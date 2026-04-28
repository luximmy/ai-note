// src/components/editor/blocks/GenerativeUIBlock.tsx
import { GenerativeUIBlock as GenerativeUIBlockType } from '@/types';
import { memo } from 'react';
import { TaskBoard } from '@/components/ai/TaskBoard';

// AI 动态组件注册表 (AI 生成的 componentId 将映射到这里)
const AIComponentRegistry: Record<string, React.FC<any>> = {
  TaskBoard: TaskBoard,
  // 未来可以继续添加：WeatherCard, StockChart, CodeSandbox...
};

function GenerativeUIBlockComponent({
  block,
}: {
  block: GenerativeUIBlockType;
}) {
  const { componentId, status, props } = block.attributes;
  const TargetComponent = AIComponentRegistry[componentId];

  // 状态 1：如果大模型正在思考/流式输出中
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

  // 状态 2：遇到错误
  if (status === 'error') {
    return (
      <div className='my-4 p-4 rounded-xl border border-red-200 bg-red-50 text-red-600 text-sm'>
        ⚠️ 生成组件失败，大模型返回了无法解析的格式。
      </div>
    );
  }

  // 状态 3：如果本地组件库中没有大模型要求的组件
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

  // 状态 4：完美渲染
  return (
    <div className='group relative'>
      <div className='absolute -left-6 top-6 opacity-0 group-hover:opacity-100 transition-opacity text-xs text-indigo-400 font-mono'>
        ✨ AI
      </div>
      <TargetComponent {...props} />
    </div>
  );
}

export const GenerativeUIBlock = memo(GenerativeUIBlockComponent);
