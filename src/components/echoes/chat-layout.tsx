
'use client';

import * as React from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChatInput } from '@/components/echoes/chat-input';
import { ChatMessage } from '@/components/echoes/chat-message';
import type { Message, Activity } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { ShareDialog } from '@/components/echoes/share-dialog';
import { useToast } from '@/hooks/use-toast';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { MoreVertical, RotateCw, Trash2, Share2, Sparkles, User, Activity as ActivityIcon, Home, Users } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { getUserMessages, saveMessage, addCheckIn } from '@/lib/firebase/firestore';
import { clearChatHistoryAction, makeCheckInPublicAction, generateSuggestionsAction, getUserActivitiesAction } from '@/app/actions';
import Image from 'next/image';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel"


const WelcomeBanner = ({ onHide }: { onHide: () => void }) => (
    <div className="p-4 mb-4 rounded-2xl bg-secondary/30 border border-secondary/50 text-center space-y-2 relative">
        <Image src="/images/logo/logo-no-bg.svg" alt="Echoes Logo" width={40} height={40} className="mx-auto text-primary" data-ai-hint="logo abstract" />
        <h2 className="text-lg font-semibold text-foreground">你好，朋友！</h2>
        <p className="text-sm text-muted-foreground">
            我是你的个人成长伙伴“回响”。今天想聊点什么，或者探索些什么新东西吗？
        </p>
         <Button variant="ghost" size="sm" onClick={onHide} className="text-xs text-muted-foreground absolute top-2 right-2">开始对话</Button>
    </div>
)


export default function ChatLayout() {
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [isAiResponding, setIsAiResponding] = React.useState(false);
  const [isChatLoading, setIsChatLoading] = React.useState(true);
  const [showWelcome, setShowWelcome] = React.useState(false);
  const [suggestionForInput, setSuggestionForInput] = React.useState('');
  const [isShareDialogOpen, setIsShareDialogOpen] = React.useState(false);
  const [userActivities, setUserActivities] = React.useState<Activity[]>([]);

  const scrollAreaRef = React.useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const router = useRouter();
  const { user, isLoading: isAuthLoading } = useAuth();
  const chatInitRef = React.useRef(false);

  const scrollToBottom = () => {
    if (scrollAreaRef.current) {
      const viewport = scrollAreaRef.current.querySelector('div[data-radix-scroll-area-viewport]');
      if (viewport) {
        setTimeout(() => {
            viewport.scrollTop = viewport.scrollHeight;
        }, 100);
      }
    }
  }

  const addMessage = (role: 'user' | 'ai', content: React.ReactNode, options?: { data?: any, skipSave?: boolean, contentForDb?: string }): string => {
    if (!user) return '';
    
    const newMessageId = `${role}-${Date.now()}`;
    const message: Message = {
        id: newMessageId,
        role,
        content,
        timestamp: new Date().toISOString(),
        userId: user.uid,
    };
    
    if (options?.data) {
        message.data = options.data;
    }
    
    if (options?.contentForDb) {
        message.contentForDb = options.contentForDb;
    }
    
    setMessages(prev => [...prev, message]);

    if (!options?.skipSave) {
        const messageToSave = { ...message };
        if (messageToSave.data === undefined) {
            messageToSave.data = {};
        }

        saveMessage(messageToSave).then(savedId => {
            setMessages(prev => prev.map(m => m.id === newMessageId ? { ...m, id: savedId } : m));
        }).catch(e => console.error("Failed to save message:", e));
    }
    
    return newMessageId;
  };


  React.useEffect(() => {
    async function initializeChat() {
        if (isAuthLoading || !user || chatInitRef.current) return;
        chatInitRef.current = true;
        
        setIsChatLoading(true);
        try {
            const [existingMessages, activities] = await Promise.all([
                getUserMessages(user.uid),
                getUserActivitiesAction(user.uid),
            ]);
            
            setUserActivities(activities);
            
            const processedMessages = existingMessages.map(msg => {
                if (msg.data?.newCheckInId) {
                    return { ...msg, content: createSharePrompt(msg.data.newCheckInId) };
                }
                return msg;
            });
            setMessages(processedMessages);
            
            if (existingMessages.length === 0) {
                setShowWelcome(true);
            }

        } catch (error) {
            console.error("Failed to initialize chat:", error);
            toast({
                title: "加载失败",
                description: "无法加载聊天记录，请刷新重试。",
                variant: "destructive"
            });
        } finally {
            setIsChatLoading(false);
        }
    }
    initializeChat();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isAuthLoading]);

  React.useEffect(() => {
    scrollToBottom();
  }, [messages]);
  
  const handleCheckInRetry = async (failedMessage: Message) => {
      if (!failedMessage || !failedMessage.data || !user) return;
  
      setMessages(prev => prev.map(m => m.id === failedMessage.id ? { ...m, status: 'pending', content: '正在重新提交...' } : m));
      setIsAiResponding(true);
  
      try {
          const checkInId = await addCheckIn(failedMessage.data);
          
          const successMsg: Message = {
              id: failedMessage.id,
              role: 'ai',
              content: '',
              timestamp: new Date().toISOString(),
              userId: user.uid,
              status: undefined,
              data: { newCheckInId: checkInId },
          };

          const replyContent = createSharePrompt(checkInId);
          successMsg.content = replyContent;
          
          await saveMessage({ ...successMsg, contentForDb: `记录成功！为你记录了这宝贵的一刻。你想公开分享吗？` });
          setMessages(prev => prev.map(m => m.id === failedMessage.id ? successMsg : m));

      } catch (error) {
          console.error('Failed to retry check-in:', error);
          const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
          const content = (
              <div>
                <p>{`抱歉，还是失败了: ${errorMessage}`}</p>
                <Button variant="link" size="sm" className="p-0 h-auto text-primary" onClick={() => handleCheckInRetry(failedMessage)}>
                  <RotateCw className="mr-1 h-3 w-3" />
                  重试
                </Button>
              </div>
          );
          setMessages(prev => prev.map(m => m.id === failedMessage.id ? { ...m, status: 'failed', content } : m));
      } finally {
          setIsAiResponding(false);
      }
  };
  
  const handleMakePublic = async (checkInId: string, messageId: string) => {
    setIsAiResponding(true);
    setMessages(prev => prev.map(m => m.id === messageId ? { ...m, data: { ...m.data, actionTaken: true } } : m));

    try {
      const result = await makeCheckInPublicAction(checkInId);
      if (result.success) {
        addMessage('ai', '太棒了，你的分享可能会鼓励到更多人哦！', { data: {} });
      } else {
        throw new Error("Failed to make post public.");
      }
    } catch (error) {
      console.error(error);
      toast({ title: "分享失败", description: "网络出了一点问题，请稍后再试。", variant: "destructive" });
      setMessages(prev => prev.map(m => m.id === messageId ? { ...m, data: { ...m.data, actionTaken: false } } : m));
    } finally {
        setIsAiResponding(false);
    }
  }

  const handleDeclinePublic = (messageId: string) => {
     setMessages(prev => prev.map(m => m.id === messageId ? { ...m, data: { ...m.data, actionTaken: true } } : m));
     addMessage('ai', '好的，这条记录已为你设为私密。', { data: {} });
  }

  const createSharePrompt = (checkInId: string) => {
    const messageId = `share-prompt-${checkInId}`;
    return (
        <div className="space-y-2">
            <p>记录成功！为你记录了这宝贵的一刻。</p>
            <p>你希望将这条内容公开分享到社群广场，鼓励更多人吗？</p>
            <div className="flex gap-2 pt-2">
                <Button 
                    size="sm" 
                    onClick={() => handleMakePublic(checkInId, messageId)} 
                    disabled={messages.find(m => m.id === messageId)?.data?.actionTaken}
                >
                    <Share2 className="mr-2 h-4 w-4" />
                    公开分享
                </Button>
                 <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => handleDeclinePublic(messageId)}
                    disabled={messages.find(m => m.id === messageId)?.data?.actionTaken}
                >
                    不用了
                </Button>
            </div>
        </div>
    );
  }


  const handleCheckIn = async (checkInData: any) => {
    if (!user) return;
    setIsAiResponding(true);
    
    const checkInToSave = {
        userId: user.uid,
        isPublic: false, 
        ...checkInData
    };
    
    try {
      const checkInId = await addCheckIn(checkInToSave);
      const userMessageContent = `【打卡】${checkInData.content}${checkInData.photoDataUri ? ' [图片]' : ''}`;
      addMessage('user', userMessageContent, { data: {} });

      const replyContent = createSharePrompt(checkInId);
      addMessage('ai', replyContent, {
        contentForDb: `记录成功！为你记录了这宝贵的一刻。你想公开分享吗？`,
        data: { newCheckInId: checkInId }
      });

    } catch(error: any) {
       console.error('Failed to save check-in:', error);
       addMessage('ai', "抱歉，保存打卡记录时出错了。", { data: { isError: true } });
    } finally {
      setIsAiResponding(false);
    }
  }

  const processToolResponse = async (tool: { name: string }): Promise<{ content: React.ReactNode, contentForDb: string, skipMessage?: boolean }> => {
    if (!user) return { content: "请先登录", contentForDb: "请先登录" };

    if (tool.name === 'check_in') {
        setIsShareDialogOpen(true);
        return { 
            content: "好的，请在这里记录。",
            contentForDb: '好的，这是打卡界面。',
            skipMessage: true, // Don't add a new message, just open the dialog
        };
    }
    if (tool.name === 'query_activity') {
        return {
            content: (
                <div className="space-y-2">
                    <p>好的，活动大厅里总有新鲜事发生。要现在就去看看吗？</p>
                    <div className="flex gap-2 pt-2">
                        <Button size="sm" asChild>
                           <Link href="/activity">
                                <ActivityIcon className="mr-2 h-4 w-4" />
                                前往活动大厅
                           </Link>
                        </Button>
                    </div>
                </div>
            ),
            contentForDb: "好的，活动大厅里总有新鲜事发生。要现在就去看看吗？"
        };
    }
    if (tool.name === 'query_profile') {
        return {
            content: (
                 <div className="space-y-2">
                    <p>好的，我们来回顾一下你的成长足迹？</p>
                    <div className="flex gap-2 pt-2">
                        <Button size="sm" asChild>
                           <Link href="/profile">
                                <User className="mr-2 h-4 w-4" />
                                查看个人中心
                           </Link>
                        </Button>
                    </div>
                </div>
            ),
            contentForDb: "好的，我们来回顾一下你的成长足迹？"
        };
    }
    if (tool.name === 'query_community') {
        return {
            content: (
                 <div className="space-y-2">
                    <p>好的，带你去社群广场看看大家都在聊什么？</p>
                    <div className="flex gap-2 pt-2">
                         <Button size="sm" asChild>
                           <Link href="/community">
                                <Users className="mr-2 h-4 w-4" />
                                前往社群广场
                           </Link>
                        </Button>
                    </div>
                </div>
            ),
            contentForDb: "好的，带你去社群广场看看大家都在聊什么？"
        };
    }
    return {
        content: `工具 ${tool.name} 已调用。`,
        contentForDb: `工具 ${tool.name} 已调用。`
    };
  }
  
  const handleSuggestionClick = (suggestion: string) => {
    setSuggestionForInput(`${suggestion}##${new Date().getTime()}`);
  }

  const handleGetSuggestions = async () => {
    if (isAiResponding) return;
    setIsAiResponding(true);

    try {
        const result = await generateSuggestionsAction();
        const suggestions = result.suggestions;

        const suggestionsContent = (
            <div className="w-full">
                <p className="mb-3">没关系，我们总有灵感枯竭的时候。这里有一些话题，或许能点燃你的思绪：</p>
                <Carousel className="w-full max-w-xs sm:max-w-sm" opts={{
                    align: "start",
                    loop: false,
                }}>
                    <CarouselContent>
                        {suggestions.map((suggestion: string, index: number) => (
                            <CarouselItem key={index} className="basis-1/2 sm:basis-1/3">
                                <Button
                                    variant="outline"
                                    className="w-full h-full text-wrap text-left justify-start"
                                    onClick={() => handleSuggestionClick(suggestion)}
                                >
                                    {suggestion}
                                </Button>
                            </CarouselItem>
                        ))}
                    </CarouselContent>
                    <CarouselPrevious className="hidden sm:flex" />
                    <CarouselNext className="hidden sm:flex"/>
                </Carousel>
            </div>
        );
        addMessage('ai', suggestionsContent, { contentForDb: "为你提供了一些建议。", data: {} });

    } catch (error) {
        console.error("Failed to get AI suggestions:", error);
        addMessage('ai', "抱歉，我现在脑子有点乱，稍后再试试帮你想主意吧！", { data: { isError: true } });
    } finally {
        setIsAiResponding(false);
    }
  }

  const handleSendMessage = async (text: string) => {
    if (!user) {
        toast({ title: "用户未登录", description: "请先登录后再进行对话。", variant: "destructive" });
        return;
    };
    setShowWelcome(false);
    
    addMessage('user', text, { data: {} });
    setIsAiResponding(true);

    try {
        const fullHistory = [...messages, { id: 'temp', role: 'user', content: text, timestamp: new Date().toISOString(), userId: user.uid }];
        let historyForApi = fullHistory
            .filter(m => (m.role === 'user' || m.role === 'ai'))
            .slice(-10); 
        
        let startIndex = 0;
        while(startIndex < historyForApi.length && historyForApi[startIndex].role !== 'user') {
            startIndex++;
        }
        historyForApi = historyForApi.slice(startIndex);


        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                prompt: text,
                history: historyForApi.map(m => ({ role: m.role === 'ai' ? 'model' : m.role, content: m.contentForDb || (typeof m.content === 'string' ? m.content : '[UI Component]') })),
            })
        });

        if (!response.ok) {
            const errorBody = await response.json();
            throw new Error(`Server returned: ${response.status}: ${errorBody.error?.message || 'Unknown error'}`);
        }

        const aiResult = await response.json();

        if (aiResult.error) {
            throw new Error(aiResult.error.message || 'An unknown error occurred in the API.');
        }

        if (aiResult.responseType === 'tool_use' && aiResult.tool) {
            const { content, contentForDb, skipMessage } = await processToolResponse(aiResult.tool);
            if (!skipMessage) {
                addMessage('ai', content, { data: { toolName: aiResult.tool.name }, contentForDb });
            }
        } else if (aiResult.responseType === 'text' && aiResult.text) {
             addMessage('ai', aiResult.text, { data: {} });
        } else {
            addMessage('ai', "抱歉，我好像走神了，你能再说一遍吗？", { data: { isError: true } });
        }

    } catch (error: any) {
        console.error('Failed to get AI response:', error);
        const errorMessage = `出现网络错误，请稍后再试。(${error.message})`
        addMessage('ai', errorMessage, { data: { isError: true } });
    } finally {
        setIsAiResponding(false);
    }
  };
  
    const handleClearHistory = async () => {
        if (!user) return;
        try {
            const result = await clearChatHistoryAction(user.uid);
            if (result.success) {
                setMessages([]);
                setShowWelcome(true);
                toast({
                    title: "对话已清空",
                    description: "已经开启一段全新的对话。",
                });
            } else {
                throw new Error("Failed to clear history on the server.");
            }
        } catch (error) {
            console.error("Failed to clear chat history:", error);
            toast({
                title: "操作失败",
                description: "清空对话时发生错误，请稍后重试。",
                variant: "destructive"
            });
        }
    };


  return (
    <div className="relative flex flex-col w-full max-w-2xl h-full sm:h-[95vh] sm:my-4 bg-card sm:rounded-2xl shadow-2xl shadow-primary/10 border-border/20">
      <header className="flex items-center justify-between p-4 border-b">
        <div className="w-8"></div>
        <div className="flex-grow flex justify-center items-center h-8">
            <Image src="/images/logo/logo-no-bg.svg" alt="Echoes Logo" width={32} height={32} className="object-contain" data-ai-hint="logo abstract" />
        </div>
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreVertical className="h-5 w-5" />
                    <span className="sr-only">菜单</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                    <Link href="/community" className="flex items-center">
                        <Share2 className="mr-2 h-4 w-4" />
                        <span>社群广场</span>
                    </Link>
                </DropdownMenuItem>
                 <DropdownMenuItem asChild>
                    <Link href="/activity" className="flex items-center">
                        <ActivityIcon className="mr-2 h-4 w-4" />
                        <span>活动大厅</span>
                    </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                    <Link href="/profile" className="flex items-center">
                        <User className="mr-2 h-4 w-4" />
                        <span>个人中心</span>
                    </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleClearHistory} className="text-destructive">
                   <Trash2 className="mr-2 h-4 w-4" />
                   <span>清空对话</span>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
      </header>

      <ShareDialog
        open={isShareDialogOpen}
        onOpenChange={setIsShareDialogOpen}
        onCheckIn={handleCheckIn}
        isSubmitting={isAiResponding}
        userActivities={userActivities}
      />

      <ScrollArea className="flex-grow p-4" ref={scrollAreaRef}>
        <div className="space-y-6">
          {showWelcome && !isChatLoading && <WelcomeBanner onHide={() => setShowWelcome(false)} />}
          {messages.map(msg => (
            <ChatMessage key={msg.id} message={msg} />
          ))}
           {isAiResponding && (
             <ChatMessage key="loading" message={{ id: 'loading', role: 'ai', content: '', timestamp: new Date().toISOString(), userId: user?.uid || '' }} isLoading />
          )}
          {isChatLoading && messages.length === 0 && (
             <ChatMessage key="loading" message={{ id: 'loading', role: 'ai', content: '', timestamp: new Date().toISOString(), userId: user?.uid || ''}} isLoading />
          )}
        </div>
      </ScrollArea>
      
      <ChatInput 
        onSendMessage={handleSendMessage} 
        onGetSuggestions={handleGetSuggestions} 
        isLoading={isAiResponding || isAuthLoading} 
        suggestionForInput={suggestionForInput.split('##')[0]}
      />
    </div>
  );
}
