import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Stripe from "npm:stripe@14.10.0";
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
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!stripeSecretKey) {
      throw new Error("STRIPE_SECRET_KEY is not configured");
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2023-10-16",
    });

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);

    if (userError || !userData.user) {
      throw new Error("Unauthorized");
    }

    const { userExtensionId } = await req.json();

    if (!userExtensionId) {
      throw new Error("userExtensionId is required");
    }

    const { data: userExtension, error: extensionError } = await supabase
      .from("user_extensions")
      .select("stripe_subscription_id, user_id")
      .eq("id", userExtensionId)
      .eq("user_id", userData.user.id)
      .maybeSingle();

    if (extensionError || !userExtension) {
      throw new Error("Extension subscription not found");
    }

    if (!userExtension.stripe_subscription_id) {
      throw new Error("No Stripe subscription found for this extension");
    }

    console.log("Cancelling Stripe subscription:", userExtension.stripe_subscription_id);

    await stripe.subscriptions.cancel(userExtension.stripe_subscription_id);

    const { error: updateError } = await supabase
      .from("user_extensions")
      .update({
        status: "cancelled",
        auto_renew: false,
        cancelled_at: new Date().toISOString(),
      })
      .eq("id", userExtensionId);

    if (updateError) {
      console.error("Error updating user extension:", updateError);
    }

    return new Response(
      JSON.stringify({ success: true, message: "Subscription cancelled successfully" }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Error cancelling subscription:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});