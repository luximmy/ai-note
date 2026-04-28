import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import NoteError from './error';

const mockRefresh = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    refresh: mockRefresh,
  }),
}));

describe('NoteError', () => {
  it('应展示错误信息并支持重试', () => {
    const reset = vi.fn();

    render(
      <NoteError
        error={new Error('网络请求超时')}
        reset={reset}
      />,
    );

    expect(screen.getByText('数据加载失败')).toBeInTheDocument();
    expect(screen.getByText('网络请求超时')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '尝试重新加载' }));
    expect(mockRefresh).toHaveBeenCalledTimes(1);
    expect(reset).toHaveBeenCalledTimes(1);
  });
});
