// src/components/ai/MermaidDiagram.tsx
import { useEffect, useRef, useState } from 'react';
import { RefreshCw } from 'lucide-react';

interface MermaidDiagramProps {
  title?: string;
  code?: string;
  onUpdateProps?: (props: Record<string, unknown>) => void;
}

// mermaid 实例缓存
let mermaidPromise: Promise<typeof import('mermaid')> | null = null;

function getMermaid() {
  if (!mermaidPromise) {
    mermaidPromise = import('mermaid').then((m) => {
      m.default.initialize({
        startOnLoad: false,
        theme: 'default',
        securityLevel: 'loose',
        fontFamily: 'inherit',
      });
      return m;
    });
  }
  return mermaidPromise;
}

export function MermaidDiagram({ title, code }: MermaidDiagramProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!code || !containerRef.current) return;

    let cancelled = false;

    const render = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const mermaid = await getMermaid();
        if (cancelled) return;

        // 生成唯一 ID
        const id = `mermaid-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

        // 清空容器
        if (containerRef.current) {
          containerRef.current.innerHTML = '';
        }

        // 渲染 SVG
        const { svg } = await mermaid.default.render(id, code);
        if (cancelled) return;

        if (containerRef.current) {
          containerRef.current.innerHTML = svg;
        }
      } catch (err) {
        if (cancelled) return;
        console.error('Mermaid 渲染失败:', err);
        setError(err instanceof Error ? err.message : '图表语法错误');
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    render();

    return () => {
      cancelled = true;
    };
  }, [code]);

  return (
    <div className='my-4 rounded-xl border border-border bg-muted overflow-hidden font-sans shadow-sm'>
      {/* Header */}
      <div className='flex items-center justify-between px-4 py-3 border-b border-border'>
        <h3 className='font-semibold text-foreground flex items-center gap-2 text-sm'>
          <span>📈</span>
          {title || 'AI 生成流程图'}
        </h3>
      </div>

      {/* Content */}
      <div className='p-4 bg-background/50'>
        {isLoading && (
          <div className='flex items-center justify-center py-8 gap-2 text-muted-foreground'>
            <RefreshCw className='h-4 w-4 animate-spin' />
            <span className='text-xs'>正在渲染图表...</span>
          </div>
        )}

        {error && (
          <div className='flex flex-col items-center justify-center py-6 gap-2'>
            <span className='text-xs text-destructive'>⚠️ {error}</span>
            <pre className='text-xs bg-muted p-3 rounded-lg overflow-x-auto max-w-full text-muted-foreground'>
              {code}
            </pre>
          </div>
        )}

        <div
          ref={containerRef}
          className={`flex justify-center overflow-x-auto ${isLoading || error ? 'hidden' : ''}`}
          style={{ minHeight: isLoading || error ? 0 : 'auto' }}
        />
      </div>
    </div>
  );
}
