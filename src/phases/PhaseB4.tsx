// PhaseB4 — 이진 분류 모델 학습 (시그모이드 출력 뉴런 1개)
// 출력 뉴런 하나가 점수 z를 만들고, σ(z)로 0~1 사이 확률을 만든다.
// 0.5를 기준으로 동그라미(σ<0.5)와 세모(σ≥0.5)를 가른다.
// 진짜 미니배치 SGD: createDeepMLP([..., 1], 'sigmoid') + trainStep + shuffle.
// 평가 데이터는 useActiveEval()로 B3 분할과 자동 연동.
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
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
              <div>
                <div className="text-sm font-medium">학습 진행</div>
                <div className="text-[11px] text-muted">
                  학습 데이터를 한 번에 {BATCH_SIZE}장씩 묶어 가중치를 한 번 갱신해요.
                </div>
              </div>
              <div className="text-[11px] font-mono text-muted">
                epoch(학습회차) <span className="text-accent font-semibold">{logs.length}</span> / {epochs}
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
                  학습이 한 epoch(학습회차) 진행될 때마다 가중치가 갱신되고 색이 바뀌어요.
                </div>
              </div>
              <div className="text-[11px] font-mono text-muted">
                갱신 #{weightTick}
              </div>
            </div>
            <NetworkViz
              model={model}
              useHidden={useHidden}
              tick={weightTick}
              pickedSample={picked}
            />
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
            <div className="text-[11px] text-muted leading-snug">
              모델 구조:{' '}
              <span className="font-mono text-text">
                입력 64 → {useHidden ? '은닉 8 → ' : ''}출력 1 (시그모이드)
              </span>
            </div>

            <div>
              <div className="flex items-baseline justify-between text-[12px] font-mono">
                <span className="text-muted">epoch(학습회차)</span>
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
            <strong>epoch(학습회차)</strong> = 학습 데이터를 한 번 다 본 횟수. 매 epoch(학습회차)마다 가중치가 한 번 갱신돼요.
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

/* ────────── 학습 곡선 (손실 주황 + train 녹색 + eval 파랑) ────────── */
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
      <text x={W - padR} y={H - 6} textAnchor="end" fontSize={10} fill="rgb(var(--color-muted))">epoch(학습회차)</text>

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
   왼쪽: 뉴런(원)과 연결선으로 표현한 신경망 토폴로지 다이어그램.
   오른쪽: 선택된 뉴런의 8×8 입력 가중치 히트맵 (입력이 8×8이므로 자연스럽게 매칭).
   은닉이 있으면 다이어그램의 뉴런을 클릭해서 보고 싶은 뉴런의 가중치를 살펴볼 수 있다.
   학습이 진행되면 매 epoch마다 다이어그램의 연결선 색·굵기와 히트맵 색이 함께 갱신된다. */
function NetworkViz({ model, useHidden, tick, pickedSample }: {
  model: MLP | null;
  useHidden: boolean;
  tick: number;
  pickedSample: DotSample | null;
}) {
  void tick;
  // 은닉이 있을 때 어떤 은닉 뉴런의 히트맵을 볼지 선택. 'out'은 은닉 없음 + 출력 뉴런.
  const [selected, setSelected] = useState<number | 'out'>('out');

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
  const hidDim = hasHidden ? layers[1] : 0;

  if (!hasHidden) {
    // 64 → 1
    const W1 = model.weights[0];
    const b1 = model.biases[0];
    const wOut = new Float32Array(64);
    for (let i = 0; i < 64; i++) wOut[i] = W1[i];
    return (
      <div className="mt-2 grid lg:grid-cols-[1fr_auto] gap-x-4 gap-y-3 items-start">
        {/* 좌: 다이어그램 — 입력 64뉴런 컬럼 → 출력 1뉴런, 64개 가중치 라인 */}
        <SimpleDiagram
          input={pickedSample?.pixels ?? null}
          bias={b1[0]}
          w={wOut}
        />
        {/* 우: 가중치 히트맵 */}
        <HeatmapPanel
          w={wOut}
          bias={b1[0]}
          title="출력 뉴런 σ의 입력 가중치"
          subtitle="64개 픽셀을 어떻게 가중합하는지"
        />
        <div className="lg:col-span-2">
          <ColorLegend />
        </div>
      </div>
    );
  }

  // 64 → 8 → 1
  const W1 = model.weights[0];      // 64 × 8
  const b1 = model.biases[0];       // 8
  const W2 = model.weights[1];      // 8 × 1
  const b2 = model.biases[1][0];

  // 은닉 뉴런별 입력 가중치 (8 × 64)
  const hiddenWeights: Float32Array[] = [];
  for (let h = 0; h < hidDim; h++) {
    const wH = new Float32Array(64);
    for (let i = 0; i < 64; i++) wH[i] = W1[i * hidDim + h];
    hiddenWeights.push(wH);
  }
  // 출력 뉴런 자체의 "입력 가중치"는 없음(은닉 8개의 출력을 받음).
  // selected === 'out'이면 W2(8개) 막대를 대신 보여준다.
  const maxW2 = Math.max(...Array.from(W2).map((v) => Math.abs(v)), 1e-6);

  const safeSelected: number | 'out' =
    typeof selected === 'number' && selected < hidDim ? selected : selected;

  return (
    <div className="mt-2 grid lg:grid-cols-[1fr_auto] gap-x-4 gap-y-3 items-start">
      {/* 좌: 다이어그램 — 입력 64뉴런 컬럼 → 은닉 8뉴런 → 출력 1뉴런 */}
      <HiddenDiagram
        input={pickedSample?.pixels ?? null}
        hidDim={hidDim}
        hiddenWeights={hiddenWeights}
        b1={b1}
        W2={W2}
        maxW2={maxW2}
        b2={b2}
        selected={safeSelected}
        onSelect={setSelected}
      />
      {/* 우: 선택된 뉴런의 가중치 패널 */}
      {safeSelected === 'out' ? (
        <OutputWeightsPanel W2={W2} b2={b2} />
      ) : (
        <HeatmapPanel
          w={hiddenWeights[safeSelected]}
          bias={b1[safeSelected]}
          title={`은닉 h${safeSelected}의 입력 가중치`}
          subtitle={`64개 픽셀에 대한 가중치 패턴`}
          outWeight={W2[safeSelected]}
        />
      )}
      <div className="lg:col-span-2">
        <ColorLegend />
        <div className="mt-1 text-[11px] text-muted text-center">
          💡 다이어그램의 뉴런을 클릭하면 그 뉴런의 가중치를 오른쪽에서 자세히 볼 수 있어요.
        </div>
      </div>
    </div>
  );
}

/* ────────── 다이어그램 (은닉 없음) — 입력 64뉴런 컬럼 → 출력 σ ──────────
   64개 입력 뉴런을 세로 한 줄로 늘어놓고, 64개 가중치 라인이 모두 출력 1뉴런으로 모인다.
   각 라인의 색·굵기·투명도가 그 픽셀의 가중치 부호·크기를 그대로 보여준다. */
function SimpleDiagram({ input, bias, w }: {
  input: number[] | null; bias: number; w: Float32Array;
}) {
  const W = 540, H = 400;
  const inCx = 36;
  const inY0 = 22, inSpacing = 5.6, inR = 2.3;
  const outCx = 470, outCy = H / 2, outR = 26;

  let maxAbs = 0;
  for (let i = 0; i < 64; i++) {
    const a = Math.abs(w[i]);
    if (a > maxAbs) maxAbs = a;
  }
  if (maxAbs < 1e-6) maxAbs = 1;

  return (
    <div className="rounded-md border border-border bg-bg/50 p-2">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
        <defs>
          <marker id="nv-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
            <path d="M0,0 L10,5 L0,10 Z" fill="rgb(var(--color-muted))" />
          </marker>
        </defs>

        {/* 입력 컬럼 라벨 */}
        <text x={inCx} y={12} textAnchor="middle" fontSize={10} fill="rgb(var(--color-muted))">
          입력 64뉴런
        </text>

        {/* 입력 → 출력 64개 가중치 라인 (색=부호, 굵기·투명도=|w|) */}
        {Array.from({ length: 64 }).map((_, i) => {
          const cy = inY0 + i * inSpacing;
          const a = Math.min(1, Math.abs(w[i]) / maxAbs);
          const positive = w[i] >= 0;
          const color = positive ? 'rgb(59,130,246)' : 'rgb(190,18,60)';
          const r = Math.floor(i / 8), c = i % 8;
          return (
            <g key={i}>
              <line
                x1={inCx + inR} y1={cy}
                x2={outCx - outR} y2={outCy}
                stroke={color}
                strokeWidth={0.3 + 0.9 * a}
                opacity={0.1 + 0.75 * a} />
              {/* 호버 hit-area (투명 두꺼운 라인) */}
              <line
                x1={inCx + inR} y1={cy}
                x2={outCx - outR} y2={outCy}
                stroke="transparent"
                strokeWidth={6}
                style={{ cursor: 'help' }}>
                <title>{`픽셀 (행 ${r}, 열 ${c}) → 출력  w[${i}] = ${w[i].toFixed(3)}`}</title>
              </line>
            </g>
          );
        })}

        {/* 입력 뉴런 64개 — 픽셀=1이면 채움, 아니면 빈 원 */}
        {Array.from({ length: 64 }).map((_, i) => {
          const cy = inY0 + i * inSpacing;
          const active = !!input && input[i] === 1;
          const r = Math.floor(i / 8), c = i % 8;
          return (
            <g key={i} style={{ cursor: 'help' }}>
              <circle cx={inCx} cy={cy} r={inR}
                fill={active ? 'rgb(var(--color-text))' : 'rgb(var(--color-bg))'}
                stroke="rgb(var(--color-muted))"
                strokeWidth={0.7} />
              {/* 호버용 큰 투명 원 */}
              <circle cx={inCx} cy={cy} r={inR + 2} fill="transparent">
                <title>{`픽셀 (행 ${r}, 열 ${c}) — 값 ${active ? 1 : 0}, w[${i}] = ${w[i].toFixed(3)}`}</title>
              </circle>
            </g>
          );
        })}

        {/* 출력 뉴런 σ */}
        <g style={{ cursor: 'help' }}>
          <circle cx={outCx} cy={outCy} r={outR}
            fill="rgb(var(--color-accent-bg))"
            stroke="rgb(16,185,129)" strokeWidth={2.5}>
            <title>{`출력 뉴런 σ — 편향(bias) b = ${bias.toFixed(3)}`}</title>
          </circle>
        </g>
        <text x={outCx} y={outCy - 2} textAnchor="middle" fontSize={12} fill="rgb(var(--color-text))" fontWeight={700} style={{ pointerEvents: 'none' }}>
          σ
        </text>
        <text x={outCx} y={outCy + 10} textAnchor="middle" fontSize={8.5} fill="rgb(var(--color-muted))" style={{ pointerEvents: 'none' }}>
          b={bias.toFixed(2)}
        </text>
        <text x={outCx} y={outCy + outR + 14} textAnchor="middle" fontSize={10} fill="rgb(var(--color-muted))">
          출력
        </text>

        {/* 출력 → σ(z) 화살표 */}
        <line x1={outCx + outR} y1={outCy} x2={W - 16} y2={outCy}
          stroke="rgb(var(--color-muted))" strokeWidth={1.2} markerEnd="url(#nv-arrow)" />
        <text x={W - 16} y={outCy - 8} textAnchor="end" fontSize={10} fill="rgb(var(--color-text))">
          σ(z)
        </text>
        <text x={W - 16} y={outCy + 14} textAnchor="end" fontSize={9} fill="rgb(var(--color-muted))">
          0~1 확률
        </text>
      </svg>
    </div>
  );
}

/* ────────── 다이어그램 (은닉 있음) — 입력 64뉴런 → 은닉 8뉴런 → 출력 σ ──────────
   입력↔은닉 라인 512개는 기본적으로 매우 옅게(mesh) 표시.
   은닉 뉴런 하나를 선택하면 그 뉴런으로 들어가는 64개 라인이 가중치 부호별로 강조됨. */
function HiddenDiagram({
  input, hidDim, hiddenWeights, b1, W2, maxW2, b2, selected, onSelect,
}: {
  input: number[] | null;
  hidDim: number;
  hiddenWeights: Float32Array[];
  b1: Float32Array;
  W2: Float32Array;
  maxW2: number;
  b2: number;
  selected: number | 'out';
  onSelect: (s: number | 'out') => void;
}) {
  const W = 540, H = 400;
  const inCx = 36;
  const inY0 = 22, inSpacing = 5.6, inR = 2.3;
  const hX = 290, hR = 12;
  const hY0 = 50, hStep = (H - 100) / hidDim;
  const outCx = 470, outCy = H / 2, outR = 22;

  // 선택된 은닉 뉴런의 64개 가중치에 대한 maxAbs (라인 색칠 정규화용)
  const selH = typeof selected === 'number' ? selected : -1;
  let selMaxAbs = 1;
  if (selH >= 0) {
    let m = 0;
    const wH = hiddenWeights[selH];
    for (let i = 0; i < 64; i++) {
      const a = Math.abs(wH[i]); if (a > m) m = a;
    }
    if (m > 1e-6) selMaxAbs = m;
  }

  // 입력 → 은닉 모든 라인을 한 번에 렌더 (선택된 h만 강조)
  const inputHiddenLines: ReactNode[] = [];
  for (let h = 0; h < hidDim; h++) {
    const hy = hY0 + h * hStep + hStep / 2;
    const isSel = selH === h;
    const wH = hiddenWeights[h];
    for (let i = 0; i < 64; i++) {
      const cy = inY0 + i * inSpacing;
      if (isSel) {
        const a = Math.min(1, Math.abs(wH[i]) / selMaxAbs);
        const positive = wH[i] >= 0;
        const r = Math.floor(i / 8), c = i % 8;
        inputHiddenLines.push(
          <g key={`s-${h}-${i}`}>
            <line
              x1={inCx + inR} y1={cy}
              x2={hX - hR} y2={hy}
              stroke={positive ? 'rgb(59,130,246)' : 'rgb(190,18,60)'}
              strokeWidth={0.35 + 0.9 * a}
              opacity={0.18 + 0.7 * a} />
            {/* 호버 hit-area */}
            <line
              x1={inCx + inR} y1={cy}
              x2={hX - hR} y2={hy}
              stroke="transparent"
              strokeWidth={6}
              style={{ cursor: 'help' }}>
              <title>{`픽셀 (행 ${r}, 열 ${c}) → h${h}  W₁[h${h}][${i}] = ${wH[i].toFixed(3)}`}</title>
            </line>
          </g>
        );
      } else {
        // mesh — 매우 옅은 회색 (호버 없음)
        inputHiddenLines.push(
          <line key={`b-${h}-${i}`}
            x1={inCx + inR} y1={cy}
            x2={hX - hR} y2={hy}
            stroke="rgb(var(--color-muted))"
            strokeWidth={0.25}
            opacity={0.05} />
        );
      }
    }
  }

  return (
    <div className="rounded-md border border-border bg-bg/50 p-2">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
        <defs>
          <marker id="nv-h-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
            <path d="M0,0 L10,5 L0,10 Z" fill="rgb(var(--color-muted))" />
          </marker>
        </defs>

        {/* 라벨들 */}
        <text x={inCx} y={12} textAnchor="middle" fontSize={10} fill="rgb(var(--color-muted))">
          입력 64뉴런
        </text>
        <text x={hX} y={28} textAnchor="middle" fontSize={10} fill="rgb(var(--color-muted))">
          은닉 {hidDim} (ReLU)
        </text>

        {/* 입력 → 은닉 라인 (mesh + 선택된 hidden 강조) */}
        {inputHiddenLines}

        {/* 입력 뉴런 64개 */}
        {Array.from({ length: 64 }).map((_, i) => {
          const cy = inY0 + i * inSpacing;
          const active = !!input && input[i] === 1;
          const r = Math.floor(i / 8), c = i % 8;
          const tip = selH >= 0
            ? `픽셀 (행 ${r}, 열 ${c}) — 값 ${active ? 1 : 0}, W₁[h${selH}][${i}] = ${hiddenWeights[selH][i].toFixed(3)}`
            : `픽셀 (행 ${r}, 열 ${c}) — 값 ${active ? 1 : 0} (은닉 뉴런을 클릭하면 그 뉴런으로 가는 가중치가 보여요)`;
          return (
            <g key={i} style={{ cursor: 'help' }}>
              <circle cx={inCx} cy={cy} r={inR}
                fill={active ? 'rgb(var(--color-text))' : 'rgb(var(--color-bg))'}
                stroke="rgb(var(--color-muted))"
                strokeWidth={0.7} />
              <circle cx={inCx} cy={cy} r={inR + 2} fill="transparent">
                <title>{tip}</title>
              </circle>
            </g>
          );
        })}

        {/* 은닉 → 출력 라인 (W2[h] 부호·크기) */}
        {Array.from({ length: hidDim }).map((_, h) => {
          const hy = hY0 + h * hStep + hStep / 2;
          const w = W2[h];
          const positive = w >= 0;
          const a = Math.abs(w) / maxW2;
          const isOutSel = selected === 'out';
          const color = positive ? 'rgb(59,130,246)' : 'rgb(190,18,60)';
          return (
            <g key={h}>
              <line
                x1={hX + hR} y1={hy}
                x2={outCx - outR} y2={outCy}
                stroke={color}
                strokeWidth={0.6 + 2.2 * a}
                opacity={isOutSel ? Math.max(0.55, 0.25 + 0.7 * a) : (0.25 + 0.65 * a)} />
              <line
                x1={hX + hR} y1={hy}
                x2={outCx - outR} y2={outCy}
                stroke="transparent"
                strokeWidth={8}
                style={{ cursor: 'help' }}>
                <title>{`h${h} → 출력  W₂[${h}] = ${w.toFixed(3)}`}</title>
              </line>
            </g>
          );
        })}

        {/* 은닉 뉴런 — 클릭 가능 */}
        {Array.from({ length: hidDim }).map((_, h) => {
          const hy = hY0 + h * hStep + hStep / 2;
          const isSel = selected === h;
          return (
            <g key={h} style={{ cursor: 'pointer' }} onClick={() => onSelect(h)}>
              <title>{`은닉 h${h} — 편향 b₁[${h}] = ${b1[h].toFixed(3)}, 출력으로의 가중치 W₂[${h}] = ${W2[h].toFixed(3)} (클릭하면 입력→h${h} 가중치 강조)`}</title>
              <circle cx={hX} cy={hy} r={hR + 4} fill="transparent" />
              <circle cx={hX} cy={hy} r={hR}
                fill={isSel ? 'rgb(var(--color-accent))' : 'rgb(var(--color-accent-bg))'}
                stroke={isSel ? 'rgb(var(--color-accent))' : 'rgb(var(--color-border))'}
                strokeWidth={isSel ? 2 : 1.2} />
              <text x={hX} y={hy + 3} textAnchor="middle" fontSize={9}
                fill={isSel ? 'white' : 'rgb(var(--color-text))'} fontWeight={isSel ? 700 : 500}
                style={{ pointerEvents: 'none' }}>
                h{h}
              </text>
              <text x={hX + hR + 4} y={hy + 3} fontSize={8.5} fill="rgb(var(--color-muted))" style={{ pointerEvents: 'none' }}>
                b={b1[h].toFixed(2)}
              </text>
            </g>
          );
        })}

        {/* 출력 뉴런 — 클릭하면 W2 막대 패널 */}
        <g style={{ cursor: 'pointer' }} onClick={() => onSelect('out')}>
          <title>{`출력 σ — 편향 b₂ = ${b2.toFixed(3)} (클릭하면 8개 W₂ 막대가 보여요)`}</title>
          <circle cx={outCx} cy={outCy} r={outR + 4} fill="transparent" />
          <circle cx={outCx} cy={outCy} r={outR}
            fill="rgb(var(--color-accent-bg))"
            stroke={selected === 'out' ? 'rgb(var(--color-accent))' : 'rgb(16,185,129)'}
            strokeWidth={selected === 'out' ? 3 : 2} />
          <text x={outCx} y={outCy - 2} textAnchor="middle" fontSize={12} fontWeight={700}
            fill={selected === 'out' ? 'rgb(var(--color-accent))' : 'rgb(var(--color-text))'}
            style={{ pointerEvents: 'none' }}>
            σ
          </text>
          <text x={outCx} y={outCy + 10} textAnchor="middle" fontSize={8.5} fill="rgb(var(--color-muted))" style={{ pointerEvents: 'none' }}>
            b={b2.toFixed(2)}
          </text>
        </g>
        <text x={outCx} y={outCy + outR + 14} textAnchor="middle" fontSize={10} fill="rgb(var(--color-muted))">
          출력
        </text>

        {/* 출력 → σ(z) */}
        <line x1={outCx + outR} y1={outCy} x2={W - 16} y2={outCy}
          stroke="rgb(var(--color-muted))" strokeWidth={1.2} markerEnd="url(#nv-h-arrow)" />
        <text x={W - 16} y={outCy - 8} textAnchor="end" fontSize={10} fill="rgb(var(--color-text))">
          σ(z)
        </text>
        <text x={W - 16} y={outCy + 14} textAnchor="end" fontSize={9} fill="rgb(var(--color-muted))">
          0~1 확률
        </text>
      </svg>
    </div>
  );
}

/* ────────── 우측 — 선택된 뉴런의 8×8 가중치 히트맵 ────────── */
function HeatmapPanel({ w, bias, title, subtitle, outWeight }: {
  w: Float32Array;
  bias: number;
  title: string;
  subtitle?: string;
  outWeight?: number;
}) {
  const SIZE = 8, cell = 18, total = SIZE * cell;
  let maxAbs = 0;
  for (let i = 0; i < w.length; i++) {
    const a = Math.abs(w[i]);
    if (a > maxAbs) maxAbs = a;
  }
  if (maxAbs < 1e-6) maxAbs = 1;

  return (
    <div className="rounded-md border border-border bg-bg/50 p-3 text-center">
      <div className="text-[12px] font-medium">{title}</div>
      {subtitle && <div className="text-[10px] text-muted mt-0.5">{subtitle}</div>}
      <svg
        viewBox={`0 0 ${total} ${total}`}
        width={total} height={total}
        className="border border-border rounded-sm bg-bg mt-2 mx-auto block"
      >
        {Array.from({ length: SIZE * SIZE }).map((_, i) => {
          const x = (i % SIZE) * cell;
          const y = Math.floor(i / SIZE) * cell;
          const v = w[i] / maxAbs;
          const r = Math.floor(i / SIZE), c = i % SIZE;
          return (
            <rect key={i} x={x} y={y} width={cell} height={cell} fill={weightColor(v)} style={{ cursor: 'help' }}>
              <title>{`(행 ${r}, 열 ${c}) — w[${i}] = ${w[i].toFixed(3)}`}</title>
            </rect>
          );
        })}
        {Array.from({ length: SIZE + 1 }).map((_, i) => (
          <g key={i} stroke="rgb(var(--color-border))" strokeWidth={0.4} opacity={0.5}>
            <line x1={i * cell} y1={0} x2={i * cell} y2={total} />
            <line x1={0} y1={i * cell} x2={total} y2={i * cell} />
          </g>
        ))}
      </svg>
      <div className="mt-1.5 text-[10px] text-muted font-mono">
        |w| max = {maxAbs.toFixed(2)} · b = {bias.toFixed(2)}
      </div>
      {outWeight !== undefined && (
        <div className="mt-1 text-[10px]" style={{ color: outWeight >= 0 ? 'rgb(59,130,246)' : 'rgb(190,18,60)' }}>
          출력으로의 가중치 W₂ = {outWeight >= 0 ? '+' : ''}{outWeight.toFixed(2)}
        </div>
      )}
    </div>
  );
}

/* ────────── 우측 — 출력 뉴런 선택 시: 은닉 8개로부터 받는 가중치 막대 ────────── */
function OutputWeightsPanel({ W2, b2 }: { W2: Float32Array; b2: number }) {
  const maxAbs = Math.max(...Array.from(W2).map((v) => Math.abs(v)), 1e-6);
  return (
    <div className="rounded-md border border-border bg-bg/50 p-3 text-center min-w-[180px]">
      <div className="text-[12px] font-medium">출력 σ가 받는 가중치</div>
      <div className="text-[10px] text-muted mt-0.5">은닉 8개에서 들어오는 W₂</div>
      <div className="mt-2 space-y-1">
        {Array.from({ length: W2.length }).map((_, h) => {
          const v = W2[h];
          const positive = v >= 0;
          const pct = (Math.abs(v) / maxAbs) * 100;
          const color = positive ? 'rgb(59,130,246)' : 'rgb(190,18,60)';
          return (
            <div key={h} className="flex items-center gap-1.5 text-[10px]">
              <span className="font-mono w-6 text-muted text-left">h{h}</span>
              <div className="flex-1 h-2.5 bg-surface rounded-sm border border-border relative overflow-hidden">
                {/* 0 기준선 가운데 */}
                <div
                  className="absolute top-0 bottom-0"
                  style={{ left: '50%', width: 1, background: 'rgb(var(--color-muted))', opacity: 0.6 }}
                />
                <div
                  className="absolute top-0 bottom-0"
                  style={{
                    left: positive ? '50%' : `${50 - pct / 2}%`,
                    width: `${pct / 2}%`,
                    background: color, opacity: 0.85,
                  }}
                />
              </div>
              <span className="font-mono w-12 text-right" style={{ color }}>
                {positive ? '+' : ''}{v.toFixed(2)}
              </span>
            </div>
          );
        })}
      </div>
      <div className="mt-2 text-[10px] text-muted font-mono">b = {b2.toFixed(2)}</div>
    </div>
  );
}

function ColorLegend() {
  return (
    <div className="mt-1 flex items-center justify-center gap-3 text-[10px] text-muted flex-wrap">
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
