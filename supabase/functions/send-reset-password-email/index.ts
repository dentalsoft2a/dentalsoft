import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ResetPasswordRequest {
  email: string;
}

// Générer un code à 6 chiffres
function generateResetCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
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

    const supabaseAdmin = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    const { email }: ResetPasswordRequest = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({ error: "Email is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`[Reset Password] Generating reset code for: ${email}`);

    // Vérifier si l'utilisateur existe
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.listUsers();
    if (userError) {
      console.error('[Reset Password] Error listing users:', userError);
      throw userError;
    }

    const user = userData.users.find(u => u.email === email);
    if (!user) {
      console.log(`[Reset Password] User not found: ${email}`);
      // Ne pas révéler si l'utilisateur existe ou non
      return new Response(
        JSON.stringify({
          success: true,
          message: "Si cet email existe, un code de réinitialisation a été envoyé",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Générer un code à 6 chiffres
    const resetCode = generateResetCode();

    // Supprimer les anciens tokens pour cet email
    await supabaseAdmin
      .from('password_reset_tokens')
      .delete()
      .eq('email', email);

    // Créer un nouveau token (expire dans 15 minutes)
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 15);

    const { error: insertError } = await supabaseAdmin
      .from('password_reset_tokens')
      .insert({
        user_id: user.id,
        email: email,
        token: resetCode,
        expires_at: expiresAt.toISOString(),
      });

    if (insertError) {
      console.error('[Reset Password] Error inserting token:', insertError);
      throw insertError;
    }

    console.log(`[Reset Password] Token created successfully for ${email}`);

    const { data: smtpSettings } = await supabaseAdmin
      .from("smtp_settings")
      .select("*")
      .maybeSingle();

    const { data: companySettings } = await supabaseAdmin
      .from("company_settings")
      .select("company_name")
      .maybeSingle();

    const companyName = companySettings?.company_name || "DentalCloud";

    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Réinitialisation de mot de passe</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); overflow: hidden;">
          <tr>
            <td style="background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%); padding: 40px 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700;">${companyName}</h1>
            </td>
          </tr>

          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="color: #1e293b; margin: 0 0 20px 0; font-size: 24px; font-weight: 600;">Réinitialisation de votre mot de passe</h2>

              <p style="color: #475569; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
                Vous avez demandé à réinitialiser votre mot de passe. Utilisez le code ci-dessous pour créer un nouveau mot de passe :
              </p>

              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                <tr>
                  <td align="center">
                    <div style="background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%); color: #ffffff; padding: 30px; border-radius: 12px; box-shadow: 0 4px 6px rgba(14, 165, 233, 0.3);">
                      <p style="color: #ffffff; margin: 0 0 10px 0; font-size: 14px; font-weight: 500; text-transform: uppercase; letter-spacing: 1px;">Votre code de réinitialisation</p>
                      <p style="color: #ffffff; margin: 0; font-size: 48px; font-weight: 700; letter-spacing: 8px; font-family: 'Courier New', monospace;">${resetCode}</p>
                    </div>
                  </td>
                </tr>
              </table>

              <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; border-radius: 6px; margin: 30px 0;">
                <p style="color: #92400e; font-size: 14px; line-height: 1.6; margin: 0;">
                  <strong>Important :</strong> Ce code est valide pendant <strong>15 minutes</strong> et ne peut être utilisé qu'<strong>une seule fois</strong>.
                </p>
              </div>

              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                <tr>
                  <td align="center">
                    <a href="https://dentalcloud.fr/reset-password" style="display: inline-block; background-color: #f8fafc; color: #0ea5e9; text-decoration: none; padding: 12px 30px; border-radius: 8px; font-weight: 600; font-size: 14px; border: 2px solid #e2e8f0; transition: all 0.2s;">
                      Aller sur la page de réinitialisation
                    </a>
                  </td>
                </tr>
              </table>

              <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 20px 0 0 0;">
                Si vous n'avez pas demandé cette réinitialisation, vous pouvez ignorer cet email en toute sécurité.
              </p>

              <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">

              <p style="color: #94a3b8; font-size: 12px; line-height: 1.5; margin: 0;">
                Ou copiez ce lien dans votre navigateur :<br>
                <a href="https://dentalcloud.fr/reset-password" style="color: #0ea5e9; word-break: break-all;">https://dentalcloud.fr/reset-password</a>
              </p>
            </td>
          </tr>

          <tr>
            <td style="background-color: #f8fafc; padding: 30px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="color: #94a3b8; font-size: 14px; margin: 0 0 10px 0;">
                ${companyName} - Gestion de laboratoire dentaire
              </p>
              <p style="color: #cbd5e1; font-size: 12px; margin: 0;">
                © ${new Date().getFullYear()} Tous droits réservés
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    const emailText = `
Réinitialisation de votre mot de passe - ${companyName}

Vous avez demandé à réinitialiser votre mot de passe.

Votre code de réinitialisation : ${resetCode}

Important : Ce code est valide pendant 15 minutes et ne peut être utilisé qu'une seule fois.

Si vous n'avez pas demandé cette réinitialisation, vous pouvez ignorer cet email en toute sécurité.

---
${companyName} - Gestion de laboratoire dentaire
© ${new Date().getFullYear()} Tous droits réservés
    `;

    if (smtpSettings) {
      console.log(`[Reset Password] Sending email via send-email function`);

      const sendEmailUrl = `${supabaseUrl}/functions/v1/send-email`;

      const emailResponse = await fetch(sendEmailUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({
          to: email,
          subject: `Code de réinitialisation - ${companyName}`,
          html: emailHtml,
          text: emailText,
        }),
      });

      if (!emailResponse.ok) {
        const errorText = await emailResponse.text();
        console.error('[Reset Password] Failed to send email:', errorText);
        throw new Error(`Failed to send email: ${errorText}`);
      }

      console.log(`[Reset Password] Email sent successfully to ${email}`);
    } else {
      console.log('[Reset Password] No SMTP settings found, email not sent (but code generated)');
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Si cet email existe, un code de réinitialisation a été envoyé",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("[Reset Password] Error:", error);
    return new Response(
      JSON.stringify({
        error: error.message || "Failed to send reset password email",
        success: false
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
