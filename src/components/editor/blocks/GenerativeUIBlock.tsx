// src/components/editor/blocks/GenerativeUIBlock.tsx
import { GenerativeUIBlock as GenerativeUIBlockType } from '@/types';
import { memo, useState, useRef, useCallback, useEffect } from 'react';
import { TaskBoard } from '@/components/ai/TaskBoard';
import { DataTable } from '@/components/ai/DataTable';
import { MermaidDiagram } from '@/components/ai/MermaidDiagram';
import { Timeline } from '@/components/ai/Timeline';
import { BlockComponentProps } from '../BlockRenderer';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export type AIComponentProps = {
  tasks?: unknown; // TaskBoard
  columns?: unknown; // DataTable
  rows?: unknown; // DataTable
  title?: string; // DataTable / MermaidDiagram / Timeline
  code?: string; // MermaidDiagram
  events?: unknown; // Timeline
  onUpdateProps?: (newProps: Record<string, unknown>) => void;
} & Record<string, unknown>;

const AIComponentRegistry: Record<string, React.FC<AIComponentProps>> = {
  TaskBoard: TaskBoard as React.FC<AIComponentProps>,
  DataTable: DataTable as React.FC<AIComponentProps>,
  MermaidDiagram: MermaidDiagram as React.FC<AIComponentProps>,
  Timeline: Timeline as React.FC<AIComponentProps>,
};

export const KNOWN_COMPONENT_IDS = Object.keys(
  AIComponentRegistry,
) as readonly string[];

export function sanitizeProps(raw: unknown): AIComponentProps {
  if (raw !== null && typeof raw === 'object' && !Array.isArray(raw)) {
    return raw as AIComponentProps;
  }
  return {};
}

/**
 * 从 AI 流式文本中提取 JSON 对象
 * 支持从 ```json ... ``` 代码块中提取，或直接解析完整 JSON
 */
export function extractJsonFromStream(text: string): Record<string, unknown> | null {
  // 尝试从 ```json ... ``` 代码块中提取
  const codeBlockMatch = text.match(/```json\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    try {
      return JSON.parse(codeBlockMatch[1].trim());
    } catch {
      // 继续尝试其他方式
    }
  }

  // 尝试直接解析整个文本（可能 JSON 还没完整）
  // 查找第一个 { 和最后一个 }
  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    try {
      return JSON.parse(text.slice(firstBrace, lastBrace + 1));
    } catch {
      // JSON 还不完整
    }
  }

  return null;
}

/**
 * Prompt 输入组件 — 当 streaming 状态且无 props 时显示
 */
function PromptInput({
  onSubmit,
  isLoading,
}: {
  onSubmit: (prompt: string) => void;
  isLoading: boolean;
}) {
  const [prompt, setPrompt] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (prompt.trim() && !isLoading) {
      onSubmit(prompt.trim());
    }
  };

  const quickPrompts = [
    { label: '📋 任务看板', value: '帮我做一个项目任务看板，包含待办、进行中、已完成的任务' },
    { label: '📊 数据表格', value: '帮我做一个数据对比表格' },
    { label: '📈 流程图', value: '帮我画一个流程图' },
    { label: '📅 时间线', value: '帮我做一个时间线' },
  ];

  return (
    <div className='my-4 p-5 rounded-xl border border-dashed border-primary/30 bg-primary/5'>
      <div className='flex items-center gap-2 mb-3'>
        <span className='text-lg'>✨</span>
        <span className='text-sm font-semibold text-foreground'>AI 组件生成器</span>
      </div>
      <p className='text-xs text-muted-foreground mb-3'>
        描述你想要的组件，AI 将为你生成可交互的 UI
      </p>

      <form onSubmit={handleSubmit} className='flex gap-2 mb-3'>
        <input
          type='text'
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder='例如：帮我做一个项目进度表...'
          className='flex-1 px-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/30'
          autoFocus
          disabled={isLoading}
        />
        <Button
          type='submit'
          size='sm'
          disabled={!prompt.trim() || isLoading}
          className='px-3'
        >
          {isLoading ? '...' : '生成'}
        </Button>
      </form>

      <div className='flex flex-wrap gap-1.5'>
        {quickPrompts.map((qp) => (
          <button
            key={qp.label}
            type='button'
            onClick={() => {
              setPrompt(qp.value);
              onSubmit(qp.value);
            }}
            disabled={isLoading}
            className='px-2.5 py-1 text-xs rounded-full border border-border bg-background text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors disabled:opacity-50'
          >
            {qp.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * 生成中状态组件
 */
function GeneratingState({ streamedText }: { streamedText: string }) {
  // 尝试从流式文本中提取当前状态
  const hasJson = streamedText.includes('{');
  const progress = hasJson ? '正在解析组件数据...' : 'AI 正在思考...';

  return (
    <div className='my-4 p-6 rounded-xl border border-dashed border-primary/20 bg-primary/5 flex flex-col items-center justify-center gap-3'>
      <div className='flex gap-1'>
        <span
          className='w-2 h-2 rounded-full bg-primary animate-bounce'
          style={{ animationDelay: '0ms' }}
        />
        <span
          className='w-2 h-2 rounded-full bg-primary animate-bounce'
          style={{ animationDelay: '150ms' }}
        />
        <span
          className='w-2 h-2 rounded-full bg-primary animate-bounce'
          style={{ animationDelay: '300ms' }}
        />
      </div>
      <p className='text-xs text-primary font-medium animate-pulse'>
        {progress}
      </p>
    </div>
  );
}

function GenerativeUIBlockComponent({
  block,
  onUpdate,
}: BlockComponentProps<GenerativeUIBlockType>) {
  const { componentId, status, props } = block.attributes;
  const isKnown = KNOWN_COMPONENT_IDS.includes(componentId);
  const TargetComponent = isKnown
    ? AIComponentRegistry[componentId]
    : undefined;

  // 本地生成状态
  const [isGenerating, setIsGenerating] = useState(false);
  const [streamedText, setStreamedText] = useState('');
  const abortControllerRef = useRef<AbortController | null>(null);

  // 清理 abort controller
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  const handleComponentUpdate = useCallback(
    (newProps: Record<string, unknown>) => {
      if (onUpdate) {
        onUpdate(block.id, {
          attributes: {
            ...block.attributes,
            props: {
              ...block.attributes.props,
              ...newProps,
            },
          },
        });
      }
    },
    [block.id, block.attributes, onUpdate],
  );

  /**
   * 调用 /api/generate-ui 生成组件
   */
  const handleGenerate = useCallback(
    async (prompt: string) => {
      setIsGenerating(true);
      setStreamedText('');

      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      try {
        const response = await fetch('/api/generate-ui', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt }),
          signal: abortController.signal,
        });

        if (!response.ok) {
          throw new Error(`API 返回 ${response.status}`);
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error('无法读取响应流');

        const decoder = new TextDecoder();
        let fullText = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          fullText += chunk;
          setStreamedText(fullText);

          // 尝试解析 JSON
          const jsonData = extractJsonFromStream(fullText);
          if (jsonData && jsonData.componentId && jsonData.props) {
            // JSON 已完整，更新 block
            onUpdate?.(block.id, {
              attributes: {
                ...block.attributes,
                componentId: jsonData.componentId as string,
                status: 'completed',
                props: jsonData.props as Record<string, unknown>,
              },
            });
            setIsGenerating(false);
            toast.success('AI 组件生成完成');
            return;
          }
        }

        // 流结束但未解析到有效 JSON
        const finalJson = extractJsonFromStream(fullText);
        if (finalJson && finalJson.componentId && finalJson.props) {
          onUpdate?.(block.id, {
            attributes: {
              ...block.attributes,
              componentId: finalJson.componentId as string,
              status: 'completed',
              props: finalJson.props as Record<string, unknown>,
            },
          });
          toast.success('AI 组件生成完成');
        } else {
          throw new Error('AI 返回的内容无法解析为有效组件');
        }
      } catch (err) {
        if (abortController.signal.aborted) return; // 用户取消

        console.error('Generative UI 生成失败:', err);
        toast.error('AI 组件生成失败', {
          description: err instanceof Error ? err.message : '未知错误',
        });

        onUpdate?.(block.id, {
          attributes: {
            ...block.attributes,
            status: 'error',
          },
        });
      } finally {
        setIsGenerating(false);
        abortControllerRef.current = null;
      }
    },
    [block.id, block.attributes, onUpdate],
  );

  // 错误状态
  if (status === 'error') {
    return (
      <div className='my-4 p-4 rounded-xl border border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-800 flex flex-col gap-3'>
        <div className='flex items-center gap-2 text-red-600 dark:text-red-400 text-sm'>
          <span>⚠️</span>
          <span>生成组件失败</span>
        </div>
        <p className='text-xs text-red-500 dark:text-red-400'>
          AI 返回了无法解析的格式，请重试。
        </p>
        <div className='flex gap-2'>
          <Button
            variant='outline'
            size='sm'
            onClick={() => {
              onUpdate?.(block.id, {
                attributes: {
                  ...block.attributes,
                  status: 'streaming',
                  props: {},
                },
              });
            }}
            className='h-7 text-xs'
          >
            重试
          </Button>
        </div>
      </div>
    );
  }

  // streaming 状态且无 props → 显示 prompt 输入
  if (status === 'streaming' && (!props || Object.keys(props).length === 0)) {
    if (isGenerating) {
      return <GeneratingState streamedText={streamedText} />;
    }
    return <PromptInput onSubmit={handleGenerate} isLoading={isGenerating} />;
  }

  // streaming 状态但有 props（从其他路径插入的）→ 显示加载动画
  if (status === 'streaming' && props && Object.keys(props).length > 0) {
    return <GeneratingState streamedText={streamedText} />;
  }

  // 未知组件
  if (!TargetComponent) {
    return (
      <div className='my-4 p-4 rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 text-amber-700 dark:text-amber-400 text-sm flex flex-col gap-2'>
        <div className='font-bold flex items-center gap-2'>
          <span>🧩</span> 未知组件类型: {componentId}
        </div>
        <pre className='text-xs bg-background/50 p-2 rounded overflow-x-auto'>
          {JSON.stringify(props, null, 2)}
        </pre>
      </div>
    );
  }

  // 正常渲染组件
  return (
    <div className='group relative'>
      <div className='absolute -left-6 top-6 opacity-0 group-hover:opacity-100 transition-opacity text-xs text-primary font-mono'>
        ✨ AI
      </div>
      <TargetComponent
        {...sanitizeProps(props)}
        onUpdateProps={handleComponentUpdate}
      />
    </div>
  );
}

export const GenerativeUIBlock = memo(GenerativeUIBlockComponent);
