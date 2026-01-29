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

    const textContent = text || subject;

    try {
      let apiUrl: string;
      let headers: Record<string, string>;
      let requestBody: any;

      // Détecter le service email et utiliser l'API appropriée
      if (smtpSettings.smtp_host.includes('brevo') || smtpSettings.smtp_host.includes('sendinblue')) {
        // Brevo (anciennement Sendinblue) API
        console.log('Using Brevo API');
        apiUrl = 'https://api.brevo.com/v3/smtp/email';
        headers = {
          'accept': 'application/json',
          'api-key': smtpSettings.smtp_password,
          'content-type': 'application/json',
        };
        requestBody = {
          sender: {
            email: smtpSettings.from_email,
          },
          to: [{ email: to }],
          subject,
          htmlContent: html,
          textContent,
        };
      } else if (smtpSettings.smtp_host.includes('resend')) {
        // Resend API
        console.log('Using Resend API');
        apiUrl = 'https://api.resend.com/emails';
        headers = {
          'Authorization': `Bearer ${smtpSettings.smtp_password}`,
          'Content-Type': 'application/json',
        };
        requestBody = {
          from: smtpSettings.from_email,
          to: [to],
          subject,
          html,
          text: textContent,
        };
      } else if (smtpSettings.smtp_host.includes('sendgrid')) {
        // SendGrid API
        console.log('Using SendGrid API');
        apiUrl = 'https://api.sendgrid.com/v3/mail/send';
        headers = {
          'Authorization': `Bearer ${smtpSettings.smtp_password}`,
          'Content-Type': 'application/json',
        };
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
      } else if (smtpSettings.smtp_host.includes('mailgun')) {
        // Mailgun API
        console.log('Using Mailgun API');
        const domain = smtpSettings.smtp_user.split('@')[1] || 'mg.yourdomain.com';
        apiUrl = `https://api.mailgun.net/v3/${domain}/messages`;
        headers = {
          'Authorization': `Basic ${btoa(`api:${smtpSettings.smtp_password}`)}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        };
        const formData = new URLSearchParams({
          from: smtpSettings.from_email,
          to,
          subject,
          text: textContent,
          html,
        });
        requestBody = formData.toString();
      } else {
        // Service SMTP générique non supporté
        throw new Error(
          `SMTP provider ${smtpSettings.smtp_host} not supported. ` +
          `Please use Brevo, Resend, SendGrid, or Mailgun.`
        );
      }

      console.log(`Sending email via ${apiUrl}`);

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers,
        body: typeof requestBody === 'string' ? requestBody : JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Email API error:', errorText);
        throw new Error(`Email API error: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      console.log('Email sent successfully:', result);

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
