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

    console.log('Starting user deletion process for:', userId);

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
    const accountName = profile?.laboratory_name || dentist?.name || "Unknown";

    console.log(`Account type: ${accountType}, Name: ${accountName}`);

    console.log('Step 1: Deleting related data from all tables...');

    const tablesToClean = [
      'admin_impersonation_sessions',
      'archived_documents',
      'audit_log',
      'credit_notes',
      'data_seals',
      'delivery_note_stages',
      'delivery_notes',
      'dentist_favorite_laboratories',
      'dentist_notifications',
      'dentist_quote_requests',
      'dentists',
      'digital_certificates',
      'fiscal_periods',
      'help_replies',
      'help_topics',
      'help_votes',
      'invoices',
      'laboratory_employees',
      'laboratory_role_permissions',
      'onboarding_progress',
      'photo_submissions',
      'proformas',
      'quote_requests',
      'referral_rewards',
      'referrals',
      'stl_files',
      'subscription_invoices',
      'user_extensions',
      'work_assignments',
      'work_comments'
    ];

    for (const table of tablesToClean) {
      try {
        const { error: error1 } = await supabaseAdmin
          .from(table)
          .delete()
          .eq('user_id', userId);

        if (error1 && !error1.message.includes('column') && !error1.message.includes('does not exist')) {
          console.error(`Error deleting from ${table} (user_id):`, error1);
        }

        const { error: error2 } = await supabaseAdmin
          .from(table)
          .delete()
          .eq('laboratory_id', userId);

        if (error2 && !error2.message.includes('column') && !error2.message.includes('does not exist')) {
          console.error(`Error deleting from ${table} (laboratory_id):`, error2);
        }

        const { error: error3 } = await supabaseAdmin
          .from(table)
          .delete()
          .eq('profile_id', userId);

        if (error3 && !error3.message.includes('column') && !error3.message.includes('does not exist')) {
          console.error(`Error deleting from ${table} (profile_id):`, error3);
        }

        const { error: error4 } = await supabaseAdmin
          .from(table)
          .delete()
          .eq('laboratory_profile_id', userId);

        if (error4 && !error4.message.includes('column') && !error4.message.includes('does not exist')) {
          console.error(`Error deleting from ${table} (laboratory_profile_id):`, error4);
        }

        console.log(`Cleaned table: ${table}`);
      } catch (e) {
        console.log(`Skipped table ${table}:`, e.message);
      }
    }

    if (dentist) {
      console.log('Step 2: Deleting dentist_accounts...');
      const { error: deleteDentistError } = await supabaseAdmin
        .from("dentist_accounts")
        .delete()
        .eq("id", userId);

      if (deleteDentistError) {
        console.error('Error deleting dentist account:', deleteDentistError);
        throw new Error(`Failed to delete dentist account: ${deleteDentistError.message}`);
      }
    }

    if (profile) {
      console.log('Step 3: Deleting profiles...');
      const { error: deleteProfileError } = await supabaseAdmin
        .from("profiles")
        .delete()
        .eq("id", userId);

      if (deleteProfileError) {
        console.error('Error deleting profile:', deleteProfileError);
        throw new Error(`Failed to delete profile: ${deleteProfileError.message}`);
      }
    }

    console.log('Step 4: Deleting user_profiles...');
    const { error: deleteUserProfileError } = await supabaseAdmin
      .from("user_profiles")
      .delete()
      .eq("id", userId);

    if (deleteUserProfileError) {
      console.error('Error deleting user_profile:', deleteUserProfileError);
      throw new Error(`Failed to delete user_profile: ${deleteUserProfileError.message}`);
    }

    console.log('Step 5: Deleting auth.users...');
    const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (deleteAuthError && !deleteAuthError.message.includes('not found')) {
      console.error('Error deleting auth user:', deleteAuthError);
      throw new Error(`Failed to delete auth user: ${deleteAuthError.message}`);
    }

    console.log(`Successfully deleted user ${userId} (${accountName})`);

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
    console.error("FATAL ERROR deleting user:", error);
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