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

    const { action, resourceId, variantId, quantity, reference } = await req.json();

    if (!action) {
      return new Response(
        JSON.stringify({ error: "Missing required field: action" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`Stock webhook received: ${action}`);

    let result;

    switch (action) {
      case "check_low_stock":
        const { data: lowStock, error: lowStockError } = await supabase
          .from("resource_variants")
          .select("*, resources(*)")
          .lt("stock_quantity", supabase.rpc("low_stock_threshold"));

        if (lowStockError) throw lowStockError;

        result = {
          action: "check_low_stock",
          lowStockItems: lowStock?.length || 0,
          items: lowStock,
        };
        break;

      case "update_stock":
        if (!resourceId || !variantId || quantity === undefined) {
          throw new Error("Missing required fields for update_stock");
        }

        const { error: updateError } = await supabase
          .from("resource_variants")
          .update({ stock_quantity: quantity })
          .eq("id", variantId);

        if (updateError) throw updateError;

        result = {
          action: "update_stock",
          resourceId,
          variantId,
          newQuantity: quantity,
        };
        break;

      case "record_movement":
        if (!resourceId || !variantId || quantity === undefined) {
          throw new Error("Missing required fields for record_movement");
        }

        const { error: movementError } = await supabase
          .from("stock_movements")
          .insert({
            resource_id: resourceId,
            variant_id: variantId,
            quantity,
            reference,
            movement_type: quantity > 0 ? "in" : "out",
          });

        if (movementError) throw movementError;

        result = {
          action: "record_movement",
          resourceId,
          variantId,
          quantity,
        };
        break;

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        ...result,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error processing stock webhook:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
