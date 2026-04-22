// src/components/editor/BlockRenderer.tsx
import { FC } from 'react';
import { Block } from '@/types';
import { ParagraphBlock } from './blocks/ParagraphBlock';
import { HeadingBlock } from './blocks/HeadingBlock';
import { CodeBlock } from './blocks/CodeBlock';

/**
 * 区块组件注册表 (Block Registry)
 * 核心架构升级：将 O(N) 的条件分支替换为 O(1) 的字典映射
 * 遵循开闭原则 (OCP)：未来新增区块只需在此处添加一行，无需修改渲染调度逻辑
 */
const BlockRegistry: Record<string, FC<{ block: any }>> = {
  paragraph: ParagraphBlock,
  heading: HeadingBlock,
  code: CodeBlock,
  // 预留位置，后续在这里添加 todo, image, generative_ui 等
};

export function BlockRenderer({ blocks }: { blocks: Block[] }) {
  if (!blocks || blocks.length === 0) {
    return (
      <div className='text-zinc-400 italic'>空空如也，敲击键盘开始记录...</div>
    );
  }

  return (
    <div className='space-y-4'>
      {blocks.map((block) => (
        <div
          key={block.id}
          className='group relative'
        >
          {/* 这里预留了给后续任务的“拖拽把手”和“区块悬浮菜单”的位置 */}
          <BlockNode block={block} />
        </div>
      ))}
    </div>
  );
}

/**
 * 核心路由节点：通过查表法动态渲染组件
 */
function BlockNode({ block }: { block: Block }) {
  // 1. 从注册表中取出对应的组件引用
  const TargetComponent = BlockRegistry[block.type];

  // 2. 兜底容错：如果数据库里存了未注册的新区块类型，优雅降级
  if (!TargetComponent) {
    return (
      <div className='text-red-500 border border-red-200 p-2 bg-red-50 rounded text-sm'>
        [未知区块类型]: {block.type}
      </div>
    );
  }

  // 3. 动态执行渲染
  return <TargetComponent block={block} />;
}
