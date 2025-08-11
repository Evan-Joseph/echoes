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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
// Import our new local auth functions
import { signInWithUsername, createAnonymousUser } from '@/lib/firebase/auth';
import { useAuth } from '@/contexts/auth-context';


// Updated schema for a simple username login
const loginSchema = z.object({
    username: z.string().min(3, '用户名至少需要3个字符'),
});

const tokenSchema = z.object({
    token: z.string().min(10, '令牌格式不正确'),
})


export default function LoginPage() {
    const [isLoading, setIsLoading] = React.useState(false);
    const [showTokenDialog, setShowTokenDialog] = React.useState(false);
    const [anonymousUid, setAnonymousUid] = React.useState('');

    const router = useRouter();
    const { toast } = useToast();
    const { setUser } = useAuth(); // Get setUser from context to update auth state manually

    const loginForm = useForm<z.infer<typeof loginSchema>>({
        resolver: zodResolver(loginSchema),
    });
    
    const tokenForm = useForm<z.infer<typeof tokenSchema>>({
        resolver: zodResolver(tokenSchema),
    });

    // This handler replaces the phone/code verification handlers
    const handleLogin = async (data: z.infer<typeof loginSchema>) => {
        setIsLoading(true);
        try {
            // Use our new simplified username sign-in
            const user = await signInWithUsername(data.username);
            if (user) {
                setUser(user); // Manually update the auth context
                toast({ title: '登录成功！', description: `欢迎你，${data.username}！` });
                router.push('/');
            }
        } catch (error: any) {
            console.error(error);
            toast({
                title: '登录失败',
                description: error.message,
                variant: 'destructive',
            });
        }
        setIsLoading(false);
    };
    
    const handleAnonymousLogin = async () => {
        setIsLoading(true);
        try {
            const user = await createAnonymousUser();
            setUser(user); // Also update context on anonymous login
            setAnonymousUid(user.uid);
            setShowTokenDialog(true);
        } catch (error: any) {
             console.error(error);
            toast({
                title: '登录失败',
                description: '无法创建匿名会话。',
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
             {/* reCAPTCHA container is no longer needed */}
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

            <Tabs defaultValue="login" className="w-full max-w-sm">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="login">登录</TabsTrigger>
                    <TabsTrigger value="anonymous">匿名访问</TabsTrigger>
                </TabsList>
                
                {/* Simplified Login Tab */}
                <TabsContent value="login">
                    <Card>
                        <CardHeader>
                            <CardTitle>欢迎来到 回响</CardTitle>
                            <CardDescription>
                                请输入一个用户名以登录。
                            </CardDescription>
                        </CardHeader>
                        <form onSubmit={loginForm.handleSubmit(handleLogin)}>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="username">用户名</Label>
                                    <Input id="username" {...loginForm.register('username')} placeholder="例如：旅行家" />
                                    {loginForm.formState.errors.username && <p className="text-sm font-medium text-destructive">{loginForm.formState.errors.username.message}</p>}
                                </div>
                            </CardContent>
                            <CardFooter>
                                <Button className="w-full" type="submit" disabled={isLoading}>
                                    {isLoading ? <Loader2 className="animate-spin" /> : '登录'}
                                </Button>
                            </CardFooter>
                        </form>
                    </Card>
                </TabsContent>

                {/* Anonymous Login Tab */}
                <TabsContent value="anonymous">
                    <Card>
                        <CardHeader>
                            <CardTitle>访问方式</CardTitle>
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
                </TabsContent>
            </Tabs>
        </main>
    );
}
