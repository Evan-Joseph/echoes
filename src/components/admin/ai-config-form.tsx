'use client';

import * as React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { getAiConfigAction, updateAiConfigAction } from '@/app/actions';
import { AiConfig, AiConfigSchema } from '@/lib/ai-config';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { Skeleton } from '../ui/skeleton';

function ConfigSection({ title, description, children }: { title: string, description: string, children: React.ReactNode }) {
    return (
        <div className="border-t pt-6">
            <h3 className="text-lg font-medium">{title}</h3>
            <p className="text-sm text-muted-foreground mb-4">{description}</p>
            <div className="space-y-4">
                {children}
            </div>
        </div>
    )
}

export function AiConfigForm() {
    const [isLoading, setIsLoading] = React.useState(true);
    const [isSaving, setIsSaving] = React.useState(false);
    const { toast } = useToast();

    const form = useForm<AiConfig>({
        resolver: zodResolver(AiConfigSchema),
        defaultValues: {
            apiConfig: { baseUrl: '', apiKey: '' },
            chatRouter: { model: '', systemPrompt: '' },
            monthlyReport: { model: '', systemPrompt: '' },
            aiComment: { model: '', systemPrompt: '' },
            aiSuggestions: { model: '', systemPrompt: '' },
        }
    });

    React.useEffect(() => {
        setIsLoading(true);
        getAiConfigAction().then(config => {
            form.reset(config);
            setIsLoading(false);
        }).catch(err => {
            toast({ title: "加载失败", description: "无法加载AI配置。", variant: "destructive" });
            setIsLoading(false);
        });
    }, [form, toast]);

    const onSubmit = async (data: AiConfig) => {
        setIsSaving(true);
        try {
            const result = await updateAiConfigAction(data);
            if (result.success) {
                toast({ title: "保存成功", description: "AI配置已更新。" });
            } else {
                throw new Error(result.message || "保存失败");
            }
        } catch (error: any) {
            toast({ title: "保存失败", description: error.message, variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <Skeleton className="h-8 w-48" />
                    <Skeleton className="h-4 w-full max-w-lg mt-2" />
                </CardHeader>
                <CardContent className="space-y-8">
                     {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
                </CardContent>
            </Card>
        );
    }

    return (
        <form onSubmit={form.handleSubmit(onSubmit)}>
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <div>
                            <CardTitle>AI 配置管理</CardTitle>
                            <CardDescription>在这里管理和热更新所有AI功能的设置。</CardDescription>
                        </div>
                        <Button type="submit" disabled={isSaving}>
                            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            保存更改
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="space-y-8">
                    <ConfigSection title="API 设置" description="配置全局AI API的地址和密钥。如果留空，将使用服务器的环境变量。">
                        <div>
                            <Label htmlFor="apiConfig.baseUrl">API Base URL</Label>
                            <Input id="apiConfig.baseUrl" {...form.register('apiConfig.baseUrl')} placeholder="例如: https://api.openai.com/v1" />
                        </div>
                        <div>
                            <Label htmlFor="apiConfig.apiKey">API Key</Label>
                            <Input id="apiConfig.apiKey" type="password" {...form.register('apiConfig.apiKey')} placeholder="如果留空，将使用环境变量" />
                        </div>
                    </ConfigSection>

                    <ConfigSection title="主聊天路由" description="配置主聊天界面的AI路由功能。">
                         <div>
                            <Label htmlFor="chatRouter.model">模型名称</Label>
                            <Input id="chatRouter.model" {...form.register('chatRouter.model')} />
                        </div>
                        <div>
                            <Label htmlFor="chatRouter.systemPrompt">系统提示 (System Prompt)</Label>
                            <Textarea id="chatRouter.systemPrompt" {...form.register('chatRouter.systemPrompt')} rows={10} />
                        </div>
                    </ConfigSection>

                    <ConfigSection title="月度报告生成" description="配置生成用户月度报告的AI功能。">
                         <div>
                            <Label htmlFor="monthlyReport.model">模型名称</Label>
                            <Input id="monthlyReport.model" {...form.register('monthlyReport.model')} />
                        </div>
                        <div>
                            <Label htmlFor="monthlyReport.systemPrompt">系统提示 (System Prompt)</Label>
                            <Textarea id="monthlyReport.systemPrompt" {...form.register('monthlyReport.systemPrompt')} rows={10} />
                        </div>
                    </ConfigSection>

                    <ConfigSection title="AI评论生成" description="配置在动态下方生成AI评论的功能。">
                         <div>
                            <Label htmlFor="aiComment.model">模型名称</Label>
                            <Input id="aiComment.model" {...form.register('aiComment.model')} />
                        </div>
                        <div>
                            <Label htmlFor="aiComment.systemPrompt">系统提示 (System Prompt)</Label>
                            <Textarea id="aiComment.systemPrompt" {...form.register('aiComment.systemPrompt')} rows={4} />
                        </div>
                    </ConfigSection>

                     <ConfigSection title="AI建议生成" description="配置为用户提供通用写作建议的功能。">
                         <div>
                            <Label htmlFor="aiSuggestions.model">模型名称</Label>
                            <Input id="aiSuggestions.model" {...form.register('aiSuggestions.model')} />
                        </div>
                        <div>
                            <Label htmlFor="aiSuggestions.systemPrompt">系统提示 (System Prompt)</Label>
                            <Textarea id="aiSuggestions.systemPrompt" {...form.register('aiSuggestions.systemPrompt')} rows={6} />
                        </div>
                    </ConfigSection>
                </CardContent>
            </Card>
        </form>
    );
}
