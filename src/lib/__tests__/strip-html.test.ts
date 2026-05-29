import { describe, expect, it } from 'vitest';
import { stripHtml, markdownToHtml, ensureHtml } from '../strip-html';

// ─── stripHtml ───

describe('stripHtml', () => {
  it('空字符串 → 空字符串', () => {
    expect(stripHtml('')).toBe('');
  });

  it('基本标签去除', () => {
    expect(stripHtml('<p>hello</p>')).toBe('hello');
  });

  it('br 标签转换为换行（多种写法）', () => {
    expect(stripHtml('a<br>b')).toBe('a\nb');
    expect(stripHtml('a<br/>b')).toBe('a\nb');
    expect(stripHtml('a<br />b')).toBe('a\nb');
    expect(stripHtml('a<BR>b')).toBe('a\nb');
  });

  it('p 闭合标签转换为换行', () => {
    expect(stripHtml('<p>para1</p><p>para2</p>')).toBe('para1\npara2');
  });

  it('连续 p 闭合标签产生多换行并折叠', () => {
    // </p><p> → \n\n, 但中间无内容所以是 \n\n
    expect(stripHtml('<p>a</p><p>b</p>')).toBe('a\nb');
  });

  it('带属性的标签', () => {
    expect(stripHtml('<p class="test">hello</p>')).toBe('hello');
    expect(stripHtml('<span style="color:red">text</span>')).toBe('text');
  });

  it('嵌套标签', () => {
    expect(stripHtml('<div><span>text</span></div>')).toBe('text');
    expect(stripHtml('<p><strong>bold</strong> normal</p>')).toBe('bold normal');
  });

  it('HTML 实体解码', () => {
    expect(stripHtml('a &amp; b')).toBe('a & b');
    expect(stripHtml('&lt;div&gt;')).toBe('<div>');
    expect(stripHtml('&quot;hello&quot;')).toBe('"hello"');
    expect(stripHtml('it&#39;s')).toBe("it's");
  });

  it('三连+ 换行折叠为双换行', () => {
    expect(stripHtml('a\n\n\n\nb')).toBe('a\n\nb');
  });

  it('纯文本（无标签）→ 原样返回', () => {
    expect(stripHtml('hello world')).toBe('hello world');
  });

  it('br 带属性时被通用标签规则去除（不转为换行）', () => {
    // <br class="break"/> 不匹配 /<br\s*\/?>/，会被 <[^>]+> 去除标签
    expect(stripHtml('a<br class="break"/>b')).toBe('ab');
  });
});

// ─── markdownToHtml ───

describe('markdownToHtml', () => {
  it('空字符串 → 空字符串', () => {
    expect(markdownToHtml('')).toBe('');
  });

  it('**bold** → <strong>', () => {
    expect(markdownToHtml('**bold**')).toBe('<strong>bold</strong>');
  });

  it('__bold__ → <strong>', () => {
    expect(markdownToHtml('__bold__')).toBe('<strong>bold</strong>');
  });

  it('*italic* → <em>', () => {
    expect(markdownToHtml('*italic*')).toBe('<em>italic</em>');
  });

  it('_italic_ → <em>（词边界）', () => {
    expect(markdownToHtml('_italic_')).toBe('<em>italic</em>');
  });

  it('中间下划线不匹配（some_var_name）', () => {
    expect(markdownToHtml('some_var_name')).toBe('some_var_name');
  });

  it('`code` → <code>', () => {
    expect(markdownToHtml('use `console.log`')).toBe(
      'use <code>console.log</code>',
    );
  });

  it('~~del~~ → <del>', () => {
    expect(markdownToHtml('~~deleted~~')).toBe('<del>deleted</del>');
  });

  it('[text](url) → <a>', () => {
    expect(markdownToHtml('[Google](https://google.com)')).toBe(
      '<a href="https://google.com">Google</a>',
    );
  });

  it('混合格式同行', () => {
    const input = '**bold** and *italic* and `code`';
    const result = markdownToHtml(input);
    expect(result).toContain('<strong>bold</strong>');
    expect(result).toContain('<em>italic</em>');
    expect(result).toContain('<code>code</code>');
  });

  it('无 markdown 文本 → 原样', () => {
    expect(markdownToHtml('hello world')).toBe('hello world');
  });
});

// ─── ensureHtml ───

describe('ensureHtml', () => {
  it('空字符串 → 空字符串', () => {
    expect(ensureHtml('')).toBe('');
  });

  it('已有 HTML 标签 → 原样返回', () => {
    const html = '<p>already html</p>';
    expect(ensureHtml(html)).toBe(html);
  });

  it('已有 div 标签 → 原样返回', () => {
    expect(ensureHtml('<div>content</div>')).toBe('<div>content</div>');
  });

  it('纯文本单换行 → <p>line1<br>line2</p>', () => {
    expect(ensureHtml('line1\nline2')).toBe('<p>line1<br>line2</p>');
  });

  it('纯文本双换行 → 两段 <p>', () => {
    expect(ensureHtml('para1\n\npara2')).toBe('<p>para1</p><p>para2</p>');
  });

  it('纯文本无换行 → 单段 <p>', () => {
    expect(ensureHtml('single line')).toBe('<p>single line</p>');
  });

  it('已有 br 标签 → 原样返回', () => {
    expect(ensureHtml('a<br>b')).toBe('a<br>b');
  });
});
