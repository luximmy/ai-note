import { describe, expect, it } from 'vitest';
import { parseMarkdownToBlocks } from '../parse-markdown-to-blocks';

describe('parseMarkdownToBlocks', () => {
  // ─── 基础 ───

  it('空字符串 → 空数组', () => {
    expect(parseMarkdownToBlocks('')).toEqual([]);
  });

  it('纯文本段落 → 1 个 paragraph block', () => {
    const result = parseMarkdownToBlocks('hello world');
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('paragraph');
    expect(result[0].content).toContain('hello world');
  });

  it('多段落（双换行分隔）→ 多个 paragraph block', () => {
    const result = parseMarkdownToBlocks('para1\n\npara2\n\npara3');
    expect(result).toHaveLength(3);
    expect(result.every((b) => b.type === 'paragraph')).toBe(true);
  });

  // ─── 标题 ───

  it('# H1 → heading level 1', () => {
    const result = parseMarkdownToBlocks('# Title');
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('heading');
    expect(result[0].attributes?.level).toBe(1);
  });

  it('## H2 → heading level 2', () => {
    const result = parseMarkdownToBlocks('## Subtitle');
    expect(result[0].attributes?.level).toBe(2);
  });

  it('### H3 → heading level 3', () => {
    const result = parseMarkdownToBlocks('### Section');
    expect(result[0].attributes?.level).toBe(3);
  });

  it('#### 四级标题 → 降级为段落', () => {
    const result = parseMarkdownToBlocks('#### too deep');
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('paragraph');
  });

  it('标题内含行内 markdown', () => {
    const result = parseMarkdownToBlocks('# **bold** title');
    expect(result[0].type).toBe('heading');
    expect(result[0].content).toContain('<strong>bold</strong>');
  });

  // ─── 代码块 ───

  it('带语言标记的代码块', () => {
    const md = '```js\nconsole.log("hi")\n```';
    const result = parseMarkdownToBlocks(md);
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('code');
    expect(result[0].attributes?.language).toBe('js');
    expect(result[0].content).toBe('console.log("hi")');
  });

  it('无语言标记 → plaintext', () => {
    const md = '```\nsome code\n```';
    const result = parseMarkdownToBlocks(md);
    expect(result[0].attributes?.language).toBe('plaintext');
  });

  it('未闭合代码块 → 读到 EOF', () => {
    const md = '```js\nline1\nline2';
    const result = parseMarkdownToBlocks(md);
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('code');
    expect(result[0].content).toBe('line1\nline2');
  });

  it('JSON 代码块含 componentId → generative_ui block', () => {
    const md =
      '```json\n{"componentId":"TaskBoard","props":{"tasks":[]}}\n```';
    const result = parseMarkdownToBlocks(md);
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('generative_ui');
    expect(result[0].attributes?.componentId).toBe('TaskBoard');
    expect(result[0].attributes?.status).toBe('completed');
  });

  it('JSON 代码块不含 componentId → code block', () => {
    const md = '```json\n{"key":"value"}\n```';
    const result = parseMarkdownToBlocks(md);
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('code');
    expect(result[0].attributes?.language).toBe('json');
  });

  it('无效 JSON 代码块 → code block', () => {
    const md = '```json\n{invalid json\n```';
    const result = parseMarkdownToBlocks(md);
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('code');
  });

  // ─── Todo 列表 ───

  it('- [ ] 未完成 → todo checked: false', () => {
    const result = parseMarkdownToBlocks('- [ ] buy milk');
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('todo');
    expect(result[0].attributes?.checked).toBe(false);
    expect(result[0].content).toBe('buy milk');
  });

  it('- [x] 已完成 → todo checked: true', () => {
    const result = parseMarkdownToBlocks('- [x] done task');
    expect(result[0].attributes?.checked).toBe(true);
  });

  it('- [X] 大写已完成 → todo checked: true', () => {
    const result = parseMarkdownToBlocks('- [X] done task');
    expect(result[0].attributes?.checked).toBe(true);
  });

  it('连续多个 todo', () => {
    const md = '- [ ] task 1\n- [x] task 2\n- [ ] task 3';
    const result = parseMarkdownToBlocks(md);
    expect(result).toHaveLength(3);
    expect(result.every((b) => b.type === 'todo')).toBe(true);
    expect(result[1].attributes?.checked).toBe(true);
  });

  // ─── 无序列表 ───

  it('无序列表 → paragraph block (HTML ul)', () => {
    const result = parseMarkdownToBlocks('- item 1\n- item 2');
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('paragraph');
    expect(result[0].content).toContain('<ul>');
    expect(result[0].content).toContain('<li>');
  });

  it('三种 bullet 标记都支持', () => {
    const md = '- dash\n* star\n+ plus';
    const result = parseMarkdownToBlocks(md);
    expect(result).toHaveLength(1);
    expect(result[0].content).toContain('dash');
    expect(result[0].content).toContain('star');
    expect(result[0].content).toContain('plus');
  });

  // ─── 有序列表 ───

  it('有序列表 → paragraph block (HTML ol)', () => {
    const md = '1. first\n2. second\n3. third';
    const result = parseMarkdownToBlocks(md);
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('paragraph');
    expect(result[0].content).toContain('<ol>');
  });

  // ─── 分割线 ───

  it('分割线 --- → paragraph with <hr>', () => {
    const result = parseMarkdownToBlocks('---');
    expect(result).toHaveLength(1);
    expect(result[0].content).toBe('<hr>');
  });

  it('分割线 ***', () => {
    const result = parseMarkdownToBlocks('***');
    expect(result).toHaveLength(1);
    expect(result[0].content).toBe('<hr>');
  });

  it('分割线 ___', () => {
    const result = parseMarkdownToBlocks('___');
    expect(result).toHaveLength(1);
    expect(result[0].content).toBe('<hr>');
  });

  // ─── 引用块 ───

  it('引用块 → paragraph block (blockquote)', () => {
    const md = '> quote line 1\n> quote line 2';
    const result = parseMarkdownToBlocks(md);
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('paragraph');
    expect(result[0].content).toContain('<blockquote>');
    expect(result[0].content).toContain('quote line 1');
    expect(result[0].content).toContain('quote line 2');
  });

  // ─── 段落内行内格式 ───

  it('段落内行内 markdown 被转换', () => {
    const result = parseMarkdownToBlocks('**bold** and *italic*');
    expect(result[0].content).toContain('<strong>bold</strong>');
    expect(result[0].content).toContain('<em>italic</em>');
  });

  // ─── 行尾符 ───

  it('Windows 行尾 \\r\\n 被正确处理', () => {
    const result = parseMarkdownToBlocks('line1\r\n\r\nline2');
    expect(result).toHaveLength(2);
  });

  // ─── 混合内容 ───

  it('标题 + 段落 + 代码块混合', () => {
    const md = '# Title\n\nSome text\n\n```js\ncode\n```';
    const result = parseMarkdownToBlocks(md);
    expect(result).toHaveLength(3);
    expect(result[0].type).toBe('heading');
    expect(result[1].type).toBe('paragraph');
    expect(result[2].type).toBe('code');
  });
});
