// 특강 슬라이드 무대 (#/lecture 또는 #/lecture/7).
// 16:9(1600×900) 고정 무대를 창 크기에 맞춰 축소·확대한다. 폰에서도 같은 슬라이드를 작게 본다.
// 조작: → / Space / 화면 오른쪽 탭 = 다음 단계(단계가 끝나면 다음 슬라이드), ← / 화면 왼쪽 탭 = 이전,
//       N = 교사 노트, Home/End = 처음/끝.
import { useEffect, useMemo, useState, type ComponentType } from 'react';
import { SLIDES, SECTIONS, type SlideDef } from './slides';

export const STAGE_W = 1600;
export const STAGE_H = 900;

function readIndex(): number {
  const raw = window.location.hash.replace(/^#\/?/, '').split('?')[0];
  const m = raw.match(/^lecture\/?(\d+)?/);
  if (!m || !m[1]) return 0;
  const i = parseInt(m[1], 10) - 1;
  return Number.isFinite(i) ? Math.min(Math.max(i, 0), SLIDES.length - 1) : 0;
}

export function Lecture() {
  const [index, setIndex] = useState(readIndex);
  const [step, setStep] = useState(0);
  const [notes, setNotes] = useState(false);
  const [scale, setScale] = useState(1);

  const slide: SlideDef = SLIDES[index];
  const Body: ComponentType<{ step: number }> = slide.component;

  // 창 크기에 맞춰 무대 축소
  useEffect(() => {
    const fit = () => setScale(Math.min(window.innerWidth / STAGE_W, window.innerHeight / STAGE_H));
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, []);

  // 주소 동기화
  useEffect(() => {
    const want = `#/lecture/${index + 1}`;
    if (window.location.hash !== want) window.history.replaceState(null, '', want);
  }, [index]);
  useEffect(() => {
    const onHash = () => { const i = readIndex(); setIndex(i); setStep(0); };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const go = useMemo(() => ({
    next() {
      if (step < slide.steps) setStep(step + 1);
      else if (index < SLIDES.length - 1) { setIndex(index + 1); setStep(0); }
    },
    prev() {
      if (step > 0) setStep(step - 1);
      else if (index > 0) { setIndex(index - 1); setStep(SLIDES[index - 1].steps); }
    },
    first() { setIndex(0); setStep(0); },
    last() { setIndex(SLIDES.length - 1); setStep(0); },
  }), [index, step, slide.steps]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return;
      if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown' || e.key === 'Enter') { e.preventDefault(); go.next(); }
      else if (e.key === 'ArrowLeft' || e.key === 'PageUp' || e.key === 'Backspace') { e.preventDefault(); go.prev(); }
      else if (e.key === 'Home') go.first();
      else if (e.key === 'End') go.last();
      else if (e.key === 'n' || e.key === 'N') setNotes((v) => !v);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go]);

  // 점검용 훅 — 브라우저 콘솔에서 슬라이드·단계를 바로 지정한다
  useEffect(() => {
    (window as unknown as { __lecture?: unknown }).__lecture = {
      set: (i: number, s: number) => { setIndex(i); setStep(s); },
      count: SLIDES.length,
      steps: SLIDES.map((d) => d.steps),
    };
  }, []);

  const section = SECTIONS.find((s) => s.id === slide.section);
  const sectionIdx = SECTIONS.findIndex((s) => s.id === slide.section);

  return (
    <div className="lec-root fixed inset-0 bg-bg text-text select-none overflow-hidden">
      <div
        className="absolute left-1/2 top-1/2"
        style={{ width: STAGE_W, height: STAGE_H, transform: `translate(-50%, -50%) scale(${scale})`, transformOrigin: 'center' }}
      >
        {/* 탭 영역 — 왼쪽 1/4 이전, 나머지 다음. 슬라이더 등 조작 요소는 stopPropagation으로 보호한다 */}
        <div className="absolute inset-0 z-0" onClick={(e) => {
          const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
          const x = (e.clientX - r.left) / r.width;
          if (x < 0.25) go.prev(); else go.next();
        }} />

        {/* 머리: 섹션 진행 바 */}
        <header className="absolute left-0 right-0 top-0 h-[64px] px-[56px] flex items-center justify-between pointer-events-none">
          <div className="flex items-center gap-[10px] text-[17px]">
            {SECTIONS.map((s, i) => (
              <div key={s.id} className="flex items-center gap-[10px]">
                <span className={`px-[12px] py-[4px] rounded-full ${i === sectionIdx ? 'bg-accent text-white font-semibold' : i < sectionIdx ? 'text-accent' : 'text-muted'}`}>{s.label}</span>
                {i < SECTIONS.length - 1 && <span className="text-muted/50">→</span>}
              </div>
            ))}
          </div>
          <div className="text-[16px] text-muted">손으로 풀어보는 딥러닝의 원리</div>
        </header>

        {/* 본문 */}
        <main className="absolute left-0 right-0 top-[64px] bottom-[64px] px-[56px] z-10 pointer-events-none">
          <div className="h-full flex flex-col pointer-events-none [&_input]:pointer-events-auto [&_button]:pointer-events-auto">
            <div className="flex items-baseline gap-[18px] mt-[6px] mb-[4px]">
              {slide.tag && <span className="text-[20px] font-bold text-accent bg-accent-bg px-[12px] py-[2px] rounded-md">{slide.tag}</span>}
              <h1 className="text-[40px] font-bold tracking-tight leading-tight m-0">{slide.title}</h1>
              {slide.sub && <span className="text-[22px] text-muted">{slide.sub}</span>}
            </div>
            <div className="flex-1 min-h-0">
              <Body step={step} />
            </div>
          </div>
        </main>

        {/* 꼬리: 단계 점·번호 */}
        <footer className="absolute left-0 right-0 bottom-0 h-[64px] px-[56px] flex items-center justify-between text-[16px] text-muted pointer-events-none">
          <div className="flex items-center gap-[8px]">
            {Array.from({ length: slide.steps + 1 }).map((_, i) => (
              <span key={i} className={`inline-block w-[10px] h-[10px] rounded-full ${i <= step ? 'bg-accent' : 'bg-border'}`} />
            ))}
            {slide.steps > 0 && <span className="ml-[8px]">{step} / {slide.steps}</span>}
          </div>
          <div>{section?.label} · {index + 1} / {SLIDES.length}</div>
        </footer>

        {/* 교사 노트 (N) */}
        {notes && slide.notes && (
          <aside className="absolute left-[56px] right-[56px] bottom-[72px] z-20 bg-surface/95 border border-border rounded-xl px-[24px] py-[16px] text-[20px] leading-relaxed shadow-lg pointer-events-none">
            {slide.notes.map((n, i) => <p key={i} className="m-0">{n}</p>)}
          </aside>
        )}
      </div>
    </div>
  );
}
