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

    // Vérifier l'authentification
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { documentType, documentId } = await req.json();

    if (!documentType || !documentId) {
      return new Response(
        JSON.stringify({ error: "Missing documentType or documentId" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Récupérer le document
    let document: any;
    let tableName: string;
    let hashFunction: string;

    if (documentType === "invoice") {
      tableName = "invoices";
      hashFunction = "calculate_invoice_hash";
      const { data, error } = await supabaseClient
        .from("invoices")
        .select("*, profiles!invoices_user_id_fkey(*)")
        .eq("id", documentId)
        .maybeSingle();

      if (error || !data) {
        return new Response(
          JSON.stringify({ error: "Invoice not found" }),
          {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      document = data;
    } else if (documentType === "credit_note") {
      tableName = "credit_notes";
      hashFunction = "calculate_credit_note_hash";
      const { data, error } = await supabaseClient
        .from("credit_notes")
        .select("*, profiles!credit_notes_user_id_fkey(*)")
        .eq("id", documentId)
        .maybeSingle();

      if (error || !data) {
        return new Response(
          JSON.stringify({ error: "Credit note not found" }),
          {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      document = data;
    } else {
      return new Response(
        JSON.stringify({ error: "Invalid document type" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Récupérer le certificat du laboratoire
    const { data: certificate, error: certError } = await supabaseClient
      .from("digital_certificates")
      .select("*")
      .eq("laboratory_id", document.user_id)
      .maybeSingle();

    if (certError || !certificate) {
      return new Response(
        JSON.stringify({ error: "No certificate found for laboratory" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Calculer le hash du document
    const { data: hashData, error: hashError } = await supabaseClient
      .rpc(hashFunction, { [`p_${documentType}_id`]: documentId });

    if (hashError) {
      console.error("Error calculating hash:", hashError);
      return new Response(
        JSON.stringify({ error: "Failed to calculate document hash" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const documentHash = hashData;

    // Importer la clé privée
    // Note: En production, déchiffrer d'abord la clé privée
    const privateKeyBase64 = certificate.private_key_encrypted;
    const privateKeyBinary = Uint8Array.from(atob(privateKeyBase64), c => c.charCodeAt(0));

    const privateKey = await crypto.subtle.importKey(
      "pkcs8",
      privateKeyBinary,
      {
        name: "RSA-PSS",
        hash: "SHA-256",
      },
      false,
      ["sign"]
    );

    // Signer le hash
    const encoder = new TextEncoder();
    const data = encoder.encode(documentHash);

    const signature = await crypto.subtle.sign(
      {
        name: "RSA-PSS",
        saltLength: 32,
      },
      privateKey,
      data
    );

    const signatureBase64 = btoa(String.fromCharCode(...new Uint8Array(signature)));

    // Mettre à jour le document avec la signature
    const now = new Date().toISOString();
    const { error: updateError } = await supabaseClient
      .from(tableName)
      .update({
        digital_signature: signatureBase64,
        signature_timestamp: now,
        hash_sha256: documentHash,
      })
      .eq("id", documentId);

    if (updateError) {
      console.error("Error updating document:", updateError);
      return new Response(
        JSON.stringify({ error: "Failed to save signature" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        signature: signatureBase64,
        hash: documentHash,
        timestamp: now,
        certificate_serial: certificate.serial_number,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
