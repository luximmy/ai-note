import Link from 'next/link';
import { ArrowRight, Brain, FileText, Network, Sparkles } from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';

const features = [
  {
    icon: FileText,
    title: 'Block 编辑器',
    description: '基于 Tiptap 的富文本编辑，支持段落、标题、代码块、Todo 列表',
  },
  {
    icon: Brain,
    title: 'AI Copilot',
    description: '智能对话助手，支持 RAG 检索增强、引用溯源、流式响应',
  },
  {
    icon: Sparkles,
    title: 'AI 重写',
    description: '选中文字即可扩写、精简、翻译，实时原位替换',
  },
  {
    icon: Network,
    title: '知识图谱',
    description: '双向链接 [[wikilink]] + 力导向图谱可视化 + 反向链接面板',
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="container mx-auto px-4 py-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl">📝</span>
          <span className="text-xl font-bold">AI Note</span>
        </div>
        <div className="flex items-center gap-4">
          <ThemeToggle />
          <Link
            href="/login"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            登录
          </Link>
          <Link
            href="/register"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            开始使用
          </Link>
        </div>
      </header>

      {/* Hero */}
      <main className="container mx-auto px-4">
        <section className="py-24 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border bg-muted/50 px-4 py-1.5 text-sm text-muted-foreground mb-8">
            <Sparkles className="h-4 w-4" />
            <span>AI 驱动的下一代笔记工具</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6">
            让思考
            <span className="text-primary">更清晰</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
            AI Note 结合了强大的块编辑器和智能 AI 助手，帮助你捕捉灵感、组织知识、深度思考。
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link
              href="/register"
              className="inline-flex items-center justify-center rounded-md bg-primary px-6 py-3 text-base font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              免费开始
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-md border px-6 py-3 text-base font-medium hover:bg-accent transition-colors"
            >
              演示登录
            </Link>
          </div>
        </section>

        {/* Features */}
        <section className="py-24">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">核心功能</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              从记录到思考，AI Note 为你的知识工作流提供全方位支持
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="rounded-lg border bg-card p-6 hover:shadow-md transition-shadow"
              >
                <feature.icon className="h-10 w-10 text-primary mb-4" />
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="py-24 text-center">
          <div className="rounded-2xl bg-primary/5 border p-12">
            <h2 className="text-3xl font-bold mb-4">准备好开始了吗？</h2>
            <p className="text-muted-foreground mb-8 max-w-md mx-auto">
              注册即可免费使用全部功能，开启你的智能笔记之旅
            </p>
            <Link
              href="/register"
              className="inline-flex items-center justify-center rounded-md bg-primary px-8 py-3 text-base font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              立即注册
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t">
        <div className="container mx-auto px-4 py-8 text-center text-sm text-muted-foreground">
          <p>© 2026 AI Note. Built with Next.js, Tiptap, and AI.</p>
        </div>
      </footer>
    </div>
  );
}
