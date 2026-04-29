// PhaseB4 — 이진 분류 모델 학습 (동그라미 vs 세모, 출력 뉴런 2개)
// train 데이터로 학습 진행 상황(손실·정확도)을 즉시 보여 주고, 학습 끝나면 store.setBinaryModel을 호출.
// "epoch = 학습 데이터를 한 번 다 본 횟수" — 매 epoch마다 가중치가 한 번 갱신된다는 직관.
import { useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '../store';
import {
  useDot, activeTrain, activeEval,
  trainLinearClassifier, evaluateAccuracy, classify,
  type BinaryModel,
} from '../dotStore';
import { type DotSample, type ShapeLabel, SHAPE_LABEL_KO } from '../data/dotShapes';
import { PHASES } from '../phases';

const TARGET_LABELS: [ShapeLabel, ShapeLabel] = ['circle', 'triangle'];
const STREAM_DELAY = 18; // ms — 곡선이 점진 갱신되는 느낌

export function PhaseB4() {
  const meta = PHASES.find((p) => p.id === 'b4')!;
  const markCompleted = useApp((s) => s.markCompleted);

  const samples = useDot((s) => s.samples);
  const removedIds = useDot((s) => s.removedIds);
  const trainIds = useDot((s) => s.trainIds);
  const evalIds = useDot((s) => s.evalIds);
  const setBinaryModel = useDot((s) => s.setBinaryModel);
  const persistedModel = useDot((s) => s.binaryModel);

  // 두 라벨만 추리기
  const trainAll = useMemo(
    () => activeTrain({ samples, removedIds, trainIds }),
    [samples, removedIds, trainIds],
  );
  const evalAll = useMemo(
    () => activeEval({ samples, removedIds, evalIds }),
    [samples, removedIds, evalIds],
  );
  const trainBin: DotSample[] = useMemo(
    () => trainAll.filter((s) => TARGET_LABELS.includes(s.label)),
    [trainAll],
  );
  const evalBin: DotSample[] = useMemo(
    () => evalAll.filter((s) => TARGET_LABELS.includes(s.label)),
    [evalAll],
  );

  // 컨트롤
  const [epochs, setEpochs] = useState(60);
  const [lr, setLr] = useState(0.1);

  // 학습 상태
  const [running, setRunning] = useState(false);
  const [streamIdx, setStreamIdx] = useState(0); // 0~epochs까지 progressively 노출
  const [lossHist, setLossHist] = useState<number[]>([]);
  const [accHist, setAccHist] = useState<number[]>([]);
  const [trainAcc, setTrainAcc] = useState<number | null>(null);
  const [evalAcc, setEvalAcc] = useState<number | null>(null);
  const [model, setModel] = useState<{ w: number[][]; b: number[] } | null>(null);

  // 검사용 — 평가 그림 클릭
  const [pickedId, setPickedId] = useState<string | null>(null);
  const picked = pickedId ? evalBin.find((s) => s.id === pickedId) ?? null : null;

  // 학습 시작 — 동기 학습 후 stream으로 점진 노출
  const stopRef = useRef(false);
  function startTraining() {
    if (running) return;
    setRunning(true);
    stopRef.current = false;
    setLossHist([]); setAccHist([]);
    setTrainAcc(null); setEvalAcc(null);
    setStreamIdx(0);
    setPickedId(null);

    // 무거운 계산은 마이크로태스크로 한 번 양보 — 버튼 눌림 반응이 즉시 보이도록
    queueMicrotask(() => {
      const result = trainLinearClassifier(trainBin, [...TARGET_LABELS], epochs, lr);
      setModel({ w: result.w, b: result.b });

      // 평가
      const trainEval = evaluateAccuracy(trainBin, [...TARGET_LABELS], result.w, result.b);
      const evalEval = evaluateAccuracy(evalBin, [...TARGET_LABELS], result.w, result.b);
      setTrainAcc(trainEval.accuracy);
      setEvalAcc(evalEval.accuracy);

      // store에 저장 — C1/C2가 사용
      const binModel: BinaryModel = {
        labels: [...TARGET_LABELS] as [ShapeLabel, ShapeLabel],
        w: result.w,
        b: result.b,
        trainedSteps: epochs,
        trainAccuracy: trainEval.accuracy,
        evalAccuracy: evalEval.accuracy,
      };
      setBinaryModel(binModel);

      // 점진 노출 — 곡선이 한 줄씩 그려지는 느낌
      let i = 0;
      const tick = () => {
        if (stopRef.current) { setRunning(false); return; }
        i += 1;
        setStreamIdx(i);
        setLossHist(result.lossHistory.slice(0, i));
        setAccHist(result.accuracyHistory.slice(0, i));
        if (i >= result.lossHistory.length) {
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

  function reset() {
    stopRef.current = true;
    setRunning(false);
    setStreamIdx(0);
    setLossHist([]); setAccHist([]);
    setTrainAcc(null); setEvalAcc(null);
    setModel(null);
    setBinaryModel(null);
    setPickedId(null);
  }

  // 완료 처리 — train ≥ 95% 또는 eval ≥ 80%
  const completedRef = useRef(false);
  useEffect(() => {
    if (completedRef.current) return;
    if ((trainAcc !== null && trainAcc >= 0.95) || (evalAcc !== null && evalAcc >= 0.8)) {
      completedRef.current = true;
      markCompleted('b4');
    }
  }, [trainAcc, evalAcc, markCompleted]);

  // unmount 시 stream 정지
  useEffect(() => () => { stopRef.current = true; }, []);

  // 검사용 — 클릭한 그림의 출력 뉴런 점수
  const pickedScores = useMemo(() => {
    if (!picked || !model) return null;
    const { logits, probs, pred } = classify(picked.pixels, model.w, model.b);
    return { logits, probs, pred };
  }, [picked, model]);

  return (
    <article>
      <div className="text-xs font-mono text-muted">PHASE {meta.num}</div>
      <h1>{meta.title}</h1>
      <p className="text-muted mt-2 text-sm">{meta.subtitle}</p>

      <p className="mt-4 text-[15px] leading-relaxed">
        라벨 후보가 <strong>동그라미</strong>·<strong>세모</strong> 두 개라서 출력 뉴런도 2개예요.
        한 그림이 들어오면 두 뉴런이 각각 점수를 내고, 점수가 큰 쪽이 모델의 답이 됩니다.
        학습은 학습용 그림으로만 진행하고, 평가용은 끝난 뒤에만 꺼내 봐요.
      </p>

      {/* ── 메인 한 viewport ── */}
      <div className="mt-5 grid lg:grid-cols-[1.6fr_1fr] gap-4 items-start">
        {/* 좌측 — 학습 진행 시각화 */}
        <div className="space-y-3">
          <div className="card p-3">
            <div className="flex items-baseline justify-between flex-wrap gap-2">
              <div className="text-sm font-medium">학습 진행</div>
              <div className="text-[11px] font-mono text-muted">
                epoch <span className="text-accent font-semibold">{streamIdx}</span> / {epochs}
              </div>
            </div>
            <TrainingChart loss={lossHist} acc={accHist} totalEpochs={epochs} />
          </div>

          {/* 평가 그림 클릭 → 출력 뉴런 점수 */}
          <div className="card p-3">
            <div className="flex items-baseline justify-between flex-wrap gap-2">
              <div>
                <div className="text-sm font-medium">새 그림 시험해 보기</div>
                <div className="text-[11px] text-muted">평가용 그림을 클릭하면 출력 뉴런 2개의 점수가 나타나요.</div>
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
            </div>

            {picked && pickedScores && (
              <PickedScoreCard sample={picked} scores={pickedScores} />
            )}
            {!model && (
              <div className="mt-2 text-[11px] text-muted">먼저 오른쪽에서 학습을 시작하면 점수가 채워져요.</div>
            )}
          </div>
        </div>

        {/* 우측 — 학습 컨트롤 + 결과 + 출력 뉴런 */}
        <div className="space-y-3">
          <div className="card p-3 space-y-3">
            <div className="text-sm font-medium">학습 컨트롤</div>

            <div>
              <div className="flex items-baseline justify-between text-[12px] font-mono">
                <span className="text-muted">epoch</span>
                <span className="text-accent font-semibold">{epochs}</span>
              </div>
              <input
                type="range" min={10} max={200} step={10}
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
                <button onClick={startTraining} className="btn-primary" disabled={trainBin.length === 0}>
                  ▶ 학습 시작
                </button>
              ) : (
                <button onClick={stopTraining} className="btn-ghost">⏸ 학습 멈춤</button>
              )}
              <button onClick={reset} className="btn-ghost" disabled={running}>초기화</button>
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
                color="rgb(var(--color-accent))"
                hint={`${trainBin.length}장`}
              />
              <BigStat
                label="평가용"
                value={evalAcc}
                color="rgb(190,18,60)"
                hint={`${evalBin.length}장`}
              />
            </div>
            {persistedModel && trainAcc === null && (
              <div className="mt-2 text-[11px] text-muted">
                이전에 저장된 모델이 있어요 — 학습 시작을 누르면 새로 학습합니다.
              </div>
            )}
          </div>

          {/* 출력 뉴런 2개 — 마지막으로 클릭한 그림(없으면 평가 첫 장) 점수 */}
          <OutputNeuronCard sample={picked ?? evalBin[0] ?? null} model={model} />
        </div>
      </div>

      {/* 하단 — epoch 한 줄 직관 */}
      <div className="aside-tip mt-4 text-[14px] leading-relaxed">
        <strong>epoch</strong> = 학습 데이터를 한 번 다 본 횟수. 매 epoch마다 가중치가 한 번 갱신돼요.
      </div>
    </article>
  );
}

/* ────────── 학습 곡선 (loss + accuracy) ────────── */
function TrainingChart({ loss, acc, totalEpochs }: { loss: number[]; acc: number[]; totalEpochs: number }) {
  const W = 720, H = 220, padL = 40, padR = 44, padT = 12, padB = 26;
  const N = Math.max(loss.length, acc.length);
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
      {/* 축 */}
      <line x1={padL} y1={H - padB} x2={W - padR} y2={H - padB} stroke="rgb(var(--color-border))" />
      <line x1={padL} y1={padT} x2={padL} y2={H - padB} stroke="rgb(var(--color-border))" />
      <line x1={W - padR} y1={padT} x2={W - padR} y2={H - padB} stroke="rgb(var(--color-border))" />

      {/* 정확도 100% 기준선 (위), 0 기준선 — 부드러운 안내 */}
      <line x1={padL} y1={sy(1, 1)} x2={W - padR} y2={sy(1, 1)}
        stroke="rgb(16,185,129)" strokeOpacity={0.35} strokeDasharray="3 3" strokeWidth={1} />

      {/* 라벨 */}
      <text x={padL - 6} y={padT + 8} textAnchor="end" fontSize={10} fill="rgb(var(--color-accent))">손실</text>
      <text x={W - padR + 6} y={padT + 8} fontSize={10} fill="rgb(16,185,129)">정확도</text>
      <text x={padL - 6} y={H - padB + 4} textAnchor="end" fontSize={10} fill="rgb(var(--color-muted))">0</text>
      <text x={W - padR + 6} y={H - padB + 4} fontSize={10} fill="rgb(var(--color-muted))">100%</text>
      <text x={W - padR} y={H - 6} textAnchor="end" fontSize={10} fill="rgb(var(--color-muted))">epoch</text>

      {/* loss path (왼쪽 축) */}
      <path d={lossPath} fill="none" stroke="rgb(var(--color-accent))" strokeWidth={1.8} />
      {/* accuracy path (오른쪽 축) */}
      <path d={accPath} fill="none" stroke="rgb(16,185,129)" strokeWidth={1.8} />

      {/* 마지막 점 */}
      {N > 0 && loss.length > 0 && (
        <circle cx={sx(loss.length - 1)} cy={sy(loss[loss.length - 1], lossMax)} r={2.5}
          fill="rgb(var(--color-accent))" />
      )}
      {N > 0 && acc.length > 0 && (
        <circle cx={sx(acc.length - 1)} cy={sy(acc[acc.length - 1], 1)} r={2.5}
          fill="rgb(16,185,129)" />
      )}
    </svg>
  );
}

/* ────────── 출력 뉴런 2개 — 막대 시각화 ────────── */
function OutputNeuronCard({ sample, model }: {
  sample: DotSample | null;
  model: { w: number[][]; b: number[] } | null;
}) {
  const scores = useMemo(() => {
    if (!sample || !model) return null;
    return classify(sample.pixels, model.w, model.b);
  }, [sample, model]);

  return (
    <div className="card p-3">
      <div className="text-sm font-medium">출력 뉴런 2개</div>
      <p className="text-[11px] text-muted mt-1">
        라벨 후보마다 점수 뉴런 하나. 점수가 큰 쪽이 모델의 답이에요.
      </p>
      {!sample || !model || !scores ? (
        <div className="mt-2 text-[12px] text-muted">학습 후 그림을 클릭하면 두 뉴런 점수가 표시됩니다.</div>
      ) : (
        <div className="mt-3 space-y-2">
          {TARGET_LABELS.map((lbl, k) => {
            const isPred = scores.pred === k;
            const probPct = scores.probs[k] * 100;
            return (
              <div key={lbl}>
                <div className="flex items-baseline justify-between text-[12px]">
                  <span className={isPred ? 'font-semibold' : 'text-muted'}>
                    {SHAPE_LABEL_KO[lbl]}
                  </span>
                  <span className="font-mono text-[11px]">
                    점수 {scores.logits[k].toFixed(2)} · {probPct.toFixed(1)}%
                  </span>
                </div>
                <div className="h-3 mt-1 bg-surface rounded-sm overflow-hidden border border-border">
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
      )}
    </div>
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
      className="mt-3 rounded-md border px-3 py-2 text-[12px] flex items-center gap-3"
      style={{
        borderColor: correct ? 'rgb(16,185,129)' : 'rgb(190,18,60)',
        background: correct ? 'rgba(16,185,129,0.06)' : 'rgba(190,18,60,0.06)',
      }}
    >
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
