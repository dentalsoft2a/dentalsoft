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

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    console.log("Starting dentist subscriptions expiration check...");

    const { data: result, error } = await supabase.rpc("expire_dentist_subscriptions");

    if (error) {
      console.error("Error calling expire_dentist_subscriptions:", error);
      throw error;
    }

    console.log("Expiration check completed:", result);

    const response = {
      success: true,
      timestamp: new Date().toISOString(),
      result: result,
      message: result?.message || "Subscription expiration check completed",
    };

    return new Response(JSON.stringify(response, null, 2), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Function error:", error);

    const errorResponse = {
      success: false,
      timestamp: new Date().toISOString(),
      error: error.message || "Unknown error occurred",
    };

    return new Response(JSON.stringify(errorResponse, null, 2), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
