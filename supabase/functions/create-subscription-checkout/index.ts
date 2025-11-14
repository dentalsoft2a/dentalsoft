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

    const { planId } = await req.json();

    if (!planId) {
      throw new Error("planId is required");
    }

    const { data: profile, error: profileError } = await supabase
      .from("user_profiles")
      .select("email")
      .eq("id", userData.user.id)
      .maybeSingle();

    if (profileError || !profile) {
      throw new Error("Profile not found");
    }

    const { data: plan, error: planError } = await supabase
      .from("subscription_plans")
      .select("name, stripe_price_id, price_monthly")
      .eq("id", planId)
      .maybeSingle();

    if (planError || !plan) {
      throw new Error("Plan not found");
    }

    if (!plan.stripe_price_id) {
      throw new Error("This plan does not have Stripe integration configured. Please contact support.");
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "subscription",
      customer_email: profile.email,
      line_items: [
        {
          price: plan.stripe_price_id,
          quantity: 1,
        },
      ],
      metadata: {
        user_id: userData.user.id,
        plan_id: planId,
        type: "subscription_plan",
      },
      subscription_data: {
        metadata: {
          user_id: userData.user.id,
          plan_id: planId,
        },
      },
      success_url: `${req.headers.get("origin")}/#/subscription?success=true&plan=${encodeURIComponent(plan.name)}`,
      cancel_url: `${req.headers.get("origin")}/#/subscription?canceled=true`,
    });

    return new Response(
      JSON.stringify({ url: session.url }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Error creating subscription checkout session:", error);
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