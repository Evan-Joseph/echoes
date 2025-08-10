
'use client';

import * as React from 'react';
import type { Activity, AppCheckIn } from '@/lib/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { CheckInForm } from './checkin-card';

interface ShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCheckIn: (data: any) => Promise<void>;
  isSubmitting: boolean;
  userActivities?: Activity[];
  // If an activity is passed, it's for sharing to a specific topic
  activity?: Activity;
  // If a check-in is passed, it's for editing an existing post
  editingCheckIn?: AppCheckIn | null;
}

export function ShareDialog({ open, onOpenChange, onCheckIn, isSubmitting, userActivities, activity, editingCheckIn }: ShareDialogProps) {

  const handleCancel = () => {
    onOpenChange(false);
  }

  const handleCheckIn = async (data: any) => {
    await onCheckIn(data);
    onOpenChange(false); // Close dialog on successful submission
  }
  
  const dialogTitle = editingCheckIn ? "编辑分享" : activity ? `参与话题：“${activity.title}”` : "记录今天的美好";
  const dialogDescription = editingCheckIn ? "修改你的分享内容和图片。" : activity ? "你的分享将会显示在这个活动话题下。" : "分享你的想法、感悟或成就。";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
          <DialogDescription>{dialogDescription}</DialogDescription>
        </DialogHeader>
        <CheckInForm
          onCheckIn={handleCheckIn}
          activities={userActivities}
          preselectedActivityId={activity?.id}
          isSubmitting={isSubmitting}
          onCancel={handleCancel}
          editingCheckIn={editingCheckIn}
        />
      </DialogContent>
    </Dialog>
  );
}
