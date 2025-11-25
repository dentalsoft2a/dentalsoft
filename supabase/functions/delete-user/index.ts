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

    console.log('Starting deletion process for user:', userId);

    const { data: result, error: deleteError } = await supabaseAdmin.rpc(
      'delete_user_and_all_data',
      { target_user_id: userId }
    );

    if (deleteError) {
      console.error('Error from delete function:', deleteError);
      throw new Error(deleteError.message);
    }

    console.log('Database deletion successful:', result);

    console.log('Deleting from auth.users...');
    const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (deleteAuthError && !deleteAuthError.message.includes('not found')) {
      console.error('Error deleting auth user:', deleteAuthError);
    }

    console.log('User deletion complete:', result);

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
    console.error("Error deleting user:", error);
    return new Response(
      JSON.stringify({
        error: error.message || "Failed to delete user",
        details: error.toString()
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