'use client';

import * as React from 'react';
import { deleteCheckInAction, getUserCheckInsAction, getUserProfileAction, makeCheckInPrivateAction, makeCheckInPublicAction, updateCheckInAction } from '@/app/actions';
import type { AppCheckIn, AppUser } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { CalendarDays, BarChart3, Star, Edit, MoreVertical, Trash2, Globe, Lock, Activity, Paperclip, X, Loader2 } from 'lucide-react';
import { format, formatDistanceToNow, differenceInCalendarDays, startOfDay, subDays } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import Image from 'next/image';
import { WordCloudCard } from '@/components/echoes/word-cloud';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/auth-context';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";
import { EditProfileDialog } from '@/components/echoes/edit-profile-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useToast } from '@/hooks/use-toast';
import { getUserTitle } from '@/lib/titles';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MonthlyReportCard } from '@/components/echoes/monthly-report-card';

// --- In-place Edit Form ---
function EditCheckInForm({
    checkIn,
    onSave,
    onCancel,
    isSaving,
}: {
    checkIn: AppCheckIn;
    onSave: (data: { content: string; photoDataUri?: string }) => void;
    onCancel: () => void;
    isSaving: boolean;
}) {
    const [content, setContent] = React.useState(checkIn.content);
    const [photoDataUri, setPhotoDataUri] = React.useState<string | undefined>(checkIn.photoUrl);
    const [fileName, setFileName] = React.useState<string | null>(checkIn.photoUrl ? '保留现有图片' : null);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            setFileName(file.name);
            const reader = new FileReader();
            reader.onloadend = () => {
                setPhotoDataUri(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };
    
    const removePhoto = () => {
        setPhotoDataUri(undefined);
        setFileName(null);
        if(fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    }

    const handleSave = () => {
        onSave({ content, photoDataUri });
    };

    return (
        <div className="space-y-4">
            <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="min-h-[100px] bg-background text-base"
                placeholder="分享你的想法、感悟或成就..."
            />
            {photoDataUri && (
                <div className="relative w-32 h-32 rounded-md overflow-hidden border group">
                     <Image src={photoDataUri} alt="当前图片" fill className="object-cover" data-ai-hint="user content" />
                     <Button
                        variant="destructive"
                        size="icon"
                        className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={removePhoto}
                     >
                        <X className="h-4 w-4" />
                     </Button>
                </div>
            )}
            <div className="flex justify-between items-center">
                 <div className="flex items-center gap-2">
                    <Button type="button" variant="ghost" size="icon" asChild disabled={isSaving}>
                        <Label htmlFor={`photo-upload-${checkIn.id}`} className="cursor-pointer text-muted-foreground hover:text-primary">
                            <Paperclip className="h-5 w-5" />
                            <Input id={`photo-upload-${checkIn.id}`} type="file" accept="image/*" className="sr-only" onChange={handleFileChange} ref={fileInputRef}/>
                        </Label>
                    </Button>
                    {fileName && <span className="text-xs text-muted-foreground truncate max-w-[100px]">{fileName}</span>}
                </div>
                <div className="flex gap-2">
                    <Button variant="ghost" onClick={onCancel} disabled={isSaving}>取消</Button>
                    <Button onClick={handleSave} disabled={isSaving}>
                        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        保存修改
                    </Button>
                </div>
            </div>
        </div>
    );
}


// --- Helper function to calculate streak ---
function calculateStreak(checkIns: AppCheckIn[]): number {
    if (checkIns.length === 0) {
        return 0;
    }

    // Sort check-ins by date descending
    const sortedCheckIns = [...checkIns].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Get unique check-in dates (day-level precision)
    const uniqueDates = Array.from(new Set(sortedCheckIns.map(c => startOfDay(new Date(c.createdAt)).getTime())));

    let streak = 0;
    const today = startOfDay(new Date());
    const firstCheckInDate = new Date(uniqueDates[0]);

    // Check if the latest check-in is today or yesterday
    if (differenceInCalendarDays(today, firstCheckInDate) > 1) {
        return 0; // Streak is broken
    }
    
    streak = 1;

    for (let i = 1; i < uniqueDates.length; i++) {
        const currentDate = new Date(uniqueDates[i - 1]);
        const previousDate = new Date(uniqueDates[i]);
        if (differenceInCalendarDays(currentDate, previousDate) === 1) {
            streak++;
        } else {
            break; // Streak is broken
        }
    }

    return streak;
}


function ProfileCheckInCard({ 
    checkIn: initialCheckIn, 
    onDelete,
    onVisibilityChange,
    onUpdate,
}: { 
    checkIn: AppCheckIn, 
    onDelete: (checkInId: string) => void; 
    onVisibilityChange: (checkInId: string, newVisibility: boolean) => void;
    onUpdate: (checkInId: string, data: { content: string; photoDataUri?: string; }) => Promise<void>;
}) {
    const [checkIn, setCheckIn] = React.useState(initialCheckIn);
    const [isEditing, setIsEditing] = React.useState(false);
    const [isSaving, setIsSaving] = React.useState(false);
    const timeAgo = formatDistanceToNow(new Date(checkIn.createdAt), { addSuffix: true, locale: zhCN });
    const [isConfirmingDelete, setIsConfirmingDelete] = React.useState(false);
    const { toast } = useToast();

    React.useEffect(() => {
        setCheckIn(initialCheckIn);
    }, [initialCheckIn]);

    const handleDeleteSelect = (event: Event) => {
        if (isConfirmingDelete) {
            onDelete(checkIn.id);
        } else {
            event.preventDefault(); 
            setIsConfirmingDelete(true);
        }
    };
    
    // Reset confirmation state when dropdown is closed
    const handleOpenChange = (open: boolean) => {
        if (!open) {
            setIsConfirmingDelete(false);
        }
    };
    
    const handleToggleVisibility = async () => {
        const newVisibility = !checkIn.isPublic;
        // Optimistic update
        setCheckIn(prev => ({...prev, isPublic: newVisibility}));
        try {
            await onVisibilityChange(checkIn.id, newVisibility);
        } catch (error) {
            // Revert on failure
             setCheckIn(prev => ({...prev, isPublic: !newVisibility}));
             toast({
                title: '更新失败',
                description: `无法将记录设为${newVisibility ? '公开' : '私密'}，请稍后重试。`,
                variant: 'destructive',
            });
        }
    };

    const handleSave = async (data: { content: string; photoDataUri?: string }) => {
        setIsSaving(true);
        try {
            await onUpdate(checkIn.id, data);
            setIsEditing(false); // Exit editing mode on success
        } finally {
            setIsSaving(false);
        }
    };


    return (
        <Card className="w-full bg-card/80 backdrop-blur-sm border-none shadow-lg rounded-2xl">
            <CardHeader className="flex flex-row justify-between items-start">
                <div>
                    <CardTitle className="text-sm font-normal text-muted-foreground">
                        打卡于 {timeAgo}
                        {checkIn.updatedAt && !isEditing && <span className="text-xs text-muted-foreground/80"> (已编辑)</span>}
                    </CardTitle>
                </div>
                 <div className="flex items-center gap-2">
                    {checkIn.isPublic ? (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground"><Globe className="h-3 w-3" /> 公开</div>
                    ) : (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground"><Lock className="h-3 w-3" /> 私密</div>
                    )}
                    {!isEditing && (
                        <DropdownMenu onOpenChange={handleOpenChange}>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-6 w-6">
                                    <MoreVertical className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onSelect={() => setIsEditing(true)}>
                                    <Edit className="mr-2 h-4 w-4" />
                                    <span>编辑</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem onSelect={handleToggleVisibility}>
                                    {checkIn.isPublic ? (
                                        <>
                                            <Lock className="mr-2 h-4 w-4" />
                                            <span>设为私密</span>
                                        </>
                                    ) : (
                                        <>
                                            <Globe className="mr-2 h-4 w-4" />
                                            <span>设为公开</span>
                                        </>
                                    )}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                    onSelect={handleDeleteSelect} 
                                    className={cn(
                                        "text-destructive focus:text-destructive focus:bg-destructive/10",
                                        isConfirmingDelete && "bg-destructive/90 text-destructive-foreground focus:bg-destructive focus:text-destructive-foreground"
                                    )}
                                >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    <span>{isConfirmingDelete ? "确认删除" : "删除"}</span>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}
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

                {isEditing ? (
                    <EditCheckInForm 
                        checkIn={checkIn}
                        onSave={handleSave}
                        onCancel={() => setIsEditing(false)}
                        isSaving={isSaving}
                    />
                ) : (
                    <>
                        <p className="mb-4 whitespace-pre-wrap">{checkIn.content}</p>
                        {checkIn.photoUrl && (
                            <div className="relative aspect-video w-full rounded-lg overflow-hidden mb-4">
                                <Image src={checkIn.photoUrl} alt="打卡图片" layout="fill" objectFit="cover" data-ai-hint="user content" />
                            </div>
                        )}
                    </>
                )}
            </CardContent>
        </Card>
    );
}

// --- Stats Chart Component ---
function calculateWeeklyStats(checkIns: AppCheckIn[]) {
    const stats: { name: string, total: number }[] = [];
    const today = startOfDay(new Date());

    for (let i = 6; i >= 0; i--) {
        const date = subDays(today, i);
        const checkInsOnDate = checkIns.filter(c => 
            startOfDay(new Date(c.createdAt)).getTime() === date.getTime()
        );
        stats.push({
            name: format(date, 'M/d'),
            total: checkInsOnDate.length,
        });
    }
    return stats;
}


function StatsChart({ checkIns }: { checkIns: AppCheckIn[] }) {
  const data = calculateWeeklyStats(checkIns);

  return (
    <div className="h-40 w-full mt-4">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
          <XAxis
            dataKey="name"
            stroke="hsl(var(--muted-foreground))"
            fontSize={12}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            stroke="hsl(var(--muted-foreground))"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => `${value}`}
            allowDecimals={false}
          />
           <Tooltip
                cursor={{ fill: 'hsl(var(--accent))', radius: 4 }}
                contentStyle={{
                    backgroundColor: 'hsl(var(--background))',
                    borderColor: 'hsl(var(--border))',
                    borderRadius: 'var(--radius)',
                    fontSize: '12px'
                }}
            />
          <Bar 
            dataKey="total" 
            fill="hsl(var(--primary))" 
            radius={[4, 4, 0, 0]} 
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}


function ProfileSkeleton() {
    return (
        <div className="w-full max-w-2xl space-y-4">
            {/* Header Skeleton */}
            <Card className="w-full max-w-2xl bg-card/80 backdrop-blur-sm border-none shadow-lg rounded-2xl">
                 <CardHeader className="items-center text-center">
                    <Skeleton className="h-24 w-24 rounded-full" />
                    <Skeleton className="h-6 w-32 mt-4" />
                    <Skeleton className="h-4 w-48 mt-2" />
                 </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="text-center">
                            <Skeleton className="h-6 w-12 mx-auto" />
                            <Skeleton className="h-4 w-20 mt-1 mx-auto" />
                        </div>
                         <div className="text-center">
                            <Skeleton className="h-6 w-12 mx-auto" />
                            <Skeleton className="h-4 w-20 mt-1 mx-auto" />
                        </div>
                    </div>
                    <Skeleton className="h-40 w-full mt-4" />
                </CardContent>
            </Card>
            {/* Word Cloud Skeleton */}
            <Card className="w-full max-w-2xl bg-card/80 backdrop-blur-sm border-none shadow-lg rounded-2xl">
                <CardHeader>
                    <Skeleton className="h-5 w-40" />
                </CardHeader>
                <CardContent className="h-48 flex items-center justify-center">
                    <Skeleton className="h-24 w-full" />
                </CardContent>
            </Card>

             {/* Check-in Card Skeletons */}
            {[...Array(2)].map((_, i) => (
                <Card key={i} className="w-full bg-card/80 backdrop-blur-sm border-none shadow-lg rounded-2xl">
                    <CardHeader>
                        <Skeleton className="h-4 w-32" />
                    </CardHeader>
                    <CardContent>
                        <Skeleton className="h-4 w-full mb-2" />
                        <Skeleton className="h-4 w-4/5" />
                    </CardContent>
                </Card>
            ))}
        </div>
    )
}

function AchievementCard({ title, description, isUnlocked }: { title: string; description: string; isUnlocked: boolean }) {
    return (
        <Card className={cn(
            "w-full bg-card/60 backdrop-blur-sm border-dashed transition-all",
            isUnlocked ? 'bg-accent/30 border-accent' : 'border-border/50'
        )}>
            <CardContent className="p-4 flex items-center gap-4">
                <div className={cn("p-3 rounded-full", isUnlocked ? "bg-accent" : "bg-muted")}>
                    <Star className={cn("h-6 w-6", isUnlocked ? "text-accent-foreground fill-current" : "text-muted-foreground")} />
                </div>
                <div>
                    <h3 className={cn("font-semibold", isUnlocked ? "text-foreground" : "text-muted-foreground")}>{title}</h3>
                    <p className="text-sm text-muted-foreground">{description}</p>
                </div>
            </CardContent>
        </Card>
    );
}

export default function ProfilePage() {
    const { user, isLoading: isAuthLoading } = useAuth();
    const [checkIns, setCheckIns] = React.useState<AppCheckIn[]>([]);
    const [userProfile, setUserProfile] = React.useState<AppUser | null>(null);
    const [userTitle, setUserTitle] = React.useState<string>('新手');
    const [streak, setStreak] = React.useState(0);
    const [isLoading, setIsLoading] = React.useState(true);
    const [error, setError] = React.useState<string | null>(null);
    const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false);
    const { toast } = useToast();

    const loadAllData = React.useCallback(async () => {
        if (isAuthLoading || !user) {
            if (!isAuthLoading && !user) {
                setError("请先登录以查看个人资料。");
                setIsLoading(false);
            }
            return;
        };

        try {
            setIsLoading(true);
            const [userCheckIns, profile] = await Promise.all([
                getUserCheckInsAction(user.uid),
                getUserProfileAction(user.uid),
            ]);
            
            const sortedCheckIns = userCheckIns.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

            setCheckIns(sortedCheckIns);
            setUserProfile(profile);
            setUserTitle(getUserTitle(profile, sortedCheckIns));
            setStreak(calculateStreak(sortedCheckIns));
            setError(null);
        } catch (err) {
             const errorMessage = err instanceof Error ? err.message : "无法加载你的记录，请稍后再试。";
            setError(errorMessage);
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    }, [user, isAuthLoading]);

    React.useEffect(() => {
        loadAllData();
    }, [loadAllData]);
    
    const handleProfileUpdate = (updatedProfile: AppUser) => {
        setUserProfile(updatedProfile);
        setUserTitle(getUserTitle(updatedProfile, checkIns));
    };

    const handleUpdateCheckIn = async (checkInId: string, data: { content: string; photoDataUri?: string }) => {
        if (!user) return;

        try {
            const result = await updateCheckInAction(checkInId, user.uid, data);
            if (result.success) {
                toast({ title: '更新成功', description: '你的分享已更新。' });
                // Optimistically update the local state before full reload
                const updatedCheckIns = checkIns.map(c => {
                    if (c.id === checkInId) {
                        return { 
                            ...c,
                            content: data.content, 
                            photoUrl: data.photoDataUri, // This might be a data URI temporarily
                            updatedAt: new Date().toISOString()
                        };
                    }
                    return c;
                });
                setCheckIns(updatedCheckIns as AppCheckIn[]);
                await loadAllData(); // Reload all data to get fresh URL and timestamp
            } else {
                throw new Error('Failed to update on server');
            }
        } catch (error) {
            toast({ title: '更新失败', description: '保存更新时出错了。', variant: 'destructive' });
            throw error; // Re-throw to inform the caller of failure
        }
    };

    const handleDeleteCheckIn = async (checkInId: string) => {
        if (!user) return;
        
        const originalCheckIns = [...checkIns];
        const newCheckIns = originalCheckIns.filter(c => c.id !== checkInId);
        setCheckIns(newCheckIns);
        setUserTitle(getUserTitle(userProfile!, newCheckIns));


        try {
            const result = await deleteCheckInAction(checkInId, user.uid);
            if (!result.success) {
                throw new Error("Failed to delete on server.");
            }
             toast({
                title: "删除成功",
                description: "你的打卡记录已成功删除。",
            });
        } catch (error) {
            // Revert on failure
            setCheckIns(originalCheckIns);
            setUserTitle(getUserTitle(userProfile!, originalCheckIns));
            toast({
                title: "删除失败",
                description: "无法删除该条记录，请稍后重试。",
                variant: "destructive",
            });
        }
    };
    
    const handleVisibilityChange = async (checkInId: string, newVisibility: boolean) => {
        const originalCheckIns = [...checkIns];
        
        const newCheckIns = originalCheckIns.map(c => c.id === checkInId ? { ...c, isPublic: newVisibility } : c);
        setCheckIns(newCheckIns);
        setUserTitle(getUserTitle(userProfile!, newCheckIns));

        const action = newVisibility ? makeCheckInPublicAction : makeCheckInPrivateAction;
        const actionName = newVisibility ? '公开' : '私密';

        try {
            const result = await action(checkInId);
            if (!result.success) {
                throw new Error(`Failed to set to ${actionName} on server.`);
            }
            toast({
                title: '更新成功',
                description: `记录已成功设为${actionName}。`,
            });
        } catch (error) {
            // Revert on failure
            setCheckIns(originalCheckIns);
            setUserTitle(getUserTitle(userProfile!, originalCheckIns));
            throw error;
        }
    };

    const getJoinDate = () => {
        if (userProfile?.createdAt) {
            const date = new Date(userProfile.createdAt);
            return `${date.getFullYear()}年${date.getMonth() + 1}月`;
        }
        return "2024年5月";
    }

    return (
        <div className="min-h-screen bg-background text-foreground">
             <header className="sticky top-0 z-10 flex items-center justify-between p-4 bg-background/80 backdrop-blur-sm border-b">
                <Button variant="ghost" size="icon" asChild>
                    <Link href="/">
                        <ArrowLeft className="h-5 w-5" />
                        <span className="sr-only">返回</span>
                    </Link>
                </Button>
                <h1 className="text-xl font-headline text-center text-foreground">个人中心</h1>
                <div className="w-8"></div>
            </header>
            <main className="p-4 flex flex-col items-center space-y-4">
                {isLoading || isAuthLoading ? (
                    <ProfileSkeleton />
                ) : error ? (
                    <p className="text-destructive">{error}</p>
                ) : !user || !userProfile ? (
                    <p className="text-muted-foreground">无法加载个人信息，请先登录。</p>
                ) : (
                    <>
                        {user && userProfile && (
                            <EditProfileDialog
                                open={isEditDialogOpen}
                                onOpenChange={setIsEditDialogOpen}
                                user={user}
                                profile={userProfile}
                                onProfileUpdate={handleProfileUpdate}
                            />
                        )}

                        <Card className="w-full max-w-2xl bg-card/80 backdrop-blur-sm border-none shadow-lg rounded-2xl">
                            <CardHeader className="items-center text-center">
                                <div className="relative group">
                                    <Avatar className="h-24 w-24 border-2 border-transparent group-hover:border-primary transition-all">
                                        <AvatarImage src={userProfile.photoURL || undefined} alt={userProfile.displayName || '用户'} />
                                        <AvatarFallback>{userProfile.displayName?.charAt(0) || '旅'}</AvatarFallback>
                                    </Avatar>
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        className="absolute bottom-0 right-0 h-8 w-8 rounded-full bg-background/80"
                                        onClick={() => setIsEditDialogOpen(true)}
                                    >
                                        <Edit className="h-4 w-4" />
                                    </Button>
                                </div>
                                <div className="flex items-center gap-2">
                                    <CardTitle className="mt-4 text-2xl">{userProfile.displayName || '匿名用户'}</CardTitle>
                                    <Button variant="ghost" size="icon" className="mt-4 h-6 w-6" onClick={() => setIsEditDialogOpen(true)}>
                                        <Edit className="h-4 w-4" />
                                    </Button>
                                </div>
                                 <CardDescription>
                                   <span className="font-semibold text-primary">{userTitle}</span> | 始于 {getJoinDate()} 的成长之旅
                                 </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-2 gap-4 border-b pb-4">
                                    <div className="text-center">
                                        <p className="text-2xl font-bold">{checkIns.length}</p>
                                        <p className="text-sm text-muted-foreground flex items-center justify-center gap-1"><CalendarDays className="h-4 w-4" />总打卡</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-2xl font-bold">{streak}</p>
                                        <p className="text-sm text-muted-foreground flex items-center justify-center gap-1"><BarChart3 className="h-4 w-4" />连续打卡</p>
                                    </div>
                                </div>
                                <StatsChart checkIns={checkIns} />
                            </CardContent>
                        </Card>
                        
                        {checkIns.length > 0 && (
                           <>
                                <MonthlyReportCard checkIns={checkIns} />
                                <WordCloudCard checkIns={checkIns} />
                           </>
                        )}

                        <h2 className="w-full max-w-2xl text-lg font-semibold pt-6">我的成就</h2>
                        <div className="w-full max-w-2xl space-y-2">
                            <AchievementCard
                                title="初窥门径"
                                description="完成连续7天打卡"
                                isUnlocked={streak >= 7}
                            />
                             <AchievementCard
                                title="笔耕不辍"
                                description="累计完成10次打卡"
                                isUnlocked={checkIns.length >= 10}
                            />
                             <AchievementCard
                                title="分享家"
                                description="发布第一条公开分享"
                                isUnlocked={checkIns.some(c => c.isPublic)}
                            />
                        </div>


                        <h2 className="w-full max-w-2xl text-lg font-semibold pt-6">我的足迹</h2>

                        {checkIns.length > 0 ? (
                            checkIns.map((checkIn) => (
                                <ProfileCheckInCard 
                                    key={checkIn.id} 
                                    checkIn={checkIn} 
                                    onDelete={handleDeleteCheckIn}
                                    onVisibilityChange={handleVisibilityChange}
                                    onUpdate={handleUpdateCheckIn}
                                />
                            ))
                        ) : (
                            <p className="text-muted-foreground">你还没有任何打卡记录哦。</p>
                        )}
                    </>
                 )}
            </main>
        </div>
    );
}

    
