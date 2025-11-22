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

const AVAILABLE_TOOLS = [
  {
    type: 'function',
    function: {
      name: 'search_dentists',
      description: 'Recherche des dentistes dans la base de données. Retourne une liste de dentistes avec leurs informations.',
      parameters: {
        type: 'object',
        properties: {
          search_query: {
            type: 'string',
            description: 'Nom, email ou téléphone du dentiste à rechercher',
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_dentist_details',
      description: 'Récupère les détails complets d\'un dentiste spécifique par son ID.',
      parameters: {
        type: 'object',
        properties: {
          dentist_id: {
            type: 'string',
            description: 'L\'ID UUID du dentiste',
          },
        },
        required: ['dentist_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'search_patients',
      description: 'Recherche des patients dans la base de données.',
      parameters: {
        type: 'object',
        properties: {
          search_query: {
            type: 'string',
            description: 'Nom ou code patient à rechercher',
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'search_catalog_items',
      description: 'Recherche des articles dans le catalogue (prothèses, couronnes, bridges, etc.).',
      parameters: {
        type: 'object',
        properties: {
          search_query: {
            type: 'string',
            description: 'Nom de l\'article ou type de prothèse',
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_delivery_note',
      description: 'Crée un nouveau bon de livraison. IMPORTANT: Demande d\'abord les informations manquantes à l\'utilisateur avant de créer.',
      parameters: {
        type: 'object',
        properties: {
          dentist_id: {
            type: 'string',
            description: 'ID du dentiste (UUID)',
          },
          patient_name: {
            type: 'string',
            description: 'Nom du patient',
          },
          patient_code: {
            type: 'string',
            description: 'Code patient (optionnel)',
          },
          prescription_date: {
            type: 'string',
            description: 'Date de prescription (format YYYY-MM-DD)',
          },
          items: {
            type: 'array',
            description: 'Liste des articles du bon de livraison',
            items: {
              type: 'object',
              properties: {
                catalog_item_id: {
                  type: 'string',
                  description: 'ID de l\'article du catalogue',
                },
                tooth_number: {
                  type: 'string',
                  description: 'Numéro de dent (ex: 11, 21, 36)',
                },
                shade: {
                  type: 'string',
                  description: 'Teinte (ex: A2, B1)',
                },
                quantity: {
                  type: 'number',
                  description: 'Quantité',
                  default: 1,
                },
              },
              required: ['catalog_item_id'],
            },
          },
          notes: {
            type: 'string',
            description: 'Notes ou instructions spéciales',
          },
        },
        required: ['dentist_id', 'patient_name', 'items'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_dashboard_stats',
      description: 'Récupère les statistiques du tableau de bord (CA, BL en cours, factures, etc.).',
      parameters: {
        type: 'object',
        properties: {},
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'search_delivery_notes',
      description: 'Recherche des bons de livraison avec filtres.',
      parameters: {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            description: 'Statut: pending, in_production, completed, delivered, invoiced',
          },
          dentist_id: {
            type: 'string',
            description: 'Filtrer par dentiste',
          },
          limit: {
            type: 'number',
            description: 'Nombre maximum de résultats',
            default: 10,
          },
        },
      },
    },
  },
];

async function executeToolCall(
  toolName: string,
  toolArgs: any,
  supabaseClient: any,
  laboratoryId: string | null
): Promise<any> {
  console.log(`[TOOL] Executing: ${toolName}`, JSON.stringify(toolArgs));

  try {
    switch (toolName) {
      case 'search_dentists': {
        const { search_query } = toolArgs;
        let query = supabaseClient
          .from('dentist_accounts')
          .select('id, name, email, phone, address')
          .eq('laboratory_id', laboratoryId)
          .limit(10);

        if (search_query) {
          query = query.or(
            `name.ilike.%${search_query}%,email.ilike.%${search_query}%,phone.ilike.%${search_query}%`
          );
        }

        const { data, error } = await query;
        if (error) throw error;
        console.log(`[TOOL] Found ${data?.length || 0} dentists`);
        return { success: true, dentists: data || [] };
      }

      case 'get_dentist_details': {
        const { dentist_id } = toolArgs;
        const { data, error } = await supabaseClient
          .from('dentist_accounts')
          .select('*')
          .eq('id', dentist_id)
          .eq('laboratory_id', laboratoryId)
          .maybeSingle();

        if (error) throw error;
        if (!data) return { success: false, error: 'Dentiste non trouvé' };
        return { success: true, dentist: data };
      }

      case 'search_patients': {
        const { search_query } = toolArgs;
        let query = supabaseClient
          .from('patients')
          .select('id, name, patient_code')
          .eq('laboratory_id', laboratoryId)
          .limit(20);

        if (search_query) {
          query = query.or(
            `name.ilike.%${search_query}%,patient_code.ilike.%${search_query}%`
          );
        }

        const { data, error } = await query;
        if (error) throw error;
        return { success: true, patients: data || [] };
      }

      case 'search_catalog_items': {
        const { search_query } = toolArgs;
        let query = supabaseClient
          .from('catalog')
          .select('id, name, description, unit_price, category')
          .eq('laboratory_id', laboratoryId)
          .limit(20);

        if (search_query) {
          query = query.or(
            `name.ilike.%${search_query}%,description.ilike.%${search_query}%,category.ilike.%${search_query}%`
          );
        }

        const { data, error } = await query;
        if (error) throw error;
        return { success: true, items: data || [] };
      }

      case 'create_delivery_note': {
        const { dentist_id, patient_name, patient_code, prescription_date, items, notes } = toolArgs;
        console.log('[TOOL] Creating delivery note:', { dentist_id, patient_name, items_count: items?.length });

        const { data: deliveryNote, error: dnError } = await supabaseClient
          .from('delivery_notes')
          .insert({
            laboratory_id: laboratoryId,
            dentist_id: dentist_id,
            patient_name: patient_name,
            patient_code: patient_code || null,
            prescription_date: prescription_date || new Date().toISOString().split('T')[0],
            notes: notes || null,
            status: 'pending',
          })
          .select()
          .single();

        if (dnError) {
          console.error('[TOOL] Error creating delivery note:', dnError);
          throw dnError;
        }

        console.log('[TOOL] Delivery note created:', deliveryNote.id);

        if (items && items.length > 0) {
          const itemsToInsert = items.map((item: any) => ({
            delivery_note_id: deliveryNote.id,
            catalog_item_id: item.catalog_item_id,
            tooth_number: item.tooth_number || null,
            shade: item.shade || null,
            quantity: item.quantity || 1,
          }));

          const { error: itemsError } = await supabaseClient
            .from('delivery_note_items')
            .insert(itemsToInsert);

          if (itemsError) {
            console.error('[TOOL] Error creating items:', itemsError);
            throw itemsError;
          }
          console.log(`[TOOL] ${items.length} items added`);
        }

        return {
          success: true,
          delivery_note: {
            id: deliveryNote.id,
            delivery_number: deliveryNote.delivery_number,
            patient_name: deliveryNote.patient_name,
            status: deliveryNote.status,
          },
        };
      }

      case 'get_dashboard_stats': {
        const { data: stats, error } = await supabaseClient.rpc(
          'get_dashboard_aggregated_data',
          { lab_id: laboratoryId }
        );

        if (error) throw error;
        return { success: true, stats: stats || {} };
      }

      case 'search_delivery_notes': {
        const { status, dentist_id, limit = 10 } = toolArgs;
        let query = supabaseClient
          .from('delivery_notes')
          .select('id, delivery_number, patient_name, status, created_at, dentist_accounts(name)')
          .eq('laboratory_id', laboratoryId)
          .order('created_at', { ascending: false })
          .limit(limit);

        if (status) query = query.eq('status', status);
        if (dentist_id) query = query.eq('dentist_id', dentist_id);

        const { data, error } = await query;
        if (error) throw error;
        return { success: true, delivery_notes: data || [] };
      }

      default:
        return { success: false, error: `Fonction inconnue: ${toolName}` };
    }
  } catch (error) {
    console.error(`[TOOL] Error in ${toolName}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue',
    };
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  console.log('[AI-CHAT] New request received');

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
      console.error('[AI-CHAT] Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Non autorisé' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[AI-CHAT] User authenticated:', user.id);

    const { conversationId, message, context }: ChatRequest = await req.json();

    if (!message || message.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'Message vide' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[AI-CHAT] Message:', message.substring(0, 50));

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

    console.log('[AI-CHAT] Laboratory ID:', laboratoryId);

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
      console.log('[AI-CHAT] Creating new conversation');
      const { data: newConv, error: convError } = await supabaseClient
        .from('ai_conversations')
        .insert({
          user_id: user.id,
          laboratory_id: laboratoryId,
          title: message.substring(0, 100),
        })
        .select()
        .maybeSingle();

      if (convError || !newConv) {
        console.error('[AI-CHAT] Error creating conversation:', convError);
        throw new Error('Impossible de créer la conversation');
      }

      currentConversationId = newConv.id;
      console.log('[AI-CHAT] Conversation created:', currentConversationId);
    }

    const { data: messages } = await supabaseClient
      .from('ai_messages')
      .select('role, content, tool_calls, tool_results')
      .eq('conversation_id', currentConversationId)
      .order('created_at', { ascending: true })
      .limit(20);

    const systemPrompt = `Tu es l'assistant IA de GB Dental, spécialisé dans la gestion de laboratoires prothésistes dentaires.

CONTEXTE UTILISATEUR :
- Laboratoire : ${laboratoryName}
- Utilisateur : ${userName} (${userRole})
- Laboratory ID: ${laboratoryId}
- Page actuelle : ${context?.currentPage || 'dashboard'}

TU PEUX MAINTENANT EXÉCUTER DES ACTIONS RÉELLES !

CAPACITÉS D'ACTION :
1. **Créer des bons de livraison** - Utilise create_delivery_note
2. **Rechercher des dentistes** - Utilise search_dentists
3. **Rechercher des patients** - Utilise search_patients  
4. **Chercher dans le catalogue** - Utilise search_catalog_items
5. **Voir les statistiques** - Utilise get_dashboard_stats
6. **Lister les BL** - Utilise search_delivery_notes

IMPORTANT - WORKFLOW DE CRÉATION :
Quand l'utilisateur veut créer un BL :
1. **POSE DES QUESTIONS** pour obtenir les infos manquantes
2. **CHERCHE** le dentiste si besoin (search_dentists)
3. **CHERCHE** les articles du catalogue (search_catalog_items)
4. **CONFIRME** avec l'utilisateur avant de créer
5. **CRÉE** le BL avec create_delivery_note
6. **CONFIRME** la création avec le numéro généré

EXEMPLE DE CONVERSATION :
User: "Crée un BL pour le Dr. Martin"
Assistant: [Cherche le dentiste] "J'ai trouvé Dr. Martin (ID: xxx). Pour quel patient ?"
User: "Patient Dupont"
Assistant: "Quels articles voulez-vous ajouter ?"
User: "Une couronne céramique sur la dent 11"
Assistant: [Cherche catalogue] "J'ai trouvé 'Couronne céramique' à 150€. Quelle teinte ?"
User: "A2"
Assistant: [Crée le BL] "✅ BL #BL-2025-001 créé avec succès pour Dr. Martin / Patient Dupont !"

PERSONNALITÉ :
- Proactif et efficace
- Pose des questions précises
- Confirme les actions importantes
- Utilise 1-2 emojis max
- Réponds en français

RÈGLES :
- UTILISE LES OUTILS pour exécuter les actions
- NE DIS PAS "je ne peux pas" si tu as l'outil
- DEMANDE les infos manquantes AVANT de créer
- CONFIRME toujours après une action
- Reste dans le contexte métier dentaire`;

    const conversationMessages: any[] = [
      { role: 'system', content: systemPrompt },
      ...(messages || []).flatMap(m => {
        const msgs: any[] = [{ role: m.role, content: m.content }];
        if (m.tool_calls) {
          msgs.push({
            role: 'assistant',
            content: null,
            tool_calls: m.tool_calls,
          });
        }
        if (m.tool_results) {
          msgs.push({
            role: 'tool',
            content: JSON.stringify(m.tool_results),
            tool_call_id: m.tool_calls?.[0]?.id,
          });
        }
        return msgs;
      }),
      { role: 'user', content: message },
    ];

    if (!OPENAI_API_KEY) {
      console.error('[AI-CHAT] OPENAI_API_KEY not configured');
      return new Response(
        JSON.stringify({ 
          error: 'Configuration OpenAI manquante. Contactez l\'administrateur.',
          debug: 'OPENAI_API_KEY not set'
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[AI-CHAT] Calling OpenAI...');
    const startTime = Date.now();
    let totalTokens = 0;
    let assistantMessage = '';
    let toolCalls: any[] = [];
    let toolResults: any[] = [];

    let openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: conversationMessages,
        temperature: 0.7,
        max_tokens: 1000,
        tools: AVAILABLE_TOOLS,
        tool_choice: 'auto',
      }),
    });

    if (!openaiResponse.ok) {
      const error = await openaiResponse.text();
      console.error('[AI-CHAT] OpenAI Error:', error);
      throw new Error(`Erreur OpenAI: ${openaiResponse.status}`);
    }

    let openaiData = await openaiResponse.json();
    totalTokens += openaiData.usage?.total_tokens || 0;
    const responseMessage = openaiData.choices[0]?.message;
    console.log('[AI-CHAT] OpenAI response received, tool_calls:', responseMessage?.tool_calls?.length || 0);

    if (responseMessage?.tool_calls && responseMessage.tool_calls.length > 0) {
      toolCalls = responseMessage.tool_calls;
      console.log('[AI-CHAT] Executing tools...');

      for (const toolCall of toolCalls) {
        const toolName = toolCall.function.name;
        const toolArgs = JSON.parse(toolCall.function.arguments);

        const result = await executeToolCall(
          toolName,
          toolArgs,
          supabaseClient,
          laboratoryId
        );

        toolResults.push({
          tool_call_id: toolCall.id,
          role: 'tool',
          name: toolName,
          content: JSON.stringify(result),
        });
      }

      conversationMessages.push(responseMessage);
      conversationMessages.push(...toolResults);

      console.log('[AI-CHAT] Calling OpenAI again with tool results...');
      openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: conversationMessages,
          temperature: 0.7,
          max_tokens: 1000,
        }),
      });

      if (!openaiResponse.ok) {
        throw new Error('Erreur lors de la réponse finale');
      }

      openaiData = await openaiResponse.json();
      totalTokens += openaiData.usage?.total_tokens || 0;
    }

    assistantMessage = openaiData.choices[0]?.message?.content || 'Désolé, je n\'ai pas pu générer de réponse.';
    const responseTime = Date.now() - startTime;

    console.log('[AI-CHAT] Saving messages...');
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
        tokens_used: totalTokens,
        model_used: 'gpt-4o-mini',
        response_time_ms: responseTime,
        tool_calls: toolCalls.length > 0 ? toolCalls : null,
        tool_results: toolResults.length > 0 ? toolResults : null,
      },
    ]);

    await supabaseClient
      .from('ai_usage_stats')
      .upsert(
        {
          user_id: user.id,
          laboratory_id: laboratoryId,
          date: today,
          total_messages: messageCount + 1,
          total_tokens: (usageStats?.total_tokens || 0) + totalTokens,
          total_conversations: 1,
        },
        { onConflict: 'user_id,date' }
      );

    console.log('[AI-CHAT] Request complete, tokens:', totalTokens);

    return new Response(
      JSON.stringify({
        conversationId: currentConversationId,
        message: assistantMessage,
        tokensUsed: totalTokens,
        messageCount: messageCount + 1,
        dailyLimit,
        toolsExecuted: toolCalls.length,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[AI-CHAT] Fatal error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Erreur interne du serveur',
        details: error instanceof Error ? error.stack : undefined,
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
