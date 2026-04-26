import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { PhaseId } from './phases';

interface AppState {
  current: PhaseId;
  completed: Record<PhaseId, boolean>;
  theme: 'light' | 'dark';
  bonusUnlocked: boolean;
  setCurrent: (id: PhaseId) => void;
  markCompleted: (id: PhaseId) => void;
  toggleTheme: () => void;
  unlockBonus: () => void;
}

export const useApp = create<AppState>()(
  persist(
    (set) => ({
      current: 'p1',
      completed: {} as Record<PhaseId, boolean>,
      theme: 'light',
      bonusUnlocked: false,
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
      unlockBonus: () => set({ bonusUnlocked: true }),
    }),
    {
      name: 'neural-explorer-state',
      partialize: (s) => ({ completed: s.completed, theme: s.theme, bonusUnlocked: s.bonusUnlocked }),
    }
  )
);
