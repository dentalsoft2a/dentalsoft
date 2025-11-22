import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface ChatRequest {
  conversationId?: string;
  message: string;
  context?: {
    currentPage?: string;
    selectedData?: any;
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser();

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Non autorisé' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { conversationId, message, context }: ChatRequest = await req.json();

    if (!message || message.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'Message vide' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let laboratoryId = null;
    let laboratoryName = 'Votre laboratoire';
    let userName = user.email || 'Utilisateur';
    let userRole = 'user';

    const { data: userProfile } = await supabaseClient
      .from('user_profiles')
      .select('email, role, profiles(id, company_name)')
      .eq('user_id', user.id)
      .maybeSingle();

    if (userProfile) {
      laboratoryId = userProfile.profiles?.id || null;
      laboratoryName = userProfile.profiles?.company_name || laboratoryName;
      userName = userProfile.email || userName;
      userRole = userProfile.role || 'laboratory';
    }

    const today = new Date().toISOString().split('T')[0];
    const { data: usageStats } = await supabaseClient
      .from('ai_usage_stats')
      .select('total_messages')
      .eq('user_id', user.id)
      .eq('date', today)
      .maybeSingle();

    const messageCount = usageStats?.total_messages || 0;
    const dailyLimit = 100;

    if (messageCount >= dailyLimit) {
      return new Response(
        JSON.stringify({
          error: `Limite quotidienne atteinte (${dailyLimit} messages/jour)`,
          limit: dailyLimit,
          used: messageCount,
        }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let currentConversationId = conversationId;

    if (!currentConversationId) {
      const { data: newConv, error: convError } = await supabaseClient
        .from('ai_conversations')
        .insert({
          user_id: user.id,
          laboratory_id: laboratoryId,
          title: 'Nouvelle conversation',
        })
        .select()
        .maybeSingle();

      if (convError || !newConv) {
        console.error('Error creating conversation:', convError);
        throw new Error('Impossible de créer la conversation');
      }

      currentConversationId = newConv.id;
    }

    const { data: messages } = await supabaseClient
      .from('ai_messages')
      .select('role, content')
      .eq('conversation_id', currentConversationId)
      .order('created_at', { ascending: true })
      .limit(10);

    const systemPrompt = `Tu es l'assistant IA de GB Dental, spécialisé dans la gestion de laboratoires prothésistes dentaires.

CONTEXTE UTILISATEUR :
- Laboratoire : ${laboratoryName}
- Utilisateur : ${userName} (${userRole})
- Page actuelle : ${context?.currentPage || 'dashboard'}

PERSONNALITÉ :
- Amical et professionnel
- Utilise des emojis avec parcimonie (1-2 max par message)
- Réponds en français
- Sois concis mais complet
- Confirme les actions importantes

CAPACITÉS :
Tu peux aider l'utilisateur à :
- Expliquer comment utiliser l'application GB Dental
- Guider dans la navigation entre les différentes sections
- Répondre aux questions sur les fonctionnalités
- Donner des conseils sur l'organisation du travail
- Expliquer les concepts du métier (bons de livraison, proformas, factures, catalogue, etc.)

SECTIONS DISPONIBLES :
- Dashboard : Vue d'ensemble, statistiques
- Bons de livraison : Création et gestion des BL
- Proformas : Devis pour les dentistes
- Factures : Facturation et paiements
- Catalogue : Articles et tarifs
- Dentistes : Gestion des clients
- Ressources : Matières premières et stocks
- Photos : Photos reçues des dentistes
- Travail : Suivi de production (Kanban)
- Paramètres : Configuration du compte

NOTE : Tu es actuellement en mode assistant conversationnel. Les fonctions avancées (création automatique de BL, recherche de données, etc.) seront disponibles dans une prochaine version.

RÈGLES :
- Reste dans ton rôle d'assistant GB Dental
- Ne donne pas d'informations médicales ou dentaires
- Redirige vers les fonctionnalités existantes de l'app
- Sois encourageant et utile
- Si on te demande de faire une action (créer un BL, chercher des données), explique comment le faire manuellement dans l'application`;

    const conversationMessages = [
      { role: 'system', content: systemPrompt },
      ...(messages || []).map(m => ({ role: m.role, content: m.content })),
      { role: 'user', content: message },
    ];

    if (!OPENAI_API_KEY) {
      console.error('OPENAI_API_KEY not configured');
      return new Response(
        JSON.stringify({ 
          error: 'Configuration OpenAI manquante. Contactez l\'administrateur.',
          debug: 'OPENAI_API_KEY not set'
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const startTime = Date.now();

    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4-turbo-preview',
        messages: conversationMessages,
        temperature: 0.7,
        max_tokens: 500,
      }),
    });

    if (!openaiResponse.ok) {
      const error = await openaiResponse.text();
      console.error('OpenAI Error:', error);
      throw new Error(`Erreur OpenAI: ${openaiResponse.status} ${openaiResponse.statusText}`);
    }

    const openaiData = await openaiResponse.json();
    const assistantMessage = openaiData.choices[0]?.message?.content || 'Désolé, je n\'ai pas pu générer de réponse.';
    const tokensUsed = openaiData.usage?.total_tokens || 0;
    const responseTime = Date.now() - startTime;

    const { error: insertError } = await supabaseClient.from('ai_messages').insert([
      {
        conversation_id: currentConversationId,
        role: 'user',
        content: message,
        metadata: context || {},
      },
      {
        conversation_id: currentConversationId,
        role: 'assistant',
        content: assistantMessage,
        tokens_used: tokensUsed,
        model_used: 'gpt-4-turbo-preview',
        response_time_ms: responseTime,
      },
    ]);

    if (insertError) {
      console.error('Error inserting messages:', insertError);
    }

    const { error: statsError } = await supabaseClient
      .from('ai_usage_stats')
      .upsert(
        {
          user_id: user.id,
          laboratory_id: laboratoryId,
          date: today,
          total_messages: messageCount + 1,
          total_tokens: (usageStats?.total_tokens || 0) + tokensUsed,
          total_conversations: 1,
        },
        { onConflict: 'user_id,date' }
      );

    if (statsError) {
      console.error('Error updating usage stats:', statsError);
    }

    return new Response(
      JSON.stringify({
        conversationId: currentConversationId,
        message: assistantMessage,
        tokensUsed,
        messageCount: messageCount + 1,
        dailyLimit,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in ai-chat function:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Erreur interne du serveur',
        details: error instanceof Error ? error.stack : undefined,
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
