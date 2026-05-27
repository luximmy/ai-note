// src/components/editor/blocks/GenerativeUIBlock.tsx
import { GenerativeUIBlock as GenerativeUIBlockType } from '@/types';
import { memo } from 'react';
import { TaskBoard } from '@/components/ai/TaskBoard';
import { BlockComponentProps } from '../BlockRenderer';

export type AIComponentProps = {
  tasks?: unknown; // 针对 TaskBoard
  onUpdateProps?: (newProps: Record<string, unknown>) => void; // ✨ 核心：属性更新回调
} & Record<string, unknown>;

const AIComponentRegistry: Record<string, React.FC<AIComponentProps>> = {
  TaskBoard: TaskBoard as React.FC<AIComponentProps>,
};

export const KNOWN_COMPONENT_IDS = Object.keys(
  AIComponentRegistry,
) as readonly string[];

function sanitizeProps(raw: unknown): AIComponentProps {
  if (raw !== null && typeof raw === 'object' && !Array.isArray(raw)) {
    return raw as AIComponentProps;
  }
  return {};
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
  // ✨ 3. 定义局部更新逻辑：当组件内部状态改变时，同步到编辑器的 attributes.props 中
  const handleComponentUpdate = (newProps: Record<string, unknown>) => {
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
  };

  if (status === 'streaming') {
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
          AI 正在生成 {componentId} 组件...
        </p>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className='my-4 p-4 rounded-xl border border-red-200 bg-red-50 text-red-600 text-sm'>
        ⚠️ 生成组件失败，大模型返回了无法解析的格式。
      </div>
    );
  }

  if (!TargetComponent) {
    return (
      <div className='my-4 p-4 rounded-xl border border-amber-200 bg-amber-50 text-amber-700 text-sm flex flex-col gap-2'>
        <div className='font-bold flex items-center gap-2'>
          <span>🧩</span> 未知组件类型: {componentId}
        </div>
        <pre className='text-xs bg-background/50 p-2 rounded overflow-x-auto'>
          {JSON.stringify(props, null, 2)}
        </pre>
      </div>
    );
  }

  return (
    <div className='group relative'>
      <div className='absolute -left-6 top-6 opacity-0 group-hover:opacity-100 transition-opacity text-xs text-primary font-mono'>
        ✨ AI
      </div>
      {/* ✨ 4. 将更新方法注入组件 */}
      <TargetComponent
        {...sanitizeProps(props)}
        onUpdateProps={handleComponentUpdate}
      />
    </div>
  );
}

export const GenerativeUIBlock = memo(GenerativeUIBlockComponent);
