import { PHASES, isBonusPhase, isBonus2Phase, isPart4Done, isPart5Done } from '../phases';
import { useApp } from '../store';
import { Portal } from './Portal';
import { PortalLanguage } from './PortalLanguage';
import type { PhaseId } from '../phases';

export function PageNav() {
  const current = useApp((s) => s.current);
  const setCurrent = useApp((s) => s.setCurrent);
  const completed = useApp((s) => s.completed);
  const bonusUnlocked = useApp((s) => s.bonusUnlocked);
  const bonusUnlocked2 = useApp((s) => s.bonusUnlocked2);
  const idx = PHASES.findIndex((p) => p.id === current);
  const prev = idx > 0 ? PHASES[idx - 1] : null;
  const rawNext = idx < PHASES.length - 1 ? PHASES[idx + 1] : null;
  // 잠긴 보너스 그룹은 다음 단계로 안내하지 않음
  let next = rawNext;
  if (next && isBonusPhase(next.id) && !bonusUnlocked) next = null;
  if (next && isBonus2Phase(next.id) && !bonusUnlocked2) next = null;
  const showPortal = current === 'p12' && !bonusUnlocked && isPart4Done(completed);
  const showPortal2 = current === 'p14' && !bonusUnlocked2 && isPart5Done(completed);

  const go = (id: PhaseId) => {
    setCurrent(id);
    window.location.hash = `#/${id}`;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <>
      {showPortal && (
        <div className="mt-12">
          <Portal />
        </div>
      )}
      {showPortal2 && (
        <div className="mt-12">
          <PortalLanguage />
        </div>
      )}
    <nav className="mt-16 pt-6 border-t border-border flex justify-between gap-4 text-sm">
      <div className="flex-1">
        {prev && (
          <button
            onClick={() => go(prev.id)}
            className="block w-full text-left p-3 rounded-md border border-border hover:bg-surface transition"
          >
            <div className="text-xs text-muted">← 이전</div>
            <div className="font-medium mt-0.5">
              {prev.num}. {prev.title}
            </div>
          </button>
        )}
      </div>
      <div className="flex-1">
        {next && (
          <button
            onClick={() => go(next.id)}
            className="block w-full text-right p-3 rounded-md border border-border hover:bg-surface transition"
          >
            <div className="text-xs text-muted">다음 →</div>
            <div className="font-medium mt-0.5">
              {next.num}. {next.title}
            </div>
          </button>
        )}
      </div>
    </nav>
    </>
  );
}
