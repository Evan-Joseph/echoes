
'use client';

import * as React from 'react';
import WordCloud from 'react-d3-cloud';
import { generateWordCloudDataAction } from '@/app/actions';
import type { AppCheckIn } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { BrainCircuit } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';

// Define the type for word cloud data items
interface WordData {
  text: string;
  value: number;
}

interface WordCloudCardProps {
  checkIns: AppCheckIn[];
}

export function WordCloudCard({ checkIns }: WordCloudCardProps) {
  const [words, setWords] = React.useState<WordData[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const { toast } = useToast();
  
  // Using a ref to prevent re-running the effect on re-renders
  const hasRun = React.useRef(false);

  React.useEffect(() => {
    if (checkIns.length > 0 && !hasRun.current) {
      hasRun.current = true;
      setIsLoading(true);
      
      const contents = checkIns.map(c => c.content);

      generateWordCloudDataAction({ checkInContents: contents })
        .then(result => {
          if (result && result.words) {
            setWords(result.words);
          }
        })
        .catch(error => {
          console.error("Failed to generate word cloud data:", error);
          toast({
            title: "生成词云失败",
            description: "抱歉，分析你的成长足迹时遇到了点问题。",
            variant: "destructive"
          });
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else if (checkIns.length === 0) {
        setIsLoading(false);
    }
  }, [checkIns, toast]);

  // Define a color scale
  const fill = (word: WordData, i?: number) => {
    const colors = ['#FF9B9B', '#A6D1E6', '#7D6E83', '#424242'];
    return colors[Math.floor(Math.random() * colors.length)];
  };

  const fontSize = (word: WordData) => Math.log2(word.value) * 15 + 16;
  
  const rotate = () => (Math.random() > 0.7 ? 90 : 0);

  return (
    <Card className="w-full max-w-2xl bg-card/80 backdrop-blur-sm border-none shadow-lg rounded-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg font-headline">
          <BrainCircuit className="h-5 w-5 text-primary" />
          我的成长词云
        </CardTitle>
        <CardDescription>这是你最近关注的焦点</CardDescription>
      </CardHeader>
      <CardContent className="h-56 w-full">
        {isLoading ? (
          <div className="h-full w-full flex items-center justify-center">
            <Skeleton className="h-4/5 w-4/5" />
          </div>
        ) : words.length > 0 ? (
          <WordCloud
            data={words}
            width={500} // This is a virtual size; it will scale to the container
            height={200}
            font="Noto Sans SC"
            fontSize={fontSize}
            fill={fill}
            padding={3}
            rotate={rotate}
            onWordClick={(event, d) => {
              console.log(`word: ${d.text}, value: ${d.value}`);
            }}
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center">
            <p className="text-muted-foreground">分享更多内容来生成你的专属词云吧！</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
