import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface ImpersonationRequest {
  targetUserId: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { data: adminProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('role, email')
      .eq('id', user.id)
      .single();

    if (profileError || !adminProfile) {
      throw new Error('Admin profile not found');
    }

    if (adminProfile.role !== 'super_admin') {
      throw new Error('Only super admins can impersonate users');
    }

    const { targetUserId }: ImpersonationRequest = await req.json();

    if (!targetUserId) {
      throw new Error('Target user ID is required');
    }

    if (targetUserId === user.id) {
      throw new Error('Cannot impersonate yourself');
    }

    const { data: targetProfile, error: targetError } = await supabase
      .from('user_profiles')
      .select('role, email')
      .eq('id', targetUserId)
      .single();

    if (targetError || !targetProfile) {
      throw new Error('Target user not found');
    }

    if (targetProfile.role === 'super_admin') {
      throw new Error('Cannot impersonate other super admins');
    }

    const { data: existingSession } = await supabase
      .from('admin_impersonation_sessions')
      .select('id')
      .eq('admin_user_id', user.id)
      .eq('is_active', true)
      .maybeSingle();

    if (existingSession) {
      throw new Error('You already have an active impersonation session. Please end it first.');
    }

    const { data: authUser, error: authUserError } = await supabase.auth.admin.getUserById(targetUserId);

    if (authUserError || !authUser || !authUser.user) {
      throw new Error('Failed to get target user authentication data');
    }

    const targetEmail = authUser.user.email;
    if (!targetEmail) {
      throw new Error('Target user has no email');
    }

    const updatePasswordUrl = `${supabaseUrl}/auth/v1/admin/users/${targetUserId}`;
    const tempPassword = crypto.randomUUID();

    const updateResponse = await fetch(updatePasswordUrl, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Content-Type': 'application/json',
        'apikey': supabaseServiceKey,
      },
      body: JSON.stringify({
        password: tempPassword,
      }),
    });

    if (!updateResponse.ok) {
      const errorData = await updateResponse.text();
      console.error('Failed to update password:', errorData);
      throw new Error('Failed to prepare impersonation');
    }

    const signInUrl = `${supabaseUrl}/auth/v1/token?grant_type=password`;
    const signInResponse = await fetch(signInUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseServiceKey,
      },
      body: JSON.stringify({
        email: targetEmail,
        password: tempPassword,
      }),
    });

    if (!signInResponse.ok) {
      const errorData = await signInResponse.text();
      console.error('Failed to sign in:', errorData);
      throw new Error('Failed to create impersonation session');
    }

    const signInData = await signInResponse.json();

    if (!signInData.access_token || !signInData.refresh_token) {
      throw new Error('Failed to extract authentication tokens');
    }

    const { data: tokenData } = await supabase.rpc('generate_impersonation_token');

    if (!tokenData) {
      throw new Error('Failed to generate impersonation token');
    }

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 2);

    const { data: session, error: sessionError } = await supabase
      .from('admin_impersonation_sessions')
      .insert({
        admin_user_id: user.id,
        target_user_id: targetUserId,
        session_token: tokenData,
        expires_at: expiresAt.toISOString(),
        is_active: true,
      })
      .select()
      .single();

    if (sessionError) {
      throw sessionError;
    }

    await supabase
      .from('user_profiles')
      .update({ impersonated_by: user.id })
      .eq('id', targetUserId);

    await supabase.from('admin_audit_log').insert({
      admin_id: user.id,
      action: 'impersonate_user',
      target_user_id: targetUserId,
      details: {
        target_email: targetEmail,
        admin_email: adminProfile.email,
        session_id: session.id,
        expires_at: expiresAt.toISOString(),
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        sessionId: session.id,
        sessionToken: tokenData,
        accessToken: signInData.access_token,
        refreshToken: signInData.refresh_token,
        expiresAt: expiresAt.toISOString(),
        targetUser: {
          id: targetUserId,
          email: targetEmail,
        },
        adminUser: {
          id: user.id,
          email: adminProfile.email,
        },
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error: any) {
    console.error('Impersonation error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Failed to impersonate user',
      }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});
