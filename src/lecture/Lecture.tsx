// 특강 슬라이드 무대 (#/lecture 또는 #/lecture/7).
// 16:9(1600×900) 고정 무대를 창 크기에 맞춰 축소·확대한다. 폰에서도 같은 슬라이드를 작게 본다.
// 조작: → / Space / 화면 오른쪽 탭 = 다음 단계(단계가 끝나면 다음 슬라이드), ← / 화면 왼쪽 탭 = 이전,
//       N = 교사 노트, F = 전체 화면, Home/End = 처음/끝. 영상 화면에서도 ← →는 슬라이드를 넘긴다.
import { useCallback, useEffect, useMemo, useState, type ComponentType } from 'react';
import { SLIDES, SECTIONS, type SlideDef } from './slides';

export const STAGE_W = 1600;
export const STAGE_H = 900;

function readStep(): number {
  const q = window.location.hash.indexOf('?');
  if (q < 0) return 0;
  const s = new URLSearchParams(window.location.hash.slice(q + 1)).get('step');
  const n = s ? parseInt(s, 10) : 0;
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function readIndex(): number {
  const raw = window.location.hash.replace(/^#\/?/, '').split('?')[0];
  const m = raw.match(/^lecture\/?(\d+)?/);
  if (!m || !m[1]) return 0;
  const i = parseInt(m[1], 10) - 1;
  return Number.isFinite(i) ? Math.min(Math.max(i, 0), SLIDES.length - 1) : 0;
}

export function Lecture() {
  const [{ index, direction }, setPosition] = useState(() => ({ index: readIndex(), direction: 0 }));
  const setIndex = useCallback((target: number) => {
    const next = Math.min(Math.max(target, 0), SLIDES.length - 1);
    setPosition(previous => next === previous.index ? previous : { index: next, direction: next > previous.index ? 1 : -1 });
  }, []);
  const [step, setStep] = useState(readStep);
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
    if (window.location.hash.split('?')[0] !== want) window.history.replaceState(null, '', want);
  }, [index]);
  useEffect(() => {
    const onHash = () => { const i = readIndex(); setIndex(i); setStep(0); };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, [setIndex]);

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
  }), [index, step, slide.steps, setIndex]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      // 영상 재생기 안의 막대·선택 상자에 초점이 있어도 ← →는 슬라이드 이동으로 쓴다
      const arrowInPlayer = ['ArrowLeft', 'ArrowRight'].includes(e.key) && !!t?.closest('[data-lecture-player]');
      if (!arrowInPlayer && (t?.closest('input, textarea, select, video') || t?.isContentEditable)) return;
      if (t?.closest('button, a') && [' ', 'Enter'].includes(e.key)) return;
      const video = document.querySelector<HTMLVideoElement>('.lec-root video');
      if (video && e.key === ' ') {
        e.preventDefault();
        if (video.paused) void video.play().catch(() => {}); else video.pause();
        return;
      }
      if (video && !video.paused && ['PageDown', 'PageUp', 'Enter', 'Backspace'].includes(e.key)) {
        e.preventDefault();
        return;
      }
      // 한글 입력 상태에서도 동작하도록 F·N은 e.code로 본다. ⌘·Ctrl 조합(브라우저 단축키)은 건드리지 않는다
      const plain = !e.metaKey && !e.ctrlKey && !e.altKey;
      if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown' || e.key === 'Enter') { e.preventDefault(); go.next(); }
      else if (e.key === 'ArrowLeft' || e.key === 'PageUp' || e.key === 'Backspace') { e.preventDefault(); go.prev(); }
      else if (e.key === 'Home') go.first();
      else if (e.key === 'End') go.last();
      else if (plain && e.code === 'KeyF') {
        if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
        else void document.documentElement.requestFullscreen().catch(() => {});
      }
      else if (plain && e.code === 'KeyN') setNotes((v) => !v);
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
  }, [setIndex]);

  const sectionIdx = SECTIONS.findIndex((s) => s.id === slide.section);

  return (
    <div className="lec-root fixed inset-0 bg-bg text-text select-none overflow-hidden">
      <div
        className="absolute left-1/2 top-1/2"
        style={{ width: STAGE_W, height: STAGE_H, transform: `translate(-50%, -50%) scale(${scale})`, transformOrigin: 'center' }}
      >
        {/* 탭 영역 — 왼쪽 1/4 이전, 나머지 다음. 슬라이더 등 조작 요소는 stopPropagation으로 보호한다 */}
        <div className="absolute inset-0 z-0" onClick={(e) => {
          const video = document.querySelector<HTMLVideoElement>('.lec-root video');
          if (video && !video.paused) return;
          const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
          const x = (e.clientX - r.left) / r.width;
          if (x < 0.25) go.prev(); else go.next();
        }} />

        {/* 머리: 섹션 진행 바 */}
        {!slide.sourcePage && <header className="absolute left-0 right-0 top-0 h-[64px] px-[56px] flex items-center justify-between pointer-events-none">
          <div className="flex items-center gap-[6px] text-[16px]">
            {SECTIONS.map((s, i) => (
              <div key={s.id} className="flex items-center gap-[6px]">
                <button type="button" title={`${s.label} 섹션으로`}
                  onClick={(e) => { e.stopPropagation(); const k = SLIDES.findIndex((d) => d.section === s.id); if (k >= 0) { setIndex(k); setStep(0); } }}
                  className={`pointer-events-auto px-[9px] py-[4px] rounded-full transition hover:bg-accent-bg ${i === sectionIdx ? 'bg-accent text-white font-semibold hover:bg-accent' : i < sectionIdx ? 'text-accent' : 'text-muted'}`}>{s.label}</button>
                {i < SECTIONS.length - 1 && <span className="text-muted/50">→</span>}
              </div>
            ))}
          </div>
          <div className="text-[15px] text-muted">손으로 풀어보는 딥러닝의 원리</div>
        </header>}

        {/* 본문 */}
        <main key={index} data-slide-id={slide.id} data-transition={direction > 0 ? 'forward' : direction < 0 ? 'back' : 'initial'} className={`absolute left-0 right-0 z-10 pointer-events-none ${direction ? `lec-slide-page ${direction > 0 ? 'lec-slide-forward' : 'lec-slide-back'}` : ''} ${slide.sourcePage ? 'top-0 bottom-[56px]' : 'top-[64px] bottom-[64px] px-[56px]'}`}>
          <div className="h-full flex flex-col pointer-events-none [&_input]:pointer-events-auto [&_button]:pointer-events-auto [&_a]:pointer-events-auto [&_video]:pointer-events-auto">
            {!slide.sourcePage && <div className="flex items-baseline gap-[18px] mt-[6px] mb-[4px]">
              {slide.tag && (
                <span className="text-[22px] font-bold text-accent bg-accent-bg px-[14px] py-[3px] rounded-md whitespace-nowrap">
                  {/^[0-9끝도]/.test(slide.tag) ? `활동지 ${slide.tag}` : slide.tag}
                </span>
              )}
              <h1 className="text-[40px] font-bold tracking-tight leading-tight m-0">{slide.titleAt ? slide.titleAt(step) : slide.title}</h1>
              {slide.sub && <span className="text-[22px] text-muted">{slide.sub}</span>}
              {slide.formula && (
                <span className="ml-auto self-center text-[27px] font-semibold text-accent bg-accent-bg/60 px-[18px] py-[5px] rounded-lg tabular-nums whitespace-nowrap">{slide.formula}</span>
              )}
            </div>}
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
          <div className="flex items-center gap-[18px]">
            <button type="button" aria-label="이전 단계" disabled={index === 0 && step === 0} onClick={go.prev} className="pointer-events-auto px-[14px] py-[5px] rounded-lg border border-border disabled:opacity-30">← 이전</button>
            <span>{index + 1} / {SLIDES.length}</span>
            <button type="button" aria-label="다음 단계" disabled={index === SLIDES.length - 1 && step === slide.steps} onClick={go.next} className="pointer-events-auto px-[14px] py-[5px] rounded-lg border border-border disabled:opacity-30">다음 →</button>
          </div>
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
