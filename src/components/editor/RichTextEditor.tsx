// src/components/editor/RichTextEditor.tsx
'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { useEffect, useRef } from 'react';

interface RichTextEditorProps {
  initialContent: string;
  onUpdate: (content: string) => void;
  forceSyncToken?: number;
}

export function RichTextEditor({
  initialContent,
  onUpdate,
  forceSyncToken = 0,
}: RichTextEditorProps) {
  const isComposingRef = useRef(false);
  const onUpdateRef = useRef(onUpdate);
  const lastAppliedForceTokenRef = useRef(forceSyncToken);
  useEffect(() => {
    onUpdateRef.current = onUpdate;
  }, [onUpdate]);

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
          'is-editor-empty before:content-[attr(data-placeholder)] before:text-zinc-400 before:float-left before:pointer-events-none',
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
        compositionend: (_view) => {
          isComposingRef.current = false;
          if (editor) {
            onUpdateRef.current(editor.getText());
          }
          return false;
        },
      },
    },
    onUpdate: ({ editor }) => {
      if (isComposingRef.current) return;
      const newContent = editor.getText();
      onUpdateRef.current(newContent);
    },
  });

  // ✨ 核心修复：监听外部数据的“强制同步”
  useEffect(() => {
    if (!editor) return;

    // 获取编辑器当前的纯文本
    const currentEditorContent = editor.getText();

    // 只有当传入的 props 和编辑器内部内容不一致时，才执行同步
    // 这通常发生在：1. 初始化加载  2. 发生错误导致回滚
    if (initialContent !== currentEditorContent) {
      const isForcedSync = forceSyncToken !== lastAppliedForceTokenRef.current;
      if (editor.isFocused && !isForcedSync) {
        return;
      }
      editor.commands.setContent(initialContent);
      lastAppliedForceTokenRef.current = forceSyncToken;
    }
  }, [initialContent, editor, forceSyncToken]);

  return <EditorContent editor={editor} />;
}
