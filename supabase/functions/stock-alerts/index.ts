import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
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

    console.log("Checking for low stock items...");

    const { data: lowStockVariants, error: variantsError } = await supabase
      .from("resource_variants")
      .select(`
        *,
        resources(*)
      `)
      .filter("stock_quantity", "lte", "low_stock_threshold");

    if (variantsError) {
      throw variantsError;
    }

    const { data: lowStockCatalog, error: catalogError } = await supabase
      .from("catalog_items")
      .select("*")
      .eq("track_stock", true)
      .filter("stock_quantity", "lte", "low_stock_threshold");

    if (catalogError) {
      throw catalogError;
    }

    const alerts: any[] = [];

    if (lowStockVariants && lowStockVariants.length > 0) {
      for (const variant of lowStockVariants) {
        alerts.push({
          type: "resource_variant",
          id: variant.id,
          name: `${variant.resources?.name} - ${variant.name}`,
          currentStock: variant.stock_quantity,
          threshold: variant.low_stock_threshold,
          message: `Stock faible: ${variant.resources?.name} - ${variant.name} (${variant.stock_quantity} restant)`,
        });
      }
    }

    if (lowStockCatalog && lowStockCatalog.length > 0) {
      for (const item of lowStockCatalog) {
        alerts.push({
          type: "catalog_item",
          id: item.id,
          name: item.name,
          currentStock: item.stock_quantity,
          threshold: item.low_stock_threshold,
          message: `Stock faible: ${item.name} (${item.stock_quantity} restant)`,
        });
      }
    }

    console.log(`Found ${alerts.length} low stock items`);

    if (alerts.length > 0) {
      console.log("Alerts to send:", alerts);
    }

    return new Response(
      JSON.stringify({
        success: true,
        timestamp: new Date().toISOString(),
        alertCount: alerts.length,
        alerts,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error checking stock alerts:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
