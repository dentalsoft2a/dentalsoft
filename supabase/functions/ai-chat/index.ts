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

    const { data: userProfile } = await supabaseClient
      .from('user_profiles')
      .select('*, profiles(*)')
      .eq('user_id', user.id)
      .single();

    if (!userProfile) {
      return new Response(
        JSON.stringify({ error: 'Profil utilisateur non trouvé' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const laboratoryId = userProfile.profiles?.id || null;
    const laboratoryName = userProfile.profiles?.company_name || 'Votre laboratoire';
    const userName = userProfile.email || 'Utilisateur';
    const userRole = userProfile.role || 'laboratory';

    const today = new Date().toISOString().split('T')[0];
    const { data: usageStats } = await supabaseClient
      .from('ai_usage_stats')
      .select('total_messages')
      .eq('user_id', user.id)
      .eq('date', today)
      .single();

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
        .single();

      if (convError || !newConv) {
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
- Utilise des emojis avec parcimonie
- Réponds en français
- Sois concis mais complet
- Confirme les actions importantes

CAPACITÉS :
Tu peux aider l'utilisateur à :
- Consulter les statistiques du laboratoire
- Chercher des informations (dentistes, articles, bons de livraison)
- Expliquer comment utiliser l'application
- Guider dans la navigation

NOTE : Les fonctions avancées (création BL, modification données) seront disponibles prochainement.

RÈGLES :
- Reste dans ton rôle d'assistant GB Dental
- Ne donne pas d'informations médicales
- Redirige vers les fonctionnalités existantes
- Sois encourageant et utile`;

    const conversationMessages = [
      { role: 'system', content: systemPrompt },
      ...(messages || []).map(m => ({ role: m.role, content: m.content })),
      { role: 'user', content: message },
    ];

    if (!OPENAI_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'Configuration OpenAI manquante' }),
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
      throw new Error('Erreur lors de l\'appel à OpenAI');
    }

    const openaiData = await openaiResponse.json();
    const assistantMessage = openaiData.choices[0]?.message?.content || 'Désolé, je n\'ai pas pu générer de réponse.';
    const tokensUsed = openaiData.usage?.total_tokens || 0;
    const responseTime = Date.now() - startTime;

    await supabaseClient.from('ai_messages').insert([
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

    await supabaseClient.rpc('increment_ai_usage_stats', {
      p_user_id: user.id,
      p_laboratory_id: laboratoryId,
      p_tokens: tokensUsed,
    }).catch(() => {
      supabaseClient.from('ai_usage_stats').upsert({
        user_id: user.id,
        laboratory_id: laboratoryId,
        date: today,
        total_messages: messageCount + 1,
        total_tokens: tokensUsed,
      }, { onConflict: 'user_id,date' });
    });

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
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
