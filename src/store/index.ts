// src/store/index.ts
import { create } from 'zustand';

interface AppState {
  isSidebarOpen: boolean;
  isAgentPanelOpen: boolean;
  toggleSidebar: () => void;
  toggleAgentPanel: () => void;
  setAgentPanelOpen: (isOpen: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  // 初始状态：左侧边栏默认打开，右侧 AI 面板为了刚才的测试，我们也先设为打开
  isSidebarOpen: true,
  isAgentPanelOpen: true,

  // 状态变更动作 (Actions)
  toggleSidebar: () =>
    set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
  toggleAgentPanel: () =>
    set((state) => ({ isAgentPanelOpen: !state.isAgentPanelOpen })),
  setAgentPanelOpen: (isOpen) => set({ isAgentPanelOpen: isOpen }),
}));
