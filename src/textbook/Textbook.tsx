// 교과서 라우터 진입점 — 슬러그에 따라 표지/페이지를 보여준다.
// hash 라우팅: #/textbook  또는  #/textbook/<slug>
import { useEffect, useMemo } from 'react';
import { TEXTBOOK_PARTS, TEXTBOOK_INTRO, findPage, findPart, TEXTBOOK_SLUGS } from './toc';
import type { TextbookSlug } from './toc';
import { TextbookSidebar } from './TextbookSidebar';
import { PageToc } from './PageToc';
import { TextbookPageNav } from './PageNav';
import { OpenInApp } from './components';
import { TextbookHome } from './pages/Home';
import { TextbookStub } from './pages/Stub';

interface Props { rawSlug?: string }

export function Textbook({ rawSlug }: Props) {
  const slug = useMemo<TextbookSlug>(() => {
    if (!rawSlug || rawSlug === '') return 'intro';
    return TEXTBOOK_SLUGS.has(rawSlug as TextbookSlug) ? (rawSlug as TextbookSlug) : 'intro';
  }, [rawSlug]);

  // 페이지 전환 시 스크롤을 맨 위로 (해시 점프가 아니면)
  useEffect(() => {
    const target = window.location.hash;
    if (!target.includes('#h-')) window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, [slug]);

  const meta = findPage(slug);
  const part = findPart(slug);

  return (
    <div className="flex-1 flex">
      <TextbookSidebar slug={slug} />
      <main className="flex-1 px-6 sm:px-10 py-10 min-w-0">
        <div className="max-w-3xl mx-auto">
          <article>
            {slug === 'intro' ? (
              <TextbookHome />
            ) : (
              <>
                <PageHeader part={part?.num} partTitle={part?.title} pageTitle={meta?.title ?? ''} subtitle={meta?.subtitle ?? ''} num={meta?.num ?? ''} appPhase={meta?.appPhase} />
                {renderPage(slug)}
                <TextbookPageNav slug={slug} />
              </>
            )}
          </article>
        </div>
      </main>
      {slug !== 'intro' && <PageToc />}
    </div>
  );
}

function PageHeader({ part, partTitle, pageTitle, subtitle, num, appPhase }: {
  part?: string; partTitle?: string; pageTitle: string; subtitle: string; num: string; appPhase?: string;
}) {
  return (
    <header className="mb-8 pb-6 border-b border-border">
      <div className="text-xs font-semibold tracking-wider text-muted">
        {part} · {partTitle} &nbsp;·&nbsp; <span className="text-accent font-mono">{num}장</span>
      </div>
      <h1 className="text-3xl sm:text-4xl font-bold mt-2 leading-tight tracking-tight">{pageTitle}</h1>
      <p className="text-base text-muted mt-2">{subtitle}</p>
      {appPhase && (
        <div className="mt-5">
          <OpenInApp phase={appPhase} />
        </div>
      )}
    </header>
  );
}

function renderPage(slug: TextbookSlug) {
  // visible 커리큘럼 본문(A·B·C 16편)은 후속 단계에서 채운다 — 일단 모두 placeholder.
  return <TextbookStub slug={slug} />;
}

// (TS noUnusedLocals 회피 — 일부 빌드 환경에서 import만 하고 안 쓰는 경우 방지)
void TEXTBOOK_PARTS;
void TEXTBOOK_INTRO;
