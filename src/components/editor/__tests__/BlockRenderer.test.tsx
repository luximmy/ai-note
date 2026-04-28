import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BlockRenderer } from '../BlockRenderer';
import type { Block } from '@/types';
import { updateBlockAction } from '@/actions/note';

const { mockRefresh, mockToastError } = vi.hoisted(() => ({
  mockRefresh: vi.fn(),
  mockToastError: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    refresh: mockRefresh,
  }),
}));

vi.mock('sonner', () => ({
  toast: {
    error: mockToastError,
  },
}));

vi.mock('@/actions/note', () => ({
  updateBlockAction: vi.fn(),
}));

vi.mock('@/components/editor/blocks/ParagraphBlock', () => ({
  ParagraphBlock: () => null,
}));

vi.mock('@/components/editor/blocks/HeadingBlock', () => ({
  HeadingBlock: () => null,
}));

vi.mock('@/components/editor/blocks/CodeBlock', () => ({
  CodeBlock: () => null,
}));

vi.mock('@/components/editor/blocks/TodoBlock', () => ({
  TodoBlock: ({
    block,
    onUpdate,
  }: {
    block: Extract<Block, { type: 'todo' }>;
    onUpdate?: (id: string, updates: Partial<Block>) => void;
  }) => (
    <button
      type='button'
      onClick={() =>
        onUpdate?.(block.id, {
          attributes: {
            checked: !block.attributes?.checked,
          },
        })
      }
    >
      {String(block.attributes?.checked)}
    </button>
  ),
}));

describe('BlockRenderer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('保存成功时应提交合并后的更新', async () => {
    vi.mocked(updateBlockAction).mockResolvedValueOnce({
      success: true,
      timestamp: Date.now(),
    });

    render(
      <BlockRenderer
        noteId='doc_001'
        blocks={[
          {
            id: 'todo_1',
            type: 'todo',
            content: 'test',
            attributes: {
              checked: false,
            },
          } as Block,
        ]}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'false' }));
    expect(screen.getByRole('button', { name: 'true' })).toBeInTheDocument();

    await act(async () => {
      vi.advanceTimersByTime(800);
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(updateBlockAction).toHaveBeenCalledWith(
      'doc_001',
      'todo_1',
      expect.objectContaining({
        attributes: expect.objectContaining({ checked: true }),
      }),
    );
  });

  it('保存失败时应回滚并触发错误提示', async () => {
    vi.mocked(updateBlockAction).mockRejectedValueOnce(new Error('mock failure'));

    render(
      <BlockRenderer
        noteId='doc_001'
        blocks={[
          {
            id: 'todo_1',
            type: 'todo',
            content: 'test',
            attributes: {
              checked: false,
            },
          } as Block,
        ]}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'false' }));
    expect(screen.getByRole('button', { name: 'true' })).toBeInTheDocument();

    await act(async () => {
      vi.advanceTimersByTime(800);
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(mockToastError).toHaveBeenCalled();
    expect(mockRefresh).toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'false' })).toBeInTheDocument();
  });
});
