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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const {
      data: { user: currentUser },
    } = await supabaseClient.auth.getUser();

    if (!currentUser) {
      throw new Error("Unauthorized");
    }

    const { data: userProfile } = await supabaseClient
      .from("user_profiles")
      .select("role")
      .eq("id", currentUser.id)
      .single();

    if (userProfile?.role !== "super_admin") {
      throw new Error("Only super admins can delete users");
    }

    const { userId } = await req.json();

    if (!userId) {
      throw new Error("Missing userId");
    }

    if (currentUser.id === userId) {
      throw new Error("Cannot delete your own account");
    }

    console.log('=== STARTING USER DELETION ===');
    console.log('Target user ID:', userId);

    console.log('Step 1: Calling PostgreSQL deletion function...');
    const { data: result, error: deleteError } = await supabaseAdmin.rpc(
      'delete_user_and_all_data',
      { target_user_id: userId }
    );

    if (deleteError) {
      console.error('ERROR in PostgreSQL function:', deleteError);
      throw new Error(`Database deletion failed: ${deleteError.message}`);
    }

    console.log('PostgreSQL deletion successful:', result);

    console.log('Step 2: Deleting from auth.users...');

    let authDeleted = false;
    let lastAuthError = null;

    for (let attempt = 1; attempt <= 3; attempt++) {
      console.log(`Attempt ${attempt}/3 to delete from auth.users...`);

      const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(userId);

      if (!deleteAuthError) {
        console.log('Successfully deleted from auth.users');
        authDeleted = true;
        break;
      }

      if (deleteAuthError.message.includes('not found') || deleteAuthError.message.includes('User not found')) {
        console.log('User not found in auth.users (already deleted or never existed)');
        authDeleted = true;
        break;
      }

      console.error(`Attempt ${attempt} failed:`, deleteAuthError);
      lastAuthError = deleteAuthError;

      if (attempt < 3) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    if (!authDeleted && lastAuthError) {
      console.error('FAILED to delete from auth.users after 3 attempts:', lastAuthError);
      return new Response(
        JSON.stringify({
          success: false,
          error: `User data deleted but auth account remains: ${lastAuthError.message}`,
          details: 'The user data has been removed from the database, but the authentication account could not be deleted. Please try again or contact support.',
          partialSuccess: true,
          accountType: result.account_type,
          accountName: result.account_name
        }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    console.log('=== USER DELETION COMPLETE ===');

    return new Response(
      JSON.stringify({
        success: true,
        message: `${result.account_type === "laboratory" ? "Laboratoire" : "Dentiste"} supprim\u00e9 avec succ\u00e8s`,
        accountType: result.account_type,
        accountName: result.account_name
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error: any) {
    console.error("=== FATAL ERROR ===");
    console.error("Error:", error);
    console.error("Stack:", error.stack);

    return new Response(
      JSON.stringify({
        error: error.message || "Failed to delete user",
        details: error.toString(),
        stack: error.stack
      }),
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