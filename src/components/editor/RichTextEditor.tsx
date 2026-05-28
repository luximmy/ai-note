// src/components/editor/RichTextEditor.tsx
'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { SlashMenu, SlashMenuItem } from './SlashMenu';
import { RewriteToolbar } from './RewriteToolbar';
import { registerWikilinkPlugin } from './extensions/wikilink-decoration';
import { useAppStore } from '@/store';
import { toast } from 'sonner';
import { ensureHtml } from '@/lib/strip-html';

interface RichTextEditorProps {
  initialContent: string;
  onUpdate: (content: string) => void;
  onSlashCommand?: (item: SlashMenuItem) => void; // 新增：供外层接管插入逻辑
  forceSyncToken?: number;
  autoFocus?: boolean;
  documents?: { id: string; title: string }[];
}

export function RichTextEditor({
  initialContent,
  onUpdate,
  onSlashCommand,
  forceSyncToken = 0,
  autoFocus = false,
  documents = [],
}: RichTextEditorProps) {
  const isComposingRef = useRef(false);
  const onUpdateRef = useRef(onUpdate);
  const router = useRouter();
  const routerRef = useRef(router);
  const documentsRef = useRef(documents);

  useEffect(() => {
    routerRef.current = router;
  }, [router]);

  useEffect(() => {
    documentsRef.current = documents;
  }, [documents]);

  // 新增：用于防抖的定时器
  const selectionTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 1. Slash Menu 状态
  const [slashMenuState, setSlashMenuState] = useState<{
    isOpen: boolean;
    position: { x: number; y: number } | null;
  }>({
    isOpen: false,
    position: null,
  });

  // 2. Rewrite Menu 状态
  const [rewriteMenuState, setRewriteMenuState] = useState<{
    isOpen: boolean;
    position: { x: number; y: number } | null;
    text: string;
    from: number;
    to: number;
  }>({ isOpen: false, position: null, text: '', from: 0, to: 0 });

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
    autofocus: autoFocus ? 'end' : false,
    extensions: [
      StarterKit.configure({
        heading: false,
        codeBlock: false,
      }),
      Placeholder.configure({
        placeholder: '输入内容，或输入 "/" 唤起菜单...',
        emptyEditorClass:
          'is-editor-empty before:content-[attr(data-placeholder)] before:text-muted-foreground before:absolute before:pointer-events-none',
      }),
    ],
    // 💥 修复 1：防抖处理选区更新
    onSelectionUpdate: ({ editor }) => {
      // a. 只要选区发生变化，立刻隐藏菜单，防止拖拽时闪烁
      setRewriteMenuState((prev) =>
        prev.isOpen ? { ...prev, isOpen: false } : prev,
      );

      // b. 清除上一次的定时器
      if (selectionTimerRef.current) {
        clearTimeout(selectionTimerRef.current);
      }

      // c. 开启 300ms 的防抖等待
      selectionTimerRef.current = setTimeout(() => {
        const { empty, from, to } = editor.state.selection;

        // 如果没有选中文本，直接返回
        if (empty || from === to) return;

        const selectedText = editor.state.doc.textBetween(from, to);
        const { view } = editor;
        const coords = view.coordsAtPos(from);

        setRewriteMenuState({
          isOpen: true,
          position: { x: coords.left, y: coords.top },
          text: selectedText,
          from,
          to,
        });
      }, 300); // 300ms 是一个非常舒适的停留唤出时间
    },
    content: ensureHtml(initialContent),
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
            if (editor) onUpdateRef.current(editor.getHTML());
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
      onUpdateRef.current(editor.getHTML());
    },
  });

  // Register wikilink plugin after editor is mounted (avoids React reconciler race)
  useEffect(() => {
    if (!editor) return;
    const timer = setTimeout(() => {
      registerWikilinkPlugin(editor, {
        documents: documentsRef.current,
        onNavigate: (targetId: string) => {
          routerRef.current.push(`/app/note/${targetId}`);
        },
      });
    }, 0);
    return () => clearTimeout(timer);
  }, [editor]);

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

  // 💥 修复 2：延迟删除与 Loading 态过渡
  const handleRewrite = async (instruction: string) => {
    if (!editor) return;
    const { text, from, to } = rewriteMenuState;

    // 立即关闭菜单
    setRewriteMenuState((prev) => ({ ...prev, isOpen: false }));

    // ✨ 弹出全局 Loading 提示，安抚用户等待情绪
    const toastId = toast.loading('✨ AI 正在思考，请稍候...');

    try {
      const response = await fetch('/api/rewrite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          instruction,
          context: useAppStore.getState().noteContext,
        }),
      });

      if (!response.ok) throw new Error('Rewrite API Failed');
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) return;

      let isFirstChunk = true;
      let fullText = '';

      const toHtml = (text: string) =>
        text
          .split(/\n{2,}/)
          .map((p) => `<p>${p.replace(/\n/g, '<br>')}</p>`)
          .join('');

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        if (!chunk) continue;

        fullText += chunk;

        // ✨ 核心逻辑：只有收到真正的第一波数据时，才删除旧文字
        if (isFirstChunk) {
          editor.chain().focus().deleteRange({ from, to }).run();
          toast.dismiss(toastId); // 关掉 Loading 提示
          isFirstChunk = false;
        }

        // 流式阶段：逐块插入，换行用 <br>（保持实时反馈）
        const displayHtml = chunk.replace(/\n/g, '<br>');
        editor.chain().focus().insertContent(displayHtml).run();
      }

      // 流结束后：用正确 <p> 段落替换已插入的内容
      if (fullText) {
        const endPos = editor.state.doc.content.size;
        editor.chain()
          .focus()
          .deleteRange({ from, to: endPos })
          .insertContentAt(from, toHtml(fullText))
          .run();
      }
      onUpdateRef.current(editor.getHTML());
      toast.success('改写完成 ✨');
    } catch (err) {
      console.error(err);
      toast.dismiss(toastId);
      toast.error('AI 改写失败', { description: '网络请求异常，请重试。' });
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
      <RewriteToolbar
        isOpen={rewriteMenuState.isOpen}
        position={rewriteMenuState.position}
        onRewrite={handleRewrite}
        onClose={() =>
          setRewriteMenuState((prev) => ({ ...prev, isOpen: false }))
        }
      />
    </>
  );
}
