import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import nodemailer from "npm:nodemailer@6.9.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface EmailRequest {
  proformaId: string;
  dentistEmail: string;
  dentistName: string;
  pdfBase64: string;
  proformaNumber: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get SMTP configuration
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
          error: "Configuration SMTP non trouvée. Veuillez configurer SMTP dans le panel admin." 
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Parse request body
    const { proformaId, dentistEmail, dentistName, pdfBase64, proformaNumber }: EmailRequest = await req.json();

    if (!dentistEmail || !pdfBase64 || !proformaNumber) {
      return new Response(
        JSON.stringify({ success: false, error: "Paramètres manquants" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Create nodemailer transporter
    const transporter = nodemailer.createTransport({
      host: smtpConfig.smtp_host,
      port: smtpConfig.smtp_port,
      secure: smtpConfig.smtp_secure,
      auth: {
        user: smtpConfig.smtp_user,
        pass: smtpConfig.smtp_password,
      },
    });

    // Convert base64 to buffer
    const pdfBuffer = Uint8Array.from(atob(pdfBase64), c => c.charCodeAt(0));

    // Send email
    const mailOptions = {
      from: `"${smtpConfig.from_name}" <${smtpConfig.from_email}>`,
      to: dentistEmail,
      subject: `Proforma ${proformaNumber} - GB Dental`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #0ea5e9 0%, #06b6d4 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px; }
            .footer { text-align: center; margin-top: 20px; color: #64748b; font-size: 14px; }
            .button { display: inline-block; background: #0ea5e9; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Proforma ${proformaNumber}</h1>
            </div>
            <div class="content">
              <p>Bonjour ${dentistName || 'Docteur'},</p>
              <p>Veuillez trouver ci-joint votre proforma <strong>${proformaNumber}</strong>.</p>
              <p>Le document PDF est joint à cet email.</p>
              <p>Si vous avez des questions ou besoin de modifications, n'hésitez pas à nous contacter.</p>
              <p>Cordialement,<br><strong>GB Dental</strong></p>
            </div>
            <div class="footer">
              <p>Cet email a été envoyé automatiquement, merci de ne pas y répondre.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      attachments: [
        {
          filename: `Proforma_${proformaNumber}.pdf`,
          content: pdfBuffer,
          contentType: "application/pdf",
        },
      ],
    };

    await transporter.sendMail(mailOptions);

    // Log the email send in audit log
    await supabase.from("audit_log").insert({
      action: "email_sent",
      entity_type: "proforma",
      entity_id: proformaId,
      details: {
        recipient: dentistEmail,
        proforma_number: proformaNumber,
      },
    });

    return new Response(
      JSON.stringify({ success: true, message: "Email envoyé avec succès" }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error sending email:", error);
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
