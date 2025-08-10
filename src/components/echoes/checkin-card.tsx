'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Paperclip, Loader2 } from 'lucide-react';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
  FormLabel,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Activity, AppCheckIn } from '@/lib/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import Image from 'next/image';

const checkInSchema = z.object({
  content: z.string().min(1, '打卡内容不能为空').max(500, '内容不能超过500字'),
  photoDataUri: z.string().optional(),
  activityId: z.string().optional(), // Can be 'none' or an actual ID
});

type CheckInFormValues = z.infer<typeof checkInSchema>;

interface CheckInFormProps {
  onCheckIn: (
    data: Omit<CheckInFormValues, 'activityId'> & {
      activityId?: string;
      activityTitle?: string;
    }
  ) => Promise<void>;
  activities?: Activity[];
  preselectedActivityId?: string;
  isSubmitting: boolean;
  onCancel?: () => void;
  editingCheckIn?: AppCheckIn | null; // For editing existing posts
}

export function CheckInForm({
  onCheckIn,
  activities = [],
  preselectedActivityId,
  isSubmitting,
  onCancel,
  editingCheckIn,
}: CheckInFormProps) {
  const form = useForm<CheckInFormValues>({
    resolver: zodResolver(checkInSchema),
    defaultValues: {
      content: editingCheckIn?.content || '',
      photoDataUri: editingCheckIn?.photoUrl, // Prefill with existing photo URL, not data URI
      activityId: editingCheckIn?.activityId || preselectedActivityId || 'none',
    },
  });
  const [fileName, setFileName] = React.useState<string | null>(
    editingCheckIn?.photoUrl ? '保留现有图片' : null
  );

  React.useEffect(() => {
    // If we start editing, reset the form with the check-in's data.
    if (editingCheckIn) {
      form.reset({
        content: editingCheckIn.content,
        // We pass the URL here. The form submission logic will handle whether it's a new file or not.
        photoDataUri: editingCheckIn.photoUrl,
        activityId: editingCheckIn.activityId || 'none',
      });
      setFileName(editingCheckIn.photoUrl ? '保留现有图片' : null);
    } else {
      // If we are creating a new one (or dialog is re-used)
      form.reset({
        content: '',
        photoDataUri: undefined,
        activityId: preselectedActivityId || 'none',
      });
      setFileName(null);
    }
  }, [editingCheckIn, preselectedActivityId, form]);

  const onSubmit = async (data: CheckInFormValues) => {
    let submissionData: Parameters<typeof onCheckIn>[0];

    if (data.activityId && data.activityId !== 'none') {
      const selectedActivity = activities.find((a) => a.id === data.activityId);
      submissionData = {
        ...data,
        activityId: selectedActivity?.id,
        activityTitle: selectedActivity?.title,
      };
    } else {
      submissionData = {
        ...data,
        activityId: undefined,
        activityTitle: undefined,
      };
    }

    await onCheckIn(submissionData);
    if (!editingCheckIn) {
      // Only reset fully if it's not an edit form
      form.reset();
      setFileName(null);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setFileName(file.name);
      const reader = new FileReader();
      reader.onloadend = () => {
        form.setValue('photoDataUri', reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      form.setValue('photoDataUri', undefined);
      setFileName(null);
    }
  };

  const currentPhoto = form.watch('photoDataUri');

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <div className="space-y-4 p-1">
          <FormField
            control={form.control}
            name="content"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Textarea
                    placeholder="分享你的想法、感悟或成就..."
                    {...field}
                    className="min-h-[100px] bg-background"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {editingCheckIn?.photoUrl &&
            currentPhoto === editingCheckIn.photoUrl && (
              <div className="relative h-24 w-24 overflow-hidden rounded-md border">
                <Image
                  src={editingCheckIn.photoUrl}
                  alt="当前图片"
                  fill
                  className="object-cover"
                  data-ai-hint="user content"
                />
              </div>
            )}

          {activities && activities.length > 0 && (
            <FormField
              control={form.control}
              name="activityId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>关联到活动 (可选)</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    disabled={!!preselectedActivityId || !!editingCheckIn}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="选择一个活动..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">不关联</SelectItem>
                      {activities.map((activity) => (
                        <SelectItem key={activity.id} value={activity.id}>
                          {activity.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
        </div>
        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              asChild
              disabled={isSubmitting}
            >
              <Label
                htmlFor="photo-upload-dialog"
                className="cursor-pointer text-muted-foreground hover:text-primary"
              >
                <Paperclip className="h-5 w-5" />
                <Input
                  id="photo-upload-dialog"
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={handleFileChange}
                />
              </Label>
            </Button>
            {fileName && (
              <span className="max-w-[100px] truncate text-xs text-muted-foreground">
                {fileName}
              </span>
            )}
          </div>
          <div className="flex gap-2">
            {onCancel && (
              <Button
                type="button"
                variant="ghost"
                onClick={onCancel}
                disabled={isSubmitting}
              >
                取消
              </Button>
            )}
            <Button
              type="submit"
              className="bg-primary/90 text-primary-foreground hover:bg-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : editingCheckIn ? (
                '保存修改'
              ) : (
                '发布分享'
              )}
            </Button>
          </div>
        </div>
      </form>
    </Form>
  );
}
