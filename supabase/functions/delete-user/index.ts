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

    console.log('Attempting to delete user:', userId);

    // Vérifier si l'utilisateur existe d'abord
    const { data: authUser, error: getUserError } = await supabaseAdmin.auth.admin.getUserById(userId);

    if (getUserError || !authUser.user) {
      console.error('User not found in auth.users:', getUserError);
      throw new Error("User not found");
    }

    console.log('User found in auth:', authUser.user.email);

    // Vérifier si c'est un laboratoire ou un dentiste (pour les logs uniquement)
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("laboratory_name")
      .eq("id", userId)
      .maybeSingle();

    const { data: dentist } = await supabaseAdmin
      .from("dentist_accounts")
      .select("name, email")
      .eq("id", userId)
      .maybeSingle();

    const accountType = profile ? "laboratory" : dentist ? "dentist" : "unknown";
    const accountName = profile?.laboratory_name || dentist?.name || authUser.user.email || "Unknown";

    console.log(`Deleting ${accountType} account:`, { userId, accountName });

    // Supprimer le compte auth - la cascade DELETE s'occupera du reste
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(
      userId
    );

    if (deleteError) {
      console.error('Error deleting user from auth:', deleteError);
      throw deleteError;
    }

    console.log(`Successfully deleted ${accountType} account:`, { userId, accountName });

    return new Response(
      JSON.stringify({
        success: true,
        message: `${accountType === "laboratory" ? "Laboratoire" : "Dentiste"} supprimé avec succès`,
        accountType,
        accountName
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
      JSON.stringify({ error: error.message || "Failed to delete user" }),
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
