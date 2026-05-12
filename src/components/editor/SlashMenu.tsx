// src/components/editor/SlashMenu.tsx
import { useEffect, useMemo, useReducer, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { BlockType } from '@/types';

// --- 客户端挂载检测（useSyncExternalStore 模式，避免 effect 内 setState） ---
let _isClientMounted = false;
const _mountListeners = new Set<() => void>();

function subscribeMount(callback: () => void) {
  _mountListeners.add(callback);
  return () => {
    _mountListeners.delete(callback);
  };
}

function getMountSnapshot() {
  return _isClientMounted;
}

function getMountServerSnapshot() {
  return false;
}

function setClientMounted() {
  if (_isClientMounted) return;
  _isClientMounted = true;
  for (const cb of _mountListeners) cb();
}

function useClientMounted() {
  return useSyncExternalStore(
    subscribeMount,
    getMountSnapshot,
    getMountServerSnapshot,
  );
}

export interface SlashMenuItem {
  type: BlockType;
  level?: 1 | 2 | 3; // 专为 Heading 准备
  icon: string;
  label: string;
  desc: string;
  content?: string;
  attributes?: Record<string, unknown>;
}

const MENU_ITEMS: SlashMenuItem[] = [
  { type: 'paragraph', icon: '¶', label: '文本', desc: '普通文本段落' },
  {
    type: 'heading',
    level: 1,
    icon: 'H1',
    label: '一级标题',
    desc: '大尺寸章节标题',
  },
  {
    type: 'heading',
    level: 2,
    icon: 'H2',
    label: '二级标题',
    desc: '中尺寸章节标题',
  },
  { type: 'todo', icon: '☑', label: '待办项', desc: '追踪任务进度' },
  { type: 'code', icon: '</>', label: '代码块', desc: '技术代码片段' },
  {
    type: 'generative_ui',
    icon: '✨',
    label: 'AI 组件',
    desc: '生成式交互 UI',
  },
];

interface SlashMenuProps {
  isOpen: boolean;
  position: { x: number; y: number } | null;
  onSelect: (item: SlashMenuItem) => void;
  onClose: () => void;
}

interface MenuState {
  selectedIndex: number;
  prevIsOpen: boolean;
}

type MenuAction =
  | { type: 'SET_INDEX'; index: number }
  | { type: 'MOVE_UP' }
  | { type: 'MOVE_DOWN' }
  | { type: 'SYNC_OPEN'; isOpen: boolean };

function menuReducer(state: MenuState, action: MenuAction): MenuState {
  switch (action.type) {
    case 'SET_INDEX':
      return { ...state, selectedIndex: action.index };
    case 'MOVE_UP':
      return {
        ...state,
        selectedIndex:
          (state.selectedIndex - 1 + MENU_ITEMS.length) % MENU_ITEMS.length,
      };
    case 'MOVE_DOWN':
      return {
        ...state,
        selectedIndex: (state.selectedIndex + 1) % MENU_ITEMS.length,
      };
    case 'SYNC_OPEN': {
      const justOpened = action.isOpen && !state.prevIsOpen;
      return {
        selectedIndex: justOpened ? 0 : state.selectedIndex,
        prevIsOpen: action.isOpen,
      };
    }
  }
}

export function SlashMenu({
  isOpen,
  position,
  onSelect,
  onClose,
}: SlashMenuProps) {
  const [menuState, dispatch] = useReducer(menuReducer, {
    selectedIndex: 0,
    prevIsOpen: false,
  });
  const { selectedIndex } = menuState;

  // 客户端挂载检测（Portal SSR 安全）
  const mounted = useClientMounted();
  useEffect(() => {
    setClientMounted();
  }, []);

  // 同步 isOpen 到 reducer（处理"菜单打开时重置 selectedIndex"）
  useEffect(() => {
    dispatch({ type: 'SYNC_OPEN', isOpen });
  }, [isOpen]);

  // render-phase 计算菜单位置（含边界翻转）
  const menuStyle = useMemo(() => {
    if (!isOpen || !position) return { top: 0, left: 0 };

    const MENU_HEIGHT = 300;
    const MENU_WIDTH = 256;
    const PADDING = 12;

    let top = position.y + PADDING;
    let left = position.x;

    if (top + MENU_HEIGHT > window.innerHeight) {
      top = Math.max(10, position.y - MENU_HEIGHT - PADDING);
    }

    if (left + MENU_WIDTH > window.innerWidth) {
      left = Math.max(10, window.innerWidth - MENU_WIDTH - 10);
    }

    return { top, left };
  }, [isOpen, position]);

  // 键盘导航（上下键循环、回车选中、Escape 关闭）
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        dispatch({ type: 'MOVE_DOWN' });
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        dispatch({ type: 'MOVE_UP' });
      } else if (e.key === 'Enter') {
        e.preventDefault();
        onSelect(MENU_ITEMS[selectedIndex]);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isOpen, selectedIndex, onSelect, onClose]);

  if (!isOpen || !position || !mounted) return null;

  return createPortal(
    <div
      className='fixed z-9999 w-64 bg-white border border-zinc-200 rounded-xl shadow-xl overflow-hidden py-1.5 font-sans animate-in fade-in zoom-in-95 duration-100'
      style={{
        top: menuStyle.top,
        left: menuStyle.left,
      }}
    >
      <div className='px-3 py-1.5 text-xs font-semibold text-zinc-500'>
        基础区块
      </div>
      {MENU_ITEMS.map((item, index) => (
        <button
          key={`${item.type}-${item.level || ''}`}
          type='button'
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onSelect(item);
          }}
          onMouseEnter={() => dispatch({ type: 'SET_INDEX', index })}
          className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-colors ${
            index === selectedIndex
              ? 'bg-zinc-100'
              : 'bg-transparent hover:bg-zinc-50'
          }`}
        >
          <div className='flex items-center justify-center w-8 h-8 rounded border border-zinc-200 bg-white text-zinc-600 font-medium shrink-0'>
            {item.icon}
          </div>
          <div className='flex flex-col'>
            <span className='text-sm font-medium text-zinc-900'>
              {item.label}
            </span>
            <span className='text-xs text-zinc-500'>{item.desc}</span>
          </div>
        </button>
      ))}
    </div>,
    document.body,
  );
}
