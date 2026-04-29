// PhaseB4 — 이진 분류 모델 학습 (동그라미 vs 세모, 출력 뉴런 2개)
// 진짜 미니배치 SGD: createDeepMLP + trainStep + shuffle. 곡선이 *진동*해야 가짜로 안 보인다.
// 평가 데이터는 useActiveEval()로 B3 분할과 자동 연동.
import { useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '../store';
import {
  useDot, useActiveTrain, useActiveEval,
  classifyModel,
  type BinaryModel,
} from '../dotStore';
import {
  createDeepMLP, trainStep, evaluate, shuffle,
  type MLP, type TrainSample,
} from '../lib/nn';
import { type DotSample, type ShapeLabel, SHAPE_LABEL_KO } from '../data/dotShapes';
import { PHASES } from '../phases';

const TARGET_LABELS: [ShapeLabel, ShapeLabel] = ['circle', 'triangle'];
const BATCH_SIZE = 16;

interface EpochLog {
  epoch: number;
  loss: number;
  trainAcc: number;
  evalAcc: number;
}

export function PhaseB4() {
  const meta = PHASES.find((p) => p.id === 'b4')!;
  const markCompleted = useApp((s) => s.markCompleted);

  const setBinaryModel = useDot((s) => s.setBinaryModel);
  const persistedModel = useDot((s) => s.binaryModel);

  const trainAll = useActiveTrain();
  const evalAll = useActiveEval();

  const trainBin: DotSample[] = useMemo(
    () => trainAll.filter((s) => TARGET_LABELS.includes(s.label)),
    [trainAll],
  );
  const evalBin: DotSample[] = useMemo(
    () => evalAll.filter((s) => TARGET_LABELS.includes(s.label)),
    [evalAll],
  );

  // 컨트롤
  const [epochs, setEpochs] = useState(40);
  const [lr, setLr] = useState(0.05);
  const [useHidden, setUseHidden] = useState(false);

  // 학습 상태
  const [running, setRunning] = useState(false);
  const [logs, setLogs] = useState<EpochLog[]>([]);
  const [trainAcc, setTrainAcc] = useState<number | null>(null);
  const [evalAcc, setEvalAcc] = useState<number | null>(null);
  const [model, setModel] = useState<MLP | null>(null);

  // 검사 — 평가 그림 클릭
  const [pickedId, setPickedId] = useState<string | null>(null);
  const picked = pickedId ? evalBin.find((s) => s.id === pickedId) ?? null : null;

  // store binaryModel이 null로 바뀌면 (B3에서 비율 변경 등) 로컬 결과도 reset
  useEffect(() => {
    if (persistedModel === null) {
      setLogs([]);
      setTrainAcc(null);
      setEvalAcc(null);
      setModel(null);
      setPickedId(null);
    }
  }, [persistedModel]);

  // unmount 시 학습 정지
  const cancelRef = useRef(false);
  useEffect(() => () => { cancelRef.current = true; }, []);

  function labelIdx(lbl: ShapeLabel): number {
    return TARGET_LABELS.indexOf(lbl);
  }

  async function startTraining() {
    if (running) return;
    if (trainBin.length === 0) return;
    setRunning(true);
    cancelRef.current = false;
    setLogs([]);
    setTrainAcc(null);
    setEvalAcc(null);
    setPickedId(null);

    const layers = useHidden ? [64, 8, 2] : [64, 2];
    const m: MLP = createDeepMLP(layers);

    const trainData: TrainSample[] = trainBin.map((s) => ({
      x: new Float32Array(s.pixels), y: labelIdx(s.label),
    }));
    const evalData: TrainSample[] = evalBin.map((s) => ({
      x: new Float32Array(s.pixels), y: labelIdx(s.label),
    }));

    const collected: EpochLog[] = [];

    for (let ep = 0; ep < epochs; ep++) {
      if (cancelRef.current) break;
      const batches = shuffle(trainData);
      let lossSum = 0;
      let nBatches = 0;
      for (let i = 0; i < batches.length; i += BATCH_SIZE) {
        const batch = batches.slice(i, i + BATCH_SIZE);
        if (batch.length === 0) continue;
        lossSum += trainStep(m, batch, lr);
        nBatches += 1;
      }
      const avgLoss = nBatches > 0 ? lossSum / nBatches : 0;
      const tAcc = evaluate(m, trainData);
      const eAcc = evalData.length > 0 ? evaluate(m, evalData) : 0;

      const entry: EpochLog = {
        epoch: ep + 1,
        loss: avgLoss,
        trainAcc: tAcc,
        evalAcc: eAcc,
      };
      collected.push(entry);
      setLogs([...collected]);
      setTrainAcc(tAcc);
      setEvalAcc(eAcc);
      setModel(m);

      // 다음 epoch 전에 렌더 양보 — 곡선이 점진 갱신되는 모습
      await new Promise((r) => setTimeout(r, 0));
    }

    if (!cancelRef.current) {
      // store 저장 — C1/C2가 mlp 필드를 사용
      const finalTrain = trainAcc ?? evaluate(m, trainData);
      const finalEval = evalData.length > 0 ? evaluate(m, evalData) : 0;
      // 옛 형식 호환을 위해 마지막 층 가중치를 평탄화한 w/b도 채운다
      const lastW = m.weights[m.weights.length - 1];
      const lastB = m.biases[m.biases.length - 1];
      const inDim = m.layers[m.layers.length - 2];
      const outDim = m.layers[m.layers.length - 1];
      const w: number[][] = [];
      for (let c = 0; c < outDim; c++) {
        const row = new Array(inDim).fill(0);
        for (let i = 0; i < inDim; i++) row[i] = lastW[i * outDim + c];
        w.push(row);
      }
      const bArr = Array.from(lastB);
      const binModel: BinaryModel = {
        labels: [...TARGET_LABELS] as [ShapeLabel, ShapeLabel],
        w,
        b: bArr,
        mlp: m,
        trainedSteps: collected.length,
        trainAccuracy: finalTrain,
        evalAccuracy: finalEval,
      };
      setBinaryModel(binModel);
    }

    setRunning(false);
  }

  function stopTraining() {
    cancelRef.current = true;
    setRunning(false);
  }

  function resetTraining() {
    cancelRef.current = true;
    setRunning(false);
    setLogs([]);
    setTrainAcc(null);
    setEvalAcc(null);
    setModel(null);
    setBinaryModel(null);
    setPickedId(null);
  }

  // 완료 처리 — eval ≥ 80% 또는 일정 epoch
  const completedRef = useRef(false);
  useEffect(() => {
    if (completedRef.current) return;
    if (evalAcc !== null && evalAcc >= 0.8) {
      completedRef.current = true;
      markCompleted('b4');
    } else if (logs.length >= 30 && trainAcc !== null) {
      completedRef.current = true;
      markCompleted('b4');
    }
  }, [evalAcc, trainAcc, logs.length, markCompleted]);

  // 클릭한 그림의 출력 점수
  const pickedScores = useMemo(() => {
    if (!picked || !model) return null;
    const tmpModel: BinaryModel = {
      labels: [...TARGET_LABELS] as [ShapeLabel, ShapeLabel],
      w: [], b: [], mlp: model,
      trainedSteps: 0, trainAccuracy: 0, evalAccuracy: 0,
    };
    return classifyModel(picked.pixels, tmpModel);
  }, [picked, model]);

  return (
    <article>
      <div className="text-xs font-mono text-muted">PHASE {meta.num}</div>
      <h1>{meta.title}</h1>
      <p className="text-muted mt-2 text-sm">{meta.subtitle}</p>

      <p className="mt-4 text-[15px] leading-relaxed">
        라벨 후보가 <strong>동그라미</strong>·<strong>세모</strong> 두 개라서 출력 뉴런도 2개예요.
        한 그림이 들어오면 두 뉴런이 각각 점수를 내고, 점수가 큰 쪽이 모델의 답이 됩니다.
      </p>

      {/* ── 메인 한 viewport ── */}
      <div className="mt-5 grid lg:grid-cols-[1.6fr_1fr] gap-4 items-start">
        {/* 좌측 — 학습 진행 시각화 */}
        <div className="space-y-3">
          <div className="card p-3">
            <div className="flex items-baseline justify-between flex-wrap gap-2">
              <div className="text-sm font-medium">학습 진행 (미니배치 SGD)</div>
              <div className="text-[11px] font-mono text-muted">
                epoch <span className="text-accent font-semibold">{logs.length}</span> / {epochs}
                <span className="ml-2">batch={BATCH_SIZE}</span>
              </div>
            </div>
            <TrainingChart logs={logs} totalEpochs={epochs} />
            {logs.length === 0 && (
              <div className="text-[12px] text-muted mt-1 text-center">
                학습 시작을 누르면 손실·정확도 곡선이 그려져요.
              </div>
            )}
          </div>

          {/* 평가 그림 클릭 → 출력 뉴런 점수 */}
          <div className="card p-3">
            <div className="flex items-baseline justify-between flex-wrap gap-2">
              <div>
                <div className="text-sm font-medium">새 그림 시험해 보기</div>
                <div className="text-[11px] text-muted">
                  평가용 그림을 클릭하면 출력 뉴런 2개의 점수가 나타나요.
                </div>
              </div>
              <div className="text-[11px] font-mono text-muted">평가용 {evalBin.length}장</div>
            </div>

            <div className="mt-2 flex flex-wrap gap-1.5">
              {evalBin.map((s) => {
                const selected = s.id === pickedId;
                const correctMark =
                  pickedScores && selected
                    ? TARGET_LABELS[pickedScores.pred] === s.label : null;
                const ringColor = !selected
                  ? 'rgb(var(--color-border))'
                  : correctMark === false
                    ? 'rgb(190,18,60)'
                    : 'rgb(16,185,129)';
                return (
                  <button
                    key={s.id}
                    onClick={() => setPickedId(s.id === pickedId ? null : s.id)}
                    title={`${SHAPE_LABEL_KO[s.label]} · ${s.id}`}
                    className="rounded-sm transition hover:opacity-80"
                    style={{ outline: selected ? `2px solid ${ringColor}` : 'none', outlineOffset: 1 }}
                  >
                    <DotThumb sample={s} />
                  </button>
                );
              })}
              {evalBin.length === 0 && (
                <div className="text-[12px] text-muted">평가용 그림이 없어요. B3에서 비율을 확인하세요.</div>
              )}
            </div>

            {picked && pickedScores && (
              <PickedScoreCard sample={picked} scores={pickedScores} />
            )}
            {!model && (
              <div className="mt-2 text-[11px] text-muted">먼저 오른쪽에서 학습을 시작하면 점수가 채워져요.</div>
            )}
          </div>
        </div>

        {/* 우측 — 학습 컨트롤 + 결과 */}
        <div className="space-y-3">
          <div className="card p-3 space-y-3">
            <div className="text-sm font-medium">학습 컨트롤</div>

            <div>
              <div className="flex items-baseline justify-between text-[12px] font-mono">
                <span className="text-muted">epoch</span>
                <span className="text-accent font-semibold">{epochs}</span>
              </div>
              <input
                type="range" min={10} max={80} step={5}
                value={epochs} onChange={(e) => setEpochs(parseInt(e.target.value, 10))}
                disabled={running}
                className="w-full accent-[rgb(var(--color-accent))]"
              />
            </div>

            <div>
              <div className="flex items-baseline justify-between text-[12px] font-mono">
                <span className="text-muted">학습률 η</span>
                <span className="text-accent font-semibold">{lr.toFixed(3)}</span>
              </div>
              <input
                type="range" min={0.005} max={0.2} step={0.005}
                value={lr} onChange={(e) => setLr(parseFloat(e.target.value))}
                disabled={running}
                className="w-full accent-[rgb(var(--color-accent))]"
              />
            </div>

            <label className="flex items-center gap-2 text-[12px] cursor-pointer select-none">
              <input
                type="checkbox"
                checked={useHidden}
                onChange={(e) => setUseHidden(e.target.checked)}
                disabled={running}
                className="accent-[rgb(var(--color-accent))]"
              />
              <span>은닉층 추가 <span className="text-muted">(64 → 8 → 2, C3 예고)</span></span>
            </label>

            <div className="flex flex-wrap gap-2 pt-1">
              {!running ? (
                <button onClick={startTraining} className="btn-primary" disabled={trainBin.length === 0}>
                  ▶ 학습 시작
                </button>
              ) : (
                <button onClick={stopTraining} className="btn-ghost">⏸ 학습 멈춤</button>
              )}
              <button onClick={resetTraining} className="btn-ghost" disabled={running}>초기화</button>
            </div>

            <div className="text-[11px] text-muted">
              학습용 {trainBin.length}장 · 평가용 {evalBin.length}장
            </div>

            {trainBin.length === 0 && (
              <div className="text-[11px]" style={{ color: 'rgb(190,18,60)' }}>
                학습용 그림이 0장이에요. B2/B3에서 active 데이터를 확인해 주세요.
              </div>
            )}
          </div>

          {/* 정확도 큰 숫자 */}
          <div className="card p-3">
            <div className="text-sm font-medium">정확도</div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <BigStat
                label="학습용"
                value={trainAcc}
                color="rgb(16,185,129)"
                hint={`${trainBin.length}장`}
              />
              <BigStat
                label="평가용"
                value={evalAcc}
                color="rgb(59,130,246)"
                hint={`${evalBin.length}장`}
              />
            </div>
          </div>

          {/* epoch 한 줄 직관 */}
          <div className="rounded-md border border-border bg-surface/40 px-3 py-2 text-[12px] leading-snug">
            <strong>epoch</strong> = 학습 데이터를 한 번 다 본 횟수. 매 epoch마다 가중치가 한 번 갱신돼요.
          </div>
        </div>
      </div>
    </article>
  );
}

/* ────────── 학습 곡선 (loss 주황 + train 녹색 + eval 파랑) ────────── */
function TrainingChart({ logs, totalEpochs }: { logs: EpochLog[]; totalEpochs: number }) {
  const W = 720, H = 220, padL = 40, padR = 44, padT = 12, padB = 26;
  const lossMax = Math.max(0.5, ...logs.map((l) => l.loss));
  const sx = (i: number) =>
    padL + (totalEpochs > 1 ? (i / (totalEpochs - 1)) : 0) * (W - padL - padR);
  const syLoss = (v: number) => H - padB - (v / lossMax) * (H - padT - padB);
  const syAcc = (v: number) => H - padB - v * (H - padT - padB);

  let lossPath = '';
  let trainPath = '';
  let evalPath = '';
  logs.forEach((l, i) => {
    const x = sx(i);
    lossPath += `${i === 0 ? 'M' : 'L'}${x},${syLoss(l.loss)} `;
    trainPath += `${i === 0 ? 'M' : 'L'}${x},${syAcc(l.trainAcc)} `;
    evalPath += `${i === 0 ? 'M' : 'L'}${x},${syAcc(l.evalAcc)} `;
  });

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full mt-1">
      <line x1={padL} y1={H - padB} x2={W - padR} y2={H - padB} stroke="rgb(var(--color-border))" />
      <line x1={padL} y1={padT} x2={padL} y2={H - padB} stroke="rgb(var(--color-border))" />
      <line x1={W - padR} y1={padT} x2={W - padR} y2={H - padB} stroke="rgb(var(--color-border))" />
      <line x1={padL} y1={syAcc(1)} x2={W - padR} y2={syAcc(1)}
        stroke="rgb(16,185,129)" strokeOpacity={0.3} strokeDasharray="3 3" strokeWidth={1} />

      <text x={padL - 6} y={padT + 8} textAnchor="end" fontSize={10} fill="rgb(var(--color-accent))">손실</text>
      <text x={W - padR + 6} y={padT + 8} fontSize={10} fill="rgb(16,185,129)">학습 정확도</text>
      <text x={W - padR + 6} y={padT + 22} fontSize={10} fill="rgb(59,130,246)">평가 정확도</text>
      <text x={padL - 6} y={H - padB + 4} textAnchor="end" fontSize={10} fill="rgb(var(--color-muted))">0</text>
      <text x={W - padR + 6} y={H - padB + 4} fontSize={10} fill="rgb(var(--color-muted))">100%</text>
      <text x={W - padR} y={H - 6} textAnchor="end" fontSize={10} fill="rgb(var(--color-muted))">epoch</text>

      <path d={lossPath} fill="none" stroke="rgb(var(--color-accent))" strokeWidth={1.8} />
      <path d={trainPath} fill="none" stroke="rgb(16,185,129)" strokeWidth={1.8} />
      <path d={evalPath} fill="none" stroke="rgb(59,130,246)" strokeWidth={1.8} />

      {logs.length > 0 && (
        <>
          <circle cx={sx(logs.length - 1)} cy={syLoss(logs[logs.length - 1].loss)} r={2.5}
            fill="rgb(var(--color-accent))" />
          <circle cx={sx(logs.length - 1)} cy={syAcc(logs[logs.length - 1].trainAcc)} r={2.5}
            fill="rgb(16,185,129)" />
          <circle cx={sx(logs.length - 1)} cy={syAcc(logs[logs.length - 1].evalAcc)} r={2.5}
            fill="rgb(59,130,246)" />
        </>
      )}
    </svg>
  );
}

function PickedScoreCard({ sample, scores }: {
  sample: DotSample;
  scores: { logits: number[]; probs: number[]; pred: number };
}) {
  const predLabel = TARGET_LABELS[scores.pred];
  const correct = predLabel === sample.label;
  return (
    <div
      className="mt-3 rounded-md border px-3 py-2 text-[12px]"
      style={{
        borderColor: correct ? 'rgb(16,185,129)' : 'rgb(190,18,60)',
        background: correct ? 'rgba(16,185,129,0.06)' : 'rgba(190,18,60,0.06)',
      }}
    >
      <div className="flex items-center gap-3">
        <DotThumb sample={sample} />
        <div className="flex-1 leading-snug">
          <div>
            정답 <strong>{SHAPE_LABEL_KO[sample.label]}</strong>
            <span className="mx-1 text-muted">→</span>
            모델 답 <strong>{SHAPE_LABEL_KO[predLabel]}</strong>
            <span className="ml-2 font-mono">{(scores.probs[scores.pred] * 100).toFixed(1)}%</span>
          </div>
          <div className="text-[11px] mt-0.5" style={{ color: correct ? 'rgb(16,185,129)' : 'rgb(190,18,60)' }}>
            {correct ? '맞혔어요.' : '틀렸어요 — 새 그림이 헷갈렸습니다.'}
          </div>
        </div>
      </div>
      {/* 출력 뉴런 2개 — softmax 막대 */}
      <div className="mt-2 space-y-1.5">
        {TARGET_LABELS.map((lbl, k) => {
          const isPred = scores.pred === k;
          const probPct = scores.probs[k] * 100;
          return (
            <div key={lbl}>
              <div className="flex items-baseline justify-between text-[11px]">
                <span className={isPred ? 'font-semibold' : 'text-muted'}>
                  {SHAPE_LABEL_KO[lbl]}
                </span>
                <span className="font-mono text-[10px] text-muted">
                  점수 {scores.logits[k].toFixed(2)} · {probPct.toFixed(1)}%
                </span>
              </div>
              <div className="h-2 mt-0.5 bg-surface rounded-sm overflow-hidden border border-border">
                <div
                  style={{
                    width: `${probPct}%`,
                    background: isPred ? 'rgb(var(--color-accent))' : 'rgb(var(--color-muted))',
                    opacity: isPred ? 1 : 0.5,
                    height: '100%',
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function BigStat({ label, value, color, hint }: {
  label: string; value: number | null; color: string; hint?: string;
}) {
  return (
    <div className="rounded-md border border-border bg-bg p-2 text-center">
      <div className="text-[11px] text-muted">{label}</div>
      <div className="text-2xl font-semibold font-mono mt-0.5" style={{ color: value === null ? 'rgb(var(--color-muted))' : color }}>
        {value === null ? '—' : `${(value * 100).toFixed(1)}%`}
      </div>
      {hint && <div className="text-[10px] text-muted mt-0.5">{hint}</div>}
    </div>
  );
}

/* ────────── 8×8 도트 썸네일 ────────── */
function DotThumb({ sample }: { sample: DotSample }) {
  const SIZE = 8;
  const cell = 4;
  const W = SIZE * cell;
  return (
    <div className="rounded-sm border border-border bg-bg shrink-0">
      <svg viewBox={`0 0 ${W} ${W}`} width={W} height={W} aria-hidden>
        {sample.pixels.map((v, i) => {
          if (v === 0) return null;
          const x = (i % SIZE) * cell;
          const y = Math.floor(i / SIZE) * cell;
          return <rect key={i} x={x} y={y} width={cell} height={cell} fill="rgb(var(--color-text))" />;
        })}
      </svg>
    </div>
  );
}
