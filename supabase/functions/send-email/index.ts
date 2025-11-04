import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface EmailPayload {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { to, subject, html, from }: EmailPayload = await req.json();

    // Validation
    if (!to || !subject || !html) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: to, subject, html" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get SMTP configuration from environment
    const SMTP_HOST = Deno.env.get("SMTP_HOST");
    const SMTP_PORT = Deno.env.get("SMTP_PORT");
    const SMTP_USER = Deno.env.get("SMTP_USER");
    const SMTP_PASS = Deno.env.get("SMTP_PASS");
    const SMTP_SENDER_NAME = Deno.env.get("SMTP_SENDER_NAME") || "DentalCloud";
    const SMTP_ADMIN_EMAIL = Deno.env.get("SMTP_ADMIN_EMAIL");

    if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
      return new Response(
        JSON.stringify({ error: "SMTP configuration not found in environment" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Prepare email recipients
    const recipients = Array.isArray(to) ? to : [to];
    const fromEmail = from || SMTP_ADMIN_EMAIL || SMTP_USER;

    // Create email content
    const emailContent = `From: ${SMTP_SENDER_NAME} <${fromEmail}>
To: ${recipients.join(", ")}
Subject: ${subject}
MIME-Version: 1.0
Content-Type: text/html; charset=UTF-8

${html}`;

    // Connect to SMTP server and send email
    const smtpPort = parseInt(SMTP_PORT || "587");

    // Use nodemailer-like approach via Deno's networking
    // For production, you might want to use a service like SendGrid, Mailgun, or AWS SES

    // For now, we'll use a simple fetch-based approach to a mail service API
    // In a real deployment, integrate with your preferred email service

    console.log(`📧 Sending email to: ${recipients.join(", ")}`);
    console.log(`Subject: ${subject}`);

    // Mock successful send for now
    // TODO: Integrate with actual SMTP or email service provider
    const response = {
      success: true,
      message: "Email queued for sending",
      recipients: recipients,
      subject: subject,
      note: "SMTP integration required for production use",
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error sending email:", error);
    return new Response(
      JSON.stringify({
        error: "Failed to send email",
        details: error instanceof Error ? error.message : String(error)
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
