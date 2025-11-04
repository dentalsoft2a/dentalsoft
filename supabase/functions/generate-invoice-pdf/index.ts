import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface InvoiceData {
  invoice_number: string;
  invoice_date: string;
  dentist_name: string;
  dentist_address?: string;
  items: Array<{
    description: string;
    quantity: number;
    unit_price: number;
    total: number;
  }>;
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  total: number;
  notes?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const invoiceData: InvoiceData = await req.json();

    // Validation
    if (!invoiceData.invoice_number || !invoiceData.items || invoiceData.items.length === 0) {
      return new Response(
        JSON.stringify({ error: "Missing required invoice data" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Generate HTML for PDF (simplified version)
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; padding: 40px; }
    .header { text-align: center; margin-bottom: 30px; }
    .invoice-info { margin-bottom: 20px; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
    th { background-color: #f5f5f5; font-weight: bold; }
    .total-row { font-weight: bold; font-size: 1.1em; }
    .notes { margin-top: 30px; font-style: italic; }
  </style>
</head>
<body>
  <div class="header">
    <h1>FACTURE</h1>
    <p>N° ${invoiceData.invoice_number}</p>
  </div>

  <div class="invoice-info">
    <p><strong>Date:</strong> ${invoiceData.invoice_date}</p>
    <p><strong>Client:</strong> ${invoiceData.dentist_name}</p>
    ${invoiceData.dentist_address ? `<p><strong>Adresse:</strong> ${invoiceData.dentist_address}</p>` : ''}
  </div>

  <table>
    <thead>
      <tr>
        <th>Description</th>
        <th>Quantité</th>
        <th>Prix unitaire</th>
        <th>Total</th>
      </tr>
    </thead>
    <tbody>
      ${invoiceData.items.map(item => `
        <tr>
          <td>${item.description}</td>
          <td>${item.quantity}</td>
          <td>${item.unit_price.toFixed(2)} €</td>
          <td>${item.total.toFixed(2)} €</td>
        </tr>
      `).join('')}
    </tbody>
    <tfoot>
      <tr>
        <td colspan="3" style="text-align: right;"><strong>Sous-total:</strong></td>
        <td>${invoiceData.subtotal.toFixed(2)} €</td>
      </tr>
      <tr>
        <td colspan="3" style="text-align: right;"><strong>TVA (${invoiceData.tax_rate}%):</strong></td>
        <td>${invoiceData.tax_amount.toFixed(2)} €</td>
      </tr>
      <tr class="total-row">
        <td colspan="3" style="text-align: right;"><strong>TOTAL:</strong></td>
        <td>${invoiceData.total.toFixed(2)} €</td>
      </tr>
    </tfoot>
  </table>

  ${invoiceData.notes ? `<div class="notes"><p><strong>Notes:</strong> ${invoiceData.notes}</p></div>` : ''}
</body>
</html>
    `;

    // In production, this would use a PDF generation library
    // For now, return the HTML content
    // TODO: Integrate with PDF generation service (puppeteer, wkhtmltopdf, etc.)

    return new Response(
      JSON.stringify({
        success: true,
        html: htmlContent,
        message: "PDF generation HTML ready",
        note: "PDF library integration required for production"
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error generating invoice PDF:", error);
    return new Response(
      JSON.stringify({
        error: "Failed to generate invoice PDF",
        details: error instanceof Error ? error.message : String(error)
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
