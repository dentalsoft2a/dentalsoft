import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
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
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    // Récupérer l'utilisateur depuis le header Authorization
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized - No authorization header" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Extraire le token JWT
    const token = authHeader.replace("Bearer ", "");

    // Vérifier l'utilisateur avec le service role key
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      console.error("Auth error:", authError);
      return new Response(
        JSON.stringify({ error: "Unauthorized - Invalid token", details: authError?.message }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Récupérer le profil du laboratoire
    const { data: profile, error: profileError } = await supabaseClient
      .from("profiles")
      .select("laboratory_name")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      console.error("Profile error:", profileError);
      return new Response(
        JSON.stringify({ error: "Profile not found", details: profileError.message }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!profile) {
      return new Response(
        JSON.stringify({ error: "Profile not found for user" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Vérifier si un certificat existe déjà
    const { data: existingCert, error: checkError } = await supabaseClient
      .from("digital_certificates")
      .select("id")
      .eq("laboratory_id", user.id)
      .maybeSingle();

    if (checkError) {
      console.error("Check certificate error:", checkError);
      return new Response(
        JSON.stringify({ error: "Error checking existing certificate", details: checkError.message }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (existingCert) {
      return new Response(
        JSON.stringify({ error: "Certificate already exists for this laboratory" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Générer une paire de clés RSA
    let keyPair;
    try {
      keyPair = await crypto.subtle.generateKey(
        {
          name: "RSA-PSS",
          modulusLength: 4096,
          publicExponent: new Uint8Array([1, 0, 1]),
          hash: "SHA-256",
        },
        true,
        ["sign", "verify"]
      );
    } catch (keyError) {
      console.error("Key generation error:", keyError);
      return new Response(
        JSON.stringify({ error: "Failed to generate keys", details: keyError.message }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Exporter la clé publique
    const publicKeyBuffer = await crypto.subtle.exportKey("spki", keyPair.publicKey);
    const publicKeyBase64 = btoa(String.fromCharCode(...new Uint8Array(publicKeyBuffer)));

    // Exporter la clé privée
    const privateKeyBuffer = await crypto.subtle.exportKey("pkcs8", keyPair.privateKey);
    const privateKeyBase64 = btoa(String.fromCharCode(...new Uint8Array(privateKeyBuffer)));

    // En production, la clé privée devrait être chiffrée avec AES-256
    const privateKeyEncrypted = privateKeyBase64;

    // Générer un numéro de série
    const serialNumber = Array.from(crypto.getRandomValues(new Uint8Array(16)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    // Créer le certificat
    const validFrom = new Date();
    const validUntil = new Date();
    validUntil.setFullYear(validUntil.getFullYear() + 3); // Valide 3 ans

    const subject = `CN=${profile.laboratory_name || 'Laboratory'}, O=DentalCloud, C=FR`;
    const issuer = `CN=DentalCloud Self-Signed CA, O=DentalCloud, C=FR`;

    const { data: certificate, error: certError } = await supabaseClient
      .from("digital_certificates")
      .insert({
        laboratory_id: user.id,
        certificate_type: "self_signed",
        public_key: publicKeyBase64,
        private_key_encrypted: privateKeyEncrypted,
        key_algorithm: "RSA-4096",
        valid_from: validFrom.toISOString(),
        valid_until: validUntil.toISOString(),
        issuer: issuer,
        subject: subject,
        serial_number: serialNumber,
      })
      .select()
      .single();

    if (certError) {
      console.error("Error creating certificate:", certError);
      return new Response(
        JSON.stringify({
          error: "Failed to create certificate",
          details: certError.message,
          hint: certError.hint,
          code: certError.code
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        certificate: {
          id: certificate.id,
          serial_number: serialNumber,
          valid_from: validFrom.toISOString(),
          valid_until: validUntil.toISOString(),
          algorithm: "RSA-4096",
          subject: subject,
          issuer: issuer,
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: error.message,
        stack: error.stack
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
