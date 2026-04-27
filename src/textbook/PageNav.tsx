// 페이지 하단의 이전 / 다음 카드 — Astro Starlight 스타일.
import { neighbors, findPage } from './toc';
import type { TextbookSlug } from './toc';

export function TextbookPageNav({ slug }: { slug: TextbookSlug }) {
  const { prev, next } = neighbors(slug);
  if (!prev && !next) return null;
  return (
    <nav className="mt-12 pt-6 border-t border-border grid grid-cols-2 gap-4 text-sm">
      <div>
        {prev && (
          <a
            href={`#/textbook/${prev.slug}`}
            className="block rounded-lg border border-border hover:border-accent hover:bg-accent-bg/30 px-4 py-3 transition"
          >
            <div className="text-xs text-muted">← 이전</div>
            <div className="font-medium mt-1">{findPage(prev.slug)?.short ?? prev.short}</div>
          </a>
        )}
      </div>
      <div>
        {next && (
          <a
            href={`#/textbook/${next.slug}`}
            className="block rounded-lg border border-border hover:border-accent hover:bg-accent-bg/30 px-4 py-3 transition text-right"
          >
            <div className="text-xs text-muted">다음 →</div>
            <div className="font-medium mt-1">{findPage(next.slug)?.short ?? next.short}</div>
          </a>
        )}
      </div>
    </nav>
  );
}
