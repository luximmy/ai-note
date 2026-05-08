// src/components/editor/RichTextEditor.tsx
'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { useEffect, useRef, useState } from 'react';
import { SlashMenu, SlashMenuItem } from './SlashMenu';

interface RichTextEditorProps {
  initialContent: string;
  onUpdate: (content: string) => void;
  onSlashCommand?: (item: SlashMenuItem) => void; // 新增：供外层接管插入逻辑
  forceSyncToken?: number;
}

export function RichTextEditor({
  initialContent,
  onUpdate,
  onSlashCommand,
  forceSyncToken = 0,
}: RichTextEditorProps) {
  const isComposingRef = useRef(false);
  const onUpdateRef = useRef(onUpdate);

  // 1. Slash Menu 状态
  const [slashMenuState, setSlashMenuState] = useState<{
    isOpen: boolean;
    position: { x: number; y: number } | null;
  }>({
    isOpen: false,
    position: null,
  });

  // 使用 ref 同步 isOpen 状态，供 DOM 拦截器内部同步读取
  const isSlashMenuOpenRef = useRef(false);

  useEffect(() => {
    onUpdateRef.current = onUpdate;
  }, [onUpdate]);

  useEffect(() => {
    isSlashMenuOpenRef.current = slashMenuState.isOpen;
  }, [slashMenuState.isOpen]);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: false,
        codeBlock: false,
      }),
      Placeholder.configure({
        placeholder: '输入内容，或输入 "/" 唤起菜单...',
        emptyEditorClass:
          'is-editor-empty before:content-[attr(data-placeholder)] before:text-zinc-400 before:absolute before:pointer-events-none',
      }),
    ],
    content: initialContent,
    editorProps: {
      attributes: {
        class: 'focus:outline-none min-h-[1.5em] w-full',
      },
      handleDOMEvents: {
        compositionstart: () => {
          isComposingRef.current = true;
          return false;
        },
        compositionend: () => {
          isComposingRef.current = false;
          setTimeout(() => {
            if (editor) onUpdateRef.current(editor.getText());
          }, 0);
          return false;
        },
        // 🚨 核心逻辑：按键拦截器
        keydown: (view, event) => {
          // 如果菜单开着，吞掉上下键和回车键，防止 Tiptap 光标乱跑
          if (isSlashMenuOpenRef.current) {
            if (['ArrowUp', 'ArrowDown', 'Enter'].includes(event.key)) {
              return true; // 告诉 Tiptap：这个事件我处理了，你别管
            }
            // 按退格键或其他键取消菜单
            if (
              event.key === 'Backspace' ||
              event.key === 'Escape' ||
              event.key === ' '
            ) {
              setSlashMenuState({ isOpen: false, position: null });
            }
            return false;
          }

          // 如果用户刚好敲击了 "/"
          if (event.key === '/' && !isComposingRef.current) {
            const { state } = view;

            // 💡 修复点：使用解析后的位置 $from
            const { $from, from } = state.selection;

            // 1. $from.parentOffset 是光标在当前文本块（如当前段落）内的相对位置
            // 如果为 0，说明是在行首（哪怕是敲击回车后的新行首！）
            const isAtStartOfLine = $from.parentOffset === 0;

            // 2. 获取光标前面的那一个字符（用于判断前面是不是空格）
            const charBefore = isAtStartOfLine
              ? ''
              : $from.parent.textContent.slice(
                  $from.parentOffset - 1,
                  $from.parentOffset,
                );

            // 确保 / 是在行首，或者前面是个空格（防误触：比如输入 a/b 不唤起）
            if (isAtStartOfLine || charBefore === ' ') {
              const coords = view.coordsAtPos(from);
              setSlashMenuState({
                isOpen: true,
                position: { x: coords.left, y: coords.top },
              });
              // 这里 return false，让 "/" 正常输入到编辑器里
            }
          }
          return false;
        },
      },
    },
    onUpdate: ({ editor }) => {
      if (isComposingRef.current) return;
      onUpdateRef.current(editor.getText());
    },
  });

  // 劫持外部数据刷新
  useEffect(() => {
    /* (保留原有逻辑) */
  }, [initialContent, editor, forceSyncToken]);

  const handleSlashSelect = (item: SlashMenuItem) => {
    setSlashMenuState({ isOpen: false, position: null });

    if (editor) {
      // 1. 删除触发菜单的那一个 "/"
      const { from } = editor.state.selection;
      editor.commands.deleteRange({ from: from - 1, to: from });

      // 2. 触发向外的插入事件
      if (onSlashCommand) {
        onSlashCommand(item);
      }
    }
  };

  return (
    <>
      <EditorContent editor={editor} />
      <SlashMenu
        isOpen={slashMenuState.isOpen}
        position={slashMenuState.position}
        onClose={() => setSlashMenuState({ isOpen: false, position: null })}
        onSelect={handleSlashSelect}
      />
    </>
  );
}
