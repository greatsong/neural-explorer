// PhaseB1 — 문제 정의와 라벨
// A6의 회귀(숫자 예측) → B의 분류(이름표 예측)로 전환.
// 도트 그림 분류 — 입력 8×8=64 픽셀, 정답 라벨 동그라미/세모(/네모는 B5에서).
import { useMemo, useRef, useState, useEffect } from 'react';
import { PHASES } from '../phases';
import { useApp } from '../store';
import { useDot } from '../dotStore';
import { SHAPE_LABEL_KO, type DotSample, type ShapeLabel } from '../data/dotShapes';

export function PhaseB1() {
  const meta = PHASES.find((p) => p.id === 'b1')!;
  const markCompleted = useApp((s) => s.markCompleted);
  const samples = useDot((s) => s.samples);

  // 라벨별 깨끗한(노이즈/오라벨이 없는) 대표 3장씩 뽑아 갤러리에 쓴다.
  const gallery = useMemo(() => {
    const labels: ShapeLabel[] = ['circle', 'triangle', 'square'];
    const map: Record<ShapeLabel, DotSample[]> = { circle: [], triangle: [], square: [] };
    for (const s of samples) {
      // 데이터셋에서 mislabel이 있으면 s.label은 잘못된 라벨이므로 제외하고
      // mislabel이 가리키는 진짜 라벨도 갤러리에선 노출하지 않는다.
      if (s.mislabel) continue;
      if (s.noisy) continue;
      map[s.label].push(s);
    }
    return labels.map((lbl) => ({ label: lbl, items: map[lbl].slice(0, 3) }));
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
      <div className="text-xs font-mono text-muted">PHASE {meta.num}</div>
      <h1>{meta.title}</h1>
      <p className="text-muted mt-2 text-sm">{meta.subtitle}</p>

      {/* 도입 — PLAN ## 10-1 #1 본문 (그대로) */}
      <p className="mt-4 leading-relaxed">
        지금까지는 "기온 몇 도?"처럼 <strong>숫자 하나</strong>를 맞추는 문제(회귀)를 풀었어요. 이제부터는 "동그라미인가, 세모인가?"처럼 <strong>정해진 종류 중 하나를 고르는 문제</strong>(분류)를 풉니다. 둘은 답 모양이 달라서 오차를 재는 방법도 달라져요 — 회귀는 <strong>A2에서 본 MSE</strong>, 분류는 <strong>교차 엔트로피(cross-entropy)</strong> 라는 손실을 쓰는데, 자세한 내용은 <strong>B5</strong>에서 만나요.
      </p>

      <div className="mt-4 grid lg:grid-cols-[1fr_1.4fr] gap-4 items-start">
        {/* 좌: 회귀 vs 분류 비교 표 */}
        <div className="card p-3">
          <div className="text-sm font-medium mb-2">회귀 vs 분류</div>
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="py-1.5 pr-2"></th>
                <th className="py-1.5 pr-2">답</th>
                <th className="py-1.5 pr-2">예</th>
                <th className="py-1.5">손실</th>
              </tr>
            </thead>
            <tbody className="font-mono text-[13px]">
              <tr className="border-b border-border/60">
                <td className="py-1.5 pr-2 font-semibold">회귀</td>
                <td className="py-1.5 pr-2">숫자</td>
                <td className="py-1.5 pr-2">기온 23.4도</td>
                <td className="py-1.5">MSE</td>
              </tr>
              <tr>
                <td className="py-1.5 pr-2 font-semibold text-accent">분류</td>
                <td className="py-1.5 pr-2">종류</td>
                <td className="py-1.5 pr-2">동그라미</td>
                <td className="py-1.5">교차 엔트로피</td>
              </tr>
            </tbody>
          </table>
          <div className="aside-note text-[12px] leading-relaxed mt-3">
            답이 <strong>숫자</strong>면 가까운 정도(MSE)로 오차를 재고, 답이 <strong>종류</strong>면 정답 종류에 얼마나 확신을 두었는지(교차 엔트로피)로 오차를 재요.
          </div>
        </div>

        {/* 우: "지금부터 풀 문제" + 갤러리 */}
        <div className="card p-3">
          <div className="text-sm font-medium">지금부터 풀 문제</div>
          <ul className="text-[13px] text-muted mt-1 list-disc list-inside space-y-0.5">
            <li>입력: <strong>8×8 = 64개 픽셀</strong> (각 칸 0=빈 칸 / 1=찍힘)</li>
            <li>정답 라벨: <strong>동그라미 · 세모</strong> (B5에서 <strong>네모</strong>도 추가)</li>
            <li>모델이 64개 숫자를 받아 <strong>정답 라벨 하나</strong>를 골라요.</li>
          </ul>

          <div className="mt-3 space-y-2">
            {gallery.map(({ label, items }) => (
              <div key={label}>
                <div className="text-[12px] text-muted mb-1">{SHAPE_LABEL_KO[label]}</div>
                <div className="flex gap-2">
                  {items.map((s) => (
                    <DotThumb key={s.id} sample={s} size={56} />
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="text-[11px] text-muted mt-2 leading-relaxed">
            각 점은 <span className="font-mono">0</span>(빈 칸) 또는 <span className="font-mono">1</span>(찍힘) — 이 64개 숫자를 입력으로 받습니다.
          </div>
        </div>
      </div>

      <div className="mt-4 grid sm:grid-cols-[1.4fr_1fr] gap-3 items-start">
        <div className="aside-tip text-[13px] leading-relaxed">
          <div className="text-sm font-medium">학습 목표</div>
          <p className="mt-1">
            B 영역에서는 <strong>도트 그림 데이터</strong> 하나를 가지고 데이터 다듬기(B2) → 학습/평가 분할(B3) → 이진 분류 학습(B4) → 다중 분류와 소프트맥스(B5)로 한 흐름을 끝까지 따라갑니다.
          </p>
        </div>
        <div className="flex sm:justify-end">
          <button
            className={understood ? 'btn-ghost' : 'btn-primary'}
            onClick={() => setUnderstood(true)}
            disabled={understood}
          >
            {understood ? '✓ 이해했어요' : '이해했어요 — 다음으로'}
          </button>
        </div>
      </div>
    </article>
  );
}

/* ────────── 8×8 도트 썸네일 ────────── */
function DotThumb({ sample, size = 56 }: { sample: DotSample; size?: number }) {
  const cell = size / 8;
  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      width={size}
      height={size}
      className="rounded border border-border bg-white dark:bg-zinc-900"
    >
      {sample.pixels.map((v, i) => {
        const x = (i % 8) * cell;
        const y = Math.floor(i / 8) * cell;
        return (
          <rect
            key={i}
            x={x}
            y={y}
            width={cell}
            height={cell}
            fill={v === 1 ? 'rgb(var(--color-accent))' : 'transparent'}
          />
        );
      })}
      {/* 옅은 격자 */}
      {Array.from({ length: 9 }).map((_, i) => (
        <g key={i} stroke="rgb(var(--color-border))" strokeWidth={0.4} opacity={0.6}>
          <line x1={i * cell} y1={0} x2={i * cell} y2={size} />
          <line x1={0} y1={i * cell} x2={size} y2={i * cell} />
        </g>
      ))}
    </svg>
  );
}
