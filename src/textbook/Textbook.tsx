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
import { TextbookP1 } from './pages/P1';
import { TextbookP2 } from './pages/P2';
import { TextbookP3 } from './pages/P3';
import { TextbookP4 } from './pages/P4';
import { TextbookP5 } from './pages/P5';
import { TextbookP6 } from './pages/P6';
import { TextbookP7 } from './pages/P7';
import { TextbookP8 } from './pages/P8';
import { TextbookP9 } from './pages/P9';
import { TextbookP10 } from './pages/P10';
import { TextbookP11 } from './pages/P11';
import { TextbookP12 } from './pages/P12';
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
  switch (slug) {
    case 'p1': return <TextbookP1 />;
    case 'p2': return <TextbookP2 />;
    case 'p3': return <TextbookP3 />;
    case 'p4': return <TextbookP4 />;
    case 'p5': return <TextbookP5 />;
    case 'p6': return <TextbookP6 />;
    case 'p7': return <TextbookP7 />;
    case 'p8': return <TextbookP8 />;
    case 'p9': return <TextbookP9 />;
    case 'p10': return <TextbookP10 />;
    case 'p11': return <TextbookP11 />;
    case 'p12': return <TextbookP12 />;
    default: return <TextbookStub slug={slug} />;
  }
}

// (TS noUnusedLocals 회피 — 일부 빌드 환경에서 import만 하고 안 쓰는 경우 방지)
void TEXTBOOK_PARTS;
void TEXTBOOK_INTRO;
