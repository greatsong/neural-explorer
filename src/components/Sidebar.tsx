import { PHASE_GROUPS, isBonusGroup, isBonus2Group } from '../phases';
import { useApp } from '../store';
import type { PhaseId } from '../phases';

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const current = useApp((s) => s.current);
  const completed = useApp((s) => s.completed);
  const setCurrent = useApp((s) => s.setCurrent);
  const go = (id: PhaseId) => {
    setCurrent(id);
    window.location.hash = `#/${id}`;
    onClose();
  };

  // 5·6부는 메뉴에서 항상 숨김 (인지 과부하 방지)
  const visibleGroups = PHASE_GROUPS.filter(([group]) => {
    if (isBonusGroup(group)) return false;
    if (isBonus2Group(group)) return false;
    return true;
  });

  return (
    <>
      {/* 모바일 백드롭 — 데스크톱에선 숨김 */}
      {open && (
        <div
          onClick={onClose}
          className="md:hidden fixed inset-0 top-14 z-30 bg-black/40"
          aria-hidden="true"
        />
      )}
      <aside
        className={`
          ${open ? 'translate-x-0' : '-translate-x-full'}
          md:translate-x-0
          fixed md:sticky
          top-14 left-0 z-40
          w-64 shrink-0
          h-[calc(100vh-3.5rem)]
          border-r border-border bg-bg md:bg-surface/40
          px-4 py-6 overflow-y-auto
          transition-transform duration-200
        `}
      >
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
    </>
  );
}
