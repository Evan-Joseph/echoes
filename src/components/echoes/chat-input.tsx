'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { SendHorizontal, Sparkles } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

const formSchema = z.object({
  message: z.string().min(1, 'Message cannot be empty.'),
});

type FormSchema = z.infer<typeof formSchema>;

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  onGetSuggestions: () => void;
  isLoading: boolean;
  suggestionForInput: string;
}

export function ChatInput({
  onSendMessage,
  onGetSuggestions,
  isLoading,
  suggestionForInput,
}: ChatInputProps) {
  const form = useForm<FormSchema>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      message: '',
    },
  });
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const { setValue } = form;

  const autoResizeTextarea = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  };

  React.useEffect(() => {
    if (suggestionForInput && textareaRef.current) {
      setValue('message', suggestionForInput);
      textareaRef.current.focus();
      setTimeout(autoResizeTextarea, 0);
    }
  }, [suggestionForInput, setValue]);

  const onSubmit = (data: FormSchema) => {
    onSendMessage(data.message);
    form.reset();
  };

  const messageValue = form.watch('message');
  React.useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }, [messageValue]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (form.getValues('message').trim()) {
        form.handleSubmit(onSubmit)();
      }
    }
  };

  const handleInput = (e: React.FormEvent<HTMLTextAreaElement>) => {
    autoResizeTextarea();
  };

  return (
    <div className="w-full border-t border-border bg-background/80 p-4 backdrop-blur-sm">
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex items-end gap-2"
        >
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="flex-shrink-0 text-muted-foreground hover:text-primary"
                  onClick={onGetSuggestions}
                >
                  <Sparkles className="h-5 w-5" />
                  <span className="sr-only">获取灵感</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>获取灵感</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <FormField
            control={form.control}
            name="message"
            render={({ field }) => (
              <FormItem className="flex-grow">
                <FormControl>
                  <Textarea
                    {...field}
                    ref={textareaRef}
                    placeholder="在这里开始对话..."
                    className="max-h-48 resize-none rounded-2xl border-input bg-card shadow-inner"
                    rows={1}
                    onKeyDown={handleKeyDown}
                    onInput={handleInput}
                  />
                </FormControl>
              </FormItem>
            )}
          />
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="submit"
                  size="icon"
                  disabled={isLoading || !form.formState.isValid}
                  className="flex-shrink-0 rounded-full bg-primary/90 text-primary-foreground hover:bg-primary disabled:bg-muted"
                >
                  <SendHorizontal className="h-5 w-5" />
                  <span className="sr-only">发送</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>发送</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </form>
      </Form>
    </div>
  );
}
