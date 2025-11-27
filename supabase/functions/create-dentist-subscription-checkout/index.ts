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

    const { planId, billingPeriod = 'monthly' } = await req.json();

    if (!planId) {
      throw new Error("planId is required");
    }

    // Get dentist account info
    const { data: dentistAccount, error: dentistError } = await supabase
      .from("dentist_accounts")
      .select("email, name")
      .eq("id", userData.user.id)
      .maybeSingle();

    if (dentistError || !dentistAccount) {
      throw new Error("Dentist account not found");
    }

    // Get subscription plan
    const { data: plan, error: planError } = await supabase
      .from("dentist_subscription_plans")
      .select("name, stripe_price_id_monthly, stripe_price_id_yearly, price_monthly, price_yearly")
      .eq("id", planId)
      .maybeSingle();

    if (planError || !plan) {
      throw new Error("Plan not found");
    }

    const stripePriceId = billingPeriod === 'yearly' ? plan.stripe_price_id_yearly : plan.stripe_price_id_monthly;
    const planPrice = billingPeriod === 'yearly' ? plan.price_yearly : plan.price_monthly;

    if (!stripePriceId) {
      throw new Error("This plan does not have Stripe integration configured. Please contact support.");
    }

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "subscription",
      customer_email: dentistAccount.email,
      line_items: [
        {
          price: stripePriceId,
          quantity: 1,
        },
      ],
      metadata: {
        dentist_id: userData.user.id,
        plan_id: planId,
        billing_period: billingPeriod,
        type: "dentist_subscription",
      },
      subscription_data: {
        metadata: {
          dentist_id: userData.user.id,
          plan_id: planId,
          billing_period: billingPeriod,
        },
      },
      success_url: `${req.headers.get("origin")}/#/dentist-subscription?success=true&plan=${encodeURIComponent(plan.name)}`,
      cancel_url: `${req.headers.get("origin")}/#/dentist-subscription?canceled=true`,
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
    console.error("Error creating dentist subscription checkout session:", error);
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