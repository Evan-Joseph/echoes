
'use client';

import * as React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Form, FormControl, FormField, FormItem, FormMessage, FormLabel } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { createActivityAction } from '@/app/actions';
import { Loader2, UploadCloud, Image as ImageIcon } from 'lucide-react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import type { Activity } from '@/lib/types';


const activitySchema = z.object({
  title: z.string().min(5, '标题至少需要5个字符').max(50, '标题不能超过50个字符'),
  description: z.string().min(10, '描述至少需要10个字符').max(500, '描述不能超过500个字符'),
  category: z.enum(['个人成长', '技能提升', '身心健康', '其他']),
  coverImageDataUri: z.string({ required_error: '请上传一张封面图片' }).url('图片数据不正确'),
});

type ActivityFormValues = z.infer<typeof activitySchema>;

interface CreateActivityDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    userId: string;
    onActivityCreated: () => void;
}

export function CreateActivityDialog({ open, onOpenChange, userId, onActivityCreated }: CreateActivityDialogProps) {
  const { toast } = useToast();
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  
  const form = useForm<ActivityFormValues>({
    resolver: zodResolver(activitySchema),
    defaultValues: {
      title: '',
      description: '',
      category: '个人成长',
    },
  });
  
  const coverImageValue = form.watch('coverImageDataUri');

  React.useEffect(() => {
    if(!open) {
        form.reset();
    }
  }, [open, form]);

  const onSubmit = async (data: ActivityFormValues) => {
    try {
        const result = await createActivityAction({ ...data, userId });
        if (result.success) {
            toast({
                title: '提交成功',
                description: '你的活动已提交审核，请耐心等待管理员批准。',
            });
            onActivityCreated();
            onOpenChange(false);
        } else {
            throw new Error('Server action failed');
        }
    } catch (error) {
        toast({
            title: '提交失败',
            description: '创建活动时出错了，请稍后再试。',
            variant: 'destructive',
        });
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) { // 2MB limit
        toast({ title: "图片太大", description: "请选择小于2MB的图片。", variant: "destructive" });
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        form.setValue('coverImageDataUri', reader.result as string, { shouldValidate: true });
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>发起一个新活动</DialogTitle>
          <DialogDescription>
            分享你的想法，邀请社区的朋友们一起参与和成长。
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            
            <FormField
              control={form.control}
              name="coverImageDataUri"
              render={({ field }) => (
                <FormItem>
                   <FormLabel>活动封面</FormLabel>
                   <FormControl>
                    <div 
                        className={cn("w-full aspect-video rounded-md border-2 border-dashed border-muted-foreground/30 flex items-center justify-center cursor-pointer hover:border-primary transition-colors",
                            field.value && "border-solid"
                        )}
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <Input 
                            id="cover-upload" 
                            type="file" 
                            accept="image/png, image/jpeg, image/gif" 
                            className="sr-only" 
                            ref={fileInputRef} 
                            onChange={handleFileChange}
                        />
                        {field.value ? (
                             <Image src={field.value} alt="活动封面预览" width={400} height={225} className="object-cover rounded-md w-full h-full" data-ai-hint="activity banner" />
                        ) : (
                            <div className="text-center text-muted-foreground">
                                <UploadCloud className="mx-auto h-10 w-10" />
                                <p className="text-sm mt-1">点击上传封面 (推荐16:9)</p>
                            </div>
                        )}
                    </div>
                   </FormControl>
                   <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>活动标题</FormLabel>
                   <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>活动描述</FormLabel>
                   <FormControl>
                    <Textarea {...field} className="min-h-[100px]" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

             <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>活动分类</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="选择一个分类" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="个人成长">个人成长</SelectItem>
                      <SelectItem value="技能提升">技能提升</SelectItem>
                      <SelectItem value="身心健康">身心健康</SelectItem>
                      <SelectItem value="其他">其他</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>取消</Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                提交审核
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
