import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { GenerativeUIBlock } from './GenerativeUIBlock';
import type { GenerativeUIBlock as GenerativeUIBlockType } from '@/types';

function createBlock(
  attributes: GenerativeUIBlockType['attributes'],
): GenerativeUIBlockType {
  return {
    id: 'gen_1',
    type: 'generative_ui',
    attributes,
  };
}

describe('GenerativeUIBlock', () => {
  it('应渲染 streaming 状态', () => {
    render(
      <GenerativeUIBlock
        block={createBlock({
          componentId: 'TaskBoard',
          status: 'streaming',
          props: {},
        })}
      />,
    );

    expect(
      screen.getByText('AI 正在生成 TaskBoard 组件...'),
    ).toBeInTheDocument();
  });

  it('应渲染 error 降级状态', () => {
    render(
      <GenerativeUIBlock
        block={createBlock({
          componentId: 'TaskBoard',
          status: 'error',
          props: {},
        })}
      />,
    );

    expect(
      screen.getByText('⚠️ 生成组件失败，大模型返回了无法解析的格式。'),
    ).toBeInTheDocument();
  });

  it('遇到未知 componentId 时应展示降级 UI', () => {
    render(
      <GenerativeUIBlock
        block={createBlock({
          componentId: 'UnknownCard',
          status: 'completed',
          props: {
            title: 'fallback data',
          },
        })}
      />,
    );

    expect(screen.getByText('未知组件类型: UnknownCard')).toBeInTheDocument();
    expect(screen.getByText(/fallback data/)).toBeInTheDocument();
  });

  it('已知组件收到异常 props 时不应崩溃', () => {
    render(
      <GenerativeUIBlock
        block={createBlock({
          componentId: 'TaskBoard',
          status: 'completed',
          props: {
            tasks: 'invalid tasks payload',
          },
        })}
      />,
    );

    expect(screen.getByText('AI 生成任务看板')).toBeInTheDocument();
    expect(screen.getByText('0 / 0')).toBeInTheDocument();
  });
});
