import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import type { Node } from '@tiptap/pm/model';
import type { Editor } from '@tiptap/core';

const WIKILINK_REGEX = /\[\[([^\]]+)\]\]/g;

export interface WikilinkDecorationOptions {
  documents?: { id: string; title: string }[];
  onNavigate?: (targetId: string) => void;
}

function findWikilinkRanges(doc: Node): Decoration[] {
  const decorations: Decoration[] = [];

  doc.descendants((node, pos) => {
    if (!node.isText || !node.text) return;

    const text = node.text;
    let match: RegExpExecArray | null;
    WIKILINK_REGEX.lastIndex = 0;

    while ((match = WIKILINK_REGEX.exec(text)) !== null) {
      const from = pos + match.index;
      const to = from + match[0].length;
      const title = match[1].trim();

      decorations.push(
        Decoration.inline(from, to, {
          class: 'wikilink',
          'data-target-title': title,
        }),
      );
    }
  });

  return decorations;
}

function createWikilinkPlugin(
  options: WikilinkDecorationOptions = {},
): Plugin {
  const { documents = [], onNavigate } = options;

  return new Plugin({
    key: new PluginKey('wikilinkDecoration'),

    state: {
      init(_, state) {
        return DecorationSet.create(state.doc, findWikilinkRanges(state.doc));
      },
      apply(tr, oldDecoSet) {
        if (!tr.docChanged) return oldDecoSet.map(tr.mapping, tr.doc);
        return DecorationSet.create(tr.doc, findWikilinkRanges(tr.doc));
      },
    },

    props: {
      decorations(state) {
        return this.getState(state);
      },

      handleClick(view, pos, event) {
        if (!onNavigate || !documents.length) return false;
        if (!event) return false;

        // Use caretRangeFromPoint to get the exact DOM text node + offset at click coords,
        // then walk up to find the .wikilink ancestor and verify the click offset
        // falls within the [[...]] pattern via TreeWalker character counting.
        const caret = document.caretRangeFromPoint(event.clientX, event.clientY);
        if (!caret) return false;

        // Walk up from caret container to find .wikilink ancestor
        let wikilinkEl: HTMLElement | null = null;
        let node: Node | null = caret.startContainer;
        while (node) {
          if (node instanceof HTMLElement && node.classList.contains('wikilink')) {
            wikilinkEl = node;
            break;
          }
          node = node.parentNode;
        }
        if (!wikilinkEl) return false;

        // Calculate click offset within the wikilink element's text content
        const walker = document.createTreeWalker(wikilinkEl, NodeFilter.SHOW_TEXT);
        let offset = 0;
        while (walker.nextNode()) {
          if (walker.currentNode === caret.startContainer) {
            offset += caret.startOffset;
            break;
          }
          offset += walker.currentNode.textContent?.length || 0;
        }

        // Verify offset falls within a [[...]] pattern
        const text = wikilinkEl.textContent || '';
        WIKILINK_REGEX.lastIndex = 0;
        const match = WIKILINK_REGEX.exec(text);
        if (match && offset >= match.index && offset < match.index + match[0].length) {
          const title = match[1].trim();
          const doc = documents.find(
            (d: { id: string; title: string }) => d.title === title,
          );
          if (doc) {
            onNavigate(doc.id);
          }
          return true;
        }

        return false;
      },
    },
  });
}

/**
 * Register the wikilink decoration plugin on an editor instance.
 * Uses requestAnimationFrame to defer registration past the React reconciler's initial render.
 */
export function registerWikilinkPlugin(
  editor: Editor,
  options: WikilinkDecorationOptions = {},
) {
  requestAnimationFrame(() => {
    editor.registerPlugin(createWikilinkPlugin(options));
  });
}
