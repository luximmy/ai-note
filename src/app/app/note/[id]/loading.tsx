// src/app/app/note/[id]/loading.tsx

export default function NoteLoading() {
  return (
    <div className='space-y-8 animate-pulse'>
      {/* 标题区骨架屏 */}
      <div className='space-y-4'>
        <div className='h-12 w-12 bg-muted-foreground/20 rounded-lg'></div>
        <div className='h-10 w-2/3 bg-muted-foreground/20 rounded-md'></div>
      </div>

      {/* 内容区骨架屏 */}
      <div className='space-y-4 pt-8 border-t'>
        <div className='h-4 w-full bg-muted rounded'></div>
        <div className='h-4 w-5/6 bg-muted rounded'></div>
        <div className='h-4 w-4/6 bg-muted rounded'></div>
        <div className='h-32 w-full bg-muted/50 rounded-md mt-6'></div>
      </div>
    </div>
  );
}
