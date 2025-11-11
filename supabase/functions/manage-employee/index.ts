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

    // Check if user is a laboratory owner (profiles table)
    const { data: profile, error: profileError } = await supabaseClient
      .from("profiles")
      .select("id, role")
      .eq("id", currentUser.id)
      .maybeSingle();

    if (profileError) {
      console.error("Error fetching profile:", profileError);
      throw new Error("Failed to verify user permissions");
    }

    if (!profile) {
      throw new Error("Only laboratory owners can manage employees");
    }

    const requestData: CreateEmployeeRequest = await req.json();

    if (!requestData.email || !requestData.full_name || !requestData.role_name) {
      throw new Error("Missing required fields");
    }

    // Handle different actions
    if (requestData.action === 'create') {
      // Create new user account
      if (!requestData.password) {
        throw new Error("Password is required for creating new employee");
      }

      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: requestData.email,
        password: requestData.password,
        email_confirm: true,
        user_metadata: {
          full_name: requestData.full_name
        }
      });

      if (authError) {
        console.error("Auth error:", authError);
        throw authError;
      }

      if (!authData.user) {
        throw new Error("Failed to create user account");
      }

      // Create employee record
      const { error: employeeError } = await supabaseClient
        .from('laboratory_employees')
        .insert({
          laboratory_profile_id: currentUser.id,
          user_profile_id: authData.user.id,
          email: requestData.email,
          full_name: requestData.full_name,
          role_name: requestData.role_name,
          created_by: currentUser.id
        });

      if (employeeError) {
        console.error("Employee insert error:", employeeError);
        // Rollback: delete the auth user
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
        throw employeeError;
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Employee created successfully",
          user_id: authData.user.id
        }),
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );

    } else if (requestData.action === 'updatePassword') {
      // Update password only
      if (!requestData.user_profile_id || !requestData.password) {
        throw new Error("user_profile_id and password are required");
      }

      const { error: pwError } = await supabaseAdmin.auth.admin.updateUserById(
        requestData.user_profile_id,
        { password: requestData.password }
      );

      if (pwError) {
        console.error("Password update error:", pwError);
        throw pwError;
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

    throw new Error("Invalid action");

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