
'use client';

import { useAuth } from '@/contexts/auth-context';
import ChatLayout from '@/components/echoes/chat-layout';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Skeleton } from '@/components/ui/skeleton';


function AppSkeleton() {
    return (
        <div className="flex flex-col w-full max-w-2xl h-full sm:h-[95vh] sm:my-4 bg-card sm:rounded-2xl shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b">
                <Skeleton className="h-6 w-8" />
                <Skeleton className="h-6 w-24" />
                <Skeleton className="h-8 w-8 rounded-full" />
            </div>
            <div className="flex-grow p-4 space-y-6">
                <div className="flex items-end gap-2">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <Skeleton className="h-12 w-48 rounded-2xl" />
                </div>
                 <div className="flex items-end gap-2 justify-end">
                    <Skeleton className="h-10 w-32 rounded-2xl" />
                </div>
                 <div className="flex items-end gap-2">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <Skeleton className="h-16 w-64 rounded-2xl" />
                </div>
            </div>
            <div className="p-4 border-t">
                 <Skeleton className="h-12 w-full rounded-2xl" />
            </div>
        </div>
    )
}

export default function Home() {
    const { user, isLoading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!isLoading && !user) {
            router.push('/login');
        }
    }, [user, isLoading, router]);

    if (isLoading || !user) {
        return (
            <main className="flex h-[100svh] w-full flex-col items-center justify-center bg-background">
              <AppSkeleton />
            </main>
        );
    }

    return (
        <main className="flex h-[100svh] w-full flex-col items-center justify-center bg-background">
            <ChatLayout />
        </main>
    );
}
