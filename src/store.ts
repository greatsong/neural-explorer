import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { PhaseId } from './phases';

interface AppState {
  current: PhaseId;
  completed: Record<PhaseId, boolean>;
  theme: 'light' | 'dark';
  bonusUnlocked: boolean;
  bonusUnlocked2: boolean;
  // 1~4부 → A/B/C 재구성 시 옛 진행도가 발견되면 1회만 띄울 안내 토스트
  legacyResetNotice: boolean;
  setCurrent: (id: PhaseId) => void;
  markCompleted: (id: PhaseId) => void;
  toggleTheme: () => void;
  unlockBonus: () => void;
  unlockBonus2: () => void;
  dismissLegacyResetNotice: () => void;
}

const STORAGE_KEY = 'neural-explorer-state-v2';
const LEGACY_KEY = 'neural-explorer-state';

// 옛 키(neural-explorer-state)를 발견하면 한 번만 안내하고 새 스키마로 진입한다.
// 마이그레이션 없음 — 진행도는 리셋. (1~4부 → A/B/C 재구성으로 ID 체계가 달라졌기 때문)
function detectLegacyAndCleanup(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const legacy = window.localStorage.getItem(LEGACY_KEY);
    if (legacy && !window.localStorage.getItem(STORAGE_KEY)) {
      window.localStorage.removeItem(LEGACY_KEY);
      return true;
    }
  } catch {
    /* localStorage 접근 불가 환경(SSR/시크릿) — 조용히 무시 */
  }
  return false;
}

const legacyDetected = detectLegacyAndCleanup();

export const useApp = create<AppState>()(
  persist(
    (set) => ({
      current: 'a1',
      completed: {} as Record<PhaseId, boolean>,
      theme: 'light',
      bonusUnlocked: false,
      bonusUnlocked2: false,
      legacyResetNotice: legacyDetected,
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
      unlockBonus2: () => set({ bonusUnlocked2: true }),
      dismissLegacyResetNotice: () => set({ legacyResetNotice: false }),
    }),
    {
      name: STORAGE_KEY,
      partialize: (s) => ({
        completed: s.completed,
        theme: s.theme,
        bonusUnlocked: s.bonusUnlocked,
        bonusUnlocked2: s.bonusUnlocked2,
      }),
    }
  )
);
