import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { PhaseId } from './phases';

interface AppState {
  current: PhaseId;
  completed: Record<PhaseId, boolean>;
  theme: 'light' | 'dark';
  setCurrent: (id: PhaseId) => void;
  markCompleted: (id: PhaseId) => void;
  toggleTheme: () => void;
}

export const useApp = create<AppState>()(
  persist(
    (set) => ({
      current: 'p1',
      completed: {} as Record<PhaseId, boolean>,
      theme: 'light',
      setCurrent: (id) => set({ current: id }),
      markCompleted: (id) =>
        set((s) => ({ completed: { ...s.completed, [id]: true } })),
      toggleTheme: () =>
        set((s) => {
          const next = s.theme === 'light' ? 'dark' : 'light';
          if (typeof document !== 'undefined') {
            document.documentElement.classList.toggle('dark', next === 'dark');
          }
          return { theme: next };
        }),
    }),
    {
      name: 'neural-explorer-state',
      partialize: (s) => ({ completed: s.completed, theme: s.theme }),
    }
  )
);
