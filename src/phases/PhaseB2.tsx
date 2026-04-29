// PhaseB2 — 데이터셋과 전처리
// 36장 도트 데이터에 노이즈/오라벨이 심어져 있다.
// 학생은 그림 + 적힌 라벨을 보고 *이상해 보이는 샘플*을 직접 토글로 제외한다.
// 두 학습(전처리 없음 vs 전처리 후)의 정확도 곡선을 나란히 비교한다.
import { useEffect, useMemo, useRef, useState } from 'react';
import { PHASES } from '../phases';
import { useApp } from '../store';
import {
  useDot,
  activeSamples,
  trainLinearClassifier,
  evaluateAccuracy,
} from '../dotStore';
import {
  SHAPE_LABEL_KO,
  type DotSample,
  type ShapeLabel,
} from '../data/dotShapes';

// B2는 동그라미 vs 세모 두 라벨로만 비교 학습 (이진).
// 데이터의 '적힌 라벨'(label 필드)이 mislabel일 수 있으니, 그대로 학습에 넣는 것이 핵심.
const TASK_LABELS: ShapeLabel[] = ['circle', 'triangle'];
const EPOCHS = 16;
const LR = 0.18;

interface TrainResult {
  trainAcc: number;
  evalAcc: number;
  accHistory: number[];
}

function runTraining(samples: DotSample[]): TrainResult {
  // 학습 가능한 샘플은 두 라벨('적힌 라벨' 기준)에 해당하는 것만.
  const usable = samples.filter((s) => TASK_LABELS.includes(s.label));
  if (usable.length < 2) {
    return { trainAcc: 0, evalAcc: 0, accHistory: [] };
  }
  const { w, b, accuracyHistory } = trainLinearClassifier(usable, TASK_LABELS, EPOCHS, LR);
  // *진짜 라벨*로 평가 — mislabel이 있으면 mislabel 필드가 정답.
  const truthSamples: DotSample[] = samples
    .filter((s) => {
      const truth = s.mislabel ?? s.label;
      return TASK_LABELS.includes(truth);
    })
    .map((s) => ({ ...s, label: s.mislabel ?? s.label }));
  const ev = evaluateAccuracy(truthSamples, TASK_LABELS, w, b);
  // 학습셋(적힌 라벨 기준) 정확도는 마지막 epoch의 값.
  const trainAcc = accuracyHistory[accuracyHistory.length - 1] ?? 0;
  return { trainAcc, evalAcc: ev.accuracy, accHistory: accuracyHistory };
}

export function PhaseB2() {
  const meta = PHASES.find((p) => p.id === 'b2')!;
  const markCompleted = useApp((s) => s.markCompleted);

  const samples = useDot((s) => s.samples);
  const removedIds = useDot((s) => s.removedIds);
  const toggleRemove = useDot((s) => s.toggleRemove);
  const resetRemoved = useDot((s) => s.resetRemoved);

  // 라벨별 그룹 (UI 갤러리는 세 라벨 모두 보여주지만 학습은 동그라미·세모만 사용)
  const grouped = useMemo(() => {
    const labels: ShapeLabel[] = ['circle', 'triangle', 'square'];
    return labels.map((lbl) => ({
      label: lbl,
      items: samples.filter((s) => s.label === lbl),
    }));
  }, [samples]);

  const active = useMemo(
    () => activeSamples({ samples, removedIds }),
    [samples, removedIds]
  );

  // 두 학습 결과 — 전처리 없음(전체)과 전처리 후(active).
  // 첫 진입에서도 보이도록 즉시 한 번 학습. 시드/파라미터 고정이라 결정론적.
  const baseline = useMemo<TrainResult>(() => runTraining(samples), [samples]);
  const [current, setCurrent] = useState<TrainResult>(() => runTraining(samples));

  // 학생이 active set을 바꾼 뒤 "재학습"을 누르면 현재 active로 다시 학습.
  const retrain = () => setCurrent(runTraining(active));

  // *제거된 노이즈/오라벨 샘플 수* 추적 — 정답 판정에 쓴다.
  const removedDirty = useMemo(() => {
    let n = 0;
    for (const s of samples) {
      if (!removedIds.has(s.id)) continue;
      if (s.noisy || s.mislabel) n += 1;
    }
    return n;
  }, [samples, removedIds]);

  // 완료 조건: dirty 4개 이상 제거 + 현재 평가 정확도 ≥ 0.9
  const completedRef = useRef(false);
  useEffect(() => {
    if (completedRef.current) return;
    if (removedDirty >= 4 && current.evalAcc >= 0.9) {
      completedRef.current = true;
      markCompleted('b2');
    }
  }, [removedDirty, current.evalAcc, markCompleted]);

  // 라벨 카운트 (학습에 쓰이는 두 라벨만)
  const taskActiveCount = active.filter((s) => TASK_LABELS.includes(s.label)).length;
  const taskTotalCount = samples.filter((s) => TASK_LABELS.includes(s.label)).length;

  return (
    <article>
      <div className="text-xs font-mono text-muted">PHASE {meta.num}</div>
      <h1>{meta.title}</h1>
      <p className="text-muted mt-2 text-sm">{meta.subtitle}</p>

      {/* 도입 — PLAN ## 10-1 #2 본문 (그대로) */}
      <div className="aside-note mt-4 text-[13px] leading-relaxed">
        같은 그림 데이터를 <strong>전처리 없이</strong> 학습시켰을 때와 <strong>전처리 후</strong> 학습시켰을 때를 나란히 비교해 봐요. 정확도 곡선이 어떻게 달라지는지 보세요 — 그림을 깨끗하게 다듬는 일이 모델보다 먼저인 이유가 여기 있습니다.
      </div>

      <div className="mt-4 grid lg:grid-cols-[1.55fr_1fr] gap-4 items-start">
        {/* 좌: 데이터 갤러리 */}
        <div className="card p-3">
          <div className="flex items-baseline justify-between flex-wrap gap-2">
            <div className="text-sm font-medium">데이터 갤러리 (36장)</div>
            <div className="text-[12px] text-muted">
              그림과 적힌 라벨이 어울리지 않거나 점들이 이상해 보이는 샘플을 클릭해 <strong>제외</strong>해 보세요.
            </div>
          </div>

          <div className="mt-2 space-y-2 max-h-[420px] overflow-y-auto pr-1">
            {grouped.map(({ label, items }) => (
              <div key={label}>
                <div className="text-[12px] text-muted mb-1">
                  적힌 라벨: <strong>{SHAPE_LABEL_KO[label]}</strong>
                  {label === 'square' && <span className="ml-2 text-[11px]">(B2 학습은 동그라미/세모만 사용)</span>}
                </div>
                <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-12 gap-1.5">
                  {items.map((s) => {
                    const removed = removedIds.has(s.id);
                    return (
                      <button
                        key={s.id}
                        onClick={() => toggleRemove(s.id)}
                        className={
                          'group relative rounded border px-0.5 py-0.5 text-[10px] transition ' +
                          (removed
                            ? 'border-rose-300 bg-rose-50 dark:bg-rose-950/30 opacity-50'
                            : 'border-border hover:border-accent bg-white dark:bg-zinc-900')
                        }
                        title={`${s.id} · ${removed ? '제외됨 (다시 클릭하면 포함)' : '클릭해서 제외'}`}
                      >
                        <DotThumb pixels={s.pixels} size={36} />
                        <div className="text-[10px] text-muted text-center mt-0.5 leading-none">
                          {removed ? '제외' : s.id.split('-')[1]}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-2 text-[12px]">
            <span className="text-muted">
              제외된 샘플 <span className="font-mono text-accent">{removedIds.size}</span> · 남은 active{' '}
              <span className="font-mono text-accent">{active.length}</span> / {samples.length}
            </span>
            <button onClick={resetRemoved} className="btn-ghost ml-auto !py-1 !px-2 text-[12px]">
              원본 데이터셋으로 되돌리기
            </button>
          </div>
        </div>

        {/* 우: 비교 학습 패널 */}
        <div className="space-y-3">
          <div className="card p-3">
            <div className="text-sm font-medium mb-1">비교 학습 — 동그라미 vs 세모</div>
            <div className="text-[11px] text-muted leading-relaxed">
              두 학습 모두 같은 시드/같은 학습률로 결정론적으로 돌립니다. 데이터만 다른 거예요.
            </div>

            <div className="mt-2 grid grid-cols-2 gap-2">
              <ResultCard
                label="전처리 없음"
                sub={`전체 ${taskTotalCount}장`}
                accent={false}
                result={baseline}
              />
              <ResultCard
                label="전처리 후"
                sub={`active ${taskActiveCount}장`}
                accent={true}
                result={current}
              />
            </div>

            <AccuracyCurve baseline={baseline.accHistory} current={current.accHistory} />

            <div className="flex flex-wrap gap-2 mt-2">
              <button onClick={retrain} className="btn-primary">▶ 현재 데이터로 재학습</button>
              <button
                onClick={() => setCurrent(runTraining(samples))}
                className="btn-ghost"
                title="비교용 baseline과 같은 결과로 되돌립니다"
              >
                초기화
              </button>
            </div>
          </div>

          <div className="aside-tip text-[12px] leading-relaxed">
            <div className="text-sm font-medium">완료 조건</div>
            <p className="mt-1 text-muted">
              <strong>이상해 보이는 샘플 4개 이상 제거 + 재학습 정확도 90% 이상</strong>이면 자동 완료돼요.
              현재 제거한 의심 샘플{' '}
              <span className={'font-mono ' + (removedDirty >= 4 ? 'text-emerald-600' : 'text-accent')}>
                {removedDirty}/4
              </span>
              · 평가 정확도{' '}
              <span className={'font-mono ' + (current.evalAcc >= 0.9 ? 'text-emerald-600' : 'text-accent')}>
                {(current.evalAcc * 100).toFixed(1)}%
              </span>
            </p>
          </div>
        </div>
      </div>
    </article>
  );
}

/* ────────── 결과 카드 ────────── */
function ResultCard({
  label,
  sub,
  accent,
  result,
}: {
  label: string;
  sub: string;
  accent: boolean;
  result: TrainResult;
}) {
  return (
    <div
      className={
        'rounded border p-2 ' +
        (accent ? 'border-accent bg-accent-bg/40' : 'border-border')
      }
    >
      <div className="text-[12px] font-medium">{label}</div>
      <div className="text-[10px] text-muted">{sub}</div>
      <div className="mt-1 grid grid-cols-2 gap-1 font-mono text-[11px]">
        <div>
          <div className="text-muted text-[10px]">학습</div>
          <div className="text-sm font-semibold">{(result.trainAcc * 100).toFixed(0)}%</div>
        </div>
        <div>
          <div className="text-muted text-[10px]">평가(진짜 라벨)</div>
          <div
            className="text-sm font-semibold"
            style={{ color: result.evalAcc >= 0.9 ? 'rgb(16,185,129)' : undefined }}
          >
            {(result.evalAcc * 100).toFixed(0)}%
          </div>
        </div>
      </div>
    </div>
  );
}

/* ────────── 정확도 곡선 (두 학습 동시) ────────── */
function AccuracyCurve({
  baseline,
  current,
}: {
  baseline: number[];
  current: number[];
}) {
  const W = 360;
  const H = 110;
  const padL = 28;
  const padR = 8;
  const padT = 10;
  const padB = 18;
  const N = Math.max(baseline.length, current.length, 2);

  const sx = (i: number) => padL + (i / (N - 1)) * (W - padL - padR);
  const sy = (v: number) => H - padB - v * (H - padT - padB);

  const pathOf = (h: number[]) => {
    if (h.length === 0) return '';
    let p = '';
    h.forEach((v, i) => {
      p += `${i === 0 ? 'M' : 'L'}${sx(i).toFixed(1)},${sy(v).toFixed(1)} `;
    });
    return p;
  };

  const yTicks = [0, 0.5, 1];

  return (
    <div className="mt-2">
      <div className="flex items-baseline justify-between px-1">
        <div className="text-[12px] font-medium">학습 정확도 곡선</div>
        <div className="text-[10px] font-mono text-muted">
          <span style={{ color: 'rgb(148,163,184)' }}>● 전처리 없음</span>{' '}
          <span className="text-accent">● 전처리 후</span>
        </div>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
        <line x1={padL} y1={H - padB} x2={W - padR} y2={H - padB} stroke="rgb(var(--color-border))" />
        <line x1={padL} y1={padT} x2={padL} y2={H - padB} stroke="rgb(var(--color-border))" />
        {yTicks.map((t) => (
          <g key={t}>
            <line
              x1={padL - 3}
              y1={sy(t)}
              x2={W - padR}
              y2={sy(t)}
              stroke="rgb(var(--color-border))"
              opacity={0.4}
            />
            <text x={padL - 5} y={sy(t) + 3} textAnchor="end" fontSize={9} fill="rgb(var(--color-muted))">
              {(t * 100).toFixed(0)}%
            </text>
          </g>
        ))}
        {/* 90% 임계선 */}
        <line
          x1={padL}
          y1={sy(0.9)}
          x2={W - padR}
          y2={sy(0.9)}
          stroke="rgb(16,185,129)"
          strokeDasharray="3 3"
          opacity={0.6}
        />
        <path d={pathOf(baseline)} fill="none" stroke="rgb(148,163,184)" strokeWidth={1.6} />
        <path d={pathOf(current)} fill="none" stroke="rgb(var(--color-accent))" strokeWidth={1.8} />
        <text x={W - padR - 2} y={sy(0.9) - 2} textAnchor="end" fontSize={9} fill="rgb(16,185,129)">
          90% 목표
        </text>
        <text x={W - padR} y={H - 4} textAnchor="end" fontSize={9} fill="rgb(var(--color-muted))">
          epoch
        </text>
      </svg>
    </div>
  );
}

/* ────────── 8×8 도트 썸네일 (작은 버전) ────────── */
function DotThumb({ pixels, size = 36 }: { pixels: number[]; size?: number }) {
  const cell = size / 8;
  return (
    <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} className="block mx-auto">
      <rect x={0} y={0} width={size} height={size} fill="white" className="dark:fill-zinc-900" />
      {pixels.map((v, i) => {
        if (v !== 1) return null;
        const x = (i % 8) * cell;
        const y = Math.floor(i / 8) * cell;
        return (
          <rect key={i} x={x} y={y} width={cell} height={cell} fill="rgb(var(--color-accent))" />
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
