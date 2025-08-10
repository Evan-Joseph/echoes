
'use client';

import Link from 'next/link';

export default function DeprecatedDebugPage() {
    return (
        <div className="flex h-screen w-full flex-col items-center justify-center space-y-4 p-4 text-center">
            <h1 className="text-2xl font-bold">此页面已移动</h1>
            <p className="text-muted-foreground">
                后台管理功能已迁移至 <Link href="/admin" className="text-primary underline">/admin</Link> 路径。
            </p>
            <Link href="/admin" className="text-primary underline">
               点击这里跳转
            </Link>
        </div>
    );
}
