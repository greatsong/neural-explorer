import { PHASE_GROUPS, isBonusGroup } from '../phases';
import { useApp } from '../store';
import type { PhaseId } from '../phases';

export function Sidebar() {
  const current = useApp((s) => s.current);
  const completed = useApp((s) => s.completed);
  const setCurrent = useApp((s) => s.setCurrent);
  const bonusUnlocked = useApp((s) => s.bonusUnlocked);

  const go = (id: PhaseId) => {
    setCurrent(id);
    window.location.hash = `#/${id}`;
  };

  const visibleGroups = PHASE_GROUPS.filter(([group]) => !isBonusGroup(group) || bonusUnlocked);

  return (
    <aside className="w-64 shrink-0 border-r border-border bg-surface/40 px-4 py-6 overflow-y-auto sticky top-14 h-[calc(100vh-3.5rem)]">
      <nav className="space-y-6 text-sm">
        {visibleGroups.map(([group, items]) => (
          <div key={group}>
            <div className="text-xs font-semibold uppercase tracking-wider text-muted mb-2">
              {group}
            </div>
            <ul className="space-y-0.5">
              {items.map((p) => {
                const active = current === p.id;
                const done = completed[p.id];
                return (
                  <li key={p.id}>
                    <button
                      onClick={() => go(p.id)}
                      className={`w-full text-left px-3 py-1.5 rounded-md flex items-center gap-2 transition ${
                        active
                          ? 'bg-accent-bg text-accent font-medium'
                          : 'hover:bg-surface text-text/90'
                      }`}
                    >
                      <span className="w-5 text-center text-xs font-mono text-muted">
                        {done ? '✓' : active ? '●' : p.num}
                      </span>
                      <span className="truncate">{p.title}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  );
}
