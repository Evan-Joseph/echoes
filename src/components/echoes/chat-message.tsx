
'use client';

import { cn } from '@/lib/utils';
import type { Message } from '@/lib/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface ChatMessageProps {
  message: Message;
  isLoading?: boolean;
}

export function ChatMessage({ message, isLoading = false }: ChatMessageProps) {
  const isAi = message.role === 'ai';

  if (isLoading) {
    return (
      <div className="flex items-end gap-2">
        <Avatar className="h-10 w-10 bg-secondary/50 p-1.5">
            <AvatarImage src="/images/logo/logo-no-bg.svg" alt="AI Avatar" data-ai-hint="logo abstract" />
            <AvatarFallback className="bg-transparent"></AvatarFallback>
        </Avatar>
        <div className="flex items-center gap-1 p-3 rounded-2xl bg-muted">
            <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.3s]"></span>
            <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.15s]"></span>
            <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground"></span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn('flex items-end gap-2', {
        'justify-end': !isAi,
      })}
    >
      {isAi && (
        <Avatar className="h-10 w-10 self-end bg-secondary/50 p-1.5">
             <AvatarImage src="/images/logo/logo-no-bg.svg" alt="AI Avatar" data-ai-hint="logo abstract" />
            <AvatarFallback className="bg-transparent"></AvatarFallback>
        </Avatar>
      )}
      
      <div
        className={cn(
          'max-w-[85%] rounded-2xl p-3 px-4 shadow-sm',
          {
            'bg-primary text-primary-foreground rounded-br-none': !isAi,
            'bg-card border border-border rounded-bl-none': isAi,
            'bg-destructive/10 border-destructive/50 text-destructive-foreground': message.status === 'failed',
          }
        )}
      >
        {typeof message.content === 'string' ? (
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
        ) : (
            message.content
        )}
      </div>

    </div>
  );
}
