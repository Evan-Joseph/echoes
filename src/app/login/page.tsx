
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
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { Loader2, KeyRound } from 'lucide-react';
import { createAnonymousUser } from '@/lib/supabase/auth';
import { useAuth } from '@/contexts/auth-context';


const tokenSchema = z.object({
    token: z.string().min(10, '令牌格式不正确'),
})


export default function LoginPage() {
    const [isLoading, setIsLoading] = React.useState(false);
    const [showTokenDialog, setShowTokenDialog] = React.useState(false);
    const [anonymousUid, setAnonymousUid] = React.useState('');

    const router = useRouter();
    const { toast } = useToast();
    const { user } = useAuth();
    
    const tokenForm = useForm<z.infer<typeof tokenSchema>>({
        resolver: zodResolver(tokenSchema),
    });

    React.useEffect(() => {
        if (user) {
            router.push('/');
        }
    }, [user, router]);
    
    const handleAnonymousLogin = async () => {
        setIsLoading(true);
        try {
            const user = await createAnonymousUser();
            setAnonymousUid(user.id);
            setShowTokenDialog(true);
        } catch (error: any) {
             console.error(error);
            toast({
                title: '登录失败',
                description: '无法创建匿名会话，请检查网络连接。',
                variant: 'destructive',
            });
        }
        setIsLoading(false);
    };

    const handleTokenLogin = (data: z.infer<typeof tokenSchema>) => {
        toast({
            title: '功能开发中',
            description: `通过令牌 ${data.token} 恢复数据的功能将在未来版本中提供。`,
        })
    }

    return (
        <main className="flex h-[100svh] w-full flex-col items-center justify-center bg-background p-4">
             <AlertDialog open={showTokenDialog} onOpenChange={setShowTokenDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                    <AlertDialogTitle>请务必保存你的登录令牌！</AlertDialogTitle>
                    <AlertDialogDescription>
                        你已选择匿名登录。为防止更换设备后数据丢失，请务必截图或复制并妥善保管以下令牌（即你的用户ID）。这是你未来找回所有聊天记录和成长档案的唯一凭证。
                    </AlertDialogDescription>
                     <div className="my-4 p-3 bg-muted rounded-md font-mono text-sm text-center break-all">
                        {anonymousUid}
                    </div>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                    <AlertDialogAction onClick={() => router.push('/')} className="w-full">我已保存，进入应用</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <div className="w-full max-w-sm">
                <Card>
                    <CardHeader>
                        <CardTitle>欢迎来到 回响</CardTitle>
                        <CardDescription>
                            选择一种方式开始你的旅程。
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                            <Button className="w-full" onClick={handleAnonymousLogin} disabled={isLoading}>
                            {isLoading ? <Loader2 className="animate-spin" /> : '开始匿名会话'}
                        </Button>
                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <span className="w-full border-t" />
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                                <span className="bg-background px-2 text-muted-foreground">
                                或
                                </span>
                            </div>
                        </div>
                        <form onSubmit={tokenForm.handleSubmit(handleTokenLogin)} className="space-y-2">
                            <Label htmlFor="token" className="flex items-center gap-2 text-muted-foreground">
                                <KeyRound className="h-4 w-4" />
                                使用令牌恢复数据
                            </Label>
                            <div className="flex gap-2">
                                <Input id="token" placeholder="在此粘贴你的令牌 (UID)" {...tokenForm.register('token')} />
                                <Button type="submit">恢复</Button>
                            </div>
                            {tokenForm.formState.errors.token && <p className="text-sm font-medium text-destructive">{tokenForm.formState.errors.token.message}</p>}
                        </form>
                    </CardContent>
                </Card>
            </div>
            <style jsx global>{`
                .PhoneInputCountry {
                    background-color: hsl(var(--card));
                    border: 1px solid hsl(var(--border));
                    border-right: none;
                    border-radius: var(--radius) 0 0 var(--radius);
                    padding: 0 0.5rem;
                }
                .PhoneInputInput {
                    background-color: hsl(var(--card));
                    border: 1px solid hsl(var(--border));
                    height: 2.5rem;
                    padding: 0.5rem 0.75rem;
                    border-radius: 0 var(--radius) var(--radius) 0;
                    width: 100%;
                }
                .PhoneInputInput:focus {
                   outline: 2px solid hsl(var(--ring));
                   outline-offset: 2px;
                }
            `}</style>
        </main>
    );
}
