// src/components/ai/parse-component-segments.ts

export interface TextSegment {
  type: 'text';
  content: string;
}

export interface ComponentSegment {
  type: 'component';
  componentId: string;
  props: Record<string, unknown>;
}

export type Segment = TextSegment | ComponentSegment;

const COMPONENT_IDS = ['TaskBoard', 'DataTable', 'MermaidDiagram', 'Timeline'] as const;

/**
 * 从文本中提取 ```json ... ``` 代码块，解析为组件段
 * 返回有序的 segments 数组（文本段 + 组件段交替）
 */
export function parseComponentSegments(text: string): Segment[] {
  const segments: Segment[] = [];
  let lastIndex = 0;

  // 匹配 ```json ... ``` 代码块
  const regex = /```json\s*([\s\S]*?)```/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    const fullMatch = match[0];
    const jsonStr = match[1].trim();
    const matchStart = match.index;

    // 前面的普通文本
    if (matchStart > lastIndex) {
      const textContent = text.slice(lastIndex, matchStart);
      if (textContent.trim()) {
        segments.push({ type: 'text', content: textContent });
      }
    }

    // 尝试解析 JSON
    try {
      const parsed = JSON.parse(jsonStr);
      if (
        parsed &&
        typeof parsed === 'object' &&
        typeof parsed.componentId === 'string' &&
        COMPONENT_IDS.includes(parsed.componentId as typeof COMPONENT_IDS[number]) &&
        parsed.props &&
        typeof parsed.props === 'object'
      ) {
        segments.push({
          type: 'component',
          componentId: parsed.componentId,
          props: parsed.props as Record<string, unknown>,
        });
      } else {
        // 不是有效组件配置，保留为文本
        segments.push({ type: 'text', content: fullMatch });
      }
    } catch {
      // JSON 解析失败，保留为文本
      segments.push({ type: 'text', content: fullMatch });
    }

    lastIndex = matchStart + fullMatch.length;
  }

  // 剩余文本
  if (lastIndex < text.length) {
    const remaining = text.slice(lastIndex);
    if (remaining.trim()) {
      segments.push({ type: 'text', content: remaining });
    }
  }

  // 如果没有任何匹配，返回整个文本作为一个段
  if (segments.length === 0 && text.trim()) {
    segments.push({ type: 'text', content: text });
  }

  return segments;
}
