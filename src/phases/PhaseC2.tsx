// PhaseC2 — 일반화: 새 데이터에서 틀리는 이유 (과적합 직관)
// 학습 정확도와 평가 정확도를 *복잡도/학습 시간* 슬라이더로 동시에 보여주고,
// 두 곡선이 갈라지는 갈림점에서 "외운 신호"라는 직관을 잡는다.
// 정규화·드롭아웃·정밀도 같은 어휘는 쓰지 않는다.

import { useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '../store';
import { PHASES } from '../phases';

// 시뮬레이션 곡선 — train은 단조 상승, eval은 갈림점에서 내려가는 형태.
// 현실의 과적합 곡선과 같은 "U자형 일반화 갭"을 단순 함수로 만들어 놓고
// 슬라이더(복잡도) x ∈ [0, 1] 으로 한 점을 가리킨다.
const N_STEPS = 60;
const SPLIT_POINT = 0.55; // 0~1 정규화. 이 지점부터 train은 계속 오르지만 eval은 떨어짐.

function trainCurve(t: number): number {
  // 0~1 → 빠르게 0.99까지 단조 상승. 시작은 0.50 근처(랜덤 추측 + 약간).
  return 0.5 + 0.49 * (1 - Math.exp(-3.6 * t));
}

function evalCurve(t: number): number {
  // 0~SPLIT_POINT까지는 train과 함께 오름.
  // SPLIT_POINT 이후로는 외운 신호 영향으로 점차 하락.
  const peak = 0.5 + 0.42 * (1 - Math.exp(-3.6 * SPLIT_POINT));
  if (t <= SPLIT_POINT) {
    return 0.5 + 0.42 * (1 - Math.exp(-3.6 * t));
  }
  const overshoot = t - SPLIT_POINT;
  // 0.45 폭만큼 가는 동안 약 0.20 떨어진다.
  return Math.max(0.55, peak - 0.55 * overshoot);
}

export function PhaseC2() {
  const meta = PHASES.find((p) => p.id === 'c2')!;
  const markCompleted = useApp((s) => s.markCompleted);

  // 슬라이더 단계 — 0(시작)~N_STEPS(과적합 영역 끝)
  const [step, setStep] = useState(0);
  const [auto, setAuto] = useState(false);

  // 0~1 정규화된 학습 진행도
  const t = step / N_STEPS;
  const trainAcc = trainCurve(t);
  const evalAcc = evalCurve(t);
  const gap = trainAcc - evalAcc;

  // 갈림점 step 인덱스
  const splitStep = Math.round(SPLIT_POINT * N_STEPS);

  // 곡선 좌표 — 메모이제이션 (slider 변화에 영향 없음)
  const curves = useMemo(() => {
    const tr: { x: number; y: number }[] = [];
    const ev: { x: number; y: number }[] = [];
    for (let i = 0; i <= N_STEPS; i++) {
      const tt = i / N_STEPS;
      tr.push({ x: i, y: trainCurve(tt) });
      ev.push({ x: i, y: evalCurve(tt) });
    }
    return { tr, ev };
  }, []);

  // 슬라이더 끝까지 한 번 가면 완료 처리
  const completedRef = useRef(false);
  useEffect(() => {
    if (!completedRef.current && step >= N_STEPS) {
      completedRef.current = true;
      markCompleted('c2');
    }
  }, [step, markCompleted]);

  // 자동 진행 — setInterval
  useEffect(() => {
    if (!auto) return;
    const id = setInterval(() => {
      setStep((s) => {
        if (s >= N_STEPS) return s;
        return s + 1;
      });
    }, 80);
    return () => clearInterval(id);
  }, [auto]);

  useEffect(() => {
    if (auto && step >= N_STEPS) setAuto(false);
  }, [auto, step]);

  const reset = () => {
    setStep(0);
    setAuto(false);
  };
  const restart = () => {
    setStep(0);
    setAuto(true);
  };

  const inOverfit = step > splitStep;

  return (
    <article>
      <div className="text-xs font-mono text-muted">PHASE {meta.num}</div>
      <h1>{meta.title}</h1>
      <p className="text-muted mt-2 text-sm leading-relaxed">
        학습 데이터에서 정확도가 높다고 무조건 좋은 모델은 아니에요.
        모델이 학습 데이터의 *우연한 특징까지* 외워버리면, 처음 보는 평가 데이터에서는
        오히려 더 자주 틀리게 됩니다. 슬라이더를 끝까지 밀어 두 곡선이 어디에서 갈라지는지 직접 살펴보세요.
      </p>

      <div className="mt-4 grid lg:grid-cols-[1.6fr_1fr] gap-4 items-start">
        {/* 좌측 — train/eval 두 곡선 */}
        <div className="card p-3">
          <div className="flex items-baseline justify-between">
            <div className="text-sm font-medium">학습 곡선 vs 평가 곡선</div>
            <div className="text-[11px] font-mono text-muted">
              <span style={{ color: 'rgb(59,130,246)' }}>● train</span>
              <span className="ml-3" style={{ color: 'rgb(234,88,12)' }}>● eval</span>
            </div>
          </div>
          <CurvesSVG
            tr={curves.tr}
            ev={curves.ev}
            step={step}
            splitStep={splitStep}
            n={N_STEPS}
          />
          <div className="text-[12px] text-muted px-1 mt-1 leading-snug">
            가로축은 학습 진행도(=복잡도/학습 시간). 두 곡선이 함께 오르다가
            <span className="mx-1" style={{ color: 'rgb(190,18,60)' }}>
              세로 점선
            </span>
            을 지나면서 갈라져요. 갈라진 폭만큼 모델이 학습 데이터를 *외운* 정도예요.
          </div>
        </div>

        {/* 우측 — 컨트롤 */}
        <div className="space-y-3">
          <div className="card p-3 space-y-3">
            <div>
              <div className="text-sm font-medium">복잡도 / 학습 시간</div>
              <p className="text-[11px] text-muted mt-0.5 leading-snug">
                슬라이더를 끝까지 밀면 train은 계속 오르고 eval은 떨어져요.
              </p>
            </div>
            <input
              type="range"
              min={0}
              max={N_STEPS}
              value={step}
              onChange={(e) => setStep(Number(e.target.value))}
              className="w-full accent-violet-600"
              aria-label="복잡도 슬라이더"
            />
            <div className="flex justify-between text-[10px] font-mono text-muted">
              <span>단순 / 짧은 학습</span>
              <span style={{ color: 'rgb(190,18,60)' }}>← 갈림점 →</span>
              <span>복잡 / 긴 학습</span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center font-mono text-xs pt-1">
              <BigStat
                label="train acc"
                value={(trainAcc * 100).toFixed(1) + '%'}
                color="rgb(59,130,246)"
              />
              <BigStat
                label="eval acc"
                value={(evalAcc * 100).toFixed(1) + '%'}
                color="rgb(234,88,12)"
              />
              <BigStat
                label="차이 (외운 정도)"
                value={(gap * 100).toFixed(1) + '%p'}
                color={gap > 0.1 ? 'rgb(190,18,60)' : 'rgb(var(--color-muted))'}
                emphasize={gap > 0.1}
              />
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              <button onClick={restart} className="btn-primary" disabled={auto}>
                ▶ 다시 학습
              </button>
              <button onClick={() => setAuto((v) => !v)} className="btn-ghost">
                {auto ? '⏸ 멈춤' : '▶ 자동'}
              </button>
              <button onClick={reset} className="btn-ghost">초기화</button>
            </div>
            <div className="text-[10px] text-muted">
              학습 진행도 step <span className="font-mono text-accent">{step}</span> / {N_STEPS}
            </div>
          </div>

          {inOverfit && (
            <div
              className="rounded-md px-3 py-2 text-sm border"
              style={{
                borderColor: 'rgb(190,18,60)',
                backgroundColor: 'rgba(190,18,60,0.08)',
                color: 'rgb(190,18,60)',
              }}
            >
              <strong>지금 갈림점을 지났어요.</strong>{' '}
              train은 계속 오르지만 eval은 내려가고 있어요. 두 숫자의 차이를 살펴보세요.
            </div>
          )}
        </div>
      </div>

      {/* 하단 한 줄 직관 */}
      <div className="aside-tip text-sm mt-4">
        학습 정확도와 평가 정확도가 <strong>벌어지면</strong> 외운 신호.
        모델이 일반화하지 못하고 있어요.
      </div>
    </article>
  );
}

/* ────────── 곡선 SVG — train(파랑) / eval(주황) + 현재 위치 마커 + 갈림점 점선 ────────── */
function CurvesSVG({
  tr,
  ev,
  step,
  splitStep,
  n,
}: {
  tr: { x: number; y: number }[];
  ev: { x: number; y: number }[];
  step: number;
  splitStep: number;
  n: number;
}) {
  const W = 720, H = 260;
  const padL = 40, padR = 14, padT = 14, padB = 28;
  const sx = (i: number) => padL + (i / n) * (W - padL - padR);
  const sy = (acc: number) => {
    // 0.45 ~ 1.0 영역만 보여줘도 정보 보존
    const yMin = 0.45, yMax = 1.0;
    return H - padB - ((acc - yMin) / (yMax - yMin)) * (H - padT - padB);
  };

  const pathTr = tr
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${sx(p.x)},${sy(p.y)}`)
    .join(' ');
  const pathEv = ev
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${sx(p.x)},${sy(p.y)}`)
    .join(' ');

  // 현재 step에서의 두 점
  const curT = tr[step] ?? tr[tr.length - 1];
  const curE = ev[step] ?? ev[ev.length - 1];

  const ticksY = [0.5, 0.6, 0.7, 0.8, 0.9, 1.0];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full mt-1" preserveAspectRatio="xMidYMid meet">
      {/* 축 */}
      <line x1={padL} y1={H - padB} x2={W - padR} y2={H - padB} stroke="rgb(var(--color-border))" />
      <line x1={padL} y1={padT} x2={padL} y2={H - padB} stroke="rgb(var(--color-border))" />
      <text x={W - padR} y={H - 8} textAnchor="end" fontSize={10} fill="rgb(var(--color-muted))">
        학습 진행도 →
      </text>
      <text x={padL - 6} y={padT + 9} textAnchor="end" fontSize={10} fill="rgb(var(--color-muted))">
        정확도
      </text>

      {/* y 그리드 */}
      {ticksY.map((y) => (
        <g key={y}>
          <line
            x1={padL}
            x2={W - padR}
            y1={sy(y)}
            y2={sy(y)}
            stroke="rgb(var(--color-border))"
            strokeOpacity={0.35}
            strokeDasharray="2 4"
          />
          <text x={padL - 4} y={sy(y) + 3} textAnchor="end" fontSize={9} fill="rgb(var(--color-muted))">
            {(y * 100).toFixed(0)}%
          </text>
        </g>
      ))}

      {/* 갈림점 점선 */}
      <line
        x1={sx(splitStep)}
        x2={sx(splitStep)}
        y1={padT}
        y2={H - padB}
        stroke="rgb(190,18,60)"
        strokeWidth={1.2}
        strokeDasharray="6 4"
        strokeOpacity={0.7}
      />
      <text
        x={sx(splitStep) + 6}
        y={padT + 12}
        fontSize={10.5}
        fontWeight={600}
        fill="rgb(190,18,60)"
      >
        과적합 갈림점
      </text>

      {/* train(파랑) / eval(주황) 곡선 */}
      <path d={pathTr} fill="none" stroke="rgb(59,130,246)" strokeWidth={2.2} />
      <path d={pathEv} fill="none" stroke="rgb(234,88,12)" strokeWidth={2.2} />

      {/* 현재 위치 — 두 점 + 사이 갭 라인 */}
      <line
        x1={sx(step)}
        x2={sx(step)}
        y1={sy(curT.y)}
        y2={sy(curE.y)}
        stroke="rgb(16,185,129)"
        strokeWidth={1.4}
        strokeDasharray="3 3"
        strokeOpacity={0.85}
      />
      <circle cx={sx(step)} cy={sy(curT.y)} r={5} fill="rgb(59,130,246)" />
      <circle cx={sx(step)} cy={sy(curE.y)} r={5} fill="rgb(234,88,12)" />
    </svg>
  );
}

function BigStat({
  label,
  value,
  color,
  emphasize,
}: {
  label: string;
  value: string;
  color: string;
  emphasize?: boolean;
}) {
  return (
    <div
      className="rounded border p-2"
      style={{
        borderColor: emphasize ? color : 'rgb(var(--color-border))',
        backgroundColor: emphasize ? 'rgba(190,18,60,0.06)' : 'transparent',
      }}
    >
      <div className="text-[10px] text-muted">{label}</div>
      <div className="text-base font-semibold" style={{ color }}>
        {value}
      </div>
    </div>
  );
}
