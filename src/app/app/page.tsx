export default function DashboardPage() {
  return (
    <div className='space-y-4'>
      <h1 className='text-2xl font-bold'>欢迎回来</h1>
      <p className='text-muted-foreground'>
        从左侧选择一篇笔记开始，或者按{' '}
        <kbd className='px-1.5 py-0.5 rounded border bg-muted text-xs'>
          Cmd + K
        </kbd>{' '}
        搜索。
      </p>
    </div>
  );
}
