
'use client';

import * as React from 'react';
import { getPublicCheckInsAction, likeCheckInAction, unlikeCheckInAction, generateAiCommentAction, addCommentAction, getCommentsAction, createReportAction } from '@/app/actions';
import type { AppCheckIn, AppUser, CommentWithAuthor } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Heart, MessageSquare, ArrowLeft, BotMessageSquare, Loader2, Send, MoreVertical, Flag, Activity } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import Image from 'next/image';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/auth-context';
import { Textarea } from '@/components/ui/textarea';
import { getUserTitle } from '@/lib/titles';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const AI_USER_ID = "echo-ai-assistant";

interface PublicCheckInCardProps {
    checkIn: AppCheckIn;
    author: AppUser;
    authorCheckIns: AppCheckIn[];
    currentUser: AppUser | null;
}

function CommentSection({ checkInId, currentUser }: { checkInId: string, currentUser: AppUser | null }) {
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
                            <AvatarImage src={author?.photoURL} alt={author?.displayName} />
                            <AvatarFallback>{author?.displayName?.charAt(0) || '?'}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                            <div className="flex items-baseline gap-2">
                                <p className="font-semibold text-foreground">{author?.displayName}</p>
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


function PublicCheckInCard({ checkIn, author, authorCheckIns, currentUser }: PublicCheckInCardProps) {
    const timeAgo = formatDistanceToNow(new Date(checkIn.createdAt), { addSuffix: true, locale: zhCN });
    
    const [likedBy, setLikedBy] = React.useState(checkIn.likedBy || []);
    const [isLiked, setIsLiked] = React.useState(currentUser ? likedBy.includes(currentUser.uid) : false);
    const [isLiking, setIsLiking] = React.useState(false);
    const [showComments, setShowComments] = React.useState(false);
    const authorTitle = getUserTitle(author, authorCheckIns);
    
    const { toast } = useToast();

    React.useEffect(() => {
        setIsLiked(currentUser ? (checkIn.likedBy || []).includes(currentUser.uid) : false);
        setLikedBy(checkIn.likedBy || []);
    }, [currentUser, checkIn.likedBy]);

    const handleToggleLike = async () => {
        if (!currentUser) {
            toast({ title: "请先登录", description: "登录后才能点赞哦。", variant: "destructive" });
            return;
        }
        if (isLiking) return;

        setIsLiking(true);
        const wasLiked = isLiked;
        
        // Optimistic update
        setIsLiked(!wasLiked);
        setLikedBy(prev => wasLiked ? prev.filter(id => id !== currentUser.uid) : [...prev, currentUser.uid!]);

        const action = wasLiked ? unlikeCheckInAction : likeCheckInAction;
        
        try {
            const result = await action(checkIn.id, currentUser.uid);
            if (!result.success) throw new Error("Failed to update like status.");
        } catch (error) {
            toast({ title: "操作失败", description: "网络开小差了，请稍后再试。", variant: "destructive" });
            // Revert on failure
            setIsLiked(wasLiked);
            setLikedBy(prev => wasLiked ? [...prev, currentUser.uid!] : prev.filter(id => id !== currentUser.uid));
        } finally {
            setIsLiking(false);
        }
    };
    
    const handleReport = async () => {
        if (!currentUser) {
            toast({ title: "请先登录", description: "登录后才能举报哦。", variant: "destructive" });
            return;
        }
        try {
            const result = await createReportAction(checkIn.id, currentUser.uid);
            if (result.success) {
                toast({ title: "举报成功", description: "感谢你的反馈，我们将会尽快处理。" });
            } else {
                throw new Error(result.message || "Failed to submit report.");
            }
        } catch(e: any) {
            toast({ title: "举报失败", description: e.message || "操作失败，请稍后重试。", variant: "destructive" });
        }
    }

    const likeCount = likedBy.length;

    return (
        <Card className="w-full max-w-2xl bg-card/80 backdrop-blur-sm border-none shadow-lg rounded-2xl overflow-hidden">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Avatar>
                            <AvatarImage src={author.photoURL} alt={author.displayName} />
                            <AvatarFallback>{author.displayName.charAt(0) || '匿'}</AvatarFallback>
                        </Avatar>
                        <div>
                            <div className="flex items-center gap-2">
                            <CardTitle className="text-base font-semibold text-foreground">{author.displayName}</CardTitle>
                            <Badge variant="secondary" className="font-normal text-xs">{authorTitle}</Badge>
                            </div>
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
                {checkIn.activityId && checkIn.activityTitle && (
                    <div className="mb-3">
                       <Link href={`/activity/${checkIn.activityId}`}>
                            <Badge variant="outline" className="font-normal text-xs bg-accent/30 border-accent/50 hover:bg-accent/50 cursor-pointer">
                                <Activity className="mr-1.5 h-3 w-3" />
                                来自活动：{checkIn.activityTitle}
                            </Badge>
                        </Link>
                    </div>
                )}
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
                        <span>{likeCount}</span>
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

function CommunitySkeleton() {
    return (
        <div className="w-full max-w-2xl space-y-4">
            {[...Array(3)].map((_, i) => (
                <Card key={i} className="w-full max-w-2xl bg-card/80 backdrop-blur-sm border-none shadow-lg rounded-2xl">
                    <CardHeader>
                        <div className="flex items-center gap-3">
                            <Skeleton className="h-10 w-10 rounded-full" />
                            <div className="space-y-2">
                                <Skeleton className="h-4 w-24" />
                                <Skeleton className="h-3 w-16" />
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2 mb-4">
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-4/5" />
                        </div>
                        <div className="flex items-center gap-4 pt-4 border-t">
                             <Skeleton className="h-8 w-16" />
                             <Skeleton className="h-8 w-24" />
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    )
}

export default function CommunityPage() {
    const [posts, setPosts] = React.useState<{ checkIn: AppCheckIn, author: AppUser, authorCheckIns: AppCheckIn[] }[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);
    const [error, setError] = React.useState<string | null>(null);
    const { user } = useAuth();
    const [currentUserProfile, setCurrentUserProfile] = React.useState<AppUser | null>(null);

    React.useEffect(() => {
        async function loadData() {
            try {
                setIsLoading(true);
                const publicPosts = await getPublicCheckInsAction();
                setPosts(publicPosts);
                if (user) {
                    setCurrentUserProfile({
                        uid: user.uid,
                        displayName: user.displayName || '匿名用户',
                        photoURL: user.photoURL || 'https://placehold.co/100x100.png'
                    } as AppUser);
                }
                setError(null);
            } catch (err) {
                setError("无法加载社群动态，请稍后再试。");
                console.error(err);
            } finally {
                setIsLoading(false);
            }
        }
        loadData();
    }, [user]);

    return (
        <div className="min-h-screen bg-background text-foreground">
            <header className="sticky top-0 z-10 flex items-center justify-between p-4 bg-background/80 backdrop-blur-sm border-b">
                 <Button variant="ghost" size="icon" asChild>
                    <Link href="/">
                        <ArrowLeft className="h-5 w-5" />
                        <span className="sr-only">返回</span>
                    </Link>
                </Button>
                <h1 className="text-xl font-headline text-center text-foreground">社群广场</h1>
                <div className="w-8"></div>
            </header>
            <main className="p-4 flex flex-col items-center space-y-4">
                {isLoading && <CommunitySkeleton />}
                {!isLoading && error && <p className="text-destructive">{error}</p>}
                {!isLoading && !error && posts.length === 0 && <p className="text-muted-foreground mt-8">这里还很安静，快去发布一个公开打卡吧！</p>}
                {!isLoading && !error && posts.map(({ checkIn, author, authorCheckIns }) => (
                    <PublicCheckInCard key={checkIn.id} checkIn={checkIn} author={author} authorCheckIns={authorCheckIns} currentUser={currentUserProfile} />
                ))}
            </main>
        </div>
    );
}
