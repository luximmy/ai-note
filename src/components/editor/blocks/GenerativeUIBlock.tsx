// src/components/editor/blocks/GenerativeUIBlock.tsx
import { GenerativeUIBlock as GenerativeUIBlockType } from '@/types';
import { memo } from 'react';
import { TaskBoard } from '@/components/ai/TaskBoard';

// 🚀 优化类型 1：定义 AI 组件的通用 Props 基础结构
// 使用 Record<string, unknown> 代替 any，保证类型安全，防止组件内部随意乱点属性
export type AIComponentProps = Record<string, unknown>;

// 🚀 优化类型 2：收敛注册表的 any
const AIComponentRegistry: Record<string, React.FC<AIComponentProps>> = {
  TaskBoard: TaskBoard as React.FC<AIComponentProps>,
  // 未来新增的 AI 组件统一在此注册，并在断言时确保遵循 AIComponentProps 契约
};

function GenerativeUIBlockComponent({
  block,
}: {
  block: GenerativeUIBlockType;
}) {
  const { componentId, status, props } = block.attributes;
  const TargetComponent = AIComponentRegistry[componentId];

  if (status === 'streaming') {
    return (
      <div className='my-4 p-6 rounded-xl border border-dashed border-indigo-200 bg-indigo-50/30 flex flex-col items-center justify-center gap-3'>
        <div className='flex gap-1'>
          <span
            className='w-2 h-2 rounded-full bg-indigo-400 animate-bounce'
            style={{ animationDelay: '0ms' }}
          />
          <span
            className='w-2 h-2 rounded-full bg-indigo-400 animate-bounce'
            style={{ animationDelay: '150ms' }}
          />
          <span
            className='w-2 h-2 rounded-full bg-indigo-400 animate-bounce'
            style={{ animationDelay: '300ms' }}
          />
        </div>
        <p className='text-xs text-indigo-400 font-medium animate-pulse'>
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
        <pre className='text-xs bg-white/50 p-2 rounded overflow-x-auto'>
          {JSON.stringify(props, null, 2)}
        </pre>
      </div>
    );
  }

  return (
    <div className='group relative'>
      <div className='absolute -left-6 top-6 opacity-0 group-hover:opacity-100 transition-opacity text-xs text-indigo-400 font-mono'>
        ✨ AI
      </div>
      {/* 🚀 优化类型 3：安全的展开注入 */}
      <TargetComponent {...(props as AIComponentProps)} />
    </div>
  );
}

export const GenerativeUIBlock = memo(GenerativeUIBlockComponent);
