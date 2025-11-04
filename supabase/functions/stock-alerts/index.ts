import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface LowStockItem {
  id: string;
  name: string;
  current_stock: number;
  low_stock_threshold: number;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Supabase configuration missing");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check catalog items with low stock
    const { data: catalogItems, error: catalogError } = await supabase
      .from("catalog")
      .select("id, name, stock_quantity, low_stock_threshold")
      .eq("track_stock", true)
      .filter("stock_quantity", "lte", "low_stock_threshold");

    if (catalogError) throw catalogError;

    // Check resource variants with low stock
    const { data: resourceVariants, error: variantsError } = await supabase
      .from("resource_variants")
      .select("id, variant_name, stock_quantity, low_stock_threshold, resource:resources(name)")
      .filter("stock_quantity", "lte", "low_stock_threshold");

    if (variantsError) throw variantsError;

    const lowStockAlerts = {
      catalog_items: catalogItems || [],
      resource_variants: resourceVariants || [],
      total_alerts: (catalogItems?.length || 0) + (resourceVariants?.length || 0),
      timestamp: new Date().toISOString(),
    };

    // If there are low stock items, log them
    if (lowStockAlerts.total_alerts > 0) {
      console.log(`⚠️ Low stock alerts: ${lowStockAlerts.total_alerts} items`);
    }

    return new Response(JSON.stringify(lowStockAlerts), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error checking stock alerts:", error);
    return new Response(
      JSON.stringify({
        error: "Failed to check stock alerts",
        details: error instanceof Error ? error.message : String(error)
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
