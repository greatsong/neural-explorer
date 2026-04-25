import { PHASES } from '../phases';
import { useApp } from '../store';
import type { PhaseId } from '../phases';

export function PageNav() {
  const current = useApp((s) => s.current);
  const setCurrent = useApp((s) => s.setCurrent);
  const idx = PHASES.findIndex((p) => p.id === current);
  const prev = idx > 0 ? PHASES[idx - 1] : null;
  const next = idx < PHASES.length - 1 ? PHASES[idx + 1] : null;

  const go = (id: PhaseId) => {
    setCurrent(id);
    window.location.hash = `#/${id}`;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
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
  );
}
