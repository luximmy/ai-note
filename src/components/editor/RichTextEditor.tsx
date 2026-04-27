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
  // 1. 状态锁：用于拦截中文输入法合成阶段
  const isComposingRef = useRef(false);
  // 2. 最新引用模式：防止闭包陷阱，避免依赖变化导致 Tiptap 重绘
  const onUpdateRef = useRef(onUpdate);
  // 3. 记录上一次应用的强制同步 Token
  const lastAppliedForceTokenRef = useRef(forceSyncToken);

  useEffect(() => {
    onUpdateRef.current = onUpdate;
  }, [onUpdate]);

  const editor = useEditor({
    immediatelyRender: false, // 避免 SSR 水合报错
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
        // 边界保护 A：中文输入法开始合成，上锁
        compositionstart: () => {
          isComposingRef.current = true;
          return false;
        },
        // 边界保护 B：中文输入法结束合成，解锁并推迟一帧获取最终文本
        compositionend: () => {
          isComposingRef.current = false;
          // 使用 setTimeout(0) 确保 Tiptap 内部已将拼音转化为最终汉字
          setTimeout(() => {
            if (editor) {
              onUpdateRef.current(editor.getText());
            }
          }, 0);
          return false;
        },
      },
    },
    onUpdate: ({ editor }) => {
      // 如果正在拼音输入中，绝对不要把半成品英文字母轰给外层 React State！
      if (isComposingRef.current) return;
      onUpdateRef.current(editor.getText());
    },
  });

  // ✨ 核心修复：监听外部数据的“强制同步”（回滚劫持）
  useEffect(() => {
    if (!editor) return;

    const currentEditorContent = editor.getText();

    // 如果外部传入的数据和编辑器当前数据不一致
    if (initialContent !== currentEditorContent) {
      const isForcedSync = forceSyncToken !== lastAppliedForceTokenRef.current;

      // 边界保护 C：正常打字时，忽略外部属性变化（避免光标跳动）
      if (editor.isFocused && !isForcedSync) {
        return;
      }

      // 边界保护 D：仅当触发回滚（Token变更），强制覆盖内部状态
      if (isForcedSync) {
        // emitUpdate: false 极其重要！防止 setContent 后再次触发 onUpdate 导致死循环
        editor.commands.setContent(initialContent, { emitUpdate: false });
        lastAppliedForceTokenRef.current = forceSyncToken;
      }
    }
  }, [initialContent, editor, forceSyncToken]);

  return <EditorContent editor={editor} />;
}
