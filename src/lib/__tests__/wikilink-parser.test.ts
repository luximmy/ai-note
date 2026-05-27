import { describe, expect, it } from 'vitest';
import { parseWikilinks, resolveWikilinkTitle, extractContext } from '../wikilink-parser';

describe('parseWikilinks', () => {
  it('提取单个 wikilink', () => {
    expect(parseWikilinks('请参考 [[笔记标题]] 了解更多')).toEqual(['笔记标题']);
  });

  it('提取多个 wikilink', () => {
    expect(parseWikilinks('参见 [[文档A]] 和 [[文档B]]')).toEqual(['文档A', '文档B']);
  });

  it('无 wikilink 时返回空数组', () => {
    expect(parseWikilinks('这是一段普通文字')).toEqual([]);
  });

  it('空字符串返回空数组', () => {
    expect(parseWikilinks('')).toEqual([]);
  });

  it('括号内空格会被 trim', () => {
    expect(parseWikilinks('[[  有空格  ]]')).toEqual(['有空格']);
  });

  it('连续两个 wikilink 无分隔', () => {
    expect(parseWikilinks('[[A]][[B]]')).toEqual(['A', 'B']);
  });
});

describe('resolveWikilinkTitle', () => {
  const docs = [
    { id: '1', title: '笔记A' },
    { id: '2', title: '笔记B' },
  ];

  it('精确匹配返回对应 ID', () => {
    expect(resolveWikilinkTitle('笔记A', docs)).toBe('1');
  });

  it('无匹配返回 null', () => {
    expect(resolveWikilinkTitle('不存在', docs)).toBeNull();
  });

  it('空文档数组返回 null', () => {
    expect(resolveWikilinkTitle('笔记A', [])).toBeNull();
  });

  it('大小写敏感', () => {
    expect(resolveWikilinkTitle('笔记a', docs)).toBeNull();
  });
});

describe('extractContext', () => {
  const content = '这是一段很长的文字，其中包含一个[[目标链接]]在中间位置，后面还有更多内容用于测试上下文提取功能。';

  it('提取链接周围的上下文', () => {
    const matchIndex = content.indexOf('[[目标链接]]');
    const result = extractContext(content, matchIndex, '[[目标链接]]'.length, 10);
    expect(result).toContain('[[目标链接]]');
    expect(result.startsWith('...')).toBe(true);
    expect(result.endsWith('...')).toBe(true);
  });

  it('链接在开头时不带前缀省略号', () => {
    const text = '[[开头链接]]后面有内容用于测试';
    const result = extractContext(text, 0, '[[开头链接]]'.length, 5);
    expect(result.startsWith('...')).toBe(false);
    expect(result).toContain('[[开头链接]]');
  });

  it('链接在结尾时不带后缀省略号', () => {
    const text = '前面有内容用于测试[[结尾链接]]';
    const matchIndex = text.indexOf('[[结尾链接]]');
    const result = extractContext(text, matchIndex, '[[结尾链接]]'.length, 5);
    expect(result.endsWith('...')).toBe(false);
    expect(result).toContain('[[结尾链接]]');
  });

  it('文本短于半径时返回全文', () => {
    const short = '[[短]]';
    const result = extractContext(short, 0, short.length, 40);
    expect(result).toBe(short);
    expect(result.startsWith('...')).toBe(false);
    expect(result.endsWith('...')).toBe(false);
  });
});
