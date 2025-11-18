import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface CleanupResult {
  success: boolean;
  cleaned_sessions: number;
  errors: string[];
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    console.log('Starting demo accounts cleanup...');

    // Vérifier si un userId spécifique est fourni (pour suppression immédiate)
    let body = null;
    try {
      body = await req.json();
    } catch {
      // Pas de body, on nettoie les sessions expirées
    }

    let expiredSessions = [];

    if (body?.userId) {
      // Suppression immédiate d'un utilisateur spécifique
      console.log(`Immediate cleanup requested for user: ${body.userId}`);
      const { data: session } = await supabase
        .from('demo_sessions')
        .select('id, user_id')
        .eq('user_id', body.userId)
        .eq('is_active', true)
        .maybeSingle();

      if (session) {
        expiredSessions = [session];
      }
    } else {
      // Nettoyage des sessions expirées (cron job)
      const { data, error: sessionsError } = await supabase
        .from('demo_sessions')
        .select('id, user_id')
        .eq('is_active', true)
        .lt('expires_at', new Date().toISOString());

      if (sessionsError) {
        console.error('Error fetching expired sessions:', sessionsError);
        throw sessionsError;
      }

      expiredSessions = data || [];
    }

    console.log(`Found ${expiredSessions.length} sessions to clean`);

    const cleanedSessions: string[] = [];
    const errors: string[] = [];

    // Nettoyer chaque session expirée
    for (const session of expiredSessions || []) {
      try {
        console.log(`Cleaning session ${session.id} for user ${session.user_id}`);

        // Supprimer les données dans l'ordre inverse des dépendances

        // 1. Supprimer les paiements de factures
        await supabase
          .from('invoice_payments')
          .delete()
          .match({ user_id: session.user_id });

        // 2. Supprimer les liens invoice_proformas
        const { data: invoices } = await supabase
          .from('invoices')
          .select('id')
          .eq('user_id', session.user_id);

        if (invoices && invoices.length > 0) {
          const invoiceIds = invoices.map(inv => inv.id);
          await supabase
            .from('invoice_proformas')
            .delete()
            .in('invoice_id', invoiceIds);
        }

        // 3. Supprimer les items de proformas
        const { data: proformas } = await supabase
          .from('proformas')
          .select('id')
          .eq('user_id', session.user_id);

        if (proformas && proformas.length > 0) {
          const proformaIds = proformas.map(pf => pf.id);
          await supabase
            .from('proforma_items')
            .delete()
            .in('proforma_id', proformaIds);
        }

        // 4. Supprimer les notes de crédit
        await supabase
          .from('credit_notes')
          .delete()
          .eq('user_id', session.user_id);

        // 5. Supprimer les factures
        await supabase
          .from('invoices')
          .delete()
          .eq('user_id', session.user_id);

        // 6. Supprimer les proformas
        await supabase
          .from('proformas')
          .delete()
          .eq('user_id', session.user_id);

        // 7. Supprimer les bons de livraison
        await supabase
          .from('delivery_notes')
          .delete()
          .eq('user_id', session.user_id);

        // 8. Supprimer les mouvements de stock
        await supabase
          .from('stock_movements')
          .delete()
          .eq('user_id', session.user_id);

        // 9. Supprimer les variants de ressources
        const { data: resources } = await supabase
          .from('resources')
          .select('id')
          .eq('user_id', session.user_id);

        if (resources && resources.length > 0) {
          const resourceIds = resources.map(r => r.id);
          await supabase
            .from('resource_variants')
            .delete()
            .in('resource_id', resourceIds);
        }

        // 10. Supprimer les ressources
        await supabase
          .from('resources')
          .delete()
          .eq('user_id', session.user_id);

        // 11. Supprimer les articles de catalogue
        await supabase
          .from('catalog_items')
          .delete()
          .eq('user_id', session.user_id);

        // 12. Supprimer les patients
        await supabase
          .from('patients')
          .delete()
          .eq('user_id', session.user_id);

        // 13. Supprimer les dentistes
        await supabase
          .from('dentists')
          .delete()
          .eq('user_id', session.user_id);

        // 14. Supprimer les marqueurs de données démo
        await supabase
          .from('demo_data_markers')
          .delete()
          .eq('user_id', session.user_id);

        // 15. Marquer la session comme nettoyée
        await supabase
          .from('demo_sessions')
          .update({ is_active: false })
          .eq('id', session.id);

        // 16. Supprimer les profils
        await supabase
          .from('user_profiles')
          .delete()
          .eq('id', session.user_id);

        await supabase
          .from('profiles')
          .delete()
          .eq('id', session.user_id);

        // 17. Supprimer l'utilisateur auth via Admin API
        const { error: authError } = await supabase.auth.admin.deleteUser(
          session.user_id
        );

        if (authError) {
          console.error(`Error deleting auth user ${session.user_id}:`, authError);
          errors.push(`Failed to delete auth user ${session.user_id}: ${authError.message}`);
        }

        cleanedSessions.push(session.id);
        console.log(`Successfully cleaned session ${session.id}`);
      } catch (error: any) {
        console.error(`Error cleaning session ${session.id}:`, error);
        errors.push(`Session ${session.id}: ${error.message}`);
      }
    }

    const result: CleanupResult = {
      success: errors.length === 0,
      cleaned_sessions: cleanedSessions.length,
      errors: errors
    };

    console.log('Cleanup completed:', result);

    return new Response(
      JSON.stringify(result),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
        status: 200
      }
    );
  } catch (error: any) {
    console.error('Cleanup function error:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Une erreur est survenue lors du nettoyage',
        cleaned_sessions: 0,
        errors: [error.message]
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
        status: 500
      }
    );
  }
});
