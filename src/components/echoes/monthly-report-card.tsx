
'use client';

import * as React from 'react';
import { generateMonthlyReportAction, getMonthlyReportAction, saveMonthlyReportAction } from '@/app/actions';
import type { AppCheckIn, MonthlyReport as MonthlyReportType } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Lightbulb, Sparkles, Pin, Milestone } from 'lucide-react';
import { format, subMonths } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { useAuth } from '@/contexts/auth-context';

interface ReportData {
  summary: string;
  highlights: string[];
  suggestions: string[];
}

interface MonthlyReportCardProps {
  checkIns: AppCheckIn[];
}

function ReportSkeleton() {
    return (
        <div className="space-y-4">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />

            <div className="pt-4 space-y-3">
                 <Skeleton className="h-6 w-1/4 mb-2" />
                 <Skeleton className="h-10 w-full rounded-md" />
                 <Skeleton className="h-10 w-full rounded-md" />
            </div>
             <div className="pt-4 space-y-3">
                 <Skeleton className="h-6 w-1/4 mb-2" />
                 <Skeleton className="h-10 w-full rounded-md" />
            </div>
        </div>
    )
}

export function MonthlyReportCard({ checkIns }: MonthlyReportCardProps) {
  const { user } = useAuth();
  const [report, setReport] = React.useState<ReportData | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const { toast } = useToast();
  const hasRun = React.useRef(false);

  // Define the target month for the report (last month)
  const reportDate = subMonths(new Date(), 1);
  const reportYear = reportDate.getFullYear();
  const reportMonth = reportDate.getMonth() + 1; // 1-12
  const reportMonthStr = format(reportDate, 'yyyy年M月', { locale: zhCN });
  
  // Define the month before that for fetching previous report
  const prevReportDate = subMonths(new Date(), 2);
  const prevReportYear = prevReportDate.getFullYear();
  const prevReportMonth = prevReportDate.getMonth() + 1;


  React.useEffect(() => {
    if (!user || hasRun.current) return;
    
    hasRun.current = true;
    setIsLoading(true);

    const runAsync = async () => {
        // 1. Check for a saved report first
        const savedReport = await getMonthlyReportAction(user.uid, reportYear, reportMonth);
        if (savedReport) {
            setReport(savedReport);
            setIsLoading(false);
            return;
        }

        // 2. If no saved report, check if there's enough data to generate one
        const oneMonthAgo = subMonths(new Date(), 1).getTime();
        const recentCheckIns = checkIns
            .filter(c => new Date(c.createdAt).getTime() >= oneMonthAgo)
            .map(c => c.content);

        if (recentCheckIns.length < 3) {
            setError('再多记录一些，就能为你生成专属报告啦！');
            setIsLoading(false);
            return;
        }
        
        // 3. Fetch the previous month's report for context
        const previousReport = await getMonthlyReportAction(user.uid, prevReportYear, prevReportMonth);

        // 4. Generate a new report
        try {
            const result = await generateMonthlyReportAction({
                checkInContents: recentCheckIns,
                previousReportSummary: previousReport?.summary,
            });
            
            if (result) {
                setReport(result);
                setError(null);
                // 5. Save the newly generated report
                await saveMonthlyReportAction({
                    userId: user.uid,
                    year: reportYear,
                    month: reportMonth,
                    ...result,
                });
            } else {
                throw new Error("AI did not return a valid report.");
            }
        } catch(err) {
            console.error("Failed to generate or save monthly report:", err);
            setError("生成报告时出错，请稍后重试。");
            toast({
                title: "生成报告失败",
                description: "抱歉，分析你的成长足迹时遇到了点问题。",
                variant: "destructive"
            });
        } finally {
            setIsLoading(false);
        }
    };

    runAsync();

  }, [user, checkIns, toast, reportYear, reportMonth, prevReportYear, prevReportMonth]);

  return (
    <Card className="w-full max-w-2xl bg-card/80 backdrop-blur-sm border-none shadow-lg rounded-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg font-headline">
          <Milestone className="h-5 w-5 text-primary" />
          你的{reportMonthStr}成长报告
        </CardTitle>
        <CardDescription>由你的伙伴“回响”为你专属生成</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <ReportSkeleton />
        ) : error ? (
           <p className="text-center text-muted-foreground py-8">{error}</p>
        ) : report && (
          <div className="space-y-6">
            <p className="text-sm leading-relaxed text-foreground/90 italic border-l-4 border-primary pl-4">
              {report.summary}
            </p>
            
            <div>
                <h3 className="font-semibold text-base mb-3 flex items-center gap-2">
                    <Pin className="h-4 w-4 text-secondary"/>
                    高光时刻
                </h3>
                <div className="space-y-2">
                    {report.highlights.map((highlight, index) => (
                        <div key={index} className="bg-muted/50 p-3 rounded-lg text-sm text-muted-foreground">
                            “{highlight}”
                        </div>
                    ))}
                </div>
            </div>

             <div>
                <h3 className="font-semibold text-base mb-3 flex items-center gap-2">
                    <Lightbulb className="h-4 w-4 text-accent-foreground"/>
                    成长建议
                </h3>
                <div className="space-y-2">
                    {report.suggestions.map((suggestion, index) => (
                         <div key={index} className="bg-accent/30 border border-accent/50 p-3 rounded-lg text-sm text-accent-foreground">
                           <Sparkles className="inline h-4 w-4 mr-2" />
                           {suggestion}
                        </div>
                    ))}
                </div>
            </div>

          </div>
        )}
      </CardContent>
    </Card>
  );
}
