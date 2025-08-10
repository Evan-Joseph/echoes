'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, KeyRound } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { supabase } from '@/lib/supabase/client';

const loginSchema = z.object({
  openId: z.string().min(10, 'OpenID 格式不正确'),
  nickName: z.string().min(1, '昵称不能为空'),
  avatarUrl: z.string().url('头像URL格式不正确').optional().or(z.literal('')),
});

export default function LoginPage() {
  const [isLoading, setIsLoading] = React.useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const { user, isLoading: isAuthLoading } = useAuth();

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      openId: '',
      nickName: 'Debug User',
      avatarUrl: '',
    },
  });

  React.useEffect(() => {
    if (user) {
      router.push('/');
    }
  }, [user, router]);

  const handleWeChatLogin = async (data: z.infer<typeof loginSchema>) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/wechat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '登录失败');
      }

      const { session } = await response.json();

      // Set the session in the Supabase client
      const { error: sessionError } = await supabase.auth.setSession({
        access_token: session.access_token,
        refresh_token: session.refresh_token,
      });

      if (sessionError) {
        throw sessionError;
      }

      toast({
        title: '登录成功',
        description: '欢迎回来！',
      });
      router.push('/');
    } catch (error: any) {
      console.error(error);
      toast({
        title: '登录失败',
        description: error.message || '无法登录，请检查输入或联系管理员。',
        variant: 'destructive',
      });
    }
    setIsLoading(false);
  };

  if (isAuthLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (user) {
    return null; // Don't render anything if user is logged in, useEffect will redirect
  }

  return (
    <main className="flex h-[100svh] w-full flex-col items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm">
        <Card>
          <CardHeader>
            <CardTitle>回响 - 调试登录</CardTitle>
            <CardDescription>
              输入 OpenID 和昵称以模拟微信登录。
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={form.handleSubmit(handleWeChatLogin)}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label htmlFor="openId">OpenID</Label>
                <Input
                  id="openId"
                  placeholder="在此输入用户的 OpenID"
                  {...form.register('openId')}
                />
                {form.formState.errors.openId && (
                  <p className="text-sm font-medium text-destructive">
                    {form.formState.errors.openId.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="nickName">昵称</Label>
                <Input
                  id="nickName"
                  placeholder="在此输入用户的昵称"
                  {...form.register('nickName')}
                />
                {form.formState.errors.nickName && (
                  <p className="text-sm font-medium text-destructive">
                    {form.formState.errors.nickName.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="avatarUrl">头像 URL (可选)</Label>
                <Input
                  id="avatarUrl"
                  placeholder="https://..."
                  {...form.register('avatarUrl')}
                />
                {form.formState.errors.avatarUrl && (
                  <p className="text-sm font-medium text-destructive">
                    {form.formState.errors.avatarUrl.message}
                  </p>
                )}
              </div>
              <Button className="w-full" type="submit" disabled={isLoading}>
                {isLoading ? <Loader2 className="animate-spin" /> : '登录'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
