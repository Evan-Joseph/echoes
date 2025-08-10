'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import {
  getUserProfileAction,
  getUserCheckInsAction,
  getUserMessagesAction,
  deleteCheckInAction,
  clearChatHistoryAction,
  updateUserProfileAction,
} from '@/app/actions';
import type { AppCheckIn, AppUser, Message } from '@/lib/types';
import { Loader2, ArrowLeft, Trash2, Edit } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { format, formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import Image from 'next/image';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChatMessage } from '@/components/echoes/chat-message';
import { useToast } from '@/hooks/use-toast';
import { EditProfileDialog } from '@/components/echoes/edit-profile-dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

function UserCheckInTimeline({
  checkIns,
  onCheckInDelete,
}: {
  checkIns: AppCheckIn[];
  onCheckInDelete: (id: string) => void;
}) {
  const { toast } = useToast();

  const handleDelete = async (checkInId: string, userId: string) => {
    try {
      await deleteCheckInAction(checkInId, userId);
      onCheckInDelete(checkInId);
      toast({ title: '删除成功', description: '该条打卡记录已被删除。' });
    } catch (error: any) {
      toast({
        title: '删除失败',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>打卡记录</CardTitle>
        <CardDescription>
          该用户的所有打卡记录，共 {checkIns.length} 条。
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[60vh] pr-4">
          <div className="space-y-4">
            {checkIns.map((checkIn) => (
              <div
                key={checkIn.id}
                className="group relative rounded-lg border bg-card/50 p-4"
              >
                <div className="absolute right-2 top-2 opacity-0 transition-opacity group-hover:opacity-100">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="destructive"
                        size="icon"
                        className="h-7 w-7"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>确认删除?</AlertDialogTitle>
                        <AlertDialogDescription>
                          此操作无法撤销，将永久删除这条打卡记录。
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>取消</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() =>
                            handleDelete(checkIn.id, checkIn.userId)
                          }
                        >
                          确认
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
                <p className="mb-2 text-sm text-muted-foreground">
                  {format(new Date(checkIn.createdAt), 'yyyy-MM-dd HH:mm')} (
                  {formatDistanceToNow(new Date(checkIn.createdAt), {
                    addSuffix: true,
                    locale: zhCN,
                  })}
                  )
                </p>
                <p className="mb-2 whitespace-pre-wrap">{checkIn.content}</p>
                {checkIn.photoUrl && (
                  <Image
                    src={checkIn.photoUrl}
                    alt="打卡图片"
                    width={200}
                    height={200}
                    className="mt-2 rounded-md"
                    data-ai-hint="user content"
                  />
                )}
              </div>
            ))}
            {checkIns.length === 0 && (
              <p className="py-8 text-center text-muted-foreground">
                无打卡记录
              </p>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

function UserChatHistory({ messages }: { messages: Message[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>对话历史</CardTitle>
        <CardDescription>该用户与AI的完整对话记录。</CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[60vh] rounded-md border bg-muted/30 p-4">
          <div className="space-y-4">
            {messages.map((message) => (
              <ChatMessage key={message.id} message={message} />
            ))}
            {messages.length === 0 && (
              <p className="py-8 text-center text-muted-foreground">
                无对话记录
              </p>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

export default function UserDetailPage() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const { toast } = useToast();

  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [profile, setProfile] = React.useState<AppUser | null>(null);
  const [checkIns, setCheckIns] = React.useState<AppCheckIn[]>([]);
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false);

  React.useEffect(() => {
    if (isAuthLoading) return;
    if (!user) {
      router.push('/'); // Redirect to home if not logged in
      return;
    }

    async function loadUserData() {
      if (!id) {
        setError('No user ID provided.');
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      setError(null);
      try {
        const [userProfile, userCheckIns, userMessages] = await Promise.all([
          getUserProfileAction(id),
          getUserCheckInsAction(id),
          getUserMessagesAction(id),
        ]);
        setProfile(userProfile);
        setCheckIns(
          userCheckIns.sort(
            (a, b) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          )
        );
        setMessages(userMessages);
      } catch (err: any) {
        setError(err.message || 'Failed to load user data.');
      } finally {
        setIsLoading(false);
      }
    }

    loadUserData();
  }, [user, isAuthLoading, router, id]);

  const handleClearHistory = async () => {
    if (!id) return;
    try {
      await clearChatHistoryAction(id);
      setMessages([]);
      toast({ title: '操作成功', description: '该用户的聊天记录已被清空。' });
    } catch (error: any) {
      toast({
        title: '操作失败',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const onCheckInDelete = (deletedCheckInId: string) => {
    setCheckIns((prev) => prev.filter((c) => c.id !== deletedCheckInId));
  };

  const onProfileUpdate = (updatedProfile: AppUser) => {
    setProfile(updatedProfile);
  };

  if (isAuthLoading || isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen w-full items-center justify-center text-destructive">
        {error}
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex h-screen w-full items-center justify-center text-muted-foreground">
        未找到用户数据。
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {profile && (
        <EditProfileDialog
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          user={{ id: profile.id } as any} // Pass a mock user object with id
          profile={profile}
          onProfileUpdate={onProfileUpdate}
        />
      )}

      <header className="sticky top-0 z-10 flex items-center justify-between border-b bg-background/80 p-4 backdrop-blur-sm">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin">
            <ArrowLeft className="h-5 w-5" />
            <span className="sr-only">返回</span>
          </Link>
        </Button>
        <h1 className="text-center font-headline text-xl text-foreground">
          用户详情
        </h1>
        <div className="w-8"></div>
      </header>

      <main className="container mx-auto max-w-7xl p-4">
        <Card className="mb-4">
          <CardHeader>
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={profile.photoURL} />
                <AvatarFallback>{profile.displayName.charAt(0)}</AvatarFallback>
              </Avatar>
              <div>
                <CardTitle>{profile.displayName}</CardTitle>
                <CardDescription className="font-mono text-xs">
                  {profile.id}
                </CardDescription>
                <p className="mt-1 text-sm text-muted-foreground">
                  加入于{' '}
                  {format(new Date(profile.createdAt), 'PPP', { locale: zhCN })}
                </p>
              </div>
            </div>
          </CardHeader>
          <CardFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditDialogOpen(true)}
            >
              <Edit className="mr-2 h-4 w-4" />
              编辑资料
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  清空聊天记录
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>确认清空聊天记录?</AlertDialogTitle>
                  <AlertDialogDescription>
                    此操作无法撤销，将永久删除该用户的所有对话历史。
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>取消</AlertDialogCancel>
                  <AlertDialogAction onClick={handleClearHistory}>
                    确认
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardFooter>
        </Card>

        <div className="grid gap-4 md:grid-cols-2">
          <UserCheckInTimeline
            checkIns={checkIns}
            onCheckInDelete={onCheckInDelete}
          />
          <UserChatHistory messages={messages} />
        </div>
      </main>
    </div>
  );
}
