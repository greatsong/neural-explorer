import { PHASES, isBonusPhase, isBonus2Phase } from '../phases';
import { useApp } from '../store';
import type { PhaseId } from '../phases';

export function PageNav() {
  const current = useApp((s) => s.current);
  const setCurrent = useApp((s) => s.setCurrent);
  const idx = PHASES.findIndex((p) => p.id === current);
  const prev = idx > 0 ? PHASES[idx - 1] : null;
  const rawNext = idx < PHASES.length - 1 ? PHASES[idx + 1] : null;
  // 5·6부는 메뉴에서 숨김 — 다음 단계로도 안내하지 않음
  let next = rawNext;
  if (next && (isBonusPhase(next.id) || isBonus2Phase(next.id))) next = null;

  const go = (id: PhaseId) => {
    setCurrent(id);
    window.location.hash = `#/${id}`;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <nav className="mt-12 sm:mt-16 pt-6 border-t border-border flex flex-col sm:flex-row sm:justify-between gap-3 sm:gap-4 text-sm">
      <div className="flex-1 min-w-0">
        {prev && (
          <button
            onClick={() => go(prev.id)}
            className="block w-full text-left p-3 rounded-md border border-border hover:bg-surface transition"
          >
            <div className="text-xs text-muted">← 이전</div>
            <div className="font-medium mt-0.5 truncate">
              {prev.num}. {prev.title}
            </div>
          </button>
        )}
      </div>
      <div className="flex-1 min-w-0">
        {next && (
          <button
            onClick={() => go(next.id)}
            className="block w-full text-left sm:text-right p-3 rounded-md border border-border hover:bg-surface transition"
          >
            <div className="text-xs text-muted">다음 →</div>
            <div className="font-medium mt-0.5 truncate">
              {next.num}. {next.title}
            </div>
          </button>
        )}
      </div>
    </nav>
  );
}
