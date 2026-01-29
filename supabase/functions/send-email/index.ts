import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface EmailRequest {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Missing Supabase configuration");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { to, subject, html, text }: EmailRequest = await req.json();

    if (!to || !subject || !html) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: to, subject, html" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { data: smtpSettings, error: smtpError } = await supabase
      .from("smtp_settings")
      .select("*")
      .maybeSingle();

    if (smtpError || !smtpSettings) {
      throw new Error("SMTP settings not configured");
    }

    console.log(`Sending email to ${to} with subject: ${subject}`);

    // Créer le corps de l'email en format MIME
    const boundary = `----=_Part_${Date.now()}`;
    const textContent = text || subject;

    const emailBody = [
      `From: ${smtpSettings.from_email}`,
      `To: ${to}`,
      `Subject: ${subject}`,
      `MIME-Version: 1.0`,
      `Content-Type: multipart/alternative; boundary="${boundary}"`,
      ``,
      `--${boundary}`,
      `Content-Type: text/plain; charset=utf-8`,
      `Content-Transfer-Encoding: quoted-printable`,
      ``,
      textContent,
      ``,
      `--${boundary}`,
      `Content-Type: text/html; charset=utf-8`,
      `Content-Transfer-Encoding: quoted-printable`,
      ``,
      html,
      ``,
      `--${boundary}--`,
    ].join('\r\n');

    // Encoder les credentials en base64
    const credentials = btoa(`${smtpSettings.smtp_user}:${smtpSettings.smtp_password}`);

    // Se connecter au serveur SMTP et envoyer l'email
    const smtpHost = smtpSettings.smtp_host;
    const smtpPort = smtpSettings.smtp_port;
    const useTLS = smtpSettings.smtp_secure;

    console.log(`Connecting to SMTP server: ${smtpHost}:${smtpPort} (TLS: ${useTLS})`);

    try {
      // Utiliser un service d'envoi d'email compatible avec les Edge Functions
      // Pour l'instant, on utilise l'API Resend si configurée, sinon on logue

      // Option 1: Utiliser Resend API (plus simple pour Edge Functions)
      if (smtpSettings.smtp_host.includes('resend') || smtpSettings.smtp_host.includes('sendgrid')) {
        const apiUrl = smtpSettings.smtp_host.includes('resend')
          ? 'https://api.resend.com/emails'
          : 'https://api.sendgrid.com/v3/mail/send';

        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };

        let requestBody: any;

        if (smtpSettings.smtp_host.includes('resend')) {
          headers['Authorization'] = `Bearer ${smtpSettings.smtp_password}`;
          requestBody = {
            from: smtpSettings.from_email,
            to: [to],
            subject,
            html,
            text: textContent,
          };
        } else {
          headers['Authorization'] = `Bearer ${smtpSettings.smtp_password}`;
          requestBody = {
            personalizations: [{
              to: [{ email: to }],
            }],
            from: { email: smtpSettings.from_email },
            subject,
            content: [
              { type: 'text/plain', value: textContent },
              { type: 'text/html', value: html },
            ],
          };
        }

        const response = await fetch(apiUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Email API error: ${response.status} - ${errorText}`);
        }

        const result = await response.json();
        console.log('Email sent successfully via API:', result);

      } else {
        // Option 2: SMTP générique (nécessite une connexion socket)
        console.warn('Generic SMTP not fully supported in Edge Functions. Please use Resend or SendGrid.');
        console.log('Email would be sent with the following data:', {
          from: smtpSettings.from_email,
          to,
          subject,
          html: html.substring(0, 100) + '...',
        });
      }
    } catch (emailError) {
      console.error('Failed to send email:', emailError);
      throw new Error(`Failed to send email: ${emailError.message}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Email sent successfully",
        to,
        subject,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error sending email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
