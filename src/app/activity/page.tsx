
'use client';

import * as React from 'react';
import { getActivitiesAction, joinActivityAction } from '@/app/actions';
import type { Activity, AppCheckIn } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft, PlusCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ActivityCard } from '@/components/echoes/activity-card';
import { useAuth } from '@/contexts/auth-context';
import { CreateActivityDialog } from '@/components/echoes/create-activity-dialog';

type ActivityWithCheckIns = Activity & { checkInsCount: number };

function ActivitySkeleton() {
    return (
        <div className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
                <div key={i} className="w-full bg-card/80 backdrop-blur-sm border-none shadow-lg rounded-2xl flex flex-col p-4 space-y-3">
                    <Skeleton className="h-32 w-full rounded-lg" />
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-9 w-full mt-2" />
                </div>
            ))}
        </div>
    )
}


export default function ActivityPage() {
    const [activities, setActivities] = React.useState<ActivityWithCheckIns[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);
    const [error, setError] = React.useState<string | null>(null);
    const [isCreateDialogOpen, setIsCreateDialogOpen] = React.useState(false);
    const { user } = useAuth();
    const { toast } = useToast();

    const loadData = React.useCallback(async () => {
        try {
            setIsLoading(true);
            const fetchedActivities = await getActivitiesAction();
            setActivities(fetchedActivities);
            setError(null);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : "无法加载活动列表，请稍后再试。";
            setError(errorMessage);
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    }, []);


    React.useEffect(() => {
        loadData();
    }, [loadData]);

    const handleParticipate = async (e: React.MouseEvent, activityId: string) => {
        e.stopPropagation(); // Stop event bubbling to the Link wrapper
        e.preventDefault(); // Prevent Link navigation
        if (!user) {
            toast({ title: '请先登录', description: '登录后才能参加活动哦。', variant: 'destructive' });
            return;
        }

        const activity = activities.find(a => a.id === activityId);
        if (!activity || activity.participants.includes(user.uid)) return;

        // Optimistic update
        setActivities(prev => prev.map(a => a.id === activityId ? { ...a, participants: [...a.participants, user.uid] } : a));

        try {
            const result = await joinActivityAction(activityId, user.uid);
            if (!result.success) throw new Error("Failed to join activity on server.");
            toast({
                title: '报名成功！',
                description: `你已成功报名“${activity?.title}”。`,
            });
        } catch (e) {
             toast({ title: "报名失败", description: "网络出了一点问题，请稍后再试。", variant: "destructive" });
             // Revert on failure
             setActivities(prev => prev.map(a => a.id === activityId ? { ...a, participants: a.participants.filter(p => p !== user.uid) } : a));
        }
    };
    
    const onActivityCreated = () => {
        // No need to reload data, as new activities need approval first.
        // A simple toast is enough.
        toast({
            title: '提交成功',
            description: '你的活动已提交审核，请耐心等待。'
        })
    }


    return (
        <div className="min-h-screen bg-background text-foreground">
            {user && (
                <CreateActivityDialog 
                    open={isCreateDialogOpen} 
                    onOpenChange={setIsCreateDialogOpen} 
                    userId={user.uid}
                    onActivityCreated={onActivityCreated}
                />
            )}
            <header className="sticky top-0 z-10 flex items-center justify-between p-4 bg-background/80 backdrop-blur-sm border-b">
                 <Button variant="ghost" size="icon" asChild>
                    <Link href="/">
                        <ArrowLeft className="h-5 w-5" />
                        <span className="sr-only">返回</span>
                    </Link>
                </Button>
                <h1 className="text-xl font-headline text-center text-foreground">活动大厅</h1>
                <Button variant="ghost" size="icon" onClick={() => user ? setIsCreateDialogOpen(true) : toast({title: '请先登录', variant: 'destructive'})}>
                    <PlusCircle className="h-5 w-5" />
                    <span className="sr-only">发起新活动</span>
                </Button>
            </header>
            <main className="p-4">
                {isLoading && <ActivitySkeleton />}
                {!isLoading && error && <p className="text-destructive mt-8 text-center">{error}</p>}
                {!isLoading && !error && activities.length === 0 && <p className="text-muted-foreground mt-8 text-center">暂无活动，敬请期待！</p>}
                {!isLoading && !error && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {activities.map((activity) => (
                           <ActivityCard 
                                key={activity.id} 
                                activity={activity} 
                                onParticipate={handleParticipate} 
                                isJoined={user ? activity.participants.includes(user.uid) : false}
                                checkInsCount={activity.checkInsCount}
                            />
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}
