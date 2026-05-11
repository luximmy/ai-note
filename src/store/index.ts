// src/store/index.ts
import { create } from 'zustand';

interface AppState {
  isSidebarOpen: boolean;
  isAgentPanelOpen: boolean;
  noteContext: string; // ✨ 新增：存储当前活跃的笔记上下文
  toggleSidebar: () => void;
  toggleAgentPanel: () => void;
  setAgentPanelOpen: (isOpen: boolean) => void;
  setNoteContext: (context: string) => void; // ✨ 新增：更新上下文的方法
}

export const useAppStore = create<AppState>((set) => ({
  isSidebarOpen: true,
  isAgentPanelOpen: true,
  noteContext: '', // 初始为空
  toggleSidebar: () =>
    set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
  toggleAgentPanel: () =>
    set((state) => ({ isAgentPanelOpen: !state.isAgentPanelOpen })),
  setAgentPanelOpen: (isOpen) => set({ isAgentPanelOpen: isOpen }),
  setNoteContext: (context) => set({ noteContext: context }),
}));
