// src/components/editor/extensions/rewrite-highlight.ts
import { Plugin, PluginKey, Transaction } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';

const rewriteHighlightKey = new PluginKey('rewriteHighlight');

function createDecorations(
  doc: Transaction['doc'],
  range: { from: number; to: number } | null,
): DecorationSet {
  if (!range) return DecorationSet.empty;
  const from = Math.max(0, range.from);
  const to = Math.min(doc.content.size, range.to);
  if (from >= to) return DecorationSet.empty;
  return DecorationSet.create(doc, [
    Decoration.inline(from, to, { class: 'rewrite-highlight' }),
  ]);
}

export function createRewriteHighlightPlugin(): Plugin {
  return new Plugin({
    key: rewriteHighlightKey,

    state: {
      init: () => DecorationSet.empty,
      apply(tr, oldDecos) {
        // 如果文档变了，清除旧高亮（避免偏移错位）
        if (tr.docChanged) return DecorationSet.empty;
        // 如果有元数据，使用新的装饰集；否则保持映射后的旧装饰
        const newDecos = tr.getMeta(rewriteHighlightKey);
        if (newDecos !== undefined) return newDecos as DecorationSet;
        return oldDecos.map(tr.mapping, tr.doc);
      },
    },

    props: {
      decorations(state) {
        return rewriteHighlightKey.getState(state);
      },
    },
  });
}

/**
 * 从 React 层设置高亮范围。
 * 调用后会派发一个携带 meta 的 transaction，触发插件创建/清除装饰。
 */
export function setRewriteHighlight(
  editor: { view: { dispatch: (tr: Transaction) => void; state: Transaction['doc'] extends infer D ? { doc: D; tr: Transaction } : never } },
  range: { from: number; to: number } | null,
) {
  const { view } = editor;
  const tr = view.state.tr;
  tr.setMeta(rewriteHighlightKey, createDecorations(view.state.doc, range));
  view.dispatch(tr);
}
