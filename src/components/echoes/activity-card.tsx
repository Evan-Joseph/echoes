
import { Card, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import type { Activity } from "@/lib/types";
import { Users, Tag, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface ActivityCardProps {
  activity: Activity;
  onParticipate: (event: React.MouseEvent, activityId: string) => void;
  isJoined?: boolean;
  checkInsCount: number;
}

export function ActivityCard({ activity, onParticipate, isJoined, checkInsCount }: ActivityCardProps) {
  return (
    <Link href={`/activity/${activity.id}`} className="block transition-transform hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded-2xl">
        <Card className="w-full h-full overflow-hidden rounded-2xl border-none shadow-lg bg-card/80 backdrop-blur-sm flex flex-col">
          <div className="relative w-full aspect-[16/9] flex-shrink-0">
            <Image
              src={activity.coverImageUrl}
              alt={activity.title}
              fill
              className="object-cover"
              data-ai-hint="wellness meditation"
            />
          </div>
          <div className="p-4 flex flex-col flex-grow">
            <CardHeader className="p-0 mb-2">
              <CardTitle className="mb-1 text-base font-headline line-clamp-2">{activity.title}</CardTitle>
            </CardHeader>
             <CardDescription className="mb-2 text-xs text-muted-foreground line-clamp-2 h-8 flex-grow">{activity.description}</CardDescription>
            <div className="flex flex-col gap-1 text-xs text-muted-foreground mt-2">
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
            <CardFooter className="p-0 mt-4">
                <Button 
                  onClick={(e) => onParticipate(e, activity.id)} 
                  size="sm" 
                  className={cn("w-full bg-primary/90 hover:bg-primary text-primary-foreground",
                    isJoined && "bg-secondary hover:bg-secondary/80"
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
