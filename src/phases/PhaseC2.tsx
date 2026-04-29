// PhaseC2 — 일반화: 새 데이터에서 틀리는 이유 (외운 정도 = 학습-평가 갭)
//
// 같은 모델([64, 16, 2])을 같은 시드/같은 epoch/같은 lr로 두 번 학습한다.
// 단 *학습 데이터 양*만 다르게 — 적은 데이터(라벨당 2~3장) vs 전체.
// 외운 모델은 train 정확도가 높지만 eval 정확도가 따라가지 못한다.
// 이 갭이 곧 "외운 정도"라는 직관을 진짜 SGD 곡선으로 보여준다.

import { useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '../store';
import { PHASES } from '../phases';
import { DOT_SAMPLES_DEFAULT, type DotSample, SHAPE_LABELS } from '../data/dotShapes';
import {
  createDeepMLP,
  trainStep,
  evaluate,
  shuffle,
  type MLP,
  type TrainSample,
} from '../lib/nn';

/* ---------- C2 자체 데이터 풀 ----------
 * B3 분할에 의존하면 active train·eval이 12장 안팎으로 작아져
 * eval 분해능이 8%p 단위가 된다 — 모델 크기를 줄여도 통계적 차이가 묻힌다.
 * C2가 직접 dotShapes의 깨끗한 24장(동·세모)에서 자체 분할 + augment로 eval 풀을 키운다. */
const POOL_LABELS: ('circle' | 'triangle')[] = ['circle', 'triangle'];

function deterministicShuffle<T>(arr: T[], seed: number): T[] {
  const out = arr.slice();
  let s = seed;
  const rnd = () => { s = (s * 1664525 + 1013904223) & 0x7fffffff; return s / 0x7fffffff; };
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/* 깨끗한 24장(동·세모) → 시드 고정 셔플 → 학습 풀 12장 + 평가 풀 12장.
 * 학습과 평가가 *같은 분포*. augment는 사용하지 않는다(분포 불일치 → 의도 흐림).
 * eval 12장 분해능 8.3%p. 학습 4장 vs 12장 차이 3배 — 통계적 갭은 명확하되
 * SGD 운에 따라 가끔 역전 가능 (그게 학습의 본질이라 사용자 합의됨). */
const CLEAN_POOL: DotSample[] = DOT_SAMPLES_DEFAULT.filter(
  (s) => POOL_LABELS.includes(s.label as 'circle' | 'triangle') && !s.noisy && !s.mislabel,
);
// 라벨별 6장씩 train/eval 분할 (계층 샘플링)
function splitByLabel(pool: DotSample[]): { train: DotSample[]; evalSet: DotSample[] } {
  const byLabel = new Map<string, DotSample[]>();
  for (const s of pool) {
    const list = byLabel.get(s.label) ?? [];
    list.push(s);
    byLabel.set(s.label, list);
  }
  const train: DotSample[] = [];
  const evalSet: DotSample[] = [];
  byLabel.forEach((list) => {
    const shuf = deterministicShuffle(list, 42);
    train.push(...shuf.slice(0, 6));
    evalSet.push(...shuf.slice(6));
  });
  return { train, evalSet };
}
const _split = splitByLabel(CLEAN_POOL);
const TRAIN_POOL_RAW: DotSample[] = _split.train;       // 12장
const EVAL_POOL: DotSample[] = _split.evalSet;          // 12장

/* ---------- 학습 데이터 변환 ----------
 * C2는 동그라미 vs 세모 두 라벨로만 학습 (B4와 동일 구조).
 * 모델 크기는 데이터 세팅(학습 4~16장, 평가 40장)에 맞춰 [64, 4, 2]. */
const TWO_LABELS = ['circle', 'triangle'] as const;
const LAYERS = [64, 4, 2];

function toTrainSamples(samples: DotSample[]): TrainSample[] {
  return samples.map((s) => ({
    x: new Float32Array(s.pixels),
    y: TWO_LABELS.indexOf(s.label as 'circle' | 'triangle'),
  }));
}

/* 학습 풀에서 라벨당 N장만 추출 — 결정론. 적은(few) 학습에 사용. */
function pickFewPerLabel(perLabel: number): TrainSample[] {
  const picks: DotSample[] = [];
  const counts: Record<string, number> = { circle: 0, triangle: 0 };
  for (const s of TRAIN_POOL_RAW) {
    if (counts[s.label] < perLabel) {
      picks.push(s);
      counts[s.label]++;
    }
    if (counts.circle >= perLabel && counts.triangle >= perLabel) break;
  }
  return toTrainSamples(picks);
}

/* ---------- 학습 진행 로그 한 점 ---------- */
interface LogEntry { epoch: number; loss: number; trainAcc: number; evalAcc: number }

interface RunResult {
  log: LogEntry[];
  finalTrain: number;
  finalEval: number;
}

export function PhaseC2() {
  const meta = PHASES.find((p) => p.id === 'c2')!;
  const markCompleted = useApp((s) => s.markCompleted);

  // C2는 자체 풀 사용 — B3 분할에 종속되지 않음.
  const trainData = useMemo(() => toTrainSamples(TRAIN_POOL_RAW), []);
  const evalData = useMemo(() => toTrainSamples(EVAL_POOL), []);

  const [epochs, setEpochs] = useState(30);
  const [lr, setLr] = useState(0.1);
  const [perLabel] = useState(2); // 적은 데이터 모델: 라벨당 2장 = 4장 (전체 16장 대비 4배)

  // 두 학습 진행 상태
  const [running, setRunning] = useState(false);
  const [fewLog, setFewLog] = useState<LogEntry[]>([]);
  const [allLog, setAllLog] = useState<LogEntry[]>([]);
  const [fewResult, setFewResult] = useState<RunResult | null>(null);
  const [allResult, setAllResult] = useState<RunResult | null>(null);
  const cancelRef = useRef(false);

  // 토글 펼침 상태 (완료 조건 확인용)
  const [detailsOpened, setDetailsOpened] = useState(false);

  // 완료 조건
  const completedRef = useRef(false);
  useEffect(() => {
    if (completedRef.current) return;
    if (fewResult && allResult && detailsOpened) {
      completedRef.current = true;
      markCompleted('c2');
    }
  }, [fewResult, allResult, detailsOpened, markCompleted]);

  useEffect(() => () => { cancelRef.current = true; }, []);

  const fewTrainCount = Math.min(perLabel * TWO_LABELS.length, trainData.length);
  const enoughData = trainData.length >= 4 && evalData.length >= 2;

  async function runOne(
    train: TrainSample[],
    setLog: (l: LogEntry[]) => void,
  ): Promise<RunResult> {
    const m: MLP = createDeepMLP(LAYERS);
    const log: LogEntry[] = [];
    const BATCH = 8;
    for (let ep = 0; ep < epochs; ep++) {
      if (cancelRef.current) break;
      const batches = shuffle(train);
      let lossSum = 0, n = 0;
      for (let i = 0; i < batches.length; i += BATCH) {
        const slice = batches.slice(i, i + BATCH);
        if (slice.length === 0) continue;
        lossSum += trainStep(m, slice, lr);
        n++;
      }
      const avgLoss = n > 0 ? lossSum / n : 0;
      const trainAcc = evaluate(m, train);
      const evalAcc = evaluate(m, evalData);
      log.push({ epoch: ep + 1, loss: avgLoss, trainAcc, evalAcc });
      setLog(log.slice());
      // UI yield
      await new Promise((r) => setTimeout(r, 0));
    }
    return {
      log,
      finalTrain: log.length > 0 ? log[log.length - 1].trainAcc : 0,
      finalEval: log.length > 0 ? log[log.length - 1].evalAcc : 0,
    };
  }

  async function runBoth() {
    if (running) return;
    if (!enoughData) return;
    cancelRef.current = false;
    setRunning(true);
    setFewLog([]); setAllLog([]);
    setFewResult(null); setAllResult(null);

    // 적은 데이터 모델 — 라벨당 perLabel 장만 시드 고정으로 추출
    const fewTrain = pickFewPerLabel(perLabel);
    // 두 학습을 순차로 — 같은 epoch/같은 lr/같은 모델 구조
    const few = await runOne(fewTrain, setFewLog);
    setFewResult(few);
    if (cancelRef.current) { setRunning(false); return; }
    const all = await runOne(trainData, setAllLog);
    setAllResult(all);
    setRunning(false);
  }

  function reset() {
    cancelRef.current = true;
    setRunning(false);
    setFewLog([]); setAllLog([]);
    setFewResult(null); setAllResult(null);
    // 다음 실행을 위해 다시 풀어준다
    setTimeout(() => { cancelRef.current = false; }, 0);
  }

  const fewGap = fewResult ? fewResult.finalTrain - fewResult.finalEval : 0;
  const allGap = allResult ? allResult.finalTrain - allResult.finalEval : 0;

  return (
    <article>
      <div className="text-xs font-mono text-muted">PHASE {meta.num}</div>
      <h1>{meta.title}</h1>
      <p className="text-muted mt-1 text-sm">학습엔 잘 맞는데 평가에선 틀리는 모델</p>

      <p className="mt-3 text-base leading-relaxed">
        같은 모델을 <em>학습 데이터를 다르게 줘서</em> 두 번 학습시키면, 외운 정도가 한눈에 보입니다.
        정답이 적으면 모델은 그 몇 장을 외워버려요.
      </p>

      {!enoughData && (
        <div className="aside-tip text-sm mt-3">
          학습/평가 데이터가 부족해요. 앞 단계에서 데이터셋을 먼저 준비해 주세요.
        </div>
      )}

      <div className="mt-4 grid lg:grid-cols-[1.6fr_1fr] gap-4 items-start">
        {/* 좌측 — 두 학습 그래프 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <RunCard
            title={`학습 데이터 — ${fewTrainCount}장 (적게)`}
            subtitle={`라벨당 ${perLabel}장`}
            log={fewLog}
            result={fewResult}
            running={running && !fewResult}
            highlightGap
          />
          <RunCard
            title={`학습 데이터 — 전체 ${trainData.length}장`}
            subtitle="active train"
            log={allLog}
            result={allResult}
            running={running && fewResult !== null && !allResult}
          />
        </div>

        {/* 우측 — 컨트롤 + 갭 카드 */}
        <div className="space-y-3">
          <div className="card p-3 space-y-3">
            <div className="text-sm font-medium">학습 설정</div>

            <div>
              <div className="flex items-baseline justify-between text-[12px]">
                <span className="text-muted">학습 epochs</span>
                <span className="font-mono text-accent">{epochs}</span>
              </div>
              <input
                type="range" min={10} max={50} step={5}
                value={epochs}
                onChange={(e) => setEpochs(Number(e.target.value))}
                disabled={running}
                className="w-full accent-violet-600"
                aria-label="학습 epochs"
              />
            </div>

            <div>
              <div className="flex items-baseline justify-between text-[12px]">
                <span className="text-muted">학습률 (lr)</span>
                <span className="font-mono text-accent">{lr.toFixed(2)}</span>
              </div>
              <input
                type="range" min={0.05} max={0.2} step={0.01}
                value={lr}
                onChange={(e) => setLr(Number(e.target.value))}
                disabled={running}
                className="w-full accent-violet-600"
                aria-label="학습률"
              />
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              <button
                onClick={runBoth}
                className="btn-primary"
                disabled={running || !enoughData}
              >
                {running ? '학습 중…' : '▶ 두 학습 비교 시작'}
              </button>
              <button onClick={reset} className="btn-ghost" disabled={running}>
                초기화
              </button>
            </div>
            <div className="text-[11px] text-muted leading-snug">
              두 학습 모두 같은 모델 <span className="font-mono">[64, 16, 2]</span> ·
              같은 epoch · 같은 lr · 미니배치 8.
            </div>
          </div>

          {/* 갭 강조 카드 */}
          {fewResult && allResult ? (
            <div
              className="card p-3 space-y-2"
              style={{ borderColor: 'rgb(190,18,60)', backgroundColor: 'rgba(190,18,60,0.04)' }}
            >
              <div className="text-sm font-medium" style={{ color: 'rgb(190,18,60)' }}>
                외운 정도 = train acc − eval acc
              </div>
              <GapRow
                label="적은 데이터로 학습한 모델"
                train={fewResult.finalTrain}
                ev={fewResult.finalEval}
                gap={fewGap}
                emphasize
              />
              <GapRow
                label="전체 데이터로 학습한 모델"
                train={allResult.finalTrain}
                ev={allResult.finalEval}
                gap={allGap}
              />
              <div className="pt-1 border-t border-border text-[12px] text-muted">
                적은 데이터 모델의 갭이 더 크다면, 그만큼 학습 데이터를 외워버렸다는 뜻입니다.
              </div>
            </div>
          ) : (
            <div className="card p-3 text-sm text-muted">
              <strong className="text-fg">두 학습 비교 시작</strong>을 누르세요.
              같은 모델·같은 epoch·같은 lr로 학습 데이터 양만 다르게 두 번 학습합니다.
            </div>
          )}
        </div>
      </div>

      {/* Phase12 #2 — 외운 정도 */}
      <details
        className="mt-5 card p-4 text-sm"
        onToggle={(e) => {
          if ((e.currentTarget as HTMLDetailsElement).open) setDetailsOpened(true);
        }}
      >
        <summary className="cursor-pointer font-medium">
          🤔 학습 정확도 vs 평가 정확도 차이 = 외운 정도
        </summary>
        <div className="mt-3 space-y-2 leading-relaxed">
          <p>
            학습 정확도가 100%인데 평가 정확도가 60%대라면, 모델이 학습 데이터를{' '}
            <strong>외워버린</strong> 거예요(과적합).
          </p>
          <p>
            외운 건 잘 맞히지만 처음 보는 그림엔 약합니다. 위에서 본 갭이 바로 그 외운 정도예요.
          </p>
          <p className="text-muted">
            데이터를 더 많이·다양하게 주거나, 모델을 너무 크게 만들지 않으면 갭이 줄어듭니다.
          </p>
        </div>
      </details>

      {fewResult && allResult && !detailsOpened && (
        <div className="aside-tip text-sm mt-3">
          위 토글을 한 번 펼쳐서 마무리하면 이 단계가 완료돼요.
        </div>
      )}
    </article>
  );
}

/* ---------- 한 학습 카드: 미니 ProgressChart + 최종 acc 두 개 ---------- */
function RunCard({
  title,
  subtitle,
  log,
  result,
  running,
  highlightGap = false,
}: {
  title: string;
  subtitle: string;
  log: LogEntry[];
  result: RunResult | null;
  running: boolean;
  highlightGap?: boolean;
}) {
  return (
    <div
      className="card p-3"
      style={highlightGap && result
        ? { borderColor: 'rgb(190,18,60)', backgroundColor: 'rgba(190,18,60,0.04)' }
        : undefined}
    >
      <div className="flex items-baseline justify-between">
        <div className="text-sm font-medium">{title}</div>
        <div className="text-[11px] font-mono text-muted">{subtitle}</div>
      </div>
      <ProgressChart log={log} running={running} />
      <div className="grid grid-cols-2 gap-2 mt-2 text-center">
        <BigStat
          label="train acc"
          value={result ? `${(result.finalTrain * 100).toFixed(1)}%` : log.length > 0 ? `${(log[log.length - 1].trainAcc * 100).toFixed(1)}%` : '—'}
          color="rgb(16,185,129)"
        />
        <BigStat
          label="eval acc"
          value={result ? `${(result.finalEval * 100).toFixed(1)}%` : log.length > 0 ? `${(log[log.length - 1].evalAcc * 100).toFixed(1)}%` : '—'}
          color="rgb(59,130,246)"
        />
      </div>
    </div>
  );
}

function ProgressChart({ log, running }: { log: LogEntry[]; running: boolean }) {
  const W = 360, H = 150;
  const padL = 28, padR = 10, padT = 8, padB = 18;

  if (log.length === 0) {
    return (
      <div
        className="mt-2 flex items-center justify-center text-[12px] text-muted"
        style={{ height: H }}
      >
        {running ? '학습 시작…' : '학습 시작 전'}
      </div>
    );
  }

  const n = Math.max(log.length - 1, 1);
  const sx = (i: number) => padL + (i / n) * (W - padL - padR);
  const syAcc = (acc: number) => H - padB - acc * (H - padT - padB);
  const maxLoss = Math.max(...log.map((l) => l.loss), 0.01);
  const syLoss = (loss: number) => H - padB - (loss / maxLoss) * (H - padT - padB);

  const lossPath = log.map((l, i) => `${i === 0 ? 'M' : 'L'}${sx(i)},${syLoss(l.loss)}`).join(' ');
  const trainPath = log.map((l, i) => `${i === 0 ? 'M' : 'L'}${sx(i)},${syAcc(l.trainAcc)}`).join(' ');
  const evalPath = log.map((l, i) => `${i === 0 ? 'M' : 'L'}${sx(i)},${syAcc(l.evalAcc)}`).join(' ');

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full mt-1" preserveAspectRatio="xMidYMid meet">
      {/* 축 */}
      <line x1={padL} y1={H - padB} x2={W - padR} y2={H - padB} stroke="rgb(var(--color-border))" />
      <line x1={padL} y1={padT} x2={padL} y2={H - padB} stroke="rgb(var(--color-border))" />
      {/* y 그리드 — accuracy 0/0.5/1.0 */}
      {[0, 0.5, 1].map((y) => (
        <g key={y}>
          <line
            x1={padL} x2={W - padR}
            y1={syAcc(y)} y2={syAcc(y)}
            stroke="rgb(var(--color-border))"
            strokeOpacity={0.3}
            strokeDasharray="2 4"
          />
          <text x={padL - 3} y={syAcc(y) + 3} textAnchor="end" fontSize={9} fill="rgb(var(--color-muted))">
            {(y * 100).toFixed(0)}%
          </text>
        </g>
      ))}
      {/* loss(주황) — 자체 스케일 */}
      <path d={lossPath} fill="none" stroke="rgb(234,88,12)" strokeWidth={1.5} strokeOpacity={0.65} />
      {/* train(녹색) / eval(파랑) */}
      <path d={trainPath} fill="none" stroke="rgb(16,185,129)" strokeWidth={2} />
      <path d={evalPath} fill="none" stroke="rgb(59,130,246)" strokeWidth={2} />
      {/* 범례 */}
      <g fontSize={9} fontFamily="ui-monospace, monospace">
        <text x={padL + 4} y={padT + 9} fill="rgb(234,88,12)">● loss</text>
        <text x={padL + 50} y={padT + 9} fill="rgb(16,185,129)">● train</text>
        <text x={padL + 100} y={padT + 9} fill="rgb(59,130,246)">● eval</text>
      </g>
    </svg>
  );
}

function GapRow({
  label, train, ev, gap, emphasize,
}: {
  label: string; train: number; ev: number; gap: number; emphasize?: boolean;
}) {
  const gapPct = (gap * 100).toFixed(0);
  return (
    <div className="text-[13px] leading-relaxed">
      <div className="text-muted">{label}</div>
      <div className="font-mono">
        train <span style={{ color: 'rgb(16,185,129)' }}>{(train * 100).toFixed(0)}%</span>
        {' · '}
        eval <span style={{ color: 'rgb(59,130,246)' }}>{(ev * 100).toFixed(0)}%</span>
        {' → 갭 '}
        <span
          style={{
            color: emphasize ? 'rgb(190,18,60)' : 'rgb(var(--color-fg))',
            fontWeight: emphasize ? 700 : 500,
            fontSize: emphasize ? '1.4em' : '1em',
          }}
        >
          {gapPct}%p
        </span>
        {emphasize && (
          <span className="ml-1 text-[11px]" style={{ color: 'rgb(190,18,60)' }}>
            (외운 정도)
          </span>
        )}
      </div>
    </div>
  );
}

function BigStat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded border p-1.5" style={{ borderColor: 'rgb(var(--color-border))' }}>
      <div className="text-[10px] text-muted">{label}</div>
      <div className="text-base font-semibold font-mono" style={{ color }}>{value}</div>
    </div>
  );
}

// SHAPE_LABELS 사용을 type-only로 안전하게 보존 (트리쉐이킹 방지 목적 외 의미 없음)
void SHAPE_LABELS;
