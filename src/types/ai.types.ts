export interface AIConversation {
  id: string;
  user_id: string;
  laboratory_id: string | null;
  title: string | null;
  summary: string | null;
  is_archived: boolean;
  is_pinned: boolean;
  message_count: number;
  total_tokens_used: number;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
  last_message_at: string;
}

export interface AIMessage {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant' | 'system' | 'function';
  content: string;
  function_call?: {
    name: string;
    arguments: Record<string, any>;
  };
  function_response?: any;
  tokens_used: number;
  model_used?: string;
  response_time_ms?: number;
  metadata: Record<string, any>;
  created_at: string;
}

export interface AIUsageStats {
  id: string;
  user_id: string;
  laboratory_id: string | null;
  date: string;
  total_messages: number;
  total_tokens: number;
  total_conversations: number;
  functions_called: Record<string, number>;
  estimated_cost_cents: number;
  created_at: string;
  updated_at: string;
}

export interface AIUserPreferences {
  id: string;
  user_id: string;
  voice_enabled: boolean;
  voice_language: string;
  theme: 'auto' | 'light' | 'dark';
  ai_personality: 'friendly' | 'professional' | 'concise';
  auto_execute_functions: boolean;
  show_function_details: boolean;
  favorite_actions: string[];
  notify_on_function_completion: boolean;
  created_at: string;
  updated_at: string;
}

export interface SendMessageRequest {
  conversationId?: string;
  message: string;
  context?: {
    currentPage?: string;
    selectedData?: any;
  };
}

export interface SendMessageResponse {
  conversationId: string;
  message: string;
  tokensUsed: number;
  messageCount: number;
  dailyLimit: number;
  toolsExecuted?: number;
}
