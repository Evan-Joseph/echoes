'use client';

import * as React from 'react';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import {
  Loader2,
  ArrowLeft,
  ShieldCheck,
  Trash2,
  MessageSquare,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  getAllCheckInsAction,
  getAllUsersAction,
  getPendingReportsAction,
  resolveReportAction,
  deleteCheckInAction,
  getCommentsAction,
  getPendingActivitiesAction,
  approveActivityAction,
  rejectActivityAction,
} from './../actions';
import type {
  AppCheckIn,
  AppUser,
  Report,
  CommentWithAuthor,
  Activity,
  ActivityWithAuthor,
} from '@/lib/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { format, formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { getUserTitle } from '@/lib/titles';
import Image from 'next/image';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';

interface AdminStats {
  userCheckInCounts: Record<string, number>;
  userAuthorCheckIns: Record<string, AppCheckIn[]>;
}

type PopulatedReport = {
  report: Report;
  checkIn: AppCheckIn;
  reporter: AppUser;
  author: AppUser;
};

function ReportComments({ checkInId }: { checkInId: string }) {
  const [comments, setComments] = React.useState<CommentWithAuthor[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [hasLoaded, setHasLoaded] = React.useState(false);

  const loadComments = async () => {
    if (hasLoaded) return;
    setIsLoading(true);
    try {
      const fetchedComments = await getCommentsAction(checkInId);
      setComments(fetchedComments);
      setHasLoaded(true);
    } catch (error) {
      // Handle error silently or with a toast
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Collapsible>
      <CollapsibleTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          onClick={loadComments}
          className="mt-2"
        >
          {isLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <MessageSquare className="mr-2 h-4 w-4" />
          )}
          {hasLoaded ? `查看 ${comments.length} 条评论` : '加载评论区'}
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <ScrollArea className="mt-2 h-48 rounded-md border bg-muted/50 p-2">
          <div className="space-y-3 p-2">
            {comments.length > 0 ? (
              comments.map((comment) => (
                <div
                  key={comment.id}
                  className="flex items-start gap-3 text-sm"
                >
                  <Avatar className="h-6 w-6">
                    <AvatarImage
                      src={comment.author?.photoURL}
                      alt={comment.author?.displayName}
                    />
                    <AvatarFallback>
                      {comment.author?.displayName?.charAt(0) || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-baseline gap-2">
                      <p className="font-semibold text-foreground">
                        {comment.author?.displayName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(comment.createdAt), {
                          addSuffix: true,
                          locale: zhCN,
                        })}
                      </p>
                    </div>
                    <p className="whitespace-pre-wrap text-foreground/90">
                      {comment.content}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-xs text-muted-foreground">
                无评论记录
              </p>
            )}
          </div>
        </ScrollArea>
      </CollapsibleContent>
    </Collapsible>
  );
}

function ActivityModerationTab() {
  const [pendingActivities, setPendingActivities] = React.useState<
    ActivityWithAuthor[]
  >([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const { toast } = useToast();

  React.useEffect(() => {
    getPendingActivitiesAction().then((data) => {
      setPendingActivities(data);
      setIsLoading(false);
    });
  }, []);

  const updateActivityStatus = async (
    id: string,
    status: 'approved' | 'rejected'
  ) => {
    const action =
      status === 'approved' ? approveActivityAction : rejectActivityAction;
    const result = await action(id);
    if (result.success) {
      toast({
        title: '操作成功',
        description: `活动已${status === 'approved' ? '批准' : '拒绝'}`,
      });
      setPendingActivities((prev) => prev.filter((a) => a.id !== id));
    } else {
      toast({ title: '操作失败', variant: 'destructive' });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>活动审核</CardTitle>
        <CardDescription>
          共 {pendingActivities.length} 条待审核的活动。
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {pendingActivities.map((activity) => (
            <div
              key={activity.id}
              className="flex flex-col gap-4 rounded-lg border p-4 md:flex-row"
            >
              <Image
                src={activity.coverImageUrl}
                width={150}
                height={150}
                alt={activity.title}
                className="aspect-video rounded-md object-cover md:aspect-square"
                data-ai-hint="activity banner"
              />
              <div className="flex-1">
                <h3 className="font-semibold">{activity.title}</h3>
                <div className="mt-1 text-sm text-muted-foreground">
                  {activity.description}
                </div>
                <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                  <div>发起人: {activity.author.displayName}</div>
                  <div>
                    分类: <Badge variant="outline">{activity.category}</Badge>
                  </div>
                  <div>
                    申请时间:{' '}
                    {format(new Date(activity.createdAt), 'PPP p', {
                      locale: zhCN,
                    })}
                  </div>
                </div>
              </div>
              <div className="flex flex-row justify-end gap-2 md:flex-col">
                <Button
                  size="sm"
                  variant="outline"
                  className="border-green-600 text-green-600 hover:bg-green-50 hover:text-green-700"
                  onClick={() => updateActivityStatus(activity.id, 'approved')}
                >
                  <CheckCircle className="mr-2 h-4 w-4" />
                  批准
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => updateActivityStatus(activity.id, 'rejected')}
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  拒绝
                </Button>
              </div>
            </div>
          ))}
          {pendingActivities.length === 0 && (
            <p className="py-4 text-center text-muted-foreground">
              所有活动都已审核完毕。
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdminPage() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [checkIns, setCheckIns] = React.useState<AppCheckIn[]>([]);
  const [users, setUsers] = React.useState<AppUser[]>([]);
  const [stats, setStats] = React.useState<AdminStats>({
    userCheckInCounts: {},
    userAuthorCheckIns: {},
  });
  const [usersMap, setUsersMap] = React.useState<Record<string, AppUser>>({});
  const [pendingReports, setPendingReports] = React.useState<PopulatedReport[]>(
    []
  );

  const loadAdminData = React.useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    setError(null);
    try {
      const [allCheckIns, allUsers, reports] = await Promise.all([
        getAllCheckInsAction(),
        getAllUsersAction(),
        getPendingReportsAction(),
      ]);

      setPendingReports(reports);

      const userCheckInCounts: Record<string, number> = {};
      const userAuthorCheckIns: Record<string, AppCheckIn[]> = {};

      allUsers.forEach((u) => {
        userCheckInCounts[u.id] = 0;
        userAuthorCheckIns[u.id] = [];
      });

      allCheckIns.forEach((checkIn) => {
        if (userCheckInCounts[checkIn.userId] !== undefined) {
          userCheckInCounts[checkIn.userId]++;
        }
        if (userAuthorCheckIns[checkIn.userId] !== undefined) {
          userAuthorCheckIns[checkIn.userId].push(checkIn);
        }
      });

      const usersMap = allUsers.reduce(
        (acc, u) => {
          acc[u.id] = u;
          return acc;
        },
        {} as Record<string, AppUser>
      );

      setCheckIns(allCheckIns);
      setUsers(allUsers);
      setStats({ userCheckInCounts, userAuthorCheckIns });
      setUsersMap(usersMap);
    } catch (err: any) {
      setError(err.message || 'Failed to load admin data.');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  React.useEffect(() => {
    if (!isAuthLoading && !user) {
      router.push('/'); // Redirect to home if not logged in
      return;
    }
    if (user) {
      loadAdminData();
    }
  }, [user, isAuthLoading, router, loadAdminData]);

  const handleResolveReport = async (reportId: string) => {
    try {
      await resolveReportAction(reportId);
      setPendingReports((prev) => prev.filter((r) => r.report.id !== reportId));
      toast({ title: '操作成功', description: '该举报已处理。' });
    } catch (e: any) {
      toast({
        title: '操作失败',
        description: e.message,
        variant: 'destructive',
      });
    }
  };

  const handleDeleteContent = async (report: PopulatedReport) => {
    try {
      // First, delete the check-in content
      await deleteCheckInAction(report.checkIn.id, report.checkIn.userId);
      // Then, resolve the report
      await resolveReportAction(report.report.id);

      setPendingReports((prev) =>
        prev.filter((r) => r.report.id !== report.report.id)
      );
      toast({ title: '操作成功', description: '内容已删除，举报已处理。' });

      // Optional: reload all data to reflect changes everywhere
      loadAdminData();
    } catch (e: any) {
      toast({
        title: '操作失败',
        description: e.message,
        variant: 'destructive',
      });
    }
  };

  if (isAuthLoading || isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!user) {
    // The useEffect above will handle the redirect.
    // This is a fallback state.
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center space-y-4">
        <p className="text-muted-foreground">正在跳转...</p>
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center space-y-4">
        <p className="text-destructive">{error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b bg-background/80 p-4 backdrop-blur-sm">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/">
            <ArrowLeft className="h-5 w-5" />
            <span className="sr-only">返回</span>
          </Link>
        </Button>
        <h1 className="text-center font-headline text-xl text-foreground">
          Admin Panel
        </h1>
        <div className="w-8"></div>
      </header>
      <main className="container mx-auto max-w-7xl p-4">
        <Tabs defaultValue="reports">
          <TabsList className="mx-auto grid w-full max-w-lg grid-cols-4">
            <TabsTrigger value="reports">内容举报</TabsTrigger>
            <TabsTrigger value="activities">活动审核</TabsTrigger>
            <TabsTrigger value="feed">全局动态</TabsTrigger>
            <TabsTrigger value="users">用户管理</TabsTrigger>
          </TabsList>

          <TabsContent value="reports">
            <Card>
              <CardHeader>
                <CardTitle>待处理的举报</CardTitle>
                <CardDescription>
                  共 {pendingReports.length} 条待处理的举报。
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {pendingReports.map(
                    ({ report, checkIn, reporter, author }) => (
                      <div
                        key={report.id}
                        className="flex flex-col gap-4 rounded-lg border p-4 md:flex-row"
                      >
                        <div className="flex-1">
                          <p className="mb-2 font-semibold">被举报内容:</p>
                          <div className="rounded-md bg-muted p-3">
                            <div className="mb-2 flex items-center gap-2">
                              <Avatar className="h-6 w-6">
                                <AvatarImage src={author?.photoURL} />
                                <AvatarFallback>
                                  {author?.displayName?.charAt(0)}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-sm font-medium">
                                {author?.displayName}
                              </span>
                            </div>
                            <p className="text-sm">{checkIn.content}</p>
                            {checkIn.photoUrl && (
                              <Image
                                src={checkIn.photoUrl}
                                width={150}
                                height={150}
                                alt="Reported content"
                                className="mt-2 rounded-md"
                                data-ai-hint="user content"
                              />
                            )}
                            <ReportComments checkInId={checkIn.id} />
                          </div>
                        </div>
                        <div className="flex-1">
                          <p className="mb-2 font-semibold">举报信息:</p>
                          <div className="space-y-2 text-sm text-muted-foreground">
                            <p>
                              举报人: {reporter.displayName} ({reporter.id})
                            </p>
                            <p>
                              举报时间:{' '}
                              {format(new Date(report.createdAt), 'PPP p', {
                                locale: zhCN,
                              })}
                            </p>
                          </div>
                          <div className="mt-4 flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleResolveReport(report.id)}
                            >
                              <ShieldCheck className="mr-2 h-4 w-4" />
                              保留
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() =>
                                handleDeleteContent({
                                  report,
                                  checkIn,
                                  reporter,
                                  author,
                                })
                              }
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              删除内容
                            </Button>
                          </div>
                        </div>
                      </div>
                    )
                  )}
                  {pendingReports.length === 0 && (
                    <p className="py-4 text-center text-muted-foreground">
                      社区一片祥和，暂无举报。
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="activities">
            <ActivityModerationTab />
          </TabsContent>

          <TabsContent value="feed">
            <Card>
              <CardHeader>
                <CardTitle>全局动态监控</CardTitle>
                <CardDescription>共 {checkIns.length} 条记录.</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>用户</TableHead>
                      <TableHead>内容</TableHead>
                      <TableHead className="text-center">状态</TableHead>
                      <TableHead className="text-center">互动</TableHead>
                      <TableHead className="text-right">时间</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {checkIns.map((checkIn) => {
                      const author = usersMap[checkIn.userId];
                      return (
                        <TableRow key={checkIn.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={author?.photoURL} />
                                <AvatarFallback>
                                  {author?.displayName?.charAt(0)}
                                </AvatarFallback>
                              </Avatar>
                              <span className="max-w-24 truncate font-medium">
                                {author?.displayName || '未知用户'}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="max-w-xs truncate">
                            {checkIn.content}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge
                              variant={
                                checkIn.isPublic ? 'secondary' : 'outline'
                              }
                            >
                              {checkIn.isPublic ? '公开' : '私密'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            {`❤️${checkIn.likedBy?.length || 0} / 💬${checkIn.commentsCount || 0}`}
                          </TableCell>
                          <TableCell className="text-right text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(checkIn.createdAt), {
                              addSuffix: true,
                              locale: zhCN,
                            })}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle>用户管理</CardTitle>
                <CardDescription>共 {users.length} 位用户.</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>用户</TableHead>
                      <TableHead>加入时间</TableHead>
                      <TableHead className="text-center">总打卡数</TableHead>
                      <TableHead>当前头衔</TableHead>
                      <TableHead className="text-right">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((u) => {
                      const userCheckIns = stats.userAuthorCheckIns[u.id] || [];
                      return (
                        <TableRow key={u.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={u.photoURL} />
                                <AvatarFallback>
                                  {u.displayName?.charAt(0)}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="font-medium">
                                  {u.displayName}
                                </div>
                                <div className="font-mono text-xs text-muted-foreground">
                                  {u.id}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {format(new Date(u.createdAt), 'PPP', {
                              locale: zhCN,
                            })}
                          </TableCell>
                          <TableCell className="text-center">
                            {stats.userCheckInCounts[u.id] || 0}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {getUserTitle(u, userCheckIns)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm" asChild>
                              <Link href={`/admin/user/${u.id}`}>查看</Link>
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
