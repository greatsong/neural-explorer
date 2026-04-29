// 교과서 본문에서 반복적으로 쓰는 작은 부품들 — Astro Starlight의 아사이드 박스 컨벤션을 본떴다.
import type { ReactNode } from 'react';
import { BlockMath, InlineMath } from 'react-katex';
import 'katex/dist/katex.min.css';

// ──────────────────────────────────────────────────────────────────────
// Aside 박스: note(파랑) · tip(보라) · caution(주황) · key(짙은 보라 강조)
// ──────────────────────────────────────────────────────────────────────
type AsideKind = 'note' | 'tip' | 'caution' | 'key';

const ASIDE_STYLE: Record<AsideKind, { wrap: string; label: string; icon: string }> = {
  note:    { wrap: 'border-l-4 border-blue-400 bg-blue-50 dark:bg-blue-950/30',     label: 'text-blue-700 dark:text-blue-300',     icon: 'ℹ️' },
  tip:     { wrap: 'border-l-4 border-accent bg-accent-bg/40',                       label: 'text-accent',                            icon: '💡' },
  caution: { wrap: 'border-l-4 border-amber-400 bg-amber-50 dark:bg-amber-950/30',  label: 'text-amber-700 dark:text-amber-300',   icon: '⚠️' },
  key:     { wrap: 'border-l-4 border-fuchsia-500 bg-fuchsia-50 dark:bg-fuchsia-950/30', label: 'text-fuchsia-700 dark:text-fuchsia-300', icon: '🔑' },
};

export function Aside({ kind = 'note', title, children }: { kind?: AsideKind; title?: string; children: ReactNode }) {
  const s = ASIDE_STYLE[kind];
  return (
    <aside className={`${s.wrap} px-4 py-3 rounded-r-md my-5`}>
      {title && (
        <div className={`text-sm font-semibold mb-1 ${s.label}`}>
          <span className="mr-1.5" aria-hidden>{s.icon}</span>{title}
        </div>
      )}
      <div className="text-[0.95em] leading-7 text-text/90">{children}</div>
    </aside>
  );
}

// ──────────────────────────────────────────────────────────────────────
// 수학 코너 — 본문 흐름과 분리해 "왜 이런 식이 나왔나"를 자세히 다룬다 (B 수준).
// ──────────────────────────────────────────────────────────────────────
export function MathCorner({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="my-8 rounded-xl border border-border bg-surface/60 overflow-hidden">
      <header className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-fuchsia-50 to-violet-50 dark:from-fuchsia-950/40 dark:to-violet-950/40 border-b border-border">
        <span className="text-base">∑</span>
        <span className="text-xs font-semibold tracking-wider text-muted">수학 코너</span>
        <span className="text-sm font-semibold text-text">{title}</span>
      </header>
      <div className="px-5 py-4 text-[0.95em] leading-7 prose-sm">{children}</div>
    </section>
  );
}

// ──────────────────────────────────────────────────────────────────────
// 실습 코너 — 캡처 + 절차 + 질문 + 팁을 한 카드에 담는다.
// ──────────────────────────────────────────────────────────────────────
export function LabBox({ step, title, children }: { step?: string; title: string; children: ReactNode }) {
  return (
    <section className="my-8 rounded-xl border-2 border-emerald-300 dark:border-emerald-800 bg-emerald-50/40 dark:bg-emerald-950/20 overflow-hidden">
      <header className="flex items-center gap-2 px-5 py-3 bg-emerald-100/80 dark:bg-emerald-900/40 border-b border-emerald-300 dark:border-emerald-800">
        <span className="text-xs font-mono px-2 py-0.5 rounded bg-emerald-700 text-white">실습</span>
        {step && <span className="text-xs font-mono text-emerald-800 dark:text-emerald-200">{step}</span>}
        <span className="text-sm font-semibold text-emerald-900 dark:text-emerald-100">{title}</span>
      </header>
      <div className="px-5 py-4 text-[0.95em] leading-7">{children}</div>
    </section>
  );
}

export function LabSteps({ children }: { children: ReactNode }) {
  return <ol className="list-decimal pl-6 space-y-1.5 my-3 marker:text-emerald-700 marker:font-semibold">{children}</ol>;
}

export function LabQuestions({ children }: { children: ReactNode }) {
  return (
    <div className="mt-4 rounded-lg border border-emerald-300 dark:border-emerald-800 bg-bg/60 px-4 py-3">
      <div className="text-xs font-semibold text-emerald-800 dark:text-emerald-200 mb-2">❓ 함께 생각해 볼 질문</div>
      <ul className="list-disc pl-5 space-y-1 text-[0.95em]">{children}</ul>
    </div>
  );
}

export function LabTip({ children }: { children: ReactNode }) {
  return (
    <div className="mt-3 text-sm text-emerald-900/90 dark:text-emerald-100/90 bg-emerald-100/50 dark:bg-emerald-900/20 rounded-md px-3 py-2 border border-emerald-200 dark:border-emerald-900">
      <strong>팁 ·</strong> {children}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────
// 캡처 이미지 — public/textbook/captures/ 의 PNG를 캡션과 함께 보여준다.
// ──────────────────────────────────────────────────────────────────────
export function Capture({ src, alt, caption }: { src: string; alt: string; caption?: string }) {
  return (
    <figure className="my-4">
      <div className="rounded-lg border border-border overflow-hidden bg-surface">
        <img src={src} alt={alt} className="w-full block" loading="lazy" />
      </div>
      {caption && <figcaption className="text-xs text-muted text-center mt-2 leading-relaxed">{caption}</figcaption>}
    </figure>
  );
}

// ──────────────────────────────────────────────────────────────────────
// 학습 목표 — 장 도입부. "이 장을 마치면 ___을 할 수 있다".
// ──────────────────────────────────────────────────────────────────────
export function LearningGoals({ items }: { items: string[] }) {
  return (
    <section className="my-6 rounded-xl border border-blue-300 dark:border-blue-800 bg-blue-50/60 dark:bg-blue-950/30 overflow-hidden">
      <header className="flex items-center gap-2 px-5 py-2.5 bg-blue-100/80 dark:bg-blue-900/40 border-b border-blue-300 dark:border-blue-800">
        <span aria-hidden>🎯</span>
        <span className="text-xs font-semibold tracking-wider text-blue-900 dark:text-blue-100">학습 목표</span>
        <span className="text-xs text-blue-800/70 dark:text-blue-200/70 ml-auto">이 장을 마치면 다음을 할 수 있다.</span>
      </header>
      <ul className="px-5 py-3 space-y-2">
        {items.map((it, i) => (
          <li key={i} className="flex gap-3 text-[0.95em] leading-7">
            <span className="text-blue-700 dark:text-blue-300 shrink-0 font-mono">✓</span>
            <span>{it}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

// ──────────────────────────────────────────────────────────────────────
// 핵심 개념 — 장 도입부. 한 줄짜리 직관. 식 대신 비유/통찰.
// ──────────────────────────────────────────────────────────────────────
export function CoreInsights({ items }: { items: string[] }) {
  return (
    <section className="my-6 rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50/60 dark:bg-amber-950/30 overflow-hidden">
      <header className="flex items-center gap-2 px-5 py-2.5 bg-amber-100/80 dark:bg-amber-900/40 border-b border-amber-300 dark:border-amber-800">
        <span aria-hidden>💡</span>
        <span className="text-xs font-semibold tracking-wider text-amber-900 dark:text-amber-100">핵심 개념</span>
        <span className="text-xs text-amber-800/70 dark:text-amber-200/70 ml-auto">이 장에서 발견하게 될 한 줄짜리 직관.</span>
      </header>
      <ul className="px-5 py-3 space-y-2">
        {items.map((it, i) => (
          <li key={i} className="flex gap-3 text-[0.95em] leading-7">
            <span className="text-amber-700 dark:text-amber-300 shrink-0 font-mono">{(i + 1).toString().padStart(2, '0')}</span>
            <span>{it}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

// ──────────────────────────────────────────────────────────────────────
// 핵심 정리 — 페이지 끝에 두는 키워드/요약 카드.
// ──────────────────────────────────────────────────────────────────────
export function KeyTakeaways({ items }: { items: string[] }) {
  return (
    <section className="my-8 rounded-xl border border-border bg-surface/40 px-5 py-4">
      <div className="text-xs font-semibold uppercase tracking-wider text-muted mb-2">핵심 정리</div>
      <ul className="space-y-2">
        {items.map((it, i) => (
          <li key={i} className="flex gap-2 text-[0.95em] leading-relaxed">
            <span className="text-accent font-mono shrink-0">{(i + 1).toString().padStart(2, '0')}</span>
            <span>{it}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

// ──────────────────────────────────────────────────────────────────────
// 인앱 실습으로 가는 외부 링크 — 페이지 상단/하단에 배치.
// ──────────────────────────────────────────────────────────────────────
export function OpenInApp({ phase, label = '실습 앱에서 직접 만져보기' }: { phase: string; label?: string }) {
  return (
    <a
      href={`#/${phase}`}
      className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-accent text-white text-sm font-medium hover:opacity-90 transition shadow-sm"
    >
      <span aria-hidden>▶</span>{label}
    </a>
  );
}

// 본문 안에 inline / block 수식 (KaTeX)
export function M({ children }: { children: string }) {
  return <InlineMath math={children} />;
}
export function Mb({ children }: { children: string }) {
  return <BlockMath math={children} />;
}

// 학습 한 사이클 6단계 띠 — P3·P4·P5에 반복 등장하여 "지금 어디 있는지"를 보여 준다.
// active 배열에 들어간 단계만 강조색, 나머지는 흐린 회색으로 표시한다.
const TRAINING_CYCLE_STEPS = [
  { n: 1, label: '오차',     formula: 'e = \\hat y - y' },
  { n: 2, label: '오차²',    formula: 'e^2' },
  { n: 3, label: '평균 손실', formula: 'L = \\tfrac{1}{N}\\sum e^2' },
  { n: 4, label: '기울기',    formula: '\\partial L / \\partial w' },
  { n: 5, label: 'η·기울기',  formula: '\\eta \\cdot g' },
  { n: 6, label: 'w 갱신',    formula: "w' = w - \\eta g" },
];

export function TrainingCycleStrip({ active, caption }: { active: number[]; caption?: string }) {
  const set = new Set(active);
  return (
    <div className="my-5 rounded-md border border-border bg-surface p-3">
      <div className="text-[11px] uppercase tracking-wider text-muted mb-2">학습 한 사이클</div>
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {TRAINING_CYCLE_STEPS.map((s, i) => {
          const on = set.has(s.n);
          const isLast = i === TRAINING_CYCLE_STEPS.length - 1;
          return (
            <div
              key={s.n}
              className={`relative rounded-md border px-2 py-2 text-center ${
                on
                  ? 'border-accent bg-accent-bg text-accent'
                  : 'border-border bg-transparent text-muted/60'
              }`}
            >
              <div className="text-[10px] font-mono opacity-70">{`①②③④⑤⑥`[s.n - 1]}</div>
              <div className={`text-xs font-medium ${on ? '' : 'opacity-80'}`}>{s.label}</div>
              <div className={`text-[10px] mt-1 leading-tight ${on ? 'opacity-90' : 'opacity-50'}`}>
                <InlineMath math={s.formula} />
              </div>
              {!isLast && (
                <span className="hidden sm:block absolute right-[-9px] top-1/2 -translate-y-1/2 text-muted/40 select-none">→</span>
              )}
            </div>
          );
        })}
      </div>
      {caption && <div className="text-[11px] text-muted mt-2">{caption}</div>}
    </div>
  );
}
