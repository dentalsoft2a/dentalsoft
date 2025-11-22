import { useState, useRef, useEffect } from 'react';
import { Bot, X, Send, Minimize2, Maximize2, MessageSquare, Sparkles } from 'lucide-react';
import { useAIChat } from '../../hooks/useAIChat';
import { useLockScroll } from '../../hooks/useLockScroll';
import MessageBubble from './MessageBubble';

interface AIAssistantChatProps {
  currentPage?: string;
  selectedData?: any;
}

export default function AIAssistantChat({ currentPage, selectedData }: AIAssistantChatProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    messages,
    sendMessage,
    isLoading,
    usageStats,
    error,
  } = useAIChat();

  useLockScroll(isOpen && isMaximized);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!inputValue.trim() || isLoading) return;

    const message = inputValue.trim();
    setInputValue('');

    try {
      await sendMessage(message, {
        currentPage,
        selectedData,
      });
    } catch (err) {
      console.error('Error sending message:', err);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const quickActions = [
    { label: 'Stats du jour', message: 'Montre-moi les statistiques du jour' },
    { label: 'Aide navigation', message: 'Comment utiliser l\'application ?' },
    { label: 'Chercher dentiste', message: 'Recherche un dentiste' },
  ];

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 w-16 h-16 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-full shadow-2xl hover:shadow-blue-500/50 hover:scale-110 transition-all duration-300 flex items-center justify-center z-50 group"
        title="Assistant IA"
      >
        <Bot className="w-8 h-8 group-hover:rotate-12 transition-transform" />
        <div className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-white animate-pulse" />
      </button>
    );
  }

  const containerClass = isMaximized
    ? 'fixed inset-0 z-50'
    : 'fixed bottom-6 right-6 w-[400px] h-[600px] z-50';

  return (
    <div className={containerClass}>
      <div className="h-full bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-200">
        <div className="bg-gradient-to-r from-blue-600 via-cyan-600 to-blue-600 px-5 py-4 flex items-center justify-between text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-lg">Assistant IA</h2>
              <p className="text-xs text-white/80">
                {usageStats
                  ? `${usageStats.total_messages}/${usageStats.total_messages + 100} messages aujourd'hui`
                  : 'Prêt à vous aider'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsMaximized(!isMaximized)}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              title={isMaximized ? 'Réduire' : 'Agrandir'}
            >
              {isMaximized ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
            </button>
            <button
              onClick={() => setIsOpen(false)}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              title="Fermer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-slate-50 to-white">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center px-6">
              <div className="w-20 h-20 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-full flex items-center justify-center mb-4">
                <Bot className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">
                Bonjour ! 👋
              </h3>
              <p className="text-slate-600 mb-6">
                Je suis votre assistant IA pour gérer votre laboratoire dentaire.
                Comment puis-je vous aider aujourd'hui ?
              </p>
              <div className="flex flex-col gap-2 w-full">
                {quickActions.map((action, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      setInputValue(action.message);
                      inputRef.current?.focus();
                    }}
                    className="px-4 py-3 bg-white border-2 border-slate-200 text-slate-700 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all font-medium text-sm"
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {messages.map((message) => (
                <MessageBubble key={message.id} message={message} />
              ))}
              {isLoading && (
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-full flex items-center justify-center flex-shrink-0">
                    <Bot className="w-5 h-5 text-white" />
                  </div>
                  <div className="bg-slate-100 rounded-2xl rounded-tl-none px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {error && (
          <div className="px-4 py-2 bg-red-50 border-t border-red-200">
            <p className="text-sm text-red-600">
              {error instanceof Error ? error.message : 'Une erreur est survenue'}
            </p>
          </div>
        )}

        <div className="p-4 bg-white border-t border-slate-200">
          <div className="flex items-end gap-2">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Posez votre question..."
              disabled={isLoading}
              className="flex-1 px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <button
              onClick={handleSend}
              disabled={!inputValue.trim() || isLoading}
              className="px-4 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl hover:from-blue-700 hover:to-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:scale-105 active:scale-95 flex items-center justify-center"
              title="Envoyer"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
          <p className="text-xs text-slate-500 mt-2 text-center">
            Propulsé par OpenAI GPT-4 · Réponses instantanées
          </p>
        </div>
      </div>
    </div>
  );
}
