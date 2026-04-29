// PhaseB5 — 다중 분류와 소프트맥스 (CE 손실 중심 + 단계 토글)
// 메인: 단계 1 (2종, 동그라미·세모) → 단계 2 (3종, +네모). 둘 다 진짜 MLP 학습 (createDeepMLP + trainStep).
// 학습 곡선에는 "교차 엔트로피 손실"을 명시. 평가 그림 클릭 → 학습된 모델의 출력 뉴런 N개 막대.
// 슬라이더 직접 조작은 보조 박스로 축소(시프트 불변 데모).
// 두 단계 모두 학습하면 비교 카드 표시 + markCompleted('b5'). 또는 3종 train acc ≥ 85%.

import { useEffect, useMemo, useRef, useState } from 'react';
import { PHASES } from '../phases';
import { useApp } from '../store';
import {
  useDot,
  useActiveTrain,
  useActiveEval,
  classifyModel,
} from '../dotStore';
import type { BinaryModel, MultiModel } from '../dotStore';
import {
  type DotSample,
  type ShapeLabel,
  SHAPE_LABEL_KO,
} from '../data/dotShapes';
import {
  createDeepMLP,
  trainStep,
  shuffle,
  type MLP,
  type TrainSample,
} from '../lib/nn';

const COLORS = {
  circle: 'rgb(249,115,22)',
  triangle: 'rgb(190,18,60)',
  square: 'rgb(59,130,246)',
  green: 'rgb(16,185,129)',
};

const LABELS_2: ShapeLabel[] = ['circle', 'triangle'];
const LABELS_3: ShapeLabel[] = ['circle', 'triangle', 'square'];

const STREAM_DELAY = 18;

type Stage = 1 | 2;

interface StageResult {
  stage: Stage;
  labels: ShapeLabel[];
  outputNeurons: number;
  durationMs: number;
  trainAcc: number;
  evalAcc: number;
  finalLoss: number;
  lossHist: number[];
  accHist: number[];
}

function softmax(z: number[]): number[] {
  const m = Math.max(...z);
  const exps = z.map((v) => Math.exp(v - m));
  const sum = exps.reduce((a, b) => a + b, 0);
  return exps.map((e) => e / sum);
}

function colorOfLabel(lbl: ShapeLabel): string {
  if (lbl === 'circle') return COLORS.circle;
  if (lbl === 'triangle') return COLORS.triangle;
  return COLORS.square;
}

export function PhaseB5() {
  const meta = PHASES.find((p) => p.id === 'b5')!;
  const markCompleted = useApp((s) => s.markCompleted);
  const setBinaryModel = useDot((s) => s.setBinaryModel);
  const setMultiModel = useDot((s) => s.setMultiModel);

  const trainAll = useActiveTrain();
  const evalAll = useActiveEval();

  // 단계 토글
  const [stage, setStage] = useState<Stage>(1);

  // 컨트롤
  const [epochs, setEpochs] = useState(40);
  const [lr, setLr] = useState(0.1);

  // 학습 상태 (현재 진행 중인 단계)
  const [running, setRunning] = useState(false);
  const [streamIdx, setStreamIdx] = useState(0);
  const [lossHist, setLossHist] = useState<number[]>([]);
  const [accHist, setAccHist] = useState<number[]>([]);
  const [activeMLP, setActiveMLP] = useState<MLP | null>(null);
  const [activeLabels, setActiveLabels] = useState<ShapeLabel[]>(LABELS_2);

  // 단계별 결과 누적 — 비교 카드용
  const [stage1Result, setStage1Result] = useState<StageResult | null>(null);
  const [stage2Result, setStage2Result] = useState<StageResult | null>(null);

  // 평가 그림 클릭
  const [pickedId, setPickedId] = useState<string | null>(null);

  // 단계가 바뀌면 진행 상태 초기화 (저장된 결과는 유지)
  useEffect(() => {
    setLossHist([]);
    setAccHist([]);
    setStreamIdx(0);
    setActiveMLP(null);
    setPickedId(null);
    setActiveLabels(stage === 1 ? LABELS_2 : LABELS_3);
  }, [stage]);

  const stopRef = useRef(false);
  useEffect(() => () => { stopRef.current = true; }, []);

  // 현재 단계의 라벨 + 학습/평가 데이터
  const currentLabels = stage === 1 ? LABELS_2 : LABELS_3;
  const trainFiltered: DotSample[] = useMemo(
    () => trainAll.filter((s) => currentLabels.includes(s.label)),
    [trainAll, currentLabels],
  );
  const evalFiltered: DotSample[] = useMemo(
    () => evalAll.filter((s) => currentLabels.includes(s.label)),
    [evalAll, currentLabels],
  );

  function startTraining() {
    if (running) return;
    if (trainFiltered.length === 0) return;
    setRunning(true);
    stopRef.current = false;
    setLossHist([]);
    setAccHist([]);
    setStreamIdx(0);
    setPickedId(null);

    const labels = stage === 1 ? LABELS_2 : LABELS_3;
    setActiveLabels(labels);

    queueMicrotask(() => {
      const mlp = createDeepMLP([64, labels.length]);
      const trainData: TrainSample[] = trainFiltered.map((s) => ({
        x: new Float32Array(s.pixels),
        y: labels.indexOf(s.label),
      }));
      const evalData: TrainSample[] = evalFiltered.map((s) => ({
        x: new Float32Array(s.pixels),
        y: labels.indexOf(s.label),
      }));

      const startTs = performance.now();
      const losses: number[] = [];
      const accs: number[] = [];

      const BATCH = Math.max(8, Math.min(32, Math.floor(trainData.length / 4) || 8));

      for (let ep = 0; ep < epochs; ep++) {
        const shuffled = shuffle(trainData);
        let epochLoss = 0;
        let batchCount = 0;
        for (let i = 0; i < shuffled.length; i += BATCH) {
          const batch = shuffled.slice(i, i + BATCH);
          const loss = trainStep(mlp, batch, lr);
          epochLoss += loss;
          batchCount += 1;
        }
        losses.push(epochLoss / Math.max(1, batchCount));

        // train accuracy
        let correct = 0;
        for (const s of trainData) {
          const { probs } = forwardLite(mlp, s.x);
          let best = 0;
          for (let k = 1; k < probs.length; k++) if (probs[k] > probs[best]) best = k;
          if (best === s.y) correct += 1;
        }
        accs.push(trainData.length > 0 ? correct / trainData.length : 0);
      }
      const durationMs = performance.now() - startTs;

      // 최종 평가
      let trainCorrect = 0;
      for (const s of trainData) {
        const { probs } = forwardLite(mlp, s.x);
        let best = 0;
        for (let k = 1; k < probs.length; k++) if (probs[k] > probs[best]) best = k;
        if (best === s.y) trainCorrect += 1;
      }
      const trainAcc = trainData.length > 0 ? trainCorrect / trainData.length : 0;

      let evalCorrect = 0;
      for (const s of evalData) {
        const { probs } = forwardLite(mlp, s.x);
        let best = 0;
        for (let k = 1; k < probs.length; k++) if (probs[k] > probs[best]) best = k;
        if (best === s.y) evalCorrect += 1;
      }
      const evalAcc = evalData.length > 0 ? evalCorrect / evalData.length : 0;

      // store에 저장 — 호환을 위해 w/b도 채움 (마지막 층 평탄화)
      const lastW = mlp.weights[mlp.weights.length - 1];
      const lastB = mlp.biases[mlp.biases.length - 1];
      const C = labels.length;
      const D = mlp.layers[mlp.layers.length - 2];
      const wOut: number[][] = Array.from({ length: C }, () => new Array(D).fill(0));
      for (let i = 0; i < D; i++) {
        for (let j = 0; j < C; j++) {
          wOut[j][i] = lastW[i * C + j];
        }
      }
      const bOut: number[] = Array.from(lastB);

      const stageResult: StageResult = {
        stage,
        labels,
        outputNeurons: labels.length,
        durationMs,
        trainAcc,
        evalAcc,
        finalLoss: losses[losses.length - 1] ?? 0,
        lossHist: losses,
        accHist: accs,
      };

      if (stage === 1) {
        const bin: BinaryModel = {
          labels: [labels[0], labels[1]] as [ShapeLabel, ShapeLabel],
          w: wOut,
          b: bOut,
          mlp,
          trainedSteps: epochs,
          trainAccuracy: trainAcc,
          evalAccuracy: evalAcc,
        };
        setBinaryModel(bin);
        setStage1Result(stageResult);
      } else {
        const multi: MultiModel = {
          labels: [labels[0], labels[1], labels[2]] as [ShapeLabel, ShapeLabel, ShapeLabel],
          w: wOut,
          b: bOut,
          mlp,
          trainedSteps: epochs,
          trainAccuracy: trainAcc,
          evalAccuracy: evalAcc,
        };
        setMultiModel(multi);
        setStage2Result(stageResult);
      }

      setActiveMLP(mlp);

      // 곡선 점진 노출
      let i = 0;
      const tick = () => {
        if (stopRef.current) {
          setRunning(false);
          return;
        }
        i += 1;
        setStreamIdx(i);
        setLossHist(losses.slice(0, i));
        setAccHist(accs.slice(0, i));
        if (i >= losses.length) {
          setRunning(false);
          return;
        }
        setTimeout(tick, STREAM_DELAY);
      };
      tick();
    });
  }

  function stopTraining() {
    stopRef.current = true;
    setRunning(false);
  }

  // 완료 처리 — 두 단계 모두 학습 OR 3종 train ≥ 85%
  const completedRef = useRef(false);
  useEffect(() => {
    if (completedRef.current) return;
    if (stage1Result && stage2Result) {
      completedRef.current = true;
      markCompleted('b5');
      return;
    }
    if (stage2Result && stage2Result.trainAcc >= 0.85) {
      completedRef.current = true;
      markCompleted('b5');
    }
  }, [stage1Result, stage2Result, markCompleted]);

  // 평가 그림 클릭 → 학습된 모델 출력
  const pickedSample = pickedId ? evalFiltered.find((s) => s.id === pickedId) ?? null : null;
  const pickedScores = useMemo(() => {
    if (!pickedSample || !activeMLP) return null;
    const fakeModel = stage === 1
      ? { labels: [activeLabels[0], activeLabels[1]] as [ShapeLabel, ShapeLabel], w: [], b: [], mlp: activeMLP, trainedSteps: 0, trainAccuracy: 0, evalAccuracy: 0 } as BinaryModel
      : { labels: [activeLabels[0], activeLabels[1], activeLabels[2]] as [ShapeLabel, ShapeLabel, ShapeLabel], w: [], b: [], mlp: activeMLP, trainedSteps: 0, trainAccuracy: 0, evalAccuracy: 0 } as MultiModel;
    return classifyModel(pickedSample.pixels, fakeModel);
  }, [pickedSample, activeMLP, stage, activeLabels]);

  // 보조 박스 — 슬라이더 (단계에 따라 N=2 or 3)
  const [demoZ, setDemoZ] = useState<number[]>([0, 0, 0]);
  const demoN = stage === 1 ? 2 : 3;
  const demoZUsed = demoZ.slice(0, demoN);
  const demoProbs = useMemo(() => softmax(demoZUsed), [demoZUsed]);
  const setDemoZi = (i: number, v: number) => {
    setDemoZ((cur) => {
      const next = [...cur];
      next[i] = v;
      return next;
    });
  };
  const shiftAll = (delta: number) => {
    setDemoZ((cur) => cur.map((v, idx) => idx < demoN ? Math.max(-5, Math.min(5, v + delta)) : v));
  };

  return (
    <article>
      <div className="text-xs font-mono text-muted">PHASE {meta.num}</div>
      <h1>{meta.title}</h1>
      <p className="text-muted mt-2 text-sm">{meta.subtitle}</p>

      <p className="mt-4 text-[15px] leading-relaxed">
        두 종류에서 세 종류로. 출력 뉴런이 늘면 무엇이 바뀔까요?
        같은 학습 원리 — <strong>교차 엔트로피 손실</strong>로 정답 라벨의 확률을 1쪽으로 끌어올립니다.
      </p>

      {/* 단계 토글 */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          className={stage === 1 ? 'btn-primary' : 'btn-ghost'}
          onClick={() => setStage(1)}
          disabled={running}
        >
          단계 1 — 2종 (동그라미 vs 세모)
          {stage1Result && <span className="ml-2 font-mono text-[11px]" style={{ color: COLORS.green }}>✓</span>}
        </button>
        <button
          type="button"
          className={stage === 2 ? 'btn-primary' : 'btn-ghost'}
          onClick={() => setStage(2)}
          disabled={running}
        >
          단계 2 — 3종 (+ 네모)
          {stage2Result && <span className="ml-2 font-mono text-[11px]" style={{ color: COLORS.green }}>✓</span>}
        </button>
        <div className="text-[11px] text-muted ml-1">
          단계 {stage} — 출력 뉴런 {currentLabels.length}개
        </div>
      </div>

      {/* 메인 그리드 */}
      <div className="mt-5 grid lg:grid-cols-[1.5fr_1fr] gap-4 items-start">
        {/* 좌측 — 학습 곡선 + 평가 그림 클릭 */}
        <div className="space-y-3">
          <div className="card p-3">
            <div className="flex items-baseline justify-between flex-wrap gap-2">
              <div>
                <div className="text-sm font-medium">학습 진행 — 교차 엔트로피 손실</div>
                <div className="text-[11px] text-muted">분류는 MSE 대신 교차 엔트로피로 학습합니다.</div>
              </div>
              <div className="text-[11px] font-mono text-muted">
                epoch <span className="text-accent font-semibold">{streamIdx}</span> / {epochs}
              </div>
            </div>
            <TrainingChart loss={lossHist} acc={accHist} totalEpochs={epochs} />
            <div className="text-[12px] text-muted leading-relaxed mt-2">
              <strong>교차 엔트로피</strong>는 정답 라벨의 확률을 1쪽으로 끌어올리는 손실이에요.
              B4의 두 라벨에서도 같은 손실로 학습되었어요.
            </div>
          </div>

          {/* 평가 그림 클릭 — 학습된 모델의 출력 뉴런 막대 */}
          <div className="card p-3">
            <div className="flex items-baseline justify-between flex-wrap gap-2">
              <div>
                <div className="text-sm font-medium">학습된 모델로 새 그림 시험</div>
                <div className="text-[11px] text-muted">
                  평가용 그림을 클릭하면 출력 뉴런 {currentLabels.length}개의 점수와 softmax 확률 막대가 보여요.
                </div>
              </div>
              <div className="text-[11px] font-mono text-muted">평가용 {evalFiltered.length}장</div>
            </div>

            <div className="mt-2 flex flex-wrap gap-1.5 max-h-[110px] overflow-y-auto">
              {evalFiltered.map((s) => {
                const selected = s.id === pickedId;
                const correctMark =
                  pickedScores && selected
                    ? activeLabels[pickedScores.pred] === s.label
                    : null;
                const ringColor = !selected
                  ? 'rgb(var(--color-border))'
                  : correctMark === false
                    ? COLORS.triangle
                    : COLORS.green;
                return (
                  <button
                    key={s.id}
                    onClick={() => setPickedId(s.id === pickedId ? null : s.id)}
                    title={`${SHAPE_LABEL_KO[s.label]} · ${s.id}`}
                    className="rounded-sm transition hover:opacity-80"
                    style={{ outline: selected ? `2px solid ${ringColor}` : 'none', outlineOffset: 1 }}
                    type="button"
                  >
                    <DotThumb sample={s} />
                  </button>
                );
              })}
            </div>

            {pickedSample && pickedScores && (
              <PickedScoreCard
                sample={pickedSample}
                scores={pickedScores}
                labels={activeLabels}
              />
            )}
            {!activeMLP && (
              <div className="mt-2 text-[11px] text-muted">
                먼저 오른쪽에서 학습을 시작하면 출력 뉴런 점수가 채워져요.
              </div>
            )}
          </div>
        </div>

        {/* 우측 — 학습 컨트롤 + 결과 */}
        <div className="space-y-3">
          <div className="card p-3 space-y-3">
            <div className="text-sm font-medium">
              학습 컨트롤 · 단계 {stage} ({currentLabels.length}종)
            </div>
            <div className="text-[11px] text-muted">
              모델: <span className="font-mono">createDeepMLP([64, {currentLabels.length}])</span> · softmax 출력층
            </div>

            <div>
              <div className="flex items-baseline justify-between text-[12px] font-mono">
                <span className="text-muted">epoch</span>
                <span className="text-accent font-semibold">{epochs}</span>
              </div>
              <input
                type="range" min={10} max={120} step={5}
                value={epochs} onChange={(e) => setEpochs(parseInt(e.target.value, 10))}
                disabled={running}
                className="w-full accent-[rgb(var(--color-accent))]"
              />
            </div>

            <div>
              <div className="flex items-baseline justify-between text-[12px] font-mono">
                <span className="text-muted">학습률 η</span>
                <span className="text-accent font-semibold">{lr.toFixed(2)}</span>
              </div>
              <input
                type="range" min={0.01} max={0.5} step={0.01}
                value={lr} onChange={(e) => setLr(parseFloat(e.target.value))}
                disabled={running}
                className="w-full accent-[rgb(var(--color-accent))]"
              />
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              {!running ? (
                <button
                  onClick={startTraining}
                  className="btn-primary"
                  disabled={trainFiltered.length === 0}
                  type="button"
                >
                  ▶ 단계 {stage} 학습 시작
                </button>
              ) : (
                <button onClick={stopTraining} className="btn-ghost" type="button">⏸ 멈춤</button>
              )}
            </div>

            {trainFiltered.length === 0 && (
              <div className="text-[11px]" style={{ color: COLORS.triangle }}>
                학습용 그림이 0장이에요. B2/B3에서 active 데이터를 확인해 주세요.
              </div>
            )}
          </div>

          {/* 단계별 결과 요약 — 학습 종료 직후 강조 */}
          {(() => {
            const cur = stage === 1 ? stage1Result : stage2Result;
            const done = !!cur && !running;
            return (
              <div
                className="card p-3 transition"
                style={done ? {
                  borderColor: 'rgb(16,185,129)',
                  background: 'rgba(16,185,129,0.06)',
                  borderWidth: 1.5,
                } : undefined}
              >
                <div className="flex items-baseline justify-between">
                  <div className="text-sm font-medium">
                    {running
                      ? <>학습 중… <span className="text-muted text-[11px]">({stage}단계)</span></>
                      : done
                        ? <>✅ 학습 완료 — 평가 결과 <span className="text-muted text-[11px]">({stage}단계)</span></>
                        : <>현재 단계 결과 <span className="text-muted text-[11px]">(아직 학습 전)</span></>}
                  </div>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <BigStat
                    label="train acc"
                    value={cur?.trainAcc ?? null}
                    color="rgb(var(--color-accent))"
                  />
                  <BigStat
                    label="eval acc"
                    value={cur?.evalAcc ?? null}
                    color={done ? 'rgb(16,185,129)' : COLORS.square}
                  />
                </div>
                <div className="mt-2 text-[11px] text-muted font-mono">
                  최종 CE 손실: {cur ? cur.finalLoss.toFixed(4) : '—'}
                </div>
                {done && (
                  <div className="mt-2 text-[11px] leading-snug" style={{ color: 'rgb(16,185,129)' }}>
                    ↓ 아래 평가 그림을 클릭해 모델이 그 그림을 어느 라벨로 분류하는지 확인해 보세요.
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      </div>

      {/* 비교 카드 — 두 단계 다 끝나면 */}
      {stage1Result && stage2Result && (
        <CompareCard s1={stage1Result} s2={stage2Result} />
      )}

      {/* 보조 박스 — softmax 직접 만져 보기 */}
      <div className="card p-3 mt-5">
        <div className="flex items-baseline justify-between flex-wrap gap-2">
          <div>
            <div className="text-sm font-medium">💡 직접 만져 보기 — softmax는 차이만 본다</div>
            <div className="text-[11px] text-muted leading-snug mt-0.5">
              <strong>이건 학습이 아니에요.</strong> 학습이 만든 z를 손으로 흉내 본 것뿐 — 학습 결과는 위에서 봐요.
            </div>
          </div>
          <div className="text-[11px] font-mono text-muted">슬라이더 {demoN}개</div>
        </div>

        <div className="grid md:grid-cols-2 gap-4 mt-3">
          {/* 슬라이더 영역 */}
          <div className="space-y-2">
            {Array.from({ length: demoN }).map((_, i) => {
              const lbl = currentLabels[i];
              const color = colorOfLabel(lbl);
              return (
                <div key={lbl} className="flex items-center gap-3">
                  <div className="w-16 text-[12px]" style={{ color }}>{SHAPE_LABEL_KO[lbl]}</div>
                  <input
                    type="range"
                    min={-5}
                    max={5}
                    step={0.1}
                    value={demoZ[i]}
                    onChange={(e) => setDemoZi(i, Number(e.target.value))}
                    className="flex-1"
                    style={{ accentColor: color }}
                  />
                  <div className="w-12 text-right font-mono text-[11px] tabular-nums">
                    {demoZ[i].toFixed(1)}
                  </div>
                </div>
              );
            })}
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <button className="btn-ghost text-[11px]" onClick={() => shiftAll(1)} type="button">
                {demoN}개 동시 +1
              </button>
              <button className="btn-ghost text-[11px]" onClick={() => shiftAll(-1)} type="button">
                {demoN}개 동시 −1
              </button>
              <button
                className="btn-ghost text-[11px]"
                onClick={() => setDemoZ([0, 0, 0])}
                type="button"
              >
                0으로 리셋
              </button>
            </div>
          </div>

          {/* 막대 영역 */}
          <div className="space-y-2">
            {Array.from({ length: demoN }).map((_, i) => {
              const lbl = currentLabels[i];
              const color = colorOfLabel(lbl);
              const pct = demoProbs[i] * 100;
              return (
                <div key={lbl} className="flex items-center gap-3">
                  <div className="w-16 text-[12px]" style={{ color }}>{SHAPE_LABEL_KO[lbl]}</div>
                  <div className="flex-1 h-5 rounded bg-surface border border-border overflow-hidden">
                    <div
                      className="h-full transition-all duration-150"
                      style={{ width: `${pct.toFixed(2)}%`, background: color, opacity: 0.85 }}
                    />
                  </div>
                  <div className="w-14 text-right font-mono text-[11px] tabular-nums">
                    {pct.toFixed(1)}%
                  </div>
                </div>
              );
            })}
            <div className="text-[11px] text-muted mt-1">
              합 = 100%. {demoN}개 슬라이더를 같은 양만큼 올려 보세요 — 막대가 변하지 않아요(차이만 본다).
            </div>
          </div>
        </div>
      </div>

      {/* 깊이 알기 — 시그모이드·소프트맥스·교차 엔트로피 (관심 있는 학생용 폴드) */}
      <DeepDive />
    </article>
  );
}

/* ────────── 깊이 알기 폴드 — 관심 있는 학생용 ──────────
   시그모이드(S자 미끄럼틀) / 소프트맥스(불공정 투표) / 교차 엔트로피(자신감 벌점)를
   직관 + 작은 SVG로 풀어 준다. 본문 흐름은 안 끊고, 펼쳐야 보임. */
function DeepDive() {
  return (
    <details className="mt-5 rounded-md border border-border bg-surface/30">
      <summary className="cursor-pointer px-4 py-3 text-sm font-medium hover:bg-surface/60 transition">
        💡 더 알아보기 — 시그모이드·소프트맥스·교차 엔트로피의 관계 (관심 있는 학생용)
      </summary>
      <div className="px-4 pb-4 pt-1 space-y-6 text-sm leading-relaxed">

        {/* 1. 시그모이드 */}
        <section>
          <h3 className="!mt-0 !mb-1 text-base font-semibold text-accent">1. 시그모이드 — S자 미끄럼틀</h3>
          <p className="text-muted">
            어떤 점수든 <strong>0과 1 사이</strong>로 밀어 넣어요. 양수면 1쪽, 음수면 0쪽, 0이면 정확히 가운데.
            "예/아니오" 둘 중 하나를 고를 때 점수를 *확률*로 바꾸는 변환기.
          </p>
          <div className="mt-2 grid md:grid-cols-[280px_1fr] gap-4 items-center">
            <SigmoidCurve />
            <div className="text-[12px] text-muted leading-snug">
              <div>· 점수 z가 크면 σ(z) → 1 ("확실히 yes")</div>
              <div>· 점수 z가 작으면 σ(z) → 0 ("확실히 no")</div>
              <div>· z = 0이면 σ(0) = 0.5 ("모르겠다")</div>
              <div className="mt-1.5 font-mono text-[11px]">σ(z) = 1 / (1 + e<sup>−z</sup>)</div>
            </div>
          </div>
        </section>

        {/* 2. 소프트맥스 */}
        <section>
          <h3 className="!mt-0 !mb-1 text-base font-semibold text-accent">2. 소프트맥스 — 후보들끼리 경쟁시키는 투표</h3>
          <p className="text-muted">
            여러 점수가 들어오면 <strong>지수로 부풀린 뒤</strong> 합이 1이 되게 나눠요.
            점수 차이가 클수록 1등이 거의 모든 표를 가져갑니다 (winner-take-most).
          </p>
          <div className="mt-2 grid md:grid-cols-[280px_1fr] gap-4 items-center">
            <SoftmaxBars />
            <div className="text-[12px] text-muted leading-snug">
              <div>· 점수 [1, 2, 5] → 확률 [1.8%, 4.7%, <strong style={{ color: 'rgb(190,18,60)' }}>93.5%</strong>]</div>
              <div>· 1등의 점수가 조금만 앞서도 표가 *몰린다*</div>
              <div>· 모든 점수에 같은 값을 더해도(시프트) 결과는 그대로 — <strong>차이만 본다</strong></div>
              <div className="mt-1.5 text-accent">
                후보가 *둘*이면 σ(z₁ − z₂) = softmax([z₁, z₂])₁ — 시그모이드는 소프트맥스의 2-class 특수형.
              </div>
            </div>
          </div>
        </section>

        {/* 3. 교차 엔트로피 */}
        <section>
          <h3 className="!mt-0 !mb-1 text-base font-semibold text-accent">3. 교차 엔트로피 — 자신 있게 틀리면 더 크게 혼낸다</h3>
          <p className="text-muted">
            모델이 <strong>정답 라벨</strong>에 매긴 확률 p가 1에 가까울수록 손실이 작고, 0에 가까울수록 손실이 폭발합니다.
            단순 *맞다/틀리다*가 아니라 <strong>얼마나 자신 있게 틀렸는지</strong>까지 잰다.
          </p>
          <div className="mt-2 grid md:grid-cols-[280px_1fr] gap-4 items-center">
            <CrossEntropyCurve />
            <div className="text-[12px] text-muted leading-snug">
              <div>· p = 1.0 → 손실 0 (완벽 확신)</div>
              <div>· p = 0.5 → 손실 0.69 (반쪽 확신)</div>
              <div>· p = 0.1 → 손실 2.30 (자신 있게 틀림)</div>
              <div>· p = 0.01 → 손실 4.60 (확신하며 틀림 — <strong style={{ color: 'rgb(190,18,60)' }}>큰 벌</strong>)</div>
              <div className="mt-1.5 font-mono text-[11px]">손실 = −ln(p<sub>정답</sub>)</div>
            </div>
          </div>
        </section>

        {/* 4. 셋이 한 학습 사이클에서 만나는 모습 */}
        <section className="aside-tip text-[13px]">
          <div className="font-medium">셋이 어떻게 한 학습 사이클에 모이나</div>
          <div className="mt-1.5 leading-relaxed">
            <strong>시그모이드/소프트맥스</strong>는 *점수를 확률로* 바꾸는 변환기.{' '}
            <strong>교차 엔트로피</strong>는 그 확률 중 *정답 자리*가 1에 가까울수록 작아지는 손실.{' '}
            매 학습 step은 <strong>정답 확률을 1쪽으로 밀어 올리는</strong> 방향으로 가중치를 움직입니다.
            B4(2종)·B5(3종)·C4(10종) 모두 같은 원리예요 — 후보 수만 다를 뿐.
          </div>
        </section>
      </div>
    </details>
  );
}

/* 작은 시각화 — 시그모이드 곡선 */
function SigmoidCurve() {
  const W = 280, H = 140;
  const padL = 24, padR = 8, padT = 10, padB = 22;
  const sx = (z: number) => padL + ((z + 6) / 12) * (W - padL - padR);
  const sy = (p: number) => H - padB - p * (H - padT - padB);
  const sigma = (z: number) => 1 / (1 + Math.exp(-z));
  const path = Array.from({ length: 121 }, (_, i) => {
    const z = -6 + (i / 120) * 12;
    return `${i === 0 ? 'M' : 'L'}${sx(z).toFixed(2)},${sy(sigma(z)).toFixed(2)}`;
  }).join(' ');
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
      {/* axes */}
      <line x1={padL} y1={H - padB} x2={W - padR} y2={H - padB} stroke="rgb(var(--color-border))" />
      <line x1={padL} y1={padT} x2={padL} y2={H - padB} stroke="rgb(var(--color-border))" />
      {/* 0.5 점선 */}
      <line x1={padL} y1={sy(0.5)} x2={W - padR} y2={sy(0.5)} stroke="rgb(var(--color-border))" strokeDasharray="2 3" />
      <text x={W - padR - 2} y={sy(0.5) - 2} textAnchor="end" fontSize={9} fill="rgb(var(--color-muted))">0.5</text>
      {/* z=0 점선 */}
      <line x1={sx(0)} y1={padT} x2={sx(0)} y2={H - padB} stroke="rgb(var(--color-border))" strokeDasharray="2 3" />
      <text x={sx(0) + 3} y={padT + 9} fontSize={9} fill="rgb(var(--color-muted))">z=0</text>
      {/* y labels */}
      <text x={padL - 4} y={sy(0) + 3} textAnchor="end" fontSize={9} fill="rgb(var(--color-muted))">0</text>
      <text x={padL - 4} y={sy(1) + 3} textAnchor="end" fontSize={9} fill="rgb(var(--color-muted))">1</text>
      {/* x labels */}
      <text x={sx(-6)} y={H - padB + 12} textAnchor="middle" fontSize={9} fill="rgb(var(--color-muted))">−6</text>
      <text x={sx(6)} y={H - padB + 12} textAnchor="middle" fontSize={9} fill="rgb(var(--color-muted))">+6</text>
      <text x={W - padR - 2} y={H - 4} textAnchor="end" fontSize={9} fill="rgb(var(--color-muted))">z (점수) →</text>
      {/* curve */}
      <path d={path} fill="none" stroke="rgb(var(--color-accent))" strokeWidth={2} />
      {/* center dot */}
      <circle cx={sx(0)} cy={sy(0.5)} r={3.5} fill="rgb(var(--color-accent))" />
    </svg>
  );
}

/* 작은 시각화 — 소프트맥스 막대 (z=[1,2,5]) */
function SoftmaxBars() {
  const z = [1, 2, 5];
  const m = Math.max(...z);
  const exps = z.map((v) => Math.exp(v - m));
  const sum = exps.reduce((a, b) => a + b, 0);
  const p = exps.map((e) => e / sum);
  const colors = ['rgb(59,130,246)', 'rgb(251,146,60)', 'rgb(190,18,60)'];
  return (
    <div className="space-y-1.5 px-1">
      {z.map((zi, i) => (
        <div key={i} className="flex items-center gap-2 text-[11px] font-mono">
          <div className="w-10 shrink-0 text-right" style={{ color: colors[i] }}>z={zi}</div>
          <div className="flex-1 h-5 rounded bg-surface border border-border overflow-hidden">
            <div className="h-full transition-all" style={{ width: `${(p[i] * 100).toFixed(1)}%`, background: colors[i], opacity: 0.9 }} />
          </div>
          <div className="w-12 text-right tabular-nums" style={{ color: colors[i], fontWeight: 600 }}>
            {(p[i] * 100).toFixed(1)}%
          </div>
        </div>
      ))}
      <div className="text-[10px] text-muted text-right pt-1">합 = 100%</div>
    </div>
  );
}

/* 작은 시각화 — 교차 엔트로피 −ln(p) */
function CrossEntropyCurve() {
  const W = 280, H = 140;
  const padL = 28, padR = 8, padT = 10, padB = 22;
  const sx = (px: number) => padL + ((px - 0.01) / (1 - 0.01)) * (W - padL - padR);
  const sy = (l: number) => H - padB - (Math.min(l, 5) / 5) * (H - padT - padB);
  const path = Array.from({ length: 99 }, (_, i) => {
    const px = 0.01 + (i / 98) * 0.99;
    return `${i === 0 ? 'M' : 'L'}${sx(px).toFixed(2)},${sy(-Math.log(px)).toFixed(2)}`;
  }).join(' ');
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
      <line x1={padL} y1={H - padB} x2={W - padR} y2={H - padB} stroke="rgb(var(--color-border))" />
      <line x1={padL} y1={padT} x2={padL} y2={H - padB} stroke="rgb(var(--color-border))" />
      {/* y ticks 0/2/4 */}
      {[0, 2, 4].map((v) => (
        <g key={v}>
          <line x1={padL} y1={sy(v)} x2={W - padR} y2={sy(v)} stroke="rgb(var(--color-border))" strokeDasharray="2 3" opacity={0.5} />
          <text x={padL - 4} y={sy(v) + 3} textAnchor="end" fontSize={9} fill="rgb(var(--color-muted))">{v}</text>
        </g>
      ))}
      {/* x labels */}
      <text x={sx(0.01)} y={H - padB + 12} textAnchor="start" fontSize={9} fill="rgb(var(--color-muted))">0</text>
      <text x={sx(0.5)} y={H - padB + 12} textAnchor="middle" fontSize={9} fill="rgb(var(--color-muted))">0.5</text>
      <text x={sx(1)} y={H - padB + 12} textAnchor="end" fontSize={9} fill="rgb(var(--color-muted))">1</text>
      <text x={W - padR - 2} y={H - 4} textAnchor="end" fontSize={9} fill="rgb(var(--color-muted))">정답 확률 p →</text>
      <text x={padL + 4} y={padT + 9} fontSize={9} fill="rgb(var(--color-muted))">손실 −ln(p)</text>
      {/* curve */}
      <path d={path} fill="none" stroke="rgb(190,18,60)" strokeWidth={2} />
      {/* 표지 점 */}
      {[
        { p: 1.0, label: 'p=1: 0' },
        { p: 0.5, label: 'p=0.5: 0.69' },
        { p: 0.1, label: 'p=0.1: 2.30' },
      ].map((d) => (
        <circle key={d.p} cx={sx(d.p)} cy={sy(-Math.log(d.p))} r={3} fill="rgb(190,18,60)" />
      ))}
    </svg>
  );
}

/* ────────── 비교 카드 — 단계 1 vs 단계 2 ────────── */
function CompareCard({ s1, s2 }: { s1: StageResult; s2: StageResult }) {
  const fmtPct = (v: number) => `${(v * 100).toFixed(1)}%`;
  const fmtMs = (v: number) => `${v.toFixed(0)} ms`;
  return (
    <div className="card p-4 mt-5" style={{ borderColor: 'rgb(var(--color-accent))' }}>
      <div className="flex items-baseline justify-between flex-wrap gap-2">
        <div className="text-sm font-medium">단계 비교 — 2종 vs 3종</div>
        <div className="text-[11px] text-muted">두 단계 모두 같은 모델 패턴 · 같은 손실(CE)</div>
      </div>
      <div className="mt-3 grid grid-cols-[1.2fr_1fr_1fr] gap-x-3 gap-y-1.5 text-[12px]">
        <div className="text-muted">항목</div>
        <div className="font-medium" style={{ color: COLORS.circle }}>단계 1 (2종)</div>
        <div className="font-medium" style={{ color: COLORS.square }}>단계 2 (3종)</div>

        <div className="text-muted">출력 뉴런 수</div>
        <div className="font-mono">{s1.outputNeurons}개</div>
        <div className="font-mono">{s2.outputNeurons}개</div>

        <div className="text-muted">학습 시간 (epoch {Math.max(s1.lossHist.length, s2.lossHist.length)})</div>
        <div className="font-mono">{fmtMs(s1.durationMs)}</div>
        <div className="font-mono">{fmtMs(s2.durationMs)}</div>

        <div className="text-muted">train accuracy</div>
        <div className="font-mono">{fmtPct(s1.trainAcc)}</div>
        <div className="font-mono">{fmtPct(s2.trainAcc)}</div>

        <div className="text-muted">eval accuracy</div>
        <div className="font-mono">{fmtPct(s1.evalAcc)}</div>
        <div className="font-mono">{fmtPct(s2.evalAcc)}</div>

        <div className="text-muted">최종 cross-entropy 손실</div>
        <div className="font-mono">{s1.finalLoss.toFixed(4)}</div>
        <div className="font-mono">{s2.finalLoss.toFixed(4)}</div>
      </div>
      <div className="aside-tip text-[13px] mt-3 leading-relaxed">
        라벨이 늘수록 출력층이 커지고, 손실은 <strong>세 후보 사이 경쟁</strong>을 보게 돼요.
        보통 2종이 더 쉽고 정확도도 높지만, 3종이라고 학습이 안 되는 게 아니에요 — <strong>학습 원리는 같습니다</strong>.
      </div>
    </div>
  );
}

/* ────────── 학습 곡선 (loss + accuracy) ────────── */
function TrainingChart({ loss, acc, totalEpochs }: {
  loss: number[]; acc: number[]; totalEpochs: number;
}) {
  const W = 720, H = 200, padL = 40, padR = 44, padT = 12, padB = 26;
  const lossMax = Math.max(0.5, ...loss);
  const sx = (i: number) =>
    padL + (totalEpochs > 1 ? (i / (totalEpochs - 1)) : 0) * (W - padL - padR);
  const sy = (v: number, max: number) =>
    H - padB - (v / max) * (H - padT - padB);

  let lossPath = '';
  loss.forEach((v, i) => { lossPath += `${i === 0 ? 'M' : 'L'}${sx(i)},${sy(v, lossMax)} `; });
  let accPath = '';
  acc.forEach((v, i) => { accPath += `${i === 0 ? 'M' : 'L'}${sx(i)},${sy(v, 1)} `; });

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full mt-1">
      <line x1={padL} y1={H - padB} x2={W - padR} y2={H - padB} stroke="rgb(var(--color-border))" />
      <line x1={padL} y1={padT} x2={padL} y2={H - padB} stroke="rgb(var(--color-border))" />
      <line x1={W - padR} y1={padT} x2={W - padR} y2={H - padB} stroke="rgb(var(--color-border))" />
      <line x1={padL} y1={sy(1, 1)} x2={W - padR} y2={sy(1, 1)}
        stroke="rgb(16,185,129)" strokeOpacity={0.35} strokeDasharray="3 3" strokeWidth={1} />
      <text x={padL - 6} y={padT + 8} textAnchor="end" fontSize={10} fill="rgb(var(--color-accent))">CE 손실</text>
      <text x={W - padR + 6} y={padT + 8} fontSize={10} fill="rgb(16,185,129)">정확도</text>
      <text x={padL - 6} y={H - padB + 4} textAnchor="end" fontSize={10} fill="rgb(var(--color-muted))">0</text>
      <text x={W - padR + 6} y={H - padB + 4} fontSize={10} fill="rgb(var(--color-muted))">100%</text>
      <text x={W - padR} y={H - 6} textAnchor="end" fontSize={10} fill="rgb(var(--color-muted))">epoch</text>
      <path d={lossPath} fill="none" stroke="rgb(var(--color-accent))" strokeWidth={1.8} />
      <path d={accPath} fill="none" stroke="rgb(16,185,129)" strokeWidth={1.8} />
      {loss.length > 0 && (
        <circle cx={sx(loss.length - 1)} cy={sy(loss[loss.length - 1], lossMax)} r={2.5}
          fill="rgb(var(--color-accent))" />
      )}
      {acc.length > 0 && (
        <circle cx={sx(acc.length - 1)} cy={sy(acc[acc.length - 1], 1)} r={2.5}
          fill="rgb(16,185,129)" />
      )}
    </svg>
  );
}

/* ────────── 평가 그림 클릭 결과 카드 ────────── */
function PickedScoreCard({ sample, scores, labels }: {
  sample: DotSample;
  scores: { logits: number[]; probs: number[]; pred: number };
  labels: ShapeLabel[];
}) {
  const predLabel = labels[scores.pred];
  const correct = predLabel === sample.label;
  return (
    <div
      className="mt-3 rounded-md border px-3 py-2 text-[12px]"
      style={{
        borderColor: correct ? COLORS.green : COLORS.triangle,
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
          <div className="text-[11px] mt-0.5" style={{ color: correct ? COLORS.green : COLORS.triangle }}>
            {correct ? '맞혔어요.' : '틀렸어요 — 새 그림이 헷갈렸습니다.'}
          </div>
        </div>
      </div>

      {/* 출력 뉴런 N개 막대 */}
      <div className="mt-3 space-y-1.5">
        {labels.map((lbl, k) => {
          const isPred = scores.pred === k;
          const probPct = scores.probs[k] * 100;
          const color = colorOfLabel(lbl);
          return (
            <div key={lbl}>
              <div className="flex items-baseline justify-between text-[11px]">
                <span className={isPred ? 'font-semibold' : 'text-muted'} style={{ color: isPred ? color : undefined }}>
                  {SHAPE_LABEL_KO[lbl]}
                </span>
                <span className="font-mono">
                  z {scores.logits[k].toFixed(2)} · {probPct.toFixed(1)}%
                </span>
              </div>
              <div className="h-2.5 mt-0.5 bg-surface rounded-sm overflow-hidden border border-border">
                <div
                  style={{
                    width: `${probPct}%`,
                    background: color,
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

function BigStat({ label, value, color }: {
  label: string; value: number | null; color: string;
}) {
  return (
    <div className="rounded-md border border-border bg-bg p-2 text-center">
      <div className="text-[11px] text-muted">{label}</div>
      <div
        className="text-2xl font-semibold font-mono mt-0.5"
        style={{ color: value === null ? 'rgb(var(--color-muted))' : color }}
      >
        {value === null ? '—' : `${(value * 100).toFixed(1)}%`}
      </div>
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

/* ────────── 평가 단계용 가벼운 forward (logits/probs만) ────────── */
function forwardLite(m: MLP, x: Float32Array): { logits: Float32Array; probs: Float32Array } {
  let cur: Float32Array = x;
  for (let k = 0; k < m.weights.length; k++) {
    const a = m.layers[k], b = m.layers[k + 1];
    const w = m.weights[k];
    const bias = m.biases[k];
    const z = new Float32Array(b);
    for (let j = 0; j < b; j++) {
      let s = bias[j];
      for (let i = 0; i < a; i++) s += cur[i] * w[i * b + j];
      z[j] = s;
    }
    if (k < m.weights.length - 1) {
      const out = new Float32Array(b);
      for (let j = 0; j < b; j++) out[j] = z[j] > 0 ? z[j] : 0;
      cur = out;
    } else {
      let max = z[0];
      for (let j = 1; j < b; j++) if (z[j] > max) max = z[j];
      const probs = new Float32Array(b);
      let zsum = 0;
      for (let j = 0; j < b; j++) { probs[j] = Math.exp(z[j] - max); zsum += probs[j]; }
      for (let j = 0; j < b; j++) probs[j] /= zsum;
      return { logits: z, probs };
    }
  }
  throw new Error('forwardLite: empty network');
}
