// 우측 보조 사이드바 — 현재 페이지의 h2/h3에서 자동으로 목차를 만든다 (Astro Starlight 컨벤션).
import { useEffect, useState } from 'react';

interface Heading { id: string; text: string; level: 2 | 3 }

export function PageToc({ contentSelector = 'main article' }: { contentSelector?: string }) {
  const [items, setItems] = useState<Heading[]>([]);
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    // 현재 페이지의 article 안에서 h2/h3을 모은다.
    const root = document.querySelector(contentSelector);
    if (!root) return;
    const heads = Array.from(root.querySelectorAll('h2, h3')) as HTMLElement[];

    const list: Heading[] = heads.map((el, i) => {
      // id가 없으면 텍스트로 만든다 (한국어는 단순화: index 사용)
      if (!el.id) el.id = `h-${i}-${(el.textContent || '').trim().slice(0, 20).replace(/\s+/g, '-')}`;
      return { id: el.id, text: el.textContent?.trim() || '', level: el.tagName === 'H2' ? 2 : 3 };
    });
    setItems(list);

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: '-80px 0px -70% 0px', threshold: 0 }
    );
    heads.forEach((h) => observer.observe(h));
    return () => observer.disconnect();
  }, [contentSelector]);

  if (items.length < 2) return null;

  return (
    <aside className="hidden xl:block w-56 shrink-0 px-4 py-6 sticky top-14 h-[calc(100vh-3.5rem)] overflow-y-auto">
      <div className="text-xs font-semibold uppercase tracking-wider text-muted mb-3">이 페이지의 목차</div>
      <ul className="space-y-1 text-sm border-l border-border">
        {items.map((h) => (
          <li key={h.id} className={h.level === 3 ? 'pl-3' : ''}>
            <a
              href={`#${h.id}`}
              className={`block py-1 pl-3 border-l-2 -ml-px transition ${
                active === h.id
                  ? 'border-accent text-accent font-medium'
                  : 'border-transparent text-muted hover:text-text'
              }`}
            >
              {h.text}
            </a>
          </li>
        ))}
      </ul>
    </aside>
  );
}
