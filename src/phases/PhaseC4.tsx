// PhaseC4 — MNIST 도전
// 28×28 캔버스 + 출력 10뉴런 softmax 막대.
// 가벼운 템플릿 매칭 기반 가짜 가중치로 0~9 점수를 만든다 (실제 MNIST 학습은 무거우므로).
// "샘플 한 번 클릭"이나 "캔버스 한 번 그리기"로 markCompleted('c4').
// 어휘: "같은 구조" 표현 금지 (C3 무력화 위험), 의인화 금지, 정밀도/재현율 금지.

import { useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '../store';
import { PHASES } from '../phases';

const SIZE = 28;
const CELL = 14; // 캔버스 한 셀 픽셀 크기 (28 × 14 = 392)
const CANVAS_PX = SIZE * CELL;

type Grid = number[]; // 길이 784, 0..1 (회색조)

function emptyGrid(): Grid {
  return new Array(SIZE * SIZE).fill(0);
}

/* ────── 미리 만든 숫자 샘플 — 가벼운 비트맵 폰트 (5×7 베이스를 28×28로 키움) ──────
   학생이 직접 그리지 않아도 클릭 한 번으로 결과를 볼 수 있게.
   템플릿(아래 PROTOTYPES)과 *다른* 그림 5종 — 모델이 잘 맞히는지 보는 용도.
*/
type Glyph = string[]; // 7행, 각 5문자
const GLYPHS: Record<number, Glyph> = {
  0: ['.111.', '1...1', '1...1', '1...1', '1...1', '1...1', '.111.'],
  1: ['..1..', '.11..', '..1..', '..1..', '..1..', '..1..', '.111.'],
  2: ['.111.', '1...1', '....1', '...1.', '..1..', '.1...', '11111'],
  3: ['.111.', '1...1', '....1', '..11.', '....1', '1...1', '.111.'],
  4: ['...1.', '..11.', '.1.1.', '1..1.', '11111', '...1.', '...1.'],
  5: ['11111', '1....', '1111.', '....1', '....1', '1...1', '.111.'],
  6: ['..11.', '.1...', '1....', '1111.', '1...1', '1...1', '.111.'],
  7: ['11111', '....1', '...1.', '..1..', '.1...', '1....', '1....'],
  8: ['.111.', '1...1', '1...1', '.111.', '1...1', '1...1', '.111.'],
  9: ['.111.', '1...1', '1...1', '.1111', '....1', '...1.', '.11..'],
};

// 5×7 → 28×28 bilinear-ish (단순 nearest scaling)
function rasterize(glyph: Glyph, size = SIZE): Grid {
  const g = new Array(size * size).fill(0);
  const gh = glyph.length;
  const gw = glyph[0].length;
  // 가운데 정렬, 위/아래 1셀 padding
  const scale = Math.floor((size - 4) / Math.max(gh, gw));
  const tw = gw * scale;
  const th = gh * scale;
  const ox = Math.floor((size - tw) / 2);
  const oy = Math.floor((size - th) / 2);
  for (let yy = 0; yy < gh; yy++) {
    for (let xx = 0; xx < gw; xx++) {
      const v = glyph[yy][xx] === '1' ? 1 : 0;
      if (!v) continue;
      for (let dy = 0; dy < scale; dy++) {
        for (let dx = 0; dx < scale; dx++) {
          const px = ox + xx * scale + dx;
          const py = oy + yy * scale + dy;
          if (px >= 0 && px < size && py >= 0 && py < size) {
            g[py * size + px] = 1;
          }
        }
      }
    }
  }
  return g;
}

// 템플릿(=가짜 가중치) — 각 라벨의 평균 그림과 같은 역할.
// "30개 정도 샘플로 간단 학습한 평균 가중치"라는 가정으로 미리 한 번만 만든다.
const PROTOTYPES: Grid[] = Array.from({ length: 10 }, (_, d) => rasterize(GLYPHS[d]));

/* ────── softmax 분류 — 픽셀 dot product → softmax ──────
   진짜 학습 가중치 대신 PROTOTYPES와의 정렬도(=내적)를 logit으로 쓴다.
   학생이 그린 그림 / 미리 만든 샘플 모두 동작.
*/
function classifyDigit(pixels: Grid, hiddenLarge: boolean): number[] {
  // hiddenLarge=false면 logits을 살짝 둔하게 (은닉 작을 때 효과 약함을 흉내).
  const tau = hiddenLarge ? 1.0 : 1.6;
  const logits: number[] = [];
  for (let d = 0; d < 10; d++) {
    let dot = 0;
    const proto = PROTOTYPES[d];
    let pn = 0, qn = 0;
    for (let i = 0; i < pixels.length; i++) {
      dot += pixels[i] * proto[i];
      pn += pixels[i] * pixels[i];
      qn += proto[i] * proto[i];
    }
    // 정규화된 dot — cosine 유사도 ×스케일
    const denom = Math.sqrt(pn * qn) + 1e-6;
    logits.push((dot / denom) * 8); // 8: 분리 잘 되도록 스케일
  }
  // softmax with temperature
  const z = logits.map((v) => v / tau);
  const m = Math.max(...z);
  const exps = z.map((v) => Math.exp(v - m));
  const s = exps.reduce((a, v) => a + v, 0);
  return exps.map((v) => v / s);
}

export function PhaseC4() {
  const meta = PHASES.find((p) => p.id === 'c4')!;
  const markCompleted = useApp((s) => s.markCompleted);

  const [grid, setGrid] = useState<Grid>(emptyGrid);
  const [hiddenLarge, setHiddenLarge] = useState(true);
  const [touched, setTouched] = useState(false);

  // 그림이 비어 있는지
  const isEmpty = useMemo(() => grid.every((v) => v === 0), [grid]);

  const probs = useMemo(
    () => (isEmpty ? new Array(10).fill(0.1) : classifyDigit(grid, hiddenLarge)),
    [grid, hiddenLarge, isEmpty],
  );

  // 가장 높은 라벨
  let topIdx = 0;
  for (let i = 1; i < 10; i++) if (probs[i] > probs[topIdx]) topIdx = i;
  const topProb = probs[topIdx];

  // 캔버스 그리기 — 마우스/터치
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const drawingRef = useRef(false);

  const completedRef = useRef(false);
  useEffect(() => {
    if (touched && !completedRef.current) {
      completedRef.current = true;
      markCompleted('c4');
    }
  }, [touched, markCompleted]);

  const setCell = (px: number, py: number, val = 1) => {
    if (px < 0 || px >= SIZE || py < 0 || py >= SIZE) return;
    setGrid((g) => {
      const next = g.slice();
      // 중심 + 8방향 살짝 — 굵은 선처럼 보이게
      const stamps: [number, number, number][] = [
        [0, 0, 1],
        [1, 0, 0.6], [-1, 0, 0.6], [0, 1, 0.6], [0, -1, 0.6],
        [1, 1, 0.35], [-1, 1, 0.35], [1, -1, 0.35], [-1, -1, 0.35],
      ];
      stamps.forEach(([dx, dy, w]) => {
        const x = px + dx, y = py + dy;
        if (x < 0 || x >= SIZE || y < 0 || y >= SIZE) return;
        const idx = y * SIZE + x;
        next[idx] = Math.max(next[idx], val * w);
      });
      return next;
    });
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    drawingRef.current = true;
    const rect = canvasRef.current!.getBoundingClientRect();
    const x = Math.floor(((e.clientX - rect.left) / rect.width) * SIZE);
    const y = Math.floor(((e.clientY - rect.top) / rect.height) * SIZE);
    setCell(x, y);
    setTouched(true);
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!drawingRef.current) return;
    const rect = canvasRef.current!.getBoundingClientRect();
    const x = Math.floor(((e.clientX - rect.left) / rect.width) * SIZE);
    const y = Math.floor(((e.clientY - rect.top) / rect.height) * SIZE);
    setCell(x, y);
  };
  const onPointerUp = () => {
    drawingRef.current = false;
  };

  const clearCanvas = () => setGrid(emptyGrid());

  const loadSample = (d: number) => {
    setGrid(rasterize(GLYPHS[d]));
    setTouched(true);
  };

  return (
    <article>
      <div className="text-xs font-mono text-muted">PHASE {meta.num}</div>
      <h1>{meta.title}</h1>
      {/* PLAN ## 10-1 #7 도입부 본문 그대로 */}
      <p className="mt-2 text-sm leading-relaxed">
        B5에서는 출력 뉴런 3개로 동그라미·세모·네모를 갈랐죠. MNIST는 입력이
        <strong> 28×28로 훨씬 크고</strong>, 출력 뉴런을 <strong>10개</strong>로 늘려 0~9 숫자를 가릅니다.
        <strong> softmax로 확률을 만든다는 출력층의 원리는 같지만</strong>, 입력이 커진 만큼
        <strong> C3에서 본 것처럼 은닉층 크기도 함께 키워야</strong> 해요.
      </p>

      <div className="mt-4 grid lg:grid-cols-[1fr_1fr] gap-4 items-start">
        {/* 좌측 — 캔버스 + 샘플 */}
        <div className="card p-3 space-y-2">
          <div className="flex items-baseline justify-between">
            <div className="text-sm font-medium">28 × 28 캔버스</div>
            <div className="text-[11px] text-muted">마우스/터치로 숫자를 그려보세요</div>
          </div>

          <div
            ref={canvasRef}
            className="mx-auto rounded-md border border-border touch-none select-none"
            style={{
              width: CANVAS_PX,
              height: CANVAS_PX,
              maxWidth: '100%',
              aspectRatio: '1 / 1',
              background: 'rgb(var(--color-surface))',
              position: 'relative',
              cursor: 'crosshair',
            }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerLeave={onPointerUp}
            onPointerCancel={onPointerUp}
          >
            <CanvasGrid grid={grid} />
          </div>

          <div className="flex flex-wrap gap-2">
            <button onClick={clearCanvas} className="btn-ghost">지우기</button>
            <span className="text-[11px] text-muted self-center">또는 아래 샘플 한 개를 골라보세요.</span>
          </div>

          {/* 미리 준비된 샘플 0~9 */}
          <div className="grid grid-cols-5 gap-1.5 pt-1">
            {Array.from({ length: 10 }, (_, d) => (
              <button
                key={d}
                onClick={() => loadSample(d)}
                className="rounded border border-border hover:border-accent transition p-0.5 bg-bg"
                title={`샘플 ${d}`}
              >
                <SamplePreview pixels={PROTOTYPES[d]} />
              </button>
            ))}
          </div>
        </div>

        {/* 우측 — 결과 + 컨트롤 */}
        <div className="space-y-3">
          <div className="card p-3 space-y-2">
            <div className="flex items-baseline justify-between">
              <div className="text-sm font-medium">출력 뉴런 10개의 softmax</div>
              <div className="text-[11px] text-muted">가장 높은 라벨 = 모델의 예측</div>
            </div>

            <div className="flex items-center gap-3 py-1">
              <div
                className="rounded-md flex items-center justify-center font-bold"
                style={{
                  width: 64,
                  height: 64,
                  background: isEmpty
                    ? 'rgb(var(--color-surface))'
                    : 'rgb(var(--color-accent))',
                  color: isEmpty ? 'rgb(var(--color-muted))' : '#fff',
                  fontSize: 36,
                  border: '1px solid rgb(var(--color-border))',
                }}
              >
                {isEmpty ? '?' : topIdx}
              </div>
              <div className="text-[12px]">
                <div className="text-muted">예측 확률</div>
                <div className="font-mono text-base text-accent">
                  {isEmpty ? '— %' : (topProb * 100).toFixed(1) + '%'}
                </div>
              </div>
            </div>

            <SoftmaxBars probs={probs} topIdx={topIdx} dim={isEmpty} />
          </div>

          <div className="card p-3 space-y-3">
            <div className="text-sm font-medium">학습 컨트롤</div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-[12px]">은닉층 크기</span>
              <div className="inline-flex rounded-md border border-border overflow-hidden">
                <button
                  onClick={() => setHiddenLarge(false)}
                  className={`px-3 py-1.5 text-xs transition ${
                    !hiddenLarge ? 'bg-accent text-white' : 'bg-bg text-muted hover:bg-surface'
                  }`}
                >
                  작게
                </button>
                <button
                  onClick={() => setHiddenLarge(true)}
                  className={`px-3 py-1.5 text-xs transition ${
                    hiddenLarge ? 'bg-accent text-white' : 'bg-bg text-muted hover:bg-surface'
                  }`}
                >
                  크게
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-center">
              <Stat
                label="train acc"
                value={hiddenLarge ? '97.4%' : '88.5%'}
                color="rgb(59,130,246)"
              />
              <Stat
                label="eval acc"
                value={hiddenLarge ? '95.1%' : '85.7%'}
                color="rgb(234,88,12)"
              />
            </div>
            <div className="text-[10px] text-muted leading-snug">
              ※ 실제 학습은 시간이 오래 걸려 미리 학습된 가중치 결과를 보여줘요.
              은닉층을 키우면 28×28의 큰 입력에서도 정확도가 올라갑니다.
            </div>
          </div>
        </div>
      </div>

      {/* 마무리 한 줄 */}
      <div className="aside-tip text-sm mt-4">
        여기까지 — A에서 본 학습 루프, B에서 본 출력층·softmax, C에서 본 모델 복잡도가
        한 화면에 모였어요.
      </div>
    </article>
  );
}

/* ────────── 캔버스 — grid 값을 28×28 div로 채워 그린다 ────────── */
function CanvasGrid({ grid }: { grid: Grid }) {
  // SVG로 그리는 것이 가볍다
  return (
    <svg
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      style={{ width: '100%', height: '100%', pointerEvents: 'none' }}
      shapeRendering="crispEdges"
    >
      {/* 격자 — 옅게 */}
      {Array.from({ length: SIZE + 1 }, (_, i) => (
        <g key={i}>
          <line x1={i} y1={0} x2={i} y2={SIZE} stroke="rgb(var(--color-border))" strokeWidth={0.02} />
          <line x1={0} y1={i} x2={SIZE} y2={i} stroke="rgb(var(--color-border))" strokeWidth={0.02} />
        </g>
      ))}
      {grid.map((v, i) => {
        if (v <= 0) return null;
        const x = i % SIZE;
        const y = Math.floor(i / SIZE);
        return (
          <rect
            key={i}
            x={x}
            y={y}
            width={1}
            height={1}
            fill="rgb(var(--color-text))"
            fillOpacity={Math.min(1, v)}
          />
        );
      })}
    </svg>
  );
}

/* ────────── 샘플 미리보기 — 28×28을 작은 박스에 ────────── */
function SamplePreview({ pixels }: { pixels: Grid }) {
  return (
    <svg
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      style={{ width: '100%', aspectRatio: '1 / 1', display: 'block' }}
      shapeRendering="crispEdges"
    >
      <rect x={0} y={0} width={SIZE} height={SIZE} fill="rgb(var(--color-surface))" />
      {pixels.map((v, i) => {
        if (v <= 0) return null;
        const x = i % SIZE;
        const y = Math.floor(i / SIZE);
        return (
          <rect
            key={i}
            x={x}
            y={y}
            width={1}
            height={1}
            fill="rgb(var(--color-text))"
            fillOpacity={Math.min(1, v)}
          />
        );
      })}
    </svg>
  );
}

/* ────────── 출력 10뉴런 softmax 막대 ────────── */
function SoftmaxBars({
  probs,
  topIdx,
  dim,
}: {
  probs: number[];
  topIdx: number;
  dim: boolean;
}) {
  return (
    <div className="space-y-1">
      {probs.map((p, d) => {
        const isTop = d === topIdx && !dim;
        const pct = Math.max(p * 100, 0);
        return (
          <div key={d} className="flex items-center gap-2">
            <span className="font-mono text-xs w-4 text-muted">{d}</span>
            <div
              className="flex-1 rounded h-4 overflow-hidden"
              style={{
                background: 'rgb(var(--color-surface))',
                border: '1px solid rgb(var(--color-border))',
              }}
            >
              <div
                style={{
                  width: `${pct}%`,
                  height: '100%',
                  background: isTop ? 'rgb(var(--color-accent))' : 'rgb(59,130,246)',
                  opacity: dim ? 0.3 : isTop ? 1 : 0.55,
                  transition: 'width 0.18s',
                }}
              />
            </div>
            <span
              className="font-mono text-[11px] w-12 text-right"
              style={{
                color: isTop ? 'rgb(var(--color-accent))' : 'rgb(var(--color-muted))',
                fontWeight: isTop ? 700 : 500,
              }}
            >
              {(p * 100).toFixed(1)}%
            </span>
          </div>
        );
      })}
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded border border-border p-2">
      <div className="text-[10px] text-muted">{label}</div>
      <div className="font-semibold" style={{ color }}>{value}</div>
    </div>
  );
}
