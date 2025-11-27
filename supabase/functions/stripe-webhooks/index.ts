import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Stripe from "npm:stripe@14.10.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey, stripe-signature",
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
    const stripeWebhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!stripeSecretKey) {
      throw new Error("STRIPE_SECRET_KEY is not configured");
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2023-10-16",
    });

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const signature = req.headers.get("stripe-signature");
    const body = await req.text();

    let event: Stripe.Event;

    if (stripeWebhookSecret && signature) {
      try {
        event = stripe.webhooks.constructEvent(
          body,
          signature,
          stripeWebhookSecret
        );
      } catch (err: any) {
        console.error("Webhook signature verification failed:", err.message);
        return new Response(
          JSON.stringify({ error: "Webhook signature verification failed" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    } else {
      event = JSON.parse(body);
    }

    console.log("Received webhook event:", event.type);

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        console.log("Checkout session completed:", session);

        if (session.metadata?.type === "dentist_subscription") {
          const dentistId = session.metadata.dentist_id;
          const planId = session.metadata.plan_id;
          const billingPeriod = session.metadata.billing_period || 'monthly';
          const subscriptionId = session.subscription as string;
          const customerId = session.customer as string;

          console.log("Processing dentist subscription for dentist:", dentistId, "plan:", planId);

          const subscriptionEndDate = new Date();
          if (billingPeriod === 'yearly') {
            subscriptionEndDate.setFullYear(subscriptionEndDate.getFullYear() + 1);
          } else {
            subscriptionEndDate.setMonth(subscriptionEndDate.getMonth() + 1);
          }

          const { error: updateError } = await supabase
            .from("dentist_accounts")
            .update({
              subscription_status: "active",
              subscription_plan_id: planId,
              subscription_start_date: new Date().toISOString(),
              subscription_end_date: subscriptionEndDate.toISOString(),
              stripe_subscription_id: subscriptionId,
              stripe_customer_id: customerId,
              billing_period: billingPeriod,
            })
            .eq("id", dentistId);

          if (updateError) {
            console.error("Error activating dentist subscription:", updateError);
          } else {
            console.log("Dentist subscription activated successfully for dentist:", dentistId);
          }
        } else if (session.metadata?.type === "subscription_plan") {
          const userId = session.metadata.user_id;
          const planId = session.metadata.plan_id;
          const subscriptionId = session.subscription as string;

          console.log("Processing subscription plan for user:", userId, "plan:", planId);

          const subscriptionEndDate = new Date();
          subscriptionEndDate.setMonth(subscriptionEndDate.getMonth() + 1);

          const { error: updateError } = await supabase
            .from("user_profiles")
            .update({
              subscription_status: "active",
              subscription_plan_id: planId,
              subscription_start_date: new Date().toISOString(),
              subscription_end_date: subscriptionEndDate.toISOString(),
              stripe_subscription_id: subscriptionId,
            })
            .eq("id", userId);

          if (updateError) {
            console.error("Error activating subscription plan:", updateError);
          } else {
            console.log("Subscription plan activated successfully for user:", userId);
          }
        } else if (session.metadata?.type === "extension_subscription") {
          const userId = session.metadata.user_id;
          const extensionId = session.metadata.extension_id;
          const subscriptionId = session.subscription as string;

          console.log("Processing extension subscription for user:", userId, "extension:", extensionId);

          const { data: profile, error: profileError } = await supabase
            .from("profiles")
            .select("id")
            .eq("id", userId)
            .maybeSingle();

          if (profileError) {
            console.error("Error finding profile:", profileError);
          }

          const expiryDate = new Date();
          expiryDate.setMonth(expiryDate.getMonth() + 1);

          const { data: existingExtension } = await supabase
            .from("user_extensions")
            .select("id")
            .eq("user_id", userId)
            .eq("extension_id", extensionId)
            .maybeSingle();

          if (existingExtension) {
            console.log("Extension already exists, updating status");
            const { error: updateError } = await supabase
              .from("user_extensions")
              .update({
                status: "active",
                start_date: new Date().toISOString(),
                expiry_date: expiryDate.toISOString(),
                auto_renew: true,
                stripe_subscription_id: subscriptionId,
                cancelled_at: null,
              })
              .eq("id", existingExtension.id);

            if (updateError) {
              console.error("Error updating user extension:", updateError);
            } else {
              console.log("Extension updated successfully for user:", userId);
            }
          } else {
            console.log("Creating new user extension");
            const { error: insertError } = await supabase
              .from("user_extensions")
              .insert({
                user_id: userId,
                profile_id: profile?.id || null,
                extension_id: extensionId,
                status: "active",
                start_date: new Date().toISOString(),
                expiry_date: expiryDate.toISOString(),
                auto_renew: true,
                stripe_subscription_id: subscriptionId,
              });

            if (insertError) {
              console.error("Error creating user extension:", insertError);
            } else {
              console.log("Extension activated successfully for user:", userId);
            }
          }
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        console.log("Subscription updated:", subscription);

        if (subscription.metadata?.user_id && subscription.metadata?.extension_id) {
          const status = subscription.status === "active" ? "active" :
                        subscription.status === "canceled" ? "cancelled" : "expired";

          const { error: updateError } = await supabase
            .from("user_extensions")
            .update({
              status,
              cancelled_at: status === "cancelled" ? new Date().toISOString() : null,
            })
            .eq("stripe_subscription_id", subscription.id);

          if (updateError) {
            console.error("Error updating extension status:", updateError);
          }
        }
        else if (subscription.metadata?.user_id && subscription.metadata?.plan_id) {
          if (subscription.status === "canceled") {
            const { error: updateError } = await supabase
              .from("user_profiles")
              .update({
                subscription_status: "cancelled",
              })
              .eq("stripe_subscription_id", subscription.id);

            if (updateError) {
              console.error("Error updating profile subscription status:", updateError);
            }
          }
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        console.log("Subscription deleted:", subscription);

        // Cancel dentist subscriptions
        const { error: dentistDeleteError } = await supabase
          .from("dentist_accounts")
          .update({
            subscription_status: "expired",
            stripe_subscription_id: null,
          })
          .eq("stripe_subscription_id", subscription.id);

        if (dentistDeleteError) {
          console.error("Error cancelling dentist subscription:", dentistDeleteError);
        }

        const { error: extensionDeleteError } = await supabase
          .from("user_extensions")
          .update({
            status: "cancelled",
            cancelled_at: new Date().toISOString(),
          })
          .eq("stripe_subscription_id", subscription.id);

        if (extensionDeleteError) {
          console.error("Error cancelling extension:", extensionDeleteError);
        }

        const { error: profileDeleteError } = await supabase
          .from("user_profiles")
          .update({
            subscription_status: "cancelled",
          })
          .eq("stripe_subscription_id", subscription.id);

        if (profileDeleteError) {
          console.error("Error cancelling profile subscription:", profileDeleteError);
        }
        break;
      }

      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        console.log("Invoice paid:", invoice);

        if (invoice.subscription) {
          const nextBillingDate = new Date(invoice.lines.data[0].period.end * 1000);

          // Renew dentist subscriptions
          const { error: dentistRenewError } = await supabase
            .from("dentist_accounts")
            .update({
              subscription_end_date: nextBillingDate.toISOString(),
              subscription_status: "active",
            })
            .eq("stripe_subscription_id", invoice.subscription as string);

          if (dentistRenewError) {
            console.error("Error renewing dentist subscription:", dentistRenewError);
          } else {
            console.log("Dentist subscription renewed successfully");
          }

          const { error: renewError } = await supabase
            .from("user_extensions")
            .update({
              expiry_date: nextBillingDate.toISOString(),
              status: "active",
            })
            .eq("stripe_subscription_id", invoice.subscription as string);

          if (renewError) {
            console.error("Error renewing extension:", renewError);
          }

          const { error: profileRenewError } = await supabase
            .from("user_profiles")
            .update({
              subscription_end_date: nextBillingDate.toISOString(),
              subscription_status: "active",
            })
            .eq("stripe_subscription_id", invoice.subscription as string);

          if (profileRenewError) {
            console.error("Error renewing profile subscription:", profileRenewError);
          }
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        console.log("Invoice payment failed:", invoice);
        
        if (invoice.subscription) {
          const { error: failError } = await supabase
            .from("user_extensions")
            .update({ status: "expired" })
            .eq("stripe_subscription_id", invoice.subscription as string);

          if (failError) {
            console.error("Error updating extension after payment failure:", failError);
          }

          const { error: profileFailError } = await supabase
            .from("user_profiles")
            .update({ subscription_status: "expired" })
            .eq("stripe_subscription_id", invoice.subscription as string);

          if (profileFailError) {
            console.error("Error updating profile after payment failure:", profileFailError);
          }
        }
        break;
      }

      default:
        console.log("Unhandled event type:", event.type);
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error processing webhook:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});