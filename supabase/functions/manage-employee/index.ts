import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface CreateEmployeeRequest {
  action: 'create' | 'update' | 'updatePassword';
  email: string;
  password?: string;
  full_name: string;
  role_name: string;
  user_profile_id?: string;
}

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

    // Check if user exists in profiles table (laboratory owner)
    const { data: profile, error: profileError } = await supabaseClient
      .from("profiles")
      .select("id, laboratory_name")
      .eq("id", currentUser.id)
      .maybeSingle();

    if (profileError || !profile) {
      throw new Error("Only laboratory owners can manage employees");
    }

    const requestData: CreateEmployeeRequest = await req.json();

    if (!requestData.email || !requestData.full_name || !requestData.role_name) {
      throw new Error("Missing required fields: email, full_name, or role_name");
    }

    // Handle different actions
    if (requestData.action === 'create') {
      if (!requestData.password) {
        throw new Error("Password is required for creating new employee");
      }

      // Check if email already exists
      const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
      const emailExists = existingUsers?.users.some(u => u.email === requestData.email);
      
      if (emailExists) {
        throw new Error(`Email ${requestData.email} is already registered`);
      }

      // Create user account with employee flag
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: requestData.email,
        password: requestData.password,
        email_confirm: true,
        user_metadata: {
          full_name: requestData.full_name,
          is_employee: true
        }
      });

      if (authError) {
        throw new Error(`Auth error: ${authError.message}`);
      }

      if (!authData.user) {
        throw new Error("No user returned from auth");
      }

      const userId = authData.user.id;

      // Wait for triggers to complete (reduced wait time)
      await new Promise(resolve => setTimeout(resolve, 500));

      // Verify user_profile was created
      let retries = 0;
      let userProfile = null;
      
      while (retries < 5) {
        const { data } = await supabaseAdmin
          .from('user_profiles')
          .select('id')
          .eq('id', userId)
          .maybeSingle();
        
        if (data) {
          userProfile = data;
          break;
        }
        
        retries++;
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      if (!userProfile) {
        // Manually create user_profile if trigger failed
        const { error: upError } = await supabaseAdmin
          .from('user_profiles')
          .insert({
            id: userId,
            email: requestData.email,
            role: 'user',
            subscription_status: 'trial',
            subscription_start_date: new Date().toISOString(),
            subscription_end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            trial_used: true
          });
        
        if (upError) {
          await supabaseAdmin.auth.admin.deleteUser(userId);
          throw new Error(`Failed to create user_profile: ${upError.message}`);
        }
      }

      // Create employee record
      const { error: employeeError } = await supabaseAdmin
        .from('laboratory_employees')
        .insert({
          laboratory_profile_id: currentUser.id,
          user_profile_id: userId,
          email: requestData.email,
          full_name: requestData.full_name,
          role_name: requestData.role_name,
          created_by: currentUser.id
        });

      if (employeeError) {
        // Rollback
        await supabaseAdmin.auth.admin.deleteUser(userId);
        throw new Error(`Failed to create employee: ${employeeError.message}`);
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Employee created successfully",
          user_id: userId
        }),
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );

    } else if (requestData.action === 'updatePassword') {
      if (!requestData.user_profile_id || !requestData.password) {
        throw new Error("user_profile_id and password are required for password update");
      }

      const { error: pwError } = await supabaseAdmin.auth.admin.updateUserById(
        requestData.user_profile_id,
        { password: requestData.password }
      );

      if (pwError) {
        throw new Error(`Failed to update password: ${pwError.message}`);
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Password updated successfully"
        }),
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    throw new Error("Invalid action. Supported actions: create, updatePassword");

  } catch (error: any) {
    console.error("Error managing employee:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to manage employee" }),
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