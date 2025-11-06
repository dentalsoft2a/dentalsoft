import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
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

    const checks: Record<string, any> = {
      timestamp: new Date().toISOString(),
      status: "healthy",
      checks: {},
    };

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("count")
        .limit(1);

      checks.checks.database = {
        status: error ? "unhealthy" : "healthy",
        message: error ? error.message : "Database connection successful",
      };
    } catch (err) {
      checks.checks.database = {
        status: "unhealthy",
        message: err.message,
      };
      checks.status = "unhealthy";
    }

    try {
      const { data: storageCheck } = await supabase.storage.listBuckets();
      checks.checks.storage = {
        status: "healthy",
        message: "Storage connection successful",
        buckets: storageCheck?.length || 0,
      };
    } catch (err) {
      checks.checks.storage = {
        status: "unhealthy",
        message: err.message,
      };
      checks.status = "unhealthy";
    }

    checks.checks.environment = {
      status: "healthy",
      supabaseUrl: supabaseUrl ? "configured" : "missing",
      supabaseKey: supabaseKey ? "configured" : "missing",
    };

    const memoryUsage = Deno.memoryUsage();
    checks.checks.memory = {
      status: "healthy",
      heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024) + " MB",
      heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024) + " MB",
    };

    const statusCode = checks.status === "healthy" ? 200 : 503;

    return new Response(JSON.stringify(checks, null, 2), {
      status: statusCode,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Health check error:", error);
    return new Response(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        status: "unhealthy",
        error: error.message,
      }),
      {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
