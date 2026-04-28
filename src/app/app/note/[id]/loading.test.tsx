import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import NoteLoading from './loading';

describe('NoteLoading', () => {
  it('应渲染骨架屏容器', () => {
    const { container } = render(<NoteLoading />);
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
    expect(container.querySelectorAll('.bg-zinc-100').length).toBeGreaterThan(0);
  });
});
