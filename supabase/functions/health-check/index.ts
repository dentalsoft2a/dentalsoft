import "jsr:@supabase/functions-js/edge-runtime.d.ts";

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
    const healthData = {
      status: "healthy",
      timestamp: new Date().toISOString(),
      service: "DentalCloud Edge Functions",
      version: "1.0.0",
      environment: {
        supabaseUrl: Deno.env.get("SUPABASE_URL") ? "configured" : "missing",
        smtpHost: Deno.env.get("SMTP_HOST") ? "configured" : "missing",
      },
    };

    return new Response(JSON.stringify(healthData), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Health check error:", error);
    return new Response(
      JSON.stringify({
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : String(error)
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
