'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/contexts/auth-context';
// Correctly import addCheckInAction and other actions
import {
    getActivityByIdAction,
    getCheckInsForActivityAction,
    likeCheckInAction,
    unlikeCheckInAction,
    createReportAction,
    addCommentAction,
    getCommentsAction,
    generateAiCommentAction,
    addCheckInAction, // Corrected import
    joinActivityAction,
    leaveActivityAction
} from '@/app/actions';
import type { AppCheckIn, AppUser, Activity, CommentWithAuthor } from '@/lib/types';
import type { User } from '@/lib/firebase/auth';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Users, Tag, Heart, MessageSquare, BotMessageSquare, Loader2, Send, MoreVertical, Flag, Activity as ActivityIcon, Edit, Lock, LogOut } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Textarea } from '@/components/ui/textarea';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ShareDialog } from '@/components/echoes/share-dialog';

const AI_USER_ID = "echo-ai-assistant";

// Changed currentUser type to User to match useAuth()
function CommentSection({ checkInId, currentUser }: { checkInId: string, currentUser: User | null }) {
    const [comments, setComments] = React.useState<CommentWithAuthor[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);
    const [newComment, setNewComment] = React.useState('');
    const [isPosting, setIsPosting] = React.useState(false);
    const [isInvokingAI, setIsInvokingAI] = React.useState(false);
    const { toast } = useToast();

    React.useEffect(() => {
        getCommentsAction(checkInId).then(fetchedComments => {
            setComments(fetchedComments);
            setIsLoading(false);
        });
    }, [checkInId]);

    const handlePostComment = async () => {
        if (!currentUser || !newComment.trim()) return;
        setIsPosting(true);
        try {
            const result = await addCommentAction(checkInId, currentUser.uid, newComment.trim());
            if (result.success && result.newComment) {
                setComments(prev => [result.newComment!, ...prev]);
                setNewComment('');
            } else {
                throw new Error("Failed to post comment.");
            }
        } catch(e) {
             toast({ title: "评论失败", description: "请稍后重试。", variant: "destructive" });
        } finally {
            setIsPosting(false);
        }
    };

    const handleInvokeAI = async () => {
        setIsInvokingAI(true);
        const originalPost = document.getElementById(`post-content-${checkInId}`)?.textContent || '';
        try {
            const aiResponse = await generateAiCommentAction({ checkInContent: originalPost });
            // The mock now returns commentText
            const result = await addCommentAction(checkInId, AI_USER_ID, aiResponse.commentText);
             if (result.success && result.newComment) {
                setComments(prev => [result.newComment!, ...prev]);
            } else {
                throw new Error("Failed to post AI comment.");
            }
        } catch (error) {
            toast({ title: "召唤失败", description: "Echo现在有点忙，请稍后再试。", variant: "destructive" });
        } finally {
            setIsInvokingAI(false);
        }
    }

    return (
        <div className="mt-4 pt-4 border-t border-border/80">
            <div className="flex items-center justify-between mb-3">
                 <h4 className="text-sm font-semibold text-muted-foreground">评论区</h4>
                 <Button variant="ghost" size="sm" onClick={handleInvokeAI} disabled={isInvokingAI}>
                    {isInvokingAI ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <BotMessageSquare className="mr-2 h-4 w-4" />}
                    @Echo
                 </Button>
            </div>
           
            {currentUser && (
                <div className="flex gap-2 mb-4">
                    <Textarea 
                        placeholder="写下你的评论..." 
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        className="bg-background/50 text-sm"
                        rows={1}
                    />
                    <Button onClick={handlePostComment} disabled={isPosting || !newComment.trim()} size="icon">
                        {isPosting ? <Loader2 className="h-4 w-4 animate-spin"/> : <Send className="h-4 w-4" />}
                    </Button>
                </div>
            )}
            
            <div className="space-y-3">
                {isLoading && <Skeleton className="h-10 w-full rounded-md" />}
                {!isLoading && comments.length === 0 && <p className="text-xs text-muted-foreground text-center py-2">还没有评论，来抢个沙发吧！</p>}
                {!isLoading && comments.map(({id, author, content, createdAt}) => (
                    <div key={id} className="flex items-start gap-3 text-sm">
                        <Avatar className="h-8 w-8">
                            <AvatarImage src={author?.photoURL || undefined} alt={author?.displayName || '用户'} />
                            <AvatarFallback>{author?.displayName?.charAt(0) || '?'}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                            <div className="flex items-baseline gap-2">
                                <p className="font-semibold text-foreground">{author?.displayName || '匿名用户'}</p>
                                <p className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(createdAt), { addSuffix: true, locale: zhCN })}</p>
                            </div>
                            <p className="text-foreground/90 whitespace-pre-wrap">{content}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function TopicCheckInCard({ checkIn, author, currentUser }: { checkIn: AppCheckIn, author: AppUser, currentUser: User | null }) {
    const timeAgo = formatDistanceToNow(new Date(checkIn.createdAt), { addSuffix: true, locale: zhCN });
    const [likedBy, setLikedBy] = React.useState(checkIn.likedBy || []);
    const [isLiked, setIsLiked] = React.useState(currentUser ? likedBy.includes(currentUser.uid) : false);
    const [isLiking, setIsLiking] = React.useState(false);
    const [showComments, setShowComments] = React.useState(false);
    const { toast } = useToast();

    React.useEffect(() => {
        setIsLiked(currentUser ? (checkIn.likedBy || []).includes(currentUser.uid) : false);
        setLikedBy(checkIn.likedBy || []);
    }, [currentUser, checkIn.likedBy]);

    const handleToggleLike = async () => {
        if (!currentUser) {
            toast({ title: "请先登录", variant: "destructive" });
            return;
        }
        if (isLiking) return;
        setIsLiking(true);
        const wasLiked = isLiked;
        
        setIsLiked(!wasLiked);
        setLikedBy(prev => wasLiked ? prev.filter(id => id !== currentUser.uid) : [...prev, currentUser.uid!]);

        const action = wasLiked ? unlikeCheckInAction : likeCheckInAction;
        
        try {
            await action(checkIn.id, currentUser.uid);
        } catch (error) {
            toast({ title: "操作失败", variant: "destructive" });
            setIsLiked(wasLiked);
            setLikedBy(prev => wasLiked ? [...prev, currentUser.uid!] : prev.filter(id => id !== currentUser.uid));
        } finally {
            setIsLiking(false);
        }
    };
    
    const handleReport = async () => {
        if (!currentUser) {
            toast({ title: "请先登录", variant: "destructive" });
            return;
        }
        try {
            const result = await createReportAction(checkIn.id, currentUser.uid);
            if (result.success) {
                toast({ title: "举报成功" });
            } else {
                throw new Error(result.message || "Failed to submit report.");
            }
        } catch(e: any) {
            toast({ title: "举报失败", description: e.message, variant: "destructive" });
        }
    }

    return (
        <Card className="w-full max-w-2xl bg-card/80 backdrop-blur-sm border-none shadow-lg rounded-2xl overflow-hidden">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Avatar>
                            <AvatarImage src={author.photoURL || undefined} alt={author.displayName || '用户'} />
                            <AvatarFallback>{author.displayName?.charAt(0) || '匿'}</AvatarFallback>
                        </Avatar>
                        <div>
                            <CardTitle className="text-base font-semibold text-foreground">{author.displayName || '匿名用户'}</CardTitle>
                            <p className="text-xs text-muted-foreground">{timeAgo}</p>
                        </div>
                    </div>
                     <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                                <MoreVertical className="h-4 w-4"/>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onSelect={handleReport}>
                                <Flag className="mr-2 h-4 w-4" />
                                <span>举报</span>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </CardHeader>
            <CardContent>
                <p id={`post-content-${checkIn.id}`} className="mb-4 whitespace-pre-wrap text-foreground/90">{checkIn.content}</p>
                {checkIn.photoUrl && (
                    <div className="relative aspect-video w-full rounded-lg overflow-hidden mb-4 border">
                        <Image src={checkIn.photoUrl} alt="打卡图片" layout="fill" objectFit="cover" data-ai-hint="user content" />
                    </div>
                )}
                 <div className="flex items-center gap-2 text-muted-foreground pt-4 border-t border-border/80">
                    <Button
                        variant="ghost"
                        size="sm"
                        className={cn("flex items-center gap-1.5 text-muted-foreground hover:text-primary", isLiked && "text-primary")}
                        onClick={handleToggleLike}
                        disabled={isLiking || !currentUser}
                    >
                        <Heart className={cn("h-4 w-4", isLiked && "fill-current")} />
                        <span>{likedBy.length}</span>
                    </Button>
                    <Button variant="ghost" size="sm" className="flex items-center gap-1.5 text-muted-foreground hover:text-primary" onClick={() => setShowComments(s => !s)}>
                        <MessageSquare className="h-4 w-4" />
                        <span>{showComments ? '收起评论' : `${checkIn.commentsCount || 0}条评论`}</span>
                    </Button>
                </div>
                {showComments && <CommentSection checkInId={checkIn.id} currentUser={currentUser} />}
            </CardContent>
        </Card>
    );
}

function PageSkeleton() {
    return (
        <main className="p-4 flex flex-col items-center space-y-4">
            <Card className="w-full max-w-4xl bg-card/80 backdrop-blur-sm border-none shadow-lg rounded-2xl overflow-hidden">
                <Skeleton className="h-48 w-full" />
                <CardHeader>
                    <Skeleton className="h-8 w-3/4" />
                    <Skeleton className="h-4 w-1/2 mt-2" />
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full mt-2" />
                    <Skeleton className="h-4 w-2/3 mt-2" />
                </CardContent>
            </Card>
            <div className="w-full max-w-2xl space-y-4 mt-4">
                {[...Array(2)].map((_, i) => (
                    <Card key={i} className="w-full bg-card/80 backdrop-blur-sm border-none shadow-lg rounded-2xl">
                        <CardHeader><Skeleton className="h-10 w-full" /></CardHeader>
                        <CardContent><Skeleton className="h-20 w-full" /></CardContent>
                    </Card>
                ))}
            </div>
        </main>
    );
}

export default function ActivityDetailPage() {
    const { id } = useParams();
    const router = useRouter();
    const { user } = useAuth();
    const { toast } = useToast();

    const [activity, setActivity] = React.useState<(Activity & { author: AppUser }) | null>(null);
    const [checkIns, setCheckIns] = React.useState<{ checkIn: AppCheckIn, author: AppUser }[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);
    const [error, setError] = React.useState<string | null>(null);
    const [isShareDialogOpen, setIsShareDialogOpen] = React.useState(false);
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const [isJoining, setIsJoining] = React.useState(false);
    const [isLeaving, setIsLeaving] = React.useState(false);

    const activityId = Array.isArray(id) ? id[0] : id;

    const loadData = React.useCallback(async () => {
        if (!activityId) return;

        setIsLoading(true);
        try {
            const [activityData, checkInsData] = await Promise.all([
                getActivityByIdAction(activityId),
                getCheckInsForActivityAction(activityId)
            ]);

            if (!activityData) {
                setError('未找到该活动，可能已被删除或不存在。');
                return;
            }

            setActivity(activityData);
            setCheckIns(checkInsData);
        } catch (err) {
            console.error(err);
            setError('加载活动详情失败，请稍后重试。');
        } finally {
            setIsLoading(false);
        }
    }, [activityId]);

    React.useEffect(() => {
        loadData();
    }, [loadData]);

    const handleCheckIn = async (checkInData: any) => {
        if (!user) {
            toast({ title: '请先登录', variant: 'destructive' });
            return;
        };
        if (!activityId) {
            toast({ title: '错误', description: '活动ID丢失，无法发布。', variant: 'destructive' });
            return;
        }
        setIsSubmitting(true);
        
        const checkInToSave = {
            userId: user.uid,
            isPublic: true, // Posts to an activity are public by default
            activityId: activityId,
            activityTitle: activity?.title,
            ...checkInData
        };
        
        try {
          // Use the correct action
          await addCheckInAction(checkInToSave);
          toast({ title: '分享成功！', description: '你的分享已发布到活动话题下。' });
          // Reload check-ins for this activity
          await loadData();
        } catch(error: any) {
           toast({ title: '分享失败', description: error.message || '保存分享时出错了。', variant: 'destructive' });
        } finally {
          setIsSubmitting(false);
          setIsShareDialogOpen(false);
        }
    };
    
    const handleJoinActivity = async () => {
        if (!user || !activityId) {
             toast({ title: '请先登录或指定活动', variant: 'destructive' });
            return;
        }
        setIsJoining(true);
        try {
            const result = await joinActivityAction(activityId, user.uid);
            if (result.success) {
                toast({ title: '加入成功！', description: '欢迎来到这个话题，开始你的分享吧！' });
                // Optimistically update the local state to show the page content
                setActivity(prev => prev ? { ...prev, participants: [...prev.participants, user.uid] } : null);
            } else {
                throw new Error('Failed to join activity on server');
            }
        } catch(e) {
            toast({ title: "加入失败", description: "网络出了一点问题，请稍后再试。", variant: "destructive" });
        } finally {
            setIsJoining(false);
        }
    };
    
    const handleLeaveActivity = async () => {
        if (!user || !activityId) return;
        setIsLeaving(true);
        try {
            const result = await leaveActivityAction(activityId, user.uid);
            if (result.success) {
                toast({ title: '已退出活动', description: '你已成功退出该话题。' });
                // Optimistically update the local state to show the join gate
                setActivity(prev => prev ? { ...prev, participants: prev.participants.filter(pId => pId !== user.uid) } : null);
            } else {
                throw new Error('Failed to leave activity on server');
            }
        } catch (e) {
            toast({ title: "退出失败", description: "网络出了一点问题，请稍后再试。", variant: "destructive" });
        } finally {
            setIsLeaving(false);
        }
    };


    if (isLoading) {
        return (
             <div className="min-h-screen bg-background text-foreground">
                <header className="sticky top-0 z-10 flex items-center p-4 bg-background/80 backdrop-blur-sm border-b">
                    <Button variant="ghost" size="icon" asChild>
                        <Link href="/activity"><ArrowLeft className="h-5 w-5" /></Link>
                    </Button>
                </header>
                <PageSkeleton />
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center">
                 <p className="text-destructive">{error}</p>
                 <Button asChild variant="link"><Link href="/activity">返回活动大厅</Link></Button>
            </div>
        );
    }
    
    if (!activity) return null;

    const hasJoined = user && activity.participants.includes(user.uid);


    // Gate for users who haven't joined
    if (!hasJoined) {
        return (
            <div className="min-h-screen bg-background text-foreground">
                <header className="sticky top-0 z-10 flex items-center justify-between p-4 bg-background/80 backdrop-blur-sm border-b">
                    <Button variant="ghost" size="icon" asChild>
                        <Link href="/activity">
                            <ArrowLeft className="h-5 w-5" />
                            <span className="sr-only">返回活动大厅</span>
                        </Link>
                    </Button>
                     <h1 className="text-xl font-headline text-center text-foreground truncate px-4">{activity.title}</h1>
                     <div className="w-8"></div>
                </header>
                 <main className="p-4 flex flex-col items-center space-y-4">
                     <Card className="w-full max-w-4xl bg-card/80 backdrop-blur-sm border-none shadow-lg rounded-2xl overflow-hidden">
                        <div className="relative w-full h-48">
                             <Image src={activity.coverImageUrl} alt={activity.title} layout="fill" objectFit="cover" data-ai-hint="activity banner" />
                             <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
                        </div>
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4">
                            <div className="bg-background/80 p-6 rounded-2xl shadow-xl max-w-md">
                                <Lock className="mx-auto h-8 w-8 text-primary mb-4" />
                                <h2 className="text-2xl font-headline text-foreground mb-2">加入活动，解锁话题讨论</h2>
                                <p className="text-muted-foreground mb-6">这个话题只对参加的成员开放。点击下方按钮，成为其中一员，查看所有分享并参与讨论吧！</p>
                                <Button size="lg" onClick={handleJoinActivity} disabled={isJoining}>
                                    {isJoining ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
                                    点击加入，解锁完整内容
                                </Button>
                            </div>
                        </div>
                    </Card>
                </main>
            </div>
        )
    }


    return (
        <div className="min-h-screen bg-background text-foreground pb-20">
            {user && (
                 <ShareDialog
                    open={isShareDialogOpen}
                    onOpenChange={setIsShareDialogOpen}
                    onCheckIn={handleCheckIn}
                    isSubmitting={isSubmitting}
                    activity={activity}
                />
            )}

            <header className="sticky top-0 z-10 flex items-center justify-between p-4 bg-background/80 backdrop-blur-sm border-b">
                 <Button variant="ghost" size="icon" asChild>
                    <Link href="/activity">
                        <ArrowLeft className="h-5 w-5" />
                        <span className="sr-only">返回活动大厅</span>
                    </Link>
                </Button>
                <h1 className="text-xl font-headline text-center text-foreground truncate px-4">{activity.title}</h1>
                 <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                            <MoreVertical className="h-4 w-4"/>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onSelect={handleLeaveActivity} className="text-destructive" disabled={isLeaving}>
                            {isLeaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogOut className="mr-2 h-4 w-4" />}
                            <span>退出活动</span>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </header>

            <main className="p-4 flex flex-col items-center space-y-4">
                <Card className="w-full max-w-4xl bg-card/80 backdrop-blur-sm border-none shadow-lg rounded-2xl overflow-hidden">
                    <div className="relative w-full h-48">
                         <Image src={activity.coverImageUrl} alt={activity.title} layout="fill" objectFit="cover" data-ai-hint="activity banner" />
                    </div>
                    <CardHeader>
                        <CardTitle className="text-2xl font-headline">{activity.title}</CardTitle>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground pt-2">
                             <div className="flex items-center gap-1.5">
                                <Tag className="h-4 w-4" />
                                <span>{activity.category}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <Users className="h-4 w-4" />
                                <span>{activity.participants.length} 人参加</span>
                            </div>
                        </div>
                    </CardHeader>
                     <CardContent>
                        <p className="text-foreground/90 whitespace-pre-wrap">{activity.description}</p>
                    </CardContent>
                </Card>

                <div className="w-full max-w-2xl">
                    <h2 className="text-lg font-semibold text-foreground my-4 flex items-center gap-2">
                        <ActivityIcon className="h-5 w-5 text-primary" />
                        话题下的分享
                    </h2>
                     <div className="space-y-4">
                        {checkIns.length > 0 ? (
                            checkIns.map(({ checkIn, author }) => (
                                <TopicCheckInCard key={checkIn.id} checkIn={checkIn} author={author} currentUser={user} />
                            ))
                        ) : (
                            <p className="text-muted-foreground text-center py-8">还没有人在此活动下分享，快来成为第一人吧！</p>
                        )}
                    </div>
                </div>
            </main>
             <div className="fixed bottom-6 right-6 z-20">
                <Button 
                    size="lg" 
                    className="rounded-full shadow-lg h-14 w-14 p-0"
                    onClick={() => user ? setIsShareDialogOpen(true) : toast({title: '请先登录', variant: 'destructive'})}
                >
                    <Edit className="h-6 w-6" />
                </Button>
            </div>
        </div>
    );
}
