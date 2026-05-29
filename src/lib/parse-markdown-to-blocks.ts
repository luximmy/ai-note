// src/lib/parse-markdown-to-blocks.ts
import { PendingInsert } from '@/store';
import { markdownToHtml } from '@/lib/strip-html';

/** 将 markdown 段落文本转为 Tiptap 可接受的 HTML */
function toParagraphHtml(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return '';
  const lines = trimmed.split('\n');
  const htmlLines = lines.map((l) => markdownToHtml(l));
  return `<p>${htmlLines.join('<br>')}</p>`;
}

/**
 * 将 AI 回复的 Markdown 文本解析为 PendingInsert 数组
 * 逐行解析，支持：JSON 代码块、代码块、标题、Todo 列表、无序列表、分割线、段落
 * 段落内容会转换为 HTML（保留 **bold**、*italic*、`code` 等内联格式）
 */
export function parseMarkdownToBlocks(text: string): PendingInsert[] {
  const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = normalized.split('\n');
  const blocks: PendingInsert[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // 跳过空行
    if (line.trim() === '') {
      i++;
      continue;
    }

    // 1. JSON 代码块 ```json ... ```
    if (line.trim().startsWith('```json')) {
      const jsonLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        jsonLines.push(lines[i]);
        i++;
      }
      if (i < lines.length) i++;

      try {
        const data = JSON.parse(jsonLines.join('\n'));
        if (data.componentId) {
          blocks.push({
            type: 'generative_ui',
            content: '',
            attributes: {
              componentId: data.componentId,
              status: 'completed',
              props: data.props || {},
            },
          });
          continue;
        }
      } catch {
        // JSON 解析失败，降级为代码块
      }

      blocks.push({
        type: 'code',
        content: jsonLines.join('\n').trim(),
        attributes: { language: 'json' },
      });
      continue;
    }

    // 2. 普通代码块 ```lang ... ```
    if (line.trim().startsWith('```')) {
      const langMatch = line.trim().match(/^```(\w*)/);
      const lang = langMatch?.[1] || 'plaintext';
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      if (i < lines.length) i++;

      blocks.push({
        type: 'code',
        content: codeLines.join('\n').trim(),
        attributes: { language: lang },
      });
      continue;
    }

    // 3. 标题 # ## ###
    const headingMatch = line.match(/^(#{1,3})\s+(.*)$/);
    if (headingMatch) {
      blocks.push({
        type: 'heading',
        content: markdownToHtml(headingMatch[2].trim()),
        attributes: { level: headingMatch[1].length as 1 | 2 | 3 },
      });
      i++;
      continue;
    }

    // 4. 分割线 --- / *** / ___
    if (/^(\s*[-*_]\s*){3,}$/.test(line)) {
      blocks.push({
        type: 'paragraph',
        content: '<hr>',
      });
      i++;
      continue;
    }

    // 5. Todo 列表 - [ ] / - [x]
    if (/^- \[( |x|X)\]\s+/.test(line)) {
      const nonTodoLines: string[] = [];

      while (i < lines.length) {
        const currentLine = lines[i];
        if (currentLine.trim() === '') {
          i++;
          break;
        }
        if (/^- \[( |x|X)\]\s+/.test(currentLine)) {
          if (nonTodoLines.length > 0) {
            const html = toParagraphHtml(nonTodoLines.join('\n'));
            if (html) blocks.push({ type: 'paragraph', content: html });
            nonTodoLines.length = 0;
          }
          const match = currentLine.match(/^- \[( |x|X)\]\s+(.*)$/);
          if (match) {
            blocks.push({
              type: 'todo',
              content: markdownToHtml(match[2].trim()),
              attributes: { checked: match[1].toLowerCase() === 'x' },
            });
          }
          i++;
        } else if (currentLine.startsWith('- ') || currentLine.startsWith('  ')) {
          nonTodoLines.push(currentLine);
          i++;
        } else {
          break;
        }
      }

      if (nonTodoLines.length > 0) {
        const html = toParagraphHtml(nonTodoLines.join('\n'));
        if (html) blocks.push({ type: 'paragraph', content: html });
      }
      continue;
    }

    // 6. 无序列表 - item（无 checkbox）
    if (/^[-*+]\s+/.test(line)) {
      const listItems: string[] = [];
      while (i < lines.length && /^[-*+]\s+/.test(lines[i])) {
        const itemMatch = lines[i].match(/^[-*+]\s+(.*)$/);
        if (itemMatch) {
          listItems.push(markdownToHtml(itemMatch[1].trim()));
        }
        i++;
        // 收集缩进续行
        while (i < lines.length && /^\s{2,}\S/.test(lines[i])) {
          listItems[listItems.length - 1] += ' ' + markdownToHtml(lines[i].trim());
          i++;
        }
      }
      if (listItems.length > 0) {
        const lis = listItems.map((item) => `<li>${item}</li>`).join('');
        blocks.push({
          type: 'paragraph',
          content: `<ul>${lis}</ul>`,
        });
      }
      continue;
    }

    // 7. 有序列表 1. item
    if (/^\d+\.\s+/.test(line)) {
      const listItems: string[] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i])) {
        const itemMatch = lines[i].match(/^\d+\.\s+(.*)$/);
        if (itemMatch) {
          listItems.push(markdownToHtml(itemMatch[1].trim()));
        }
        i++;
        while (i < lines.length && /^\s{2,}\S/.test(lines[i])) {
          listItems[listItems.length - 1] += ' ' + markdownToHtml(lines[i].trim());
          i++;
        }
      }
      if (listItems.length > 0) {
        const lis = listItems.map((item) => `<li>${item}</li>`).join('');
        blocks.push({
          type: 'paragraph',
          content: `<ol>${lis}</ol>`,
        });
      }
      continue;
    }

    // 8. 引用块 > text
    if (line.startsWith('> ')) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].startsWith('> ')) {
        quoteLines.push(lines[i].replace(/^>\s*/, ''));
        i++;
      }
      const innerHtml = quoteLines.map((l) => `<p>${markdownToHtml(l)}</p>`).join('');
      blocks.push({
        type: 'paragraph',
        content: `<blockquote>${innerHtml}</blockquote>`,
      });
      continue;
    }

    // 9. 普通段落（收集连续非空行，直到遇到其他块类型）
    const paragraphLines: string[] = [line];
    i++;
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !lines[i].match(/^#{1,3}\s+/) &&
      !lines[i].startsWith('```') &&
      !/^- \[( |x|X)\]\s+/.test(lines[i]) &&
      !/^[-*+]\s+/.test(lines[i]) &&
      !/^\d+\.\s+/.test(lines[i]) &&
      !/^(\s*[-*_]\s*){3,}$/.test(lines[i]) &&
      !lines[i].startsWith('> ')
    ) {
      paragraphLines.push(lines[i]);
      i++;
    }

    const html = toParagraphHtml(paragraphLines.join('\n'));
    if (html) {
      blocks.push({ type: 'paragraph', content: html });
    }
  }

  return blocks;
}
