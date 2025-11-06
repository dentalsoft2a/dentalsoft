import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

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
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Missing Supabase configuration");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { invoiceId, action } = await req.json();

    if (!invoiceId || !action) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: invoiceId, action" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { data: invoice, error: invoiceError } = await supabase
      .from("invoices")
      .select("*, dentist_accounts(*), profiles(*)")
      .eq("id", invoiceId)
      .maybeSingle();

    if (invoiceError || !invoice) {
      throw new Error("Invoice not found");
    }

    console.log(`Sending ${action} notification for invoice ${invoiceId}`);

    let subject = "";
    let message = "";

    switch (action) {
      case "created":
        subject = `Nouvelle facture ${invoice.invoice_number}`;
        message = `Une nouvelle facture a été créée pour un montant de ${invoice.total_amount} DH`;
        break;
      case "paid":
        subject = `Facture payée ${invoice.invoice_number}`;
        message = `La facture ${invoice.invoice_number} a été marquée comme payée`;
        break;
      case "reminder":
        subject = `Rappel de paiement - Facture ${invoice.invoice_number}`;
        message = `Rappel: La facture ${invoice.invoice_number} est en attente de paiement`;
        break;
      default:
        throw new Error("Invalid action");
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Notification sent successfully",
        invoiceId,
        action,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error sending notification:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
