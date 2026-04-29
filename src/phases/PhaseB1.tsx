// PhaseB1 — 문제 정의와 라벨
// A6의 회귀(숫자 예측)에서 B 영역의 분류(종류 맞히기)로 전환하는 도입.
// 교차 엔트로피 같은 손실 이야기는 여기서 다루지 않는다 — 분류·라벨·앞으로의 흐름만.
import { useEffect, useMemo, useRef, useState } from 'react';
import { PHASES } from '../phases';
import { useApp } from '../store';
import { useDot } from '../dotStore';
import { SHAPE_LABEL_KO, type DotSample, type ShapeLabel } from '../data/dotShapes';

const FLOW: { id: string; title: string; body: string }[] = [
  {
    id: 'b2',
    title: 'B2 · 데이터를 정제한다',
    body: '잘못된 그림이 섞여 있으면 학습이 망가져요. 모델보다 먼저 데이터를 다듬어요.',
  },
  {
    id: 'b3',
    title: 'B3 · 학습용·평가용으로 나눈다',
    body: '외운 것인지, 새 그림에서도 통하는지 확인하려면 먼저 쪼개 둬야 해요.',
  },
  {
    id: 'b4',
    title: 'B4 · 출력 뉴런 2개로 분류',
    body: '동그라미 vs 세모 — 출력 뉴런 두 개 중 더 큰 쪽을 골라요.',
  },
  {
    id: 'b5',
    title: 'B5 · 출력 뉴런 3개 + 소프트맥스',
    body: '동그라미·세모·네모. 세 점수를 확률로 바꿔 가장 큰 것을 골라요.',
  },
];

export function PhaseB1() {
  const meta = PHASES.find((p) => p.id === 'b1')!;
  const markCompleted = useApp((s) => s.markCompleted);
  const samples = useDot((s) => s.samples);

  // 라벨별 깨끗한(노이즈/오라벨 없는) 샘플 5~6장씩.
  const gallery = useMemo(() => {
    const labels: ShapeLabel[] = ['circle', 'triangle', 'square'];
    const map: Record<ShapeLabel, DotSample[]> = { circle: [], triangle: [], square: [] };
    for (const s of samples) {
      if (s.mislabel || s.noisy) continue;
      map[s.label].push(s);
    }
    return labels.map((lbl) => ({ label: lbl, items: map[lbl].slice(0, 6) }));
  }, [samples]);

  const [understood, setUnderstood] = useState(false);
  const completedRef = useRef(false);
  useEffect(() => {
    if (understood && !completedRef.current) {
      completedRef.current = true;
      markCompleted('b1');
    }
  }, [understood, markCompleted]);

  return (
    <article>
      {/* 헤더 — 압축 (PHASE/h1/부제) */}
      <header className="mb-3">
        <div className="text-xs font-mono text-muted">PHASE {meta.num}</div>
        <h1 className="text-2xl font-semibold mt-0.5">{meta.title}</h1>
        <p className="text-muted text-sm mt-0.5">{meta.subtitle}</p>
      </header>

      {/* 도입 — 회귀 → 분류 한 단락 */}
      <p className="leading-relaxed text-[15px]">
        지금까지는 <strong>숫자(기온)</strong>를 맞췄어요. 이제부터는 <strong>종류</strong>를 맞힙니다 —
        그림이 동그라미인가, 세모인가? B 영역에서는 도트로 그린 작은 그림 한 묶음을 가지고
        분류 모델을 처음부터 끝까지 따라 만들어요.
      </p>

      {/* 분류·라벨·입력 형식 — 작은 박스 한 줄씩 */}
      <div className="mt-3 grid sm:grid-cols-3 gap-2 text-[13px] leading-relaxed">
        <div className="card p-2.5">
          <div className="font-medium mb-0.5">분류란?</div>
          <div className="text-muted">정해진 후보 중 하나를 골라내는 문제예요.</div>
        </div>
        <div className="card p-2.5">
          <div className="font-medium mb-0.5">라벨이란?</div>
          <div className="text-muted">각 그림에 붙은 정답(동그라미·세모·네모)을 라벨이라고 불러요.</div>
        </div>
        <div className="card p-2.5">
          <div className="font-medium mb-0.5">입력 형식</div>
          <div className="text-muted">8×8 = 64개 픽셀. 각 칸 0(빈 칸) 또는 1(찍힘).</div>
        </div>
      </div>

      {/* 앞으로의 흐름 — 4 카드 한 줄씩 */}
      <div className="mt-3">
        <div className="text-sm font-medium mb-1.5">앞으로의 흐름</div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2">
          {FLOW.map((step) => (
            <div key={step.id} className="card p-2.5">
              <div className="text-[13px] font-semibold text-accent">{step.title}</div>
              <div className="text-[12px] text-muted mt-1 leading-relaxed">{step.body}</div>
            </div>
          ))}
        </div>
      </div>

      {/* 라벨별 갤러리 — 라벨당 5~6장 */}
      <div className="mt-3 card p-3">
        <div className="flex items-baseline justify-between flex-wrap gap-2">
          <div className="text-sm font-medium">라벨별 데이터 미리보기</div>
          <div className="text-[12px] text-muted">
            같은 라벨이라도 위치·크기가 조금씩 달라요. 모델이 이 다양성을 보고 라벨을 골라야 해요.
          </div>
        </div>
        <div className="mt-2 space-y-2">
          {gallery.map(({ label, items }) => (
            <div key={label} className="flex items-center gap-3">
              <div className="text-[13px] w-24 shrink-0 font-medium">{SHAPE_LABEL_KO[label]}</div>
              <div className="flex gap-1.5 flex-wrap">
                {items.map((s) => (
                  <DotThumb key={s.id} pixels={s.pixels} size={44} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 다음으로 */}
      <div className="mt-4 flex justify-end">
        <button
          className={understood ? 'btn-ghost' : 'btn-primary'}
          onClick={() => setUnderstood(true)}
          disabled={understood}
        >
          {understood ? '✓ B2로 넘어가요' : 'B2로 넘어가기'}
        </button>
      </div>
    </article>
  );
}

/* ────────── 8×8 도트 썸네일 ────────── */
function DotThumb({ pixels, size = 44 }: { pixels: number[]; size?: number }) {
  const cell = size / 8;
  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      width={size}
      height={size}
      className="rounded border border-border bg-white dark:bg-zinc-900 block"
    >
      {pixels.map((v, i) => {
        if (v !== 1) return null;
        const x = (i % 8) * cell;
        const y = Math.floor(i / 8) * cell;
        return (
          <rect
            key={i}
            x={x}
            y={y}
            width={cell}
            height={cell}
            fill="rgb(var(--color-accent))"
          />
        );
      })}
      {Array.from({ length: 9 }).map((_, i) => (
        <g key={i} stroke="rgb(var(--color-border))" strokeWidth={0.3} opacity={0.5}>
          <line x1={i * cell} y1={0} x2={i * cell} y2={size} />
          <line x1={0} y1={i * cell} x2={size} y2={i * cell} />
        </g>
      ))}
    </svg>
  );
}
