import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

// 1. 引入 sonner 的全局 Toaster 组件
import { Toaster } from 'sonner';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'ai-note | AI-Native Canvas',
  description: 'Next generation AI-driven knowledge canvas',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang='zh-CN'
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className='min-h-full flex flex-col'>
        {children}
        {/* 2. 在 body 的最末尾挂载全局弹窗组件 */}
        {/* 可以加上 richColors 让成功/失败的弹窗带有好看的背景色 */}
        {/* position 控制弹窗出现的位置，比如右下角 */}
        <Toaster
          position='bottom-right'
          richColors
        />
      </body>
    </html>
  );
}
