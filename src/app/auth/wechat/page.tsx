'use client';

import * as React from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getSupabaseClient } from '@/lib/supabase/client';

function WeChatAuthClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();
  const { user, isLoading: isAuthLoading } = useAuth();
  const [status, setStatus] = React.useState('正在登录中，请稍候...');
  const [error, setError] = React.useState<string | null>(null);

  const hasRun = React.useRef(false);

  React.useEffect(() => {
    if (user) {
      router.replace('/');
      return;
    }

    if (hasRun.current) {
      return;
    }
    hasRun.current = true;

    const code = searchParams.get('code');
    const nickName = searchParams.get('nickName');
    const avatarUrl = searchParams.get('avatarUrl');

    if (!code || !nickName) {
      setError('无效的认证参数。请从微信小程序重新访问。');
      setStatus('登录失败');
      return;
    }

    const performLogin = async () => {
      const supabase = getSupabaseClient();
      try {
        const response = await fetch('/api/auth/callback', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ code, nickName, avatarUrl }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || '服务器发生错误');
        }

        const { token, email, user: userData } = await response.json();

        if (!token || !email || !userData) {
          throw new Error('未能获取有效的登录凭证。');
        }

        const {
          data: { session },
          error: otpError,
        } = await supabase.auth.verifyOtp({
          email,
          token,
          type: 'magiclink',
        });

        if (otpError) {
          throw otpError;
        }

        if (!session) {
          throw new Error('无法创建会话，请重试。');
        }

        setStatus('登录成功！正在跳转...');
        toast({
          title: '登录成功',
          description: `欢迎您，${userData.displayName || nickName}！`,
        });
        router.replace('/');
      } catch (err: any) {
        console.error('WeChat Login Error:', err);
        setError(err.message || '发生未知错误，请重试。');
        setStatus('登录失败');
        toast({
          title: '登录失败',
          description: err.message || '无法登录，请联系管理员。',
          variant: 'destructive',
        });
      }
    };

    performLogin();
  }, [searchParams, router, toast, user]);

  if (isAuthLoading) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin" />
        <p className="text-muted-foreground">正在准备环境...</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full flex-col items-center justify-center space-y-4">
      {!error && <Loader2 className="h-8 w-8 animate-spin" />}
      <p className="text-xl font-semibold">{status}</p>
      {error && (
        <p className="max-w-md text-center text-destructive">{error}</p>
      )}
    </div>
  );
}

export default function WeChatAuthPage() {
  // The component using useSearchParams must be wrapped in a Suspense boundary.
  return (
    <React.Suspense
      fallback={
        <div className="flex h-screen w-full flex-col items-center justify-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p className="text-muted-foreground">正在加载认证模块...</p>
        </div>
      }
    >
      <WeChatAuthClient />
    </React.Suspense>
  );
}
