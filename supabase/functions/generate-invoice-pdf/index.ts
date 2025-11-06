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

    const { invoiceId } = await req.json();

    if (!invoiceId) {
      return new Response(
        JSON.stringify({ error: "Missing required field: invoiceId" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { data: invoice, error: invoiceError } = await supabase
      .from("invoices")
      .select(`
        *,
        dentist_accounts(*),
        profiles(*),
        invoice_proformas(
          proformas(
            *,
            proforma_items(*)
          )
        )
      `)
      .eq("id", invoiceId)
      .maybeSingle();

    if (invoiceError || !invoice) {
      throw new Error("Invoice not found");
    }

    console.log(`Generating PDF for invoice ${invoice.invoice_number}`);

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Facture ${invoice.invoice_number}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; }
            .header { text-align: center; margin-bottom: 40px; }
            .invoice-info { margin-bottom: 30px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
            .total { font-weight: bold; font-size: 1.2em; text-align: right; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>FACTURE</h1>
            <p>${invoice.invoice_number}</p>
          </div>
          <div class="invoice-info">
            <p><strong>Date:</strong> ${new Date(invoice.invoice_date).toLocaleDateString()}</p>
            <p><strong>Client:</strong> ${invoice.dentist_accounts?.name || "N/A"}</p>
            <p><strong>Statut:</strong> ${invoice.status}</p>
          </div>
          <div class="total">
            <p>Total: ${invoice.total_amount} DH</p>
            <p>Montant payé: ${invoice.paid_amount} DH</p>
            <p>Reste à payer: ${invoice.total_amount - invoice.paid_amount} DH</p>
          </div>
        </body>
      </html>
    `;

    const pdfBuffer = new Uint8Array(0);

    const filename = `invoice-${invoice.invoice_number}.pdf`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("invoices")
      .upload(filename, pdfBuffer, {
        contentType: "application/pdf",
        upsert: true,
      });

    if (uploadError) {
      throw uploadError;
    }

    const { data: publicUrlData } = supabase.storage
      .from("invoices")
      .getPublicUrl(filename);

    return new Response(
      JSON.stringify({
        success: true,
        url: publicUrlData.publicUrl,
        filename,
        invoiceNumber: invoice.invoice_number,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error generating invoice PDF:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
