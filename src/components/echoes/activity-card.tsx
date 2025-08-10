import {
  Card,
  CardFooter,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import type { Activity } from '@/lib/types';
import { Users, Tag, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface ActivityCardProps {
  activity: Activity;
  onParticipate: (event: React.MouseEvent, activityId: string) => void;
  isJoined?: boolean;
  checkInsCount: number;
}

export function ActivityCard({
  activity,
  onParticipate,
  isJoined,
  checkInsCount,
}: ActivityCardProps) {
  return (
    <Link
      href={`/activity/${activity.id}`}
      className="block rounded-2xl transition-transform hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
    >
      <Card className="flex h-full w-full flex-col overflow-hidden rounded-2xl border-none bg-card/80 shadow-lg backdrop-blur-sm">
        <div className="relative aspect-[16/9] w-full flex-shrink-0">
          <Image
            src={activity.coverImageUrl}
            alt={activity.title}
            fill
            className="object-cover"
            data-ai-hint="wellness meditation"
          />
        </div>
        <div className="flex flex-grow flex-col p-4">
          <CardHeader className="mb-2 p-0">
            <CardTitle className="mb-1 line-clamp-2 font-headline text-base">
              {activity.title}
            </CardTitle>
          </CardHeader>
          <CardDescription className="mb-2 line-clamp-2 h-8 flex-grow text-xs text-muted-foreground">
            {activity.description}
          </CardDescription>
          <div className="mt-2 flex flex-col gap-1 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Tag className="h-3 w-3" />
              <span>{activity.category}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Users className="h-3 w-3" />
              <span>{activity.participants.length} 人参加</span>
            </div>
            <div className="flex items-center gap-1.5">
              <MessageSquare className="h-3 w-3" />
              <span>{checkInsCount} 条分享</span>
            </div>
          </div>
          <CardFooter className="mt-4 p-0">
            <Button
              onClick={(e) => onParticipate(e, activity.id)}
              size="sm"
              className={cn(
                'w-full bg-primary/90 text-primary-foreground hover:bg-primary',
                isJoined && 'bg-secondary hover:bg-secondary/80'
              )}
              disabled={isJoined}
            >
              {isJoined ? '已参加' : '我想参加'}
            </Button>
          </CardFooter>
        </div>
      </Card>
    </Link>
  );
}
