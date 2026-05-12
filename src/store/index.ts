// src/store/index.ts
import { create } from 'zustand';
import { BlockType } from '@/types';

export interface PendingInsert {
  type: BlockType;
  content: string;
  attributes?: any;
}

interface AppState {
  isSidebarOpen: boolean;
  isAgentPanelOpen: boolean;
  noteContext: string;
  // ✨ 新增：等待插入的区块指令
  pendingInsertBlocks: PendingInsert[] | null;

  toggleSidebar: () => void;
  toggleAgentPanel: () => void;
  setAgentPanelOpen: (isOpen: boolean) => void;
  setNoteContext: (context: string) => void;
  // ✨ 新增：派发插入指令
  triggerInsert: (blocks: PendingInsert[]) => void; // ✨ 接收数组
  clearInsert: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  isSidebarOpen: true,
  isAgentPanelOpen: true,
  noteContext: '',
  pendingInsertBlocks: null,

  toggleSidebar: () =>
    set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
  toggleAgentPanel: () =>
    set((state) => ({ isAgentPanelOpen: !state.isAgentPanelOpen })),
  setAgentPanelOpen: (isOpen) => set({ isAgentPanelOpen: isOpen }),
  setNoteContext: (context) => set({ noteContext: context }),

  // ✨ 实现：设置插入指令
  triggerInsert: (blocks) => set({ pendingInsertBlocks: blocks }),
  clearInsert: () => set({ pendingInsertBlocks: null }),
}));
