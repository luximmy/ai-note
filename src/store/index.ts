// src/store/index.ts
import { create } from 'zustand';
import { BlockType } from '@/types';

export interface PendingInsert {
  type: BlockType;
  content: string;
  attributes?: Record<string, unknown>;
}

// ✨ 新增：定义重写目标的类型
export interface RewriteTarget {
  blockId: string;
  text: string;
  from: number; // 选区开始位置
  to: number; // 选区结束位置
}

interface AppState {
  isSidebarOpen: boolean;
  isAgentPanelOpen: boolean;
  noteContext: string;
  pendingInsertBlocks: PendingInsert[] | null;

  // ✨ 新增：重写目标状态
  rewriteTarget: RewriteTarget | null;

  toggleSidebar: () => void;
  toggleAgentPanel: () => void;
  setAgentPanelOpen: (isOpen: boolean) => void;
  setNoteContext: (context: string) => void;
  triggerInsert: (blocks: PendingInsert[]) => void;
  clearInsert: () => void;

  // ✨ 新增：设置和清除重写目标的方法
  setRewriteTarget: (target: RewriteTarget | null) => void;
}

export const useAppStore = create<AppState>((set) => ({
  isSidebarOpen: true,
  isAgentPanelOpen: true,
  noteContext: '',
  pendingInsertBlocks: null,

  // ✨ 初始化状态
  rewriteTarget: null,

  toggleSidebar: () =>
    set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
  toggleAgentPanel: () =>
    set((state) => ({ isAgentPanelOpen: !state.isAgentPanelOpen })),
  setAgentPanelOpen: (isOpen) => set({ isAgentPanelOpen: isOpen }),
  setNoteContext: (context) => set({ noteContext: context }),

  triggerInsert: (blocks) => set({ pendingInsertBlocks: blocks }),
  clearInsert: () => set({ pendingInsertBlocks: null }),

  // ✨ 实现方法
  setRewriteTarget: (target) => set({ rewriteTarget: target }),
}));
