import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import {
  sendMessage,
  fetchConversations,
  fetchConversationMessages,
  createConversation,
  updateConversationTitle,
  archiveConversation,
  deleteConversation,
  fetchUsageStats,
  fetchUserPreferences,
  updateUserPreferences,
} from '../services/aiService';
import type {
  AIConversation,
  AIMessage,
  AIUsageStats,
  AIUserPreferences,
  SendMessageRequest,
} from '../types/ai.types';

export function useAIConversations() {
  return useQuery<AIConversation[]>({
    queryKey: ['aiConversations'],
    queryFn: fetchConversations,
    staleTime: 1 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

export function useAIMessages(conversationId: string | null) {
  return useQuery<AIMessage[]>({
    queryKey: ['aiMessages', conversationId],
    queryFn: () => fetchConversationMessages(conversationId!),
    enabled: !!conversationId,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

export function useAISendMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: sendMessage,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['aiMessages', data.conversationId] });
      queryClient.invalidateQueries({ queryKey: ['aiConversations'] });
      queryClient.invalidateQueries({ queryKey: ['aiUsageStats'] });
    },
  });
}

export function useAICreateConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createConversation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aiConversations'] });
    },
  });
}

export function useAIUpdateTitle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ conversationId, title }: { conversationId: string; title: string }) =>
      updateConversationTitle(conversationId, title),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aiConversations'] });
    },
  });
}

export function useAIArchiveConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: archiveConversation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aiConversations'] });
    },
  });
}

export function useAIDeleteConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteConversation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aiConversations'] });
    },
  });
}

export function useAIUsageStats() {
  return useQuery<AIUsageStats | null>({
    queryKey: ['aiUsageStats'],
    queryFn: fetchUsageStats,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

export function useAIUserPreferences() {
  return useQuery<AIUserPreferences | null>({
    queryKey: ['aiUserPreferences'],
    queryFn: fetchUserPreferences,
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

export function useAIUpdatePreferences() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateUserPreferences,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aiUserPreferences'] });
    },
  });
}

export function useAIChat(initialConversationId?: string) {
  const [conversationId, setConversationId] = useState<string | null>(
    initialConversationId || null
  );
  const [currentMessage, setCurrentMessage] = useState('');

  const { data: conversations, isLoading: conversationsLoading } = useAIConversations();
  const { data: messages, isLoading: messagesLoading } = useAIMessages(conversationId);
  const { data: usageStats } = useAIUsageStats();
  const { data: preferences } = useAIUserPreferences();

  const sendMessageMutation = useAISendMessage();
  const createConversationMutation = useAICreateConversation();

  const sendChatMessage = async (message: string, context?: any) => {
    if (!message.trim()) return;

    setCurrentMessage('');

    try {
      const response = await sendMessageMutation.mutateAsync({
        conversationId: conversationId || undefined,
        message: message.trim(),
        context,
      });

      if (!conversationId) {
        setConversationId(response.conversationId);
      }

      return response;
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  };

  const startNewConversation = async () => {
    try {
      const conv = await createConversationMutation.mutateAsync();
      setConversationId(conv.id);
      return conv;
    } catch (error) {
      console.error('Error creating conversation:', error);
      throw error;
    }
  };

  return {
    conversationId,
    setConversationId,
    conversations: conversations || [],
    messages: messages || [],
    currentMessage,
    setCurrentMessage,
    usageStats,
    preferences,
    sendMessage: sendChatMessage,
    startNewConversation,
    isLoading: sendMessageMutation.isPending || messagesLoading,
    conversationsLoading,
    error: sendMessageMutation.error,
  };
}
