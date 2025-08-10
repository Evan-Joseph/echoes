'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { updateUserProfileAction } from '@/app/actions';
import type { AppUser } from '@/lib/types';
import { Loader2, Upload } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { cn } from '@/lib/utils';

const profileSchema = z.object({
  displayName: z
    .string()
    .min(2, '昵称至少需要2个字符')
    .max(20, '昵称不能超过20个字符'),
  photoURL: z.string().url('请提供有效的头像地址').min(1, '请选择一个头像'),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

interface EditProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: AppUser;
  profile: AppUser;
  onProfileUpdate: (newProfile: AppUser) => void;
}

export function EditProfileDialog({
  open,
  onOpenChange,
  user,
  profile,
  onProfileUpdate,
}: EditProfileDialogProps) {
  const { toast } = useToast();
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      displayName: profile.displayName || '',
      photoURL: profile.photoURL || '',
    },
  });

  const photoURLValue = form.watch('photoURL');

  React.useEffect(() => {
    if (profile) {
      form.reset({
        displayName: profile.displayName || '',
        photoURL: profile.photoURL || '',
      });
    }
  }, [profile, form, open]);

  const onSubmit = async (data: ProfileFormValues) => {
    try {
      const result = await updateUserProfileAction(user.id, data);
      if (result.success) {
        toast({
          title: '更新成功',
          description: '你的个人资料已更新。',
        });
        onProfileUpdate({ ...profile, ...data });
        onOpenChange(false);
      } else {
        throw new Error('Server action failed');
      }
    } catch (error) {
      toast({
        title: '更新失败',
        description: '保存你的资料时出错了，请稍后再试。',
        variant: 'destructive',
      });
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        // 2MB limit
        toast({
          title: '图片太大',
          description: '请选择小于2MB的图片。',
          variant: 'destructive',
        });
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        form.setValue('photoURL', reader.result as string, {
          shouldValidate: true,
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const triggerFileSelect = () => fileInputRef.current?.click();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>编辑个人资料</DialogTitle>
          <DialogDescription>
            设置你的昵称和头像，让朋友们更好地认识你。
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="photoURL"
              render={({ field }) => (
                <FormItem className="flex flex-col items-center gap-2">
                  <Label htmlFor="avatar-upload" className="cursor-pointer">
                    <div className="group relative">
                      <Avatar className="h-24 w-24 ring-2 ring-border ring-offset-2 transition-all group-hover:ring-primary">
                        <AvatarImage
                          src={field.value}
                          alt={form.getValues('displayName')}
                          data-ai-hint="user avatar"
                        />
                        <AvatarFallback>
                          {form.getValues('displayName')?.charAt(0) || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                        <Upload className="h-8 w-8 text-white" />
                      </div>
                    </div>
                  </Label>
                  <Input
                    id="avatar-upload"
                    type="file"
                    accept="image/png, image/jpeg, image/gif"
                    className="sr-only"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                  />
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="displayName"
              render={({ field }) => (
                <FormItem>
                  <Label htmlFor="displayName">昵称</Label>
                  <Input id="displayName" {...field} />
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenChange(false)}
              >
                取消
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                保存
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
