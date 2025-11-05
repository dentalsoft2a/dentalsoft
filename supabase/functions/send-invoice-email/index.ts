import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import nodemailer from "npm:nodemailer@6.9.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    console.log("Starting invoice email send process...");
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("Getting SMTP configuration...");
    
    const { data: smtpConfig, error: smtpError } = await supabase
      .from("smtp_settings")
      .select("*")
      .eq("is_active", true)
      .maybeSingle();

    if (smtpError || !smtpConfig) {
      console.error("SMTP config error:", smtpError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Configuration SMTP non trouv\u00e9e. Veuillez configurer SMTP dans le panel admin." 
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("SMTP config loaded:", {
      host: smtpConfig.smtp_host,
      port: smtpConfig.smtp_port,
      secure: smtpConfig.smtp_secure
    });
    
    let requestData;
    try {
      const text = await req.text();
      console.log("Request body length:", text.length);
      requestData = JSON.parse(text);
    } catch (parseError) {
      console.error("Error parsing request body:", parseError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Erreur lors de l'analyse de la requ\u00eate: " + (parseError instanceof Error ? parseError.message : "Unknown error")
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { invoiceId, dentistEmail, dentistName, pdfBase64, invoiceNumber } = requestData;

    console.log("Request data:", {
      invoiceId,
      dentistEmail,
      dentistName,
      invoiceNumber,
      pdfBase64Length: pdfBase64?.length || 0
    });

    if (!dentistEmail || !pdfBase64 || !invoiceNumber) {
      console.error("Missing parameters");
      return new Response(
        JSON.stringify({ success: false, error: "Param\u00e8tres manquants" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("Creating nodemailer transporter...");
    
    const transportConfig: any = {
      host: smtpConfig.smtp_host,
      port: smtpConfig.smtp_port,
      auth: {
        user: smtpConfig.smtp_user,
        pass: smtpConfig.smtp_password,
      },
    };

    if (smtpConfig.smtp_port === 465) {
      transportConfig.secure = true;
    } else if (smtpConfig.smtp_port === 587) {
      transportConfig.secure = false;
      transportConfig.requireTLS = true;
    } else {
      transportConfig.secure = smtpConfig.smtp_secure;
    }

    transportConfig.tls = {
      rejectUnauthorized: true,
      minVersion: 'TLSv1.2'
    };

    console.log("Transport config:", {
      host: transportConfig.host,
      port: transportConfig.port,
      secure: transportConfig.secure,
      requireTLS: transportConfig.requireTLS
    });

    const transporter = nodemailer.createTransport(transportConfig);

    console.log("Converting base64 to buffer...");
    
    let pdfBuffer;
    try {
      pdfBuffer = Uint8Array.from(atob(pdfBase64), c => c.charCodeAt(0));
      console.log("PDF buffer size:", pdfBuffer.length);
    } catch (bufferError) {
      console.error("Error converting base64:", bufferError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Erreur lors de la conversion du PDF: " + (bufferError instanceof Error ? bufferError.message : "Unknown error")
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("Preparing email...");
    
    const mailOptions = {
      from: `\"${smtpConfig.from_name}\" <${smtpConfig.from_email}>`,
      to: dentistEmail,
      subject: `Facture ${invoiceNumber} - GB Dental`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset=\"utf-8\">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #0ea5e9 0%, #06b6d4 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px; }
            .footer { text-align: center; margin-top: 20px; color: #64748b; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class=\"container\">
            <div class=\"header\">
              <h1>Facture ${invoiceNumber}</h1>
            </div>
            <div class=\"content\">
              <p>Bonjour ${dentistName || 'Docteur'},</p>
              <p>Veuillez trouver ci-joint votre facture <strong>${invoiceNumber}</strong>.</p>
              <p>Le document PDF est joint \u00e0 cet email.</p>
              <p>Pour toute question concernant cette facture, n'h\u00e9sitez pas \u00e0 nous contacter.</p>
              <p>Cordialement,<br><strong>GB Dental</strong></p>
            </div>
            <div class=\"footer\">
              <p>Cet email a \u00e9t\u00e9 envoy\u00e9 automatiquement, merci de ne pas y r\u00e9pondre.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      attachments: [
        {
          filename: `Facture_${invoiceNumber}.pdf`,
          content: pdfBuffer,
          contentType: "application/pdf",
        },
      ],
    };

    console.log("Sending email...");
    
    try {
      await transporter.sendMail(mailOptions);
      console.log("Email sent successfully");
    } catch (emailError) {
      console.error("Error sending email:", emailError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Erreur lors de l'envoi de l'email: " + (emailError instanceof Error ? emailError.message : "Unknown error") + ". V\u00e9rifiez votre configuration SMTP (port 587 = STARTTLS, port 465 = SSL/TLS)."
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("Logging to audit...");
    
    if (invoiceId) {
      await supabase.from("audit_log").insert({
        action: "email_sent",
        entity_type: "invoice",
        entity_id: invoiceId,
        details: {
          recipient: dentistEmail,
          invoice_number: invoiceNumber,
        },
      });
    }

    console.log("Process completed successfully");
    
    return new Response(
      JSON.stringify({ success: true, message: "Email envoy\u00e9 avec succ\u00e8s" }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : "Erreur lors de l'envoi de l'email" 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
