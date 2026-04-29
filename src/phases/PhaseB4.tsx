// PhaseB4 — 이진 분류 모델 학습 (시그모이드 출력 뉴런 1개)
// 출력 뉴런 하나가 점수 z를 만들고, σ(z)로 0~1 사이 확률을 만든다.
// 0.5를 기준으로 동그라미(σ<0.5)와 세모(σ≥0.5)를 가른다.
// 진짜 미니배치 SGD: createDeepMLP([..., 1], 'sigmoid') + trainStep + shuffle.
// 평가 데이터는 useActiveEval()로 B3 분할과 자동 연동.
import { useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '../store';
import {
  useDot, useActiveTrain, useActiveEval,
  type BinaryModel,
} from '../dotStore';
import {
  createDeepMLP, trainStep, evaluate, shuffle, forward,
  type MLP, type TrainSample,
} from '../lib/nn';
import { type DotSample, type ShapeLabel, SHAPE_LABEL_KO } from '../data/dotShapes';
import { PHASES } from '../phases';

// 라벨 해석 — y=0 동그라미(σ<0.5), y=1 세모(σ≥0.5)
const TARGET_LABELS: [ShapeLabel, ShapeLabel] = ['circle', 'triangle'];
const NEG_LABEL = TARGET_LABELS[0];
const POS_LABEL = TARGET_LABELS[1];
const BATCH_SIZE = 16;

interface EpochLog {
  epoch: number;
  loss: number;     // BCE
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
  // 가중치는 model.weights 배열을 in-place로 갱신 → React가 변화를 못 본다.
  // tick을 bump해서 매 epoch 시각화를 강제 갱신한다.
  const [weightTick, setWeightTick] = useState(0);

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
    return TARGET_LABELS.indexOf(lbl);  // 0(circle) | 1(triangle)
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

    const layers = useHidden ? [64, 8, 1] : [64, 1];
    const m: MLP = createDeepMLP(layers, 'sigmoid');

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
      setWeightTick((t) => t + 1);

      // 다음 epoch 전에 렌더 양보 — 곡선이 점진 갱신되는 모습
      await new Promise((r) => setTimeout(r, 0));
    }

    if (!cancelRef.current) {
      const finalTrain = evaluate(m, trainData);
      const finalEval = evalData.length > 0 ? evaluate(m, evalData) : 0;
      const binModel: BinaryModel = {
        labels: [...TARGET_LABELS] as [ShapeLabel, ShapeLabel],
        mlp: m,
        trainedEpochs: collected.length,
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

  // 클릭한 그림의 점수 z, 확률 σ(z)
  const pickedScore = useMemo(() => {
    if (!picked || !model) return null;
    const fr = forward(model, new Float32Array(picked.pixels));
    const z = fr.logits[0];
    const sigma = fr.probs[0];  // σ(z)
    const predIdx = sigma >= 0.5 ? 1 : 0;
    return { z, sigma, predIdx };
  }, [picked, model]);

  return (
    <article>
      <div className="text-xs font-mono text-muted">PHASE {meta.num}</div>
      <h1>{meta.title}</h1>
      <p className="text-muted mt-2 text-sm">{meta.subtitle}</p>

      <p className="mt-4 text-[15px] leading-relaxed">
        라벨 후보가 <strong>동그라미</strong>·<strong>세모</strong> 둘이라서 출력 뉴런 하나면 충분해요.
        그 뉴런이 점수 <span className="font-mono">z</span>를 만들고, <strong>시그모이드</strong>가
        그 점수를 <span className="font-mono">0~1 사이 확률</span>로 바꿉니다.
        확률이 <span className="font-mono">0.5</span>보다 크면 <strong>{SHAPE_LABEL_KO[POS_LABEL]}</strong>,
        작으면 <strong>{SHAPE_LABEL_KO[NEG_LABEL]}</strong>으로 답해요.
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

          {/* 신경망 구조 + 실시간 가중치 히트맵 */}
          <div className="card p-3">
            <div className="flex items-baseline justify-between flex-wrap gap-2">
              <div>
                <div className="text-sm font-medium">신경망 구조 + 실시간 가중치</div>
                <div className="text-[11px] text-muted">
                  학습이 한 epoch 진행될 때마다 가중치가 갱신되고 색이 바뀌어요.
                </div>
              </div>
              <div className="text-[11px] font-mono text-muted">
                갱신 #{weightTick}
              </div>
            </div>
            <NetworkViz model={model} useHidden={useHidden} tick={weightTick} />
          </div>

          {/* 평가 그림 클릭 → 시그모이드 확률 */}
          <div className="card p-3">
            <div className="flex items-baseline justify-between flex-wrap gap-2">
              <div>
                <div className="text-sm font-medium">새 그림 시험해 보기</div>
                <div className="text-[11px] text-muted">
                  평가용 그림을 클릭하면 점수 <span className="font-mono">z</span>와
                  <span className="font-mono"> σ(z)</span>가 표시돼요.
                </div>
              </div>
              <div className="text-[11px] font-mono text-muted">평가용 {evalBin.length}장</div>
            </div>

            <div className="mt-2 flex flex-wrap gap-1.5">
              {evalBin.map((s) => {
                const selected = s.id === pickedId;
                const correctMark =
                  pickedScore && selected
                    ? TARGET_LABELS[pickedScore.predIdx] === s.label : null;
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

            {picked && pickedScore && (
              <PickedScoreCard sample={picked} score={pickedScore} />
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
            <div className="text-[11px] text-muted">
              모델: <span className="font-mono">
                createDeepMLP([{useHidden ? '64, 8, 1' : '64, 1'}], 'sigmoid')
              </span>
            </div>

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
              <span>은닉층 추가 <span className="text-muted">(64 → 8 → 1, C 영역 예고)</span></span>
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

      {/* 부록 안내 — 라벨 셋 이상은 별도 탐구 주제로 */}
      <aside className="mt-5 rounded-md border border-border bg-surface/40 px-4 py-3 text-[13px] leading-relaxed">
        <div className="font-medium">📘 더 깊이 알아보고 싶다면 (선택)</div>
        <p className="text-muted mt-1">
          라벨이 <strong>세 개 이상</strong>이 되면 출력 뉴런이 늘고, 시그모이드 대신
          <strong> 소프트맥스</strong>로 여러 점수를 동시에 확률로 만들고
          <strong> 교차 엔트로피</strong>라는 손실로 학습해요. 본 교재에서는 이진 분류만 다루지만,
          관심 있는 학생은 이 세 가지(소프트맥스 · 교차 엔트로피 · 다중 분류)를 따로 탐구해 보세요.
        </p>
      </aside>
    </article>
  );
}

/* ────────── 학습 곡선 (BCE 손실 주황 + train 녹색 + eval 파랑) ────────── */
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

      <text x={padL - 6} y={padT + 8} textAnchor="end" fontSize={10} fill="rgb(var(--color-accent))">손실(BCE)</text>
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

function PickedScoreCard({ sample, score }: {
  sample: DotSample;
  score: { z: number; sigma: number; predIdx: number };
}) {
  const predLabel = TARGET_LABELS[score.predIdx];
  const correct = predLabel === sample.label;
  const sigmaPct = score.sigma * 100;
  const negPct = (1 - score.sigma) * 100;

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
            <span className="ml-2 font-mono text-[11px] text-muted">
              z = {score.z.toFixed(2)} · σ(z) = {score.sigma.toFixed(3)}
            </span>
          </div>
          <div className="text-[11px] mt-0.5" style={{ color: correct ? 'rgb(16,185,129)' : 'rgb(190,18,60)' }}>
            {correct ? '맞혔어요.' : '틀렸어요 — 새 그림이 헷갈렸습니다.'}
          </div>
        </div>
      </div>

      {/* 시그모이드 출력 — 0~1 막대, 0.5 기준선 */}
      <div className="mt-2.5">
        <div className="flex items-baseline justify-between text-[11px]">
          <span className="text-muted">σ(z) 막대 — 0이면 동그라미, 1이면 세모</span>
          <span className="font-mono">{score.sigma.toFixed(3)}</span>
        </div>
        <div className="relative mt-1 h-3 bg-surface rounded-sm overflow-hidden border border-border">
          {/* 0.5 기준선 */}
          <div
            className="absolute top-0 bottom-0"
            style={{ left: '50%', width: 1, background: 'rgb(var(--color-muted))', opacity: 0.7 }}
          />
          {/* σ(z) 채움 */}
          <div
            style={{
              width: `${sigmaPct}%`,
              background: 'rgb(var(--color-accent))',
              height: '100%',
            }}
          />
        </div>
        <div className="flex justify-between text-[10px] text-muted mt-0.5 font-mono">
          <span>{SHAPE_LABEL_KO[NEG_LABEL]} ← 0</span>
          <span>0.5 (기준)</span>
          <span>1 → {SHAPE_LABEL_KO[POS_LABEL]}</span>
        </div>
      </div>

      {/* 두 라벨 확률 (참고용) */}
      <div className="mt-2 grid grid-cols-2 gap-2 text-[11px] font-mono">
        <div className="flex items-center gap-1.5">
          <span className="text-muted">{SHAPE_LABEL_KO[NEG_LABEL]}</span>
          <span className={score.predIdx === 0 ? 'font-semibold' : ''}>{negPct.toFixed(1)}%</span>
          <span className="text-muted text-[10px]">= 1 − σ(z)</span>
        </div>
        <div className="flex items-center gap-1.5 justify-end">
          <span className="text-muted">{SHAPE_LABEL_KO[POS_LABEL]}</span>
          <span className={score.predIdx === 1 ? 'font-semibold' : ''}>{sigmaPct.toFixed(1)}%</span>
          <span className="text-muted text-[10px]">= σ(z)</span>
        </div>
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

/* ────────── 신경망 구조 + 실시간 가중치 시각화 ──────────
   입력 8×8(=64)에서 출발하므로, 각 뉴런의 64개 입력 가중치를 8×8 색지도(red↔blue)로
   바로 그릴 수 있다. 학습이 진행되면 색이 굳어지면서 어떤 픽셀을 보고 판단하는지 드러난다. */
function NetworkViz({ model, useHidden, tick }: {
  model: MLP | null; useHidden: boolean; tick: number;
}) {
  void tick;
  if (!model) {
    return (
      <div className="text-[12px] text-muted text-center py-8 border border-dashed border-border rounded-md mt-2 bg-surface/30">
        학습을 시작하면 가중치가 실시간으로 갱신되는 모습이 보여요.
        <div className="mt-1 text-[11px]">
          예정 구조: <span className="font-mono">{useHidden ? '64 → 8 → 1' : '64 → 1'}</span> · 출력 σ(z)
        </div>
      </div>
    );
  }

  const layers = model.layers;
  const hasHidden = layers.length === 3;
  const inDim = layers[0];
  const hidDim = hasHidden ? layers[1] : 0;
  const W1 = model.weights[0];      // shape: inDim × (hidDim || 1)
  const b1 = model.biases[0];

  if (!hasHidden) {
    // 64 → 1 — 한 뉴런이 64개 픽셀을 보고 점수를 매긴다
    const wOut = new Float32Array(inDim);
    for (let i = 0; i < inDim; i++) wOut[i] = W1[i];  // stride 1
    return (
      <div className="mt-2">
        <div className="text-[11px] text-muted mb-2 leading-snug">
          <strong>구조</strong>: 입력 64픽셀 ─ (64개 가중치 + 편향 b) ─ 점수 z ─ <span className="font-mono">σ(z)</span> ─ 0~1 확률
        </div>
        <div className="flex items-center justify-center gap-3 flex-wrap">
          {/* 입력 라벨 */}
          <div className="text-center min-w-[64px]">
            <div className="text-[10px] text-muted">입력</div>
            <div className="text-[12px] font-mono mt-0.5">x</div>
            <div className="text-[10px] text-muted mt-0.5">8×8 픽셀</div>
          </div>
          <ArrowSpan />
          {/* 가중치 8x8 히트맵 + bias */}
          <WeightHeatmap w={wOut} cell={18} label="이 뉴런의 64개 가중치" />
          <div className="text-center text-[11px] font-mono text-muted leading-tight">
            <div>+ b</div>
            <div className="text-[10px]">{b1[0].toFixed(2)}</div>
          </div>
          <ArrowSpan />
          {/* 점수 z → σ(z) */}
          <div className="text-center min-w-[60px]">
            <div className="text-[10px] text-muted">점수</div>
            <div className="text-[12px] font-mono mt-0.5">z</div>
          </div>
          <ArrowSpan symbol="σ" />
          {/* 출력 노드 */}
          <div className="text-center min-w-[60px]">
            <div className="text-[10px] text-muted">출력</div>
            <div className="text-[12px] font-mono mt-0.5">σ(z)</div>
            <div className="text-[10px] text-muted mt-0.5">0~1 확률</div>
          </div>
        </div>
        <ColorLegend />
      </div>
    );
  }

  // 64 → 8 → 1 — 은닉 뉴런 8개 각각이 자기만의 64개 가중치를 갖는다
  const W2 = model.weights[1];
  const b2 = model.biases[1];
  return (
    <div className="mt-2">
      <div className="text-[11px] text-muted mb-2 leading-snug">
        <strong>구조</strong>: 입력 64픽셀 ─ 은닉 {hidDim}뉴런(ReLU) ─ 출력 1뉴런(σ) ─ 0~1 확률.{' '}
        은닉 뉴런마다 자기만의 8×8 가중치 패턴을 가져요.
      </div>
      <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5 justify-items-center">
        {Array.from({ length: hidDim }).map((_, h) => {
          const wH = new Float32Array(inDim);
          for (let i = 0; i < inDim; i++) wH[i] = W1[i * hidDim + h];
          return (
            <HiddenNeuronCell
              key={h}
              w={wH}
              wOut={W2[h]}
              bias={b1[h]}
              idx={h}
            />
          );
        })}
      </div>
      <div className="mt-2 text-[11px] text-center text-muted leading-snug">
        ↓ 은닉 8개 출력값을 가중합 (출력 가중치는 위 셀 아래 숫자) + 편향 <span className="font-mono">b={b2[0].toFixed(2)}</span> → 점수 z → σ(z)
      </div>
      <ColorLegend />
    </div>
  );
}

function ArrowSpan({ symbol = '→' }: { symbol?: string }) {
  return <div className="text-muted text-lg">{symbol}</div>;
}

function ColorLegend() {
  return (
    <div className="mt-2 flex items-center justify-center gap-3 text-[10px] text-muted">
      <span className="flex items-center gap-1">
        <span className="inline-block w-3 h-3 rounded-sm" style={{ background: 'rgb(190,18,60)' }} />
        −가중치 (동그라미 쪽으로 끌어내림)
      </span>
      <span className="flex items-center gap-1">
        <span className="inline-block w-3 h-3 rounded-sm" style={{ background: 'rgb(59,130,246)' }} />
        +가중치 (세모 쪽으로 끌어올림)
      </span>
    </div>
  );
}

function WeightHeatmap({ w, cell = 14, label }: { w: Float32Array; cell?: number; label?: string }) {
  const SIZE = 8;
  const total = SIZE * cell;
  let maxAbs = 0;
  for (let i = 0; i < w.length; i++) {
    const a = Math.abs(w[i]);
    if (a > maxAbs) maxAbs = a;
  }
  if (maxAbs < 1e-6) maxAbs = 1;
  return (
    <div className="text-center">
      {label && <div className="text-[10px] text-muted mb-1">{label}</div>}
      <svg viewBox={`0 0 ${total} ${total}`} width={total} height={total} className="border border-border rounded-sm bg-bg">
        {Array.from({ length: SIZE * SIZE }).map((_, i) => {
          const x = (i % SIZE) * cell;
          const y = Math.floor(i / SIZE) * cell;
          const v = w[i] / maxAbs;
          return <rect key={i} x={x} y={y} width={cell} height={cell} fill={weightColor(v)} />;
        })}
        {/* 격자 */}
        {Array.from({ length: SIZE + 1 }).map((_, i) => (
          <g key={i} stroke="rgb(var(--color-border))" strokeWidth={0.4} opacity={0.5}>
            <line x1={i * cell} y1={0} x2={i * cell} y2={total} />
            <line x1={0} y1={i * cell} x2={total} y2={i * cell} />
          </g>
        ))}
      </svg>
      <div className="text-[9px] text-muted mt-0.5 font-mono">|w| max={maxAbs.toFixed(2)}</div>
    </div>
  );
}

function HiddenNeuronCell({ w, wOut, bias, idx }: {
  w: Float32Array; wOut: number; bias: number; idx: number;
}) {
  const SIZE = 8;
  const cell = 6;
  const total = SIZE * cell;
  let maxAbs = 0;
  for (let i = 0; i < w.length; i++) {
    const a = Math.abs(w[i]);
    if (a > maxAbs) maxAbs = a;
  }
  if (maxAbs < 1e-6) maxAbs = 1;
  return (
    <div className="text-center">
      <div className="text-[9px] text-muted">h{idx} <span className="font-mono">b={bias.toFixed(2)}</span></div>
      <svg viewBox={`0 0 ${total} ${total}`} width={total} height={total} className="border border-border rounded-sm bg-bg">
        {Array.from({ length: SIZE * SIZE }).map((_, i) => {
          const x = (i % SIZE) * cell;
          const y = Math.floor(i / SIZE) * cell;
          const v = w[i] / maxAbs;
          return <rect key={i} x={x} y={y} width={cell} height={cell} fill={weightColor(v)} />;
        })}
      </svg>
      <div
        className="text-[9px] mt-0.5 font-mono"
        style={{ color: wOut >= 0 ? 'rgb(59,130,246)' : 'rgb(190,18,60)' }}
      >
        →{wOut >= 0 ? '+' : ''}{wOut.toFixed(2)}
      </div>
    </div>
  );
}

function weightColor(v: number): string {
  // v ∈ [-1, 1]
  const a = Math.min(1, Math.abs(v));
  if (a < 0.02) return 'rgb(var(--color-bg))';
  if (v >= 0) return `rgba(59,130,246,${a.toFixed(2)})`;
  return `rgba(190,18,60,${a.toFixed(2)})`;
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
