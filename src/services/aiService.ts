import { supabase } from '../lib/supabase';
import { logger } from '../utils/logger';
import type {
  AIConversation,
  AIMessage,
  AIUsageStats,
  AIUserPreferences,
  SendMessageRequest,
  SendMessageResponse,
} from '../types/ai.types';

const AI_CHAT_ENDPOINT = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat`;

export async function sendMessage(request: SendMessageRequest): Promise<SendMessageResponse> {
  try {
    logger.debug('[AIService] Sending message to AI:', {
      conversationId: request.conversationId,
      messageLength: request.message.length,
      context: request.context,
    });

    const { data: session } = await supabase.auth.getSession();
    if (!session?.session) {
      throw new Error('Non authentifié');
    }

    const response = await fetch(AI_CHAT_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.session.access_token}`,
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Erreur lors de l\'envoi du message');
    }

    const data: SendMessageResponse = await response.json();

    logger.info('[AIService] Message sent successfully:', {
      conversationId: data.conversationId,
      tokensUsed: data.tokensUsed,
      messageCount: data.messageCount,
    });

    return data;
  } catch (error) {
    logger.error('[AIService] Error sending message:', error);
    throw error;
  }
}

export async function fetchConversations(): Promise<AIConversation[]> {
  try {
    const { data, error } = await supabase
      .from('ai_conversations')
      .select('*')
      .eq('is_archived', false)
      .order('last_message_at', { ascending: false });

    if (error) throw error;

    return data || [];
  } catch (error) {
    logger.error('[AIService] Error fetching conversations:', error);
    throw error;
  }
}

export async function fetchConversationMessages(conversationId: string): Promise<AIMessage[]> {
  try {
    const { data, error } = await supabase
      .from('ai_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) throw error;

    return data || [];
  } catch (error) {
    logger.error('[AIService] Error fetching messages:', error);
    throw error;
  }
}

export async function createConversation(title?: string): Promise<AIConversation> {
  try {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) throw new Error('Non authentifié');

    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('*, profiles(*)')
      .eq('user_id', user.user.id)
      .maybeSingle();

    const laboratoryId = userProfile?.profiles?.id || null;

    const { data, error } = await supabase
      .from('ai_conversations')
      .insert({
        user_id: user.user.id,
        laboratory_id: laboratoryId,
        title: title || 'Nouvelle conversation',
      })
      .select()
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    logger.error('[AIService] Error creating conversation:', error);
    throw error;
  }
}

export async function updateConversationTitle(
  conversationId: string,
  title: string
): Promise<void> {
  try {
    const { error } = await supabase
      .from('ai_conversations')
      .update({ title })
      .eq('id', conversationId);

    if (error) throw error;
  } catch (error) {
    logger.error('[AIService] Error updating conversation title:', error);
    throw error;
  }
}

export async function archiveConversation(conversationId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('ai_conversations')
      .update({ is_archived: true })
      .eq('id', conversationId);

    if (error) throw error;
  } catch (error) {
    logger.error('[AIService] Error archiving conversation:', error);
    throw error;
  }
}

export async function deleteConversation(conversationId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('ai_conversations')
      .delete()
      .eq('id', conversationId);

    if (error) throw error;
  } catch (error) {
    logger.error('[AIService] Error deleting conversation:', error);
    throw error;
  }
}

export async function fetchUsageStats(): Promise<AIUsageStats | null> {
  try {
    const today = new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('ai_usage_stats')
      .select('*')
      .eq('date', today)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return data || null;
  } catch (error) {
    logger.error('[AIService] Error fetching usage stats:', error);
    throw error;
  }
}

export async function fetchUserPreferences(): Promise<AIUserPreferences | null> {
  try {
    const { data, error } = await supabase
      .from('ai_user_preferences')
      .select('*')
      .maybeSingle();

    if (error) {
      throw error;
    }

    return data || null;
  } catch (error) {
    logger.error('[AIService] Error fetching user preferences:', error);
    throw error;
  }
}

export async function updateUserPreferences(
  preferences: Partial<AIUserPreferences>
): Promise<AIUserPreferences> {
  try {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) throw new Error('Non authentifié');

    const { data, error } = await supabase
      .from('ai_user_preferences')
      .upsert(
        {
          user_id: user.user.id,
          ...preferences,
        },
        { onConflict: 'user_id' }
      )
      .select()
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    logger.error('[AIService] Error updating preferences:', error);
    throw error;
  }
}
