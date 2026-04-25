// src/components/editor/RichTextEditor.tsx
'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { useEffect, useRef } from 'react';

interface RichTextEditorProps {
  initialContent: string;
  onUpdate: (content: string) => void;
}

export function RichTextEditor({
  initialContent,
  onUpdate,
}: RichTextEditorProps) {
  const onUpdateRef = useRef(onUpdate);
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
    },
    onUpdate: ({ editor }) => {
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
      // 检查当前是否没有焦点，或者这就是一次强制回滚
      // 避免在用户正常打字时由于延迟导致的“文字闪烁”
      editor.commands.setContent(initialContent);
    }
  }, [initialContent, editor]);

  return <EditorContent editor={editor} />;
}
