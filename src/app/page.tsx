'use client';

import { useAuth } from '@/contexts/auth-context';
import ChatLayout from '@/components/echoes/chat-layout';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import Image from 'next/image';

function AppSkeleton() {
  return (
    <div className="flex h-full w-full max-w-2xl flex-col bg-card shadow-2xl sm:my-4 sm:h-[95vh] sm:rounded-2xl">
      <div className="flex items-center justify-between border-b p-4">
        <Skeleton className="h-6 w-8" />
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-8 w-8 rounded-full" />
      </div>
      <div className="flex-grow space-y-6 p-4">
        <div className="flex items-end gap-2">
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-12 w-48 rounded-2xl" />
        </div>
        <div className="flex items-end justify-end gap-2">
          <Skeleton className="h-10 w-32 rounded-2xl" />
        </div>
        <div className="flex items-end gap-2">
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-16 w-64 rounded-2xl" />
        </div>
      </div>
      <div className="border-t p-4">
        <Skeleton className="h-12 w-full rounded-2xl" />
      </div>
    </div>
  );
}

export default function Home() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      // No longer redirecting. The component will now handle the unauthenticated state.
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <main className="flex h-[100svh] w-full flex-col items-center justify-center bg-background">
        <AppSkeleton />
      </main>
    );
  }

  if (!user) {
    return (
      <main className="flex h-[100svh] w-full flex-col items-center justify-center bg-background p-4">
        <div className="flex flex-col items-center space-y-4 text-center">
          <Image
            src="/images/logo/logo-no-bg.svg"
            alt="Echoes Logo"
            width={96}
            height={96}
            className="h-24 w-24"
          />
          <h1 className="text-2xl font-bold">欢迎来到 Echoes</h1>
          <p className="max-w-md text-muted-foreground">
            此应用是为微信小程序提供服务的。请通过微信小程序访问以获得完整的体验和功能。
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex h-[100svh] w-full flex-col items-center justify-center bg-background">
      <ChatLayout />
    </main>
  );
}
