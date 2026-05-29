'use client';

import { useState, useRef, useEffect } from 'react';
import { updateNote } from '@/actions/note';
import { useRouter } from 'next/navigation';

interface NoteHeaderProps {
  noteId: string;
  title: string;
  emoji?: string;
}

const EMOJI_LIST = [
  '📝', '📄', '📋', '📌', '📎', '📒', '📓', '📔', '📕', '📖',
  '📗', '📘', '📙', '📚', '💡', '🔥', '⭐', '❤️', '🎯', '🚀',
  '✨', '🎨', '🎵', '📸', '🗓️', '📊', '💻', '🔧', '⚙️', '🏠',
];

export function NoteHeader({ noteId, title: initialTitle, emoji: initialEmoji }: NoteHeaderProps) {
  const router = useRouter();
  const [title, setTitle] = useState(initialTitle);
  const [emoji, setEmoji] = useState(initialEmoji || '📝');
  const [isEditingEmoji, setIsEditingEmoji] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const emojiRef = useRef<HTMLDivElement>(null);

  // Close emoji picker when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (emojiRef.current && !emojiRef.current.contains(e.target as Node)) {
        setIsEditingEmoji(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function handleTitleBlur() {
    const newTitle = titleRef.current?.textContent?.trim() || title;
    if (newTitle !== initialTitle) {
      setIsSaving(true);
      try {
        await updateNote(noteId, { title: newTitle });
        setTitle(newTitle);
        router.refresh();
      } catch (error) {
        console.error('Failed to update title:', error);
        setTitle(initialTitle);
      } finally {
        setIsSaving(false);
      }
    }
  }

  function handleTitleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();
      titleRef.current?.blur();
    }
  }

  async function handleEmojiSelect(newEmoji: string) {
    if (newEmoji === emoji) {
      setIsEditingEmoji(false);
      return;
    }
    setIsSaving(true);
    try {
      await updateNote(noteId, { emoji: newEmoji });
      setEmoji(newEmoji);
      setIsEditingEmoji(false);
      router.refresh();
    } catch (error) {
      console.error('Failed to update emoji:', error);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <header className='space-y-4'>
      <div className='relative' ref={emojiRef}>
        <button
          onClick={() => setIsEditingEmoji(!isEditingEmoji)}
          className='text-5xl hover:scale-110 transition-transform cursor-pointer'
          disabled={isSaving}
        >
          {emoji}
        </button>

        {isEditingEmoji && (
          <div className='absolute top-full left-0 mt-2 p-3 bg-popover border rounded-lg shadow-lg z-50 w-[280px]'>
            <div className='grid grid-cols-10 gap-1'>
              {EMOJI_LIST.map((e) => (
                <button
                  key={e}
                  onClick={() => handleEmojiSelect(e)}
                  className={`w-7 h-7 flex items-center justify-center rounded hover:bg-accent text-lg ${
                    e === emoji ? 'bg-accent' : ''
                  }`}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <h1
        ref={titleRef}
        contentEditable
        suppressContentEditableWarning
        onBlur={handleTitleBlur}
        onKeyDown={handleTitleKeyDown}
        className='text-4xl font-bold tracking-tight text-foreground outline-none empty:before:content-["无标题"] empty:before:text-muted-foreground/50'
      >
        {title}
      </h1>

      {isSaving && (
        <span className='text-xs text-muted-foreground'>保存中...</span>
      )}
    </header>
  );
}
