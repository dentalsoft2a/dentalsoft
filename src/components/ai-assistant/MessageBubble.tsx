import { Bot, User as UserIcon } from 'lucide-react';
import type { AIMessage } from '../../types/ai.types';

interface MessageBubbleProps {
  message: AIMessage;
}

export default function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';

  if (isSystem) {
    return (
      <div className="flex justify-center my-4">
        <div className="px-4 py-2 bg-slate-100 rounded-lg text-sm text-slate-600 italic">
          {message.content}
        </div>
      </div>
    );
  }

  const formatContent = (content: string) => {
    const lines = content.split('\n');
    return lines.map((line, index) => {
      if (line.startsWith('**') && line.endsWith('**')) {
        return (
          <p key={index} className="font-bold">
            {line.replace(/\*\*/g, '')}
          </p>
        );
      }

      if (line.startsWith('- ')) {
        return (
          <li key={index} className="ml-4">
            {line.substring(2)}
          </li>
        );
      }

      if (line.trim().length === 0) {
        return <br key={index} />;
      }

      return <p key={index}>{line}</p>;
    });
  };

  return (
    <div className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
          isUser
            ? 'bg-gradient-to-r from-purple-600 to-pink-600'
            : 'bg-gradient-to-r from-blue-600 to-cyan-600'
        }`}
      >
        {isUser ? (
          <UserIcon className="w-5 h-5 text-white" />
        ) : (
          <Bot className="w-5 h-5 text-white" />
        )}
      </div>

      <div
        className={`max-w-[80%] rounded-2xl px-4 py-3 ${
          isUser
            ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-tr-none'
            : 'bg-slate-100 text-slate-900 rounded-tl-none'
        }`}
      >
        <div className="space-y-1 text-sm leading-relaxed">
          {formatContent(message.content)}
        </div>

        {message.tokens_used && message.tokens_used > 0 && !isUser && (
          <div className="mt-2 pt-2 border-t border-slate-200 flex items-center gap-2 text-xs text-slate-500">
            <span>{message.tokens_used} tokens</span>
            {message.response_time_ms && (
              <span>· {(message.response_time_ms / 1000).toFixed(2)}s</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
