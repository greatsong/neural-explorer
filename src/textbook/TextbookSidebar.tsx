// 좌측 사이드바 — Astro Starlight 톤. 부 → 페이지 트리, 현재 페이지 강조.
import { TEXTBOOK_INTRO, TEXTBOOK_PARTS } from './toc';
import type { TextbookSlug } from './toc';

interface Props {
  slug: TextbookSlug;
}

export function TextbookSidebar({ slug }: Props) {
  return (
    <aside className="w-64 shrink-0 border-r border-border bg-surface/40 px-4 py-6 overflow-y-auto sticky top-14 h-[calc(100vh-3.5rem)]">
      <nav className="space-y-6 text-sm">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-muted mb-2">교과서 안내</div>
          <SideLink slug={TEXTBOOK_INTRO.slug} active={slug === TEXTBOOK_INTRO.slug} num="📖" title={TEXTBOOK_INTRO.short} />
        </div>

        {TEXTBOOK_PARTS.map((part) => (
          <div key={part.num}>
            <div className="text-xs font-semibold uppercase tracking-wider text-muted mb-2">
              {part.num} · {part.title}
            </div>
            <ul className="space-y-0.5">
              {part.pages.map((p) => (
                <li key={p.slug}>
                  <SideLink slug={p.slug} active={slug === p.slug} num={p.num} title={p.short} />
                </li>
              ))}
            </ul>
          </div>
        ))}

        <div className="pt-4 mt-4 border-t border-border">
          <a
            href="#/"
            className="block text-xs text-muted hover:text-text px-3 py-1.5 rounded-md hover:bg-surface"
          >
            ← 인터랙티브 앱으로 돌아가기
          </a>
        </div>
      </nav>
    </aside>
  );
}

function SideLink({ slug, active, num, title }: { slug: TextbookSlug; active: boolean; num: string; title: string }) {
  return (
    <a
      href={`#/textbook/${slug}`}
      className={`w-full text-left px-3 py-1.5 rounded-md flex items-center gap-2 transition text-sm ${
        active ? 'bg-accent-bg text-accent font-medium' : 'hover:bg-surface text-text/90'
      }`}
    >
      <span className="w-5 text-center text-xs font-mono text-muted">{num}</span>
      <span className="truncate">{title}</span>
    </a>
  );
}
