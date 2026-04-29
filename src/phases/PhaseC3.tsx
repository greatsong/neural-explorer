// PhaseC3 — 모델 복잡도 + 역전파
// 작은 모델: 입력 1 · 은닉 1 · 출력 1 (가장 단순한 2층 망).
// 5점 데이터 (1,3)…(5,11) — A5와 같은 데이터, 정답 ŷ = 2x + 1.
// 학생이 "다음 단계 →"를 눌러 가며 6단계(예측 → 오차 → 출력층 기울기 → 은닉층 신호 → 은닉층 기울기 → 갱신)를
// 한 번씩 직접 보고, 마지막 단계(갱신)에서만 실제 가중치가 움직인다.
// 다이어그램 라벨은 노드 위/아래로 분리해 겹침 없음. 식 카드는 5점 모두를 *표*로 보여 손계산 검산 가능.

import { useEffect, useRef, useState } from 'react';
import { PHASES } from '../phases';
import { useApp } from '../store';

/* ──────── 모델·데이터 ──────── */
interface Weights { w1: number; b1: number; w2: number; b2: number }
const INIT: Weights = { w1: 0.5, b1: 0.1, w2: 1.5, b2: 0.0 };
const DATA: { x: number; y: number }[] = [
  { x: 1, y: 3 },
  { x: 2, y: 5 },
  { x: 3, y: 7 },
  { x: 4, y: 9 },
  { x: 5, y: 11 },
];
const LR = 0.05;

const relu = (z: number) => (z > 0 ? z : 0);
const reluD = (z: number) => (z > 0 ? 1 : 0);

interface RowDetail {
  x: number; y: number;
  z1: number; h: number; z2: number; yhat: number;
  e: number;
  eh: number;
  eDotH: number;     // dw₂에 들어가는 한 점 기여 (e·h)
  ehDotX: number;    // dw₁에 들어가는 한 점 기여 (e_h·x)
}

function compute(W: Weights, x: number, y: number): RowDetail {
  const z1 = W.w1 * x + W.b1;
  const h = relu(z1);
  const z2 = W.w2 * h + W.b2;
  const yhat = z2;             // 출력층은 linear (회귀)
  const e = yhat - y;           // MSE 미분의 부호 단순화 — A4·A5와 같은 정의
  const eh = e * W.w2 * reluD(z1);
  return { x, y, z1, h, z2, yhat, e, eh, eDotH: e * h, ehDotX: eh * x };
}

interface Aggregate {
  rows: RowDetail[];
  loss: number;
  meanE: number;
  dw2: number; db2: number;
  meanEh: number;
  dw1: number; db1: number;
}
function aggregate(W: Weights): Aggregate {
  const rows = DATA.map((d) => compute(W, d.x, d.y));
  const N = rows.length;
  let lossSum = 0, sumE = 0, sumEH = 0, sumEh = 0, sumEhX = 0;
  for (const r of rows) {
    lossSum += 0.5 * r.e * r.e;
    sumE += r.e;
    sumEH += r.eDotH;
    sumEh += r.eh;
    sumEhX += r.ehDotX;
  }
  return {
    rows,
    loss: lossSum / N,
    meanE: sumE / N,
    dw2: sumEH / N,
    db2: sumE / N,
    meanEh: sumEh / N,
    dw1: sumEhX / N,
    db1: sumEh / N,
  };
}

function applyStep(W: Weights, agg: Aggregate): Weights {
  return {
    w1: W.w1 - LR * agg.dw1,
    b1: W.b1 - LR * agg.db1,
    w2: W.w2 - LR * agg.dw2,
    b2: W.b2 - LR * agg.db2,
  };
}

/* ──────── 6단계 정의 ──────── */
type StageId = 'predict' | 'error' | 'outputGrad' | 'hiddenSignal' | 'hiddenGrad' | 'update';
const STAGES: { id: StageId; num: number; label: string; sub: string }[] = [
  { id: 'predict',      num: 1, label: '예측',          sub: 'x → z₁ → h → z₂ → ŷ' },
  { id: 'error',        num: 2, label: '오차',          sub: 'e = ŷ − y' },
  { id: 'outputGrad',   num: 3, label: '출력층 기울기', sub: 'dw₂ = 평균(e·h),  db₂ = 평균(e)' },
  { id: 'hiddenSignal', num: 4, label: '은닉층 신호',   sub: 'e_h = e · w₂ · ReLU′(z₁)  ← 역전파 핵심' },
  { id: 'hiddenGrad',   num: 5, label: '은닉층 기울기', sub: 'dw₁ = 평균(e_h·x),  db₁ = 평균(e_h)' },
  { id: 'update',       num: 6, label: '갱신',          sub: 'w ← w − η·dw,  b ← b − η·db' },
];

/* ════════════════════════════════════════════════════════════
   PhaseC3 — 단일 페이지(트랙 분리 없음)
══════════════════════════════════════════════════════════════ */
export function PhaseC3() {
  const meta = PHASES.find((p) => p.id === 'c3')!;
  const markCompleted = useApp((s) => s.markCompleted);

  const [W, setW] = useState<Weights>(INIT);
  const [stageIdx, setStageIdx] = useState(0);   // 0~5
  const [stepCount, setStepCount] = useState(0);
  const [history, setHistory] = useState<number[]>([aggregate(INIT).loss]);
  const [auto, setAuto] = useState(false);
  const [showFormula, setShowFormula] = useState(true);

  const agg = aggregate(W);

  // ref로 자동 학습 안에서 최신 W 읽기
  const wRef = useRef(W);
  useEffect(() => { wRef.current = W; }, [W]);

  // 다음 단계 → — 한 칸씩 진행. update 단계로 들어갈 때만 가중치 갱신.
  const advance = () => {
    const cur = stageIdx;
    const next = (cur + 1) % STAGES.length;
    if (cur === STAGES.length - 1) {
      // update → predict 다음 step. 갱신은 이미 이전 단계 진입에서 일어났음.
      setStageIdx(0);
      return;
    }
    if (cur === STAGES.length - 2) {
      // 5단계(은닉층 기울기) → 6단계(갱신) 진입 — 실제 갱신
      const next_W = applyStep(W, agg);
      setW(next_W);
      const newLoss = aggregate(next_W).loss;
      setHistory((h) => [...h, newLoss]);
      setStepCount((s) => s + 1);
    }
    setStageIdx(next);
  };

  // 자동 학습 — 한 step씩 빠르게
  useEffect(() => {
    if (!auto) return;
    const id = setInterval(() => {
      const cur = wRef.current;
      const a = aggregate(cur);
      const nw = applyStep(cur, a);
      setW(nw);
      setHistory((h) => [...h, aggregate(nw).loss]);
      setStepCount((s) => s + 1);
      setStageIdx(0); // 자동 모드에서는 단계 표시는 의미 없음
    }, 180);
    return () => clearInterval(id);
  }, [auto]);

  // 완료 — 한 step 진행 1회 + 자동 학습 또는 손실 0.05 이하
  const completedRef = useRef(false);
  useEffect(() => {
    if (completedRef.current) return;
    if (stepCount >= 1 && agg.loss < 0.05) {
      completedRef.current = true;
      markCompleted('c3');
    } else if (stepCount >= 30) {
      // 충분히 진행했으면 완료
      completedRef.current = true;
      markCompleted('c3');
    }
  }, [stepCount, agg.loss, markCompleted]);

  const reset = () => {
    setW(INIT);
    setStageIdx(0);
    setStepCount(0);
    setHistory([aggregate(INIT).loss]);
    setAuto(false);
    completedRef.current = false;
  };

  const currentStage = STAGES[stageIdx];

  return (
    <article>
      <div className="text-xs font-mono text-muted">PHASE {meta.num}</div>
      <h1>{meta.title}</h1>
      <p className="text-muted mt-2 text-sm leading-relaxed">
        가장 단순한 *2층 망*(입력 1 · 은닉 1 · 출력 1)으로 한 step의 6단계를 직접 따라가요.
        <strong> 다음 단계 →</strong> 버튼을 한 번씩 누르며 *예측 → 오차 → 출력층 기울기 → 은닉층 신호 → 은닉층 기울기 → 갱신*이
        어떤 숫자로 이어지는지 보세요. <strong>은닉층 신호</strong> 단계가 역전파의 핵심입니다.
      </p>

      {/* 모드 토글 */}
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <span className="text-sm text-muted">표시:</span>
        <div className="inline-flex rounded-md border border-border overflow-hidden">
          <button
            onClick={() => setShowFormula(false)}
            className={`px-3 py-1.5 text-sm transition ${!showFormula ? 'bg-accent text-white' : 'bg-bg text-muted hover:bg-surface'}`}
          >직관</button>
          <button
            onClick={() => setShowFormula(true)}
            className={`px-3 py-1.5 text-sm transition ${showFormula ? 'bg-accent text-white' : 'bg-bg text-muted hover:bg-surface'}`}
          >식·표</button>
        </div>
        <span className="text-xs text-muted">η = {LR}</span>
      </div>

      {/* 메인 — 좌(다이어그램+곡선) / 우(컨트롤+식 카드) */}
      <div className="mt-4 grid lg:grid-cols-[1.4fr_1fr] gap-4 items-start">
        {/* 좌측 */}
        <div className="space-y-3">
          <Diagram W={W} agg={agg} stage={currentStage.id} />
          <LossCurve history={history} />
        </div>

        {/* 우측 — 컨트롤 + 식 카드 */}
        <div className="space-y-3">
          {/* 컨트롤 */}
          <div className="card p-3 space-y-2">
            <div className="grid grid-cols-3 gap-2 text-center font-mono text-xs">
              <Stat label="step" value={stepCount.toString()} />
              <Stat label="손실" value={agg.loss.toFixed(3)} highlight={agg.loss < 0.05} />
              <Stat label="다음" value={`${currentStage.num}/6`} accent />
            </div>
            <div className="text-[11px] text-muted">
              다음 단계: <strong className="text-accent">{currentStage.num}. {currentStage.label}</strong>
              <span className="ml-1 text-muted">— {currentStage.sub}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={advance} disabled={auto} className="btn-primary">
                다음 단계 →
              </button>
              <button onClick={() => setAuto((v) => !v)} className="btn-ghost">
                {auto ? '⏸ 자동 멈춤' : '▶ 자동 학습'}
              </button>
              <button onClick={reset} className="btn-ghost">초기화</button>
            </div>
            <div className="text-[10px] text-muted leading-snug">
              ※ <strong>5 → 6단계</strong>(은닉층 기울기 → 갱신)로 넘어갈 때만 실제 가중치가 움직여요. 다른 단계는 *그 시점의 값*만 보여 줍니다.
            </div>
          </div>

          {/* 식 카드 또는 직관 카드 */}
          {showFormula ? (
            <FormulaCard W={W} agg={agg} stage={currentStage.id} />
          ) : (
            <IntuitionCard stage={currentStage.id} />
          )}
        </div>
      </div>

      {/* 하단 — 역전파 박스 (PLAN ## 10-1 #6 본문 그대로) */}
      <div
        className="mt-4 rounded-md border px-4 py-3 text-sm leading-relaxed"
        style={{
          borderColor: 'rgb(190,18,60)',
          backgroundColor: 'rgba(190,18,60,0.05)',
        }}
      >
        <div className="text-[12px] font-mono mb-1" style={{ color: 'rgb(190,18,60)' }}>
          역전파 (backpropagation)
        </div>
        <p className="mb-2">
          은닉층이 생기면 가중치가 여러 층에 흩어져 있어, 어느 가중치를 얼마나 고쳐야 할지 한눈에 알기 어려워요.
        </p>
        <p className="mb-2">
          출력층의 오차는 <strong>A4에서 본 그대로</strong> (예측 − 정답)예요. 은닉층은 자기 정답이 없지만,
          {' '}<em>바로 뒷층의 오차</em>를 받아 자기 몫으로 나눠 가집니다 — 그래서 화살이 <strong>거꾸로</strong> 흘러요.
          이 거꾸로 흐름이 <strong>역전파(backpropagation)</strong> 예요.
        </p>
        <p>
          각 가중치는 A4에서 본 <code>dw = 평균(e·x)</code> 모양의 식을 자기 층 입력 x로 똑같이 써서 갱신돼요.
          {' '}<strong>A5에서 본 한 step의 갱신식이 모든 층에 동시에 적용</strong>된다고 보면 됩니다.
        </p>
      </div>
    </article>
  );
}

/* ════════════════════════════════════════════════════════════
   다이어그램 — 입력 1 · 은닉 1 · 출력 1
   라벨 위치를 노드 위/아래로 분리 → 절대 겹치지 않음.
══════════════════════════════════════════════════════════════ */
function Diagram({ W, agg, stage }: { W: Weights; agg: Aggregate; stage: StageId }) {
  // 대표 점 (학생이 한 점의 흐름을 따라가기 쉽게) — x = 3
  const sample = agg.rows[2];
  const W_SVG = 720, H_SVG = 320;
  const cy = 130;
  const xCx = 60, z1Cx = 220, hCx = 360, z2Cx = 500, yhCx = 640;

  const fwdActive = stage === 'predict';
  const errActive = stage === 'error';
  const outActive = stage === 'outputGrad';
  const hsigActive = stage === 'hiddenSignal';
  const hgActive = stage === 'hiddenGrad';
  const updActive = stage === 'update';

  // 활성도 — 단계별 투명도
  const opPredict = fwdActive ? 1 : (stage === 'error' ? 0.85 : 0.45);
  const opError = errActive || outActive || hsigActive || hgActive ? 1 : 0.35;
  const opOutGrad = outActive || updActive ? 1 : 0.25;
  const opHSig = hsigActive || hgActive ? 1 : 0.25;
  const opHGrad = hgActive || updActive ? 1 : 0.25;

  const FWD = 'rgb(var(--color-accent))';
  const BACK = 'rgb(190, 18, 60)';
  const MUTED = 'rgb(140,140,140)';

  return (
    <div className="card p-3">
      <div className="flex items-baseline justify-between mb-1">
        <div className="text-sm font-medium">2층 망 — 대표 점 x = 3 (정답 y = 7)</div>
        <div className="text-[11px] font-mono text-muted">
          <span style={{ color: FWD }}>● 순전파</span>
          <span className="ml-3" style={{ color: BACK }}>● 역전파</span>
        </div>
      </div>
      <svg viewBox={`0 0 ${W_SVG} ${H_SVG}`} className="w-full">
        <defs>
          <marker id="c3-arr" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 z" fill={FWD} />
          </marker>
          <marker id="c3-back" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 z" fill={BACK} />
          </marker>
        </defs>

        {/* 순전파 엣지 + 가중치 라벨 (위쪽) */}
        {/* x → z₁ */}
        <line x1={xCx + 22} y1={cy} x2={z1Cx - 28} y2={cy}
              stroke={FWD} strokeWidth={2} strokeOpacity={opPredict} markerEnd="url(#c3-arr)" />
        {/* w₁ 라벨 (엣지 위) */}
        <text x={(xCx + z1Cx) / 2} y={cy - 18} textAnchor="middle"
              fontSize={12} fontFamily="JetBrains Mono" fill={FWD} opacity={opPredict}>
          × w₁ = {W.w1.toFixed(2)}
        </text>
        {/* b₁ 라벨 (z₁ 위쪽 ↓ 화살표) */}
        <text x={z1Cx} y={cy - 50} textAnchor="middle"
              fontSize={11} fontFamily="JetBrains Mono" fill={FWD} opacity={opPredict}>
          + b₁ = {W.b1.toFixed(2)}
        </text>
        <line x1={z1Cx} y1={cy - 38} x2={z1Cx} y2={cy - 22}
              stroke={FWD} strokeWidth={1.4} strokeOpacity={opPredict} />

        {/* z₁ 노드 */}
        <circle cx={z1Cx} cy={cy} r={22} fill="white" stroke={FWD} strokeWidth={2} opacity={opPredict} />
        <text x={z1Cx} y={cy + 4} textAnchor="middle" fontSize={11} fontFamily="JetBrains Mono"
              fill={FWD} fontWeight={600} opacity={opPredict}>z₁</text>
        {/* z₁ 값 (노드 아래) */}
        <text x={z1Cx} y={cy + 42} textAnchor="middle" fontSize={11} fontFamily="JetBrains Mono"
              fill={FWD} opacity={opPredict}>= {sample.z1.toFixed(2)}</text>

        {/* z₁ → h (ReLU) */}
        <line x1={z1Cx + 22} y1={cy} x2={hCx - 28} y2={cy}
              stroke={FWD} strokeWidth={2} strokeOpacity={opPredict} markerEnd="url(#c3-arr)" />
        <text x={(z1Cx + hCx) / 2} y={cy - 18} textAnchor="middle"
              fontSize={12} fontFamily="JetBrains Mono" fill={FWD} opacity={opPredict}>
          ReLU
        </text>

        {/* h 노드 */}
        <circle cx={hCx} cy={cy} r={22} fill="white" stroke={FWD} strokeWidth={2} opacity={opPredict} />
        <text x={hCx} y={cy + 4} textAnchor="middle" fontSize={12} fontFamily="JetBrains Mono"
              fill={FWD} fontWeight={600} opacity={opPredict}>h</text>
        <text x={hCx} y={cy + 42} textAnchor="middle" fontSize={11} fontFamily="JetBrains Mono"
              fill={FWD} opacity={opPredict}>= {sample.h.toFixed(2)}</text>

        {/* h → z₂ */}
        <line x1={hCx + 22} y1={cy} x2={z2Cx - 28} y2={cy}
              stroke={FWD} strokeWidth={2} strokeOpacity={opPredict} markerEnd="url(#c3-arr)" />
        <text x={(hCx + z2Cx) / 2} y={cy - 18} textAnchor="middle"
              fontSize={12} fontFamily="JetBrains Mono" fill={FWD} opacity={opPredict}>
          × w₂ = {W.w2.toFixed(2)}
        </text>
        <text x={z2Cx} y={cy - 50} textAnchor="middle"
              fontSize={11} fontFamily="JetBrains Mono" fill={FWD} opacity={opPredict}>
          + b₂ = {W.b2.toFixed(2)}
        </text>
        <line x1={z2Cx} y1={cy - 38} x2={z2Cx} y2={cy - 22}
              stroke={FWD} strokeWidth={1.4} strokeOpacity={opPredict} />

        {/* z₂ 노드 */}
        <circle cx={z2Cx} cy={cy} r={22} fill="white" stroke={FWD} strokeWidth={2} opacity={opPredict} />
        <text x={z2Cx} y={cy + 4} textAnchor="middle" fontSize={11} fontFamily="JetBrains Mono"
              fill={FWD} fontWeight={600} opacity={opPredict}>z₂</text>
        <text x={z2Cx} y={cy + 42} textAnchor="middle" fontSize={11} fontFamily="JetBrains Mono"
              fill={FWD} opacity={opPredict}>= {sample.z2.toFixed(2)}</text>

        {/* z₂ → ŷ */}
        <line x1={z2Cx + 22} y1={cy} x2={yhCx - 28} y2={cy}
              stroke={FWD} strokeWidth={2} strokeOpacity={opPredict} markerEnd="url(#c3-arr)" />

        {/* x 노드 */}
        <circle cx={xCx} cy={cy} r={22} fill="white" stroke={MUTED} strokeWidth={2} />
        <text x={xCx} y={cy + 4} textAnchor="middle" fontSize={12} fontFamily="JetBrains Mono"
              fill="rgb(var(--color-text))" fontWeight={600}>x</text>
        <text x={xCx} y={cy + 42} textAnchor="middle" fontSize={11} fontFamily="JetBrains Mono"
              fill="rgb(var(--color-muted))">= {sample.x}</text>

        {/* ŷ 노드 (대표 점) */}
        <circle cx={yhCx} cy={cy} r={24} fill="rgb(var(--color-accent-bg))" stroke={FWD} strokeWidth={2.5} opacity={opPredict} />
        <text x={yhCx} y={cy + 4} textAnchor="middle" fontSize={12} fontFamily="JetBrains Mono"
              fill={FWD} fontWeight={700} opacity={opPredict}>ŷ</text>
        <text x={yhCx} y={cy + 44} textAnchor="middle" fontSize={11} fontFamily="JetBrains Mono"
              fill={FWD} opacity={opPredict}>= {sample.yhat.toFixed(2)}</text>

        {/* 정답 y (ŷ 옆 회색) */}
        <text x={yhCx} y={cy - 38} textAnchor="middle" fontSize={11} fontFamily="JetBrains Mono"
              fill={MUTED}>정답 y = {sample.y}</text>

        {/* ── 역전파 라벨 (엣지 *아래쪽* — 절대 겹침 없음) ── */}
        {/* 출력층 dw₂ = 평균(e·h)  — h → z₂ 엣지 아래 */}
        <text x={(hCx + z2Cx) / 2} y={cy + 75} textAnchor="middle"
              fontSize={12} fontFamily="JetBrains Mono" fill={BACK} opacity={opOutGrad} fontWeight={600}>
          dw₂ = {agg.dw2.toFixed(3)}
        </text>
        <text x={(hCx + z2Cx) / 2} y={cy + 90} textAnchor="middle"
              fontSize={10} fontFamily="JetBrains Mono" fill={BACK} opacity={opOutGrad}>
          = 평균(e·h)
        </text>
        {/* 점선 화살표 (z₂ → h 거꾸로) */}
        <line x1={z2Cx - 24} y1={cy + 26} x2={hCx + 24} y2={cy + 26}
              stroke={BACK} strokeWidth={1.5} strokeDasharray="4 3" opacity={opOutGrad}
              markerEnd="url(#c3-back)" />

        {/* 은닉층 신호 e_h — h ← z₂ */}
        <text x={hCx} y={cy + 75} textAnchor="middle"
              fontSize={11} fontFamily="JetBrains Mono" fill={BACK} opacity={opHSig} fontWeight={600}>
          e_h(h₃) = {sample.eh.toFixed(2)}
        </text>
        <text x={hCx} y={cy + 90} textAnchor="middle"
              fontSize={9} fontFamily="JetBrains Mono" fill={BACK} opacity={opHSig}>
          = e · w₂ · ReLU′(z₁)
        </text>

        {/* 은닉층 dw₁ = 평균(e_h·x) — x → z₁ 엣지 아래 */}
        <text x={(xCx + z1Cx) / 2} y={cy + 75} textAnchor="middle"
              fontSize={12} fontFamily="JetBrains Mono" fill={BACK} opacity={opHGrad} fontWeight={600}>
          dw₁ = {agg.dw1.toFixed(3)}
        </text>
        <text x={(xCx + z1Cx) / 2} y={cy + 90} textAnchor="middle"
              fontSize={10} fontFamily="JetBrains Mono" fill={BACK} opacity={opHGrad}>
          = 평균(e_h·x)
        </text>
        <line x1={z1Cx - 24} y1={cy + 26} x2={xCx + 24} y2={cy + 26}
              stroke={BACK} strokeWidth={1.5} strokeDasharray="4 3" opacity={opHGrad}
              markerEnd="url(#c3-back)" />

        {/* 오차 e — ŷ 아래 */}
        <text x={yhCx} y={cy + 80} textAnchor="middle"
              fontSize={12} fontFamily="JetBrains Mono" fill={BACK} opacity={opError} fontWeight={600}>
          e = {sample.e.toFixed(2)}
        </text>
        <text x={yhCx} y={cy + 95} textAnchor="middle"
              fontSize={10} fontFamily="JetBrains Mono" fill={BACK} opacity={opError}>
          = ŷ − y
        </text>

        {/* 갱신 단계 — 모든 가중치 새 값 (윗쪽에 작게) */}
        {updActive && (
          <g>
            <text x={(xCx + z1Cx) / 2} y={cy - 60} textAnchor="middle"
                  fontSize={10} fontFamily="JetBrains Mono" fill={FWD} fontWeight={700}>
              w₁ → {(W.w1 - LR * agg.dw1).toFixed(3)}
            </text>
            <text x={(hCx + z2Cx) / 2} y={cy - 60} textAnchor="middle"
                  fontSize={10} fontFamily="JetBrains Mono" fill={FWD} fontWeight={700}>
              w₂ → {(W.w2 - LR * agg.dw2).toFixed(3)}
            </text>
          </g>
        )}
      </svg>
      <div className="text-[11px] text-muted px-1 mt-1 leading-snug">
        라벨 위치: <span style={{ color: FWD }}>가중치(w)·편향(b)</span>은 노드 위쪽,{' '}
        <span style={{ color: BACK }}>역전파 값(dw·e_h·e)</span>은 노드 아래쪽 — 겹침 없음.
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   식·표 카드 — 5점 모두를 표로 보여 *손계산 검산 가능*
══════════════════════════════════════════════════════════════ */
function FormulaCard({ W, agg, stage }: { W: Weights; agg: Aggregate; stage: StageId }) {
  return (
    <div className="card p-3 space-y-2 text-sm">
      <div className="font-medium">5점 표 — 단계마다 새 칸이 채워져요</div>
      <div className="text-[11px] text-muted leading-snug">
        대표 점 x = 3은 다이어그램. 여기는 *모든 5점*의 값. 갱신은 평균을 사용합니다.
      </div>

      {/* 표 */}
      <table className="w-full text-[11px] font-mono">
        <thead className="text-muted">
          <tr className="border-b border-border">
            <th className="text-left py-1">x</th>
            <th>y</th>
            <th>z₁</th>
            <th>h</th>
            <th>ŷ</th>
            <Conditional show={stage !== 'predict'}><th style={{ color: 'rgb(190,18,60)' }}>e</th></Conditional>
            <Conditional show={stage === 'outputGrad' || stage === 'update'}><th>e·h</th></Conditional>
            <Conditional show={stage === 'hiddenSignal' || stage === 'hiddenGrad' || stage === 'update'}>
              <th style={{ color: 'rgb(190,18,60)' }}>e_h</th>
            </Conditional>
            <Conditional show={stage === 'hiddenGrad' || stage === 'update'}><th>e_h·x</th></Conditional>
          </tr>
        </thead>
        <tbody>
          {agg.rows.map((r) => (
            <tr key={r.x} className="border-b border-border/40">
              <td className="py-0.5">{r.x}</td>
              <td className="text-center">{r.y}</td>
              <td className="text-center">{r.z1.toFixed(2)}</td>
              <td className="text-center">{r.h.toFixed(2)}</td>
              <td className="text-center text-accent">{r.yhat.toFixed(2)}</td>
              <Conditional show={stage !== 'predict'}>
                <td className="text-center" style={{ color: 'rgb(190,18,60)' }}>{r.e.toFixed(2)}</td>
              </Conditional>
              <Conditional show={stage === 'outputGrad' || stage === 'update'}>
                <td className="text-center">{r.eDotH.toFixed(2)}</td>
              </Conditional>
              <Conditional show={stage === 'hiddenSignal' || stage === 'hiddenGrad' || stage === 'update'}>
                <td className="text-center" style={{ color: 'rgb(190,18,60)' }}>{r.eh.toFixed(2)}</td>
              </Conditional>
              <Conditional show={stage === 'hiddenGrad' || stage === 'update'}>
                <td className="text-center">{r.ehDotX.toFixed(2)}</td>
              </Conditional>
            </tr>
          ))}
          {/* 평균 행 — 단계 3부터 */}
          {(stage === 'outputGrad' || stage === 'hiddenSignal' || stage === 'hiddenGrad' || stage === 'update') && (
            <tr className="bg-surface/40 text-[10px] text-muted">
              <td className="py-0.5 text-right pr-2" colSpan={5}>합 ÷ 5 →</td>
              <td className="text-center" style={{ color: 'rgb(190,18,60)', fontWeight: 600 }}>
                평균 e<br />{agg.meanE.toFixed(3)}
              </td>
              {(stage === 'outputGrad' || stage === 'update') && (
                <td className="text-center" style={{ fontWeight: 600 }}>
                  dw₂<br />{agg.dw2.toFixed(3)}
                </td>
              )}
              {(stage === 'hiddenSignal' || stage === 'hiddenGrad' || stage === 'update') && (
                <td className="text-center" style={{ color: 'rgb(190,18,60)', fontWeight: 600 }}>
                  평균 e_h<br />{agg.meanEh.toFixed(3)}
                </td>
              )}
              {(stage === 'hiddenGrad' || stage === 'update') && (
                <td className="text-center" style={{ fontWeight: 600 }}>
                  dw₁<br />{agg.dw1.toFixed(3)}
                </td>
              )}
            </tr>
          )}
        </tbody>
      </table>

      {/* 단계별 핵심 식 강조 */}
      <div className="rounded-md border border-accent/40 bg-accent-bg/30 px-3 py-2 text-[12px] font-mono leading-relaxed">
        {stage === 'predict' && (
          <>
            <div>z₁ = w₁·x + b₁ &nbsp; h = ReLU(z₁)</div>
            <div>z₂ = w₂·h + b₂ &nbsp; ŷ = z₂</div>
          </>
        )}
        {stage === 'error' && (
          <div>e = ŷ − y &nbsp; <span className="text-muted">(점마다 다름. 평균 ē = {agg.meanE.toFixed(3)})</span></div>
        )}
        {stage === 'outputGrad' && (
          <>
            <div><strong>dw₂</strong> = 평균(e·h) = {agg.dw2.toFixed(3)}</div>
            <div><strong>db₂</strong> = 평균(e) = {agg.db2.toFixed(3)}</div>
            <div className="text-muted text-[10px] mt-1">A4의 dw = 평균(e·x) 식 그대로 — *입력*만 h로 바뀜.</div>
          </>
        )}
        {stage === 'hiddenSignal' && (
          <>
            <div><strong>e_h = e · w₂ · ReLU′(z₁)</strong> &nbsp; <span className="text-muted">← 역전파 핵심</span></div>
            <div className="text-muted text-[10px] mt-1">
              은닉층은 자기 정답이 없지만, 출력층의 오차 e가 *w₂를 거꾸로 통과*해 자기 책임으로 옮겨와요.
              ReLU′(z₁)은 z₁ &gt; 0이면 1, 아니면 0 — 죽은 뉴런은 책임도 0.
            </div>
            <div>평균 e_h = {agg.meanEh.toFixed(3)}</div>
          </>
        )}
        {stage === 'hiddenGrad' && (
          <>
            <div><strong>dw₁</strong> = 평균(e_h·x) = {agg.dw1.toFixed(3)}</div>
            <div><strong>db₁</strong> = 평균(e_h) = {agg.db1.toFixed(3)}</div>
            <div className="text-muted text-[10px] mt-1">
              A4 식이 *다시* 나옴 — 다만 입력은 *자기 층의 입력 x*, 오차는 *전달받은 e_h*.
            </div>
          </>
        )}
        {stage === 'update' && (
          <>
            <div className="font-semibold mb-1">갱신 — 4개 가중치를 한 번에</div>
            <div>w₂ ← {W.w2.toFixed(3)} − {LR}·{agg.dw2.toFixed(3)} = {(W.w2 - LR * agg.dw2).toFixed(3)}</div>
            <div>b₂ ← {W.b2.toFixed(3)} − {LR}·{agg.db2.toFixed(3)} = {(W.b2 - LR * agg.db2).toFixed(3)}</div>
            <div>w₁ ← {W.w1.toFixed(3)} − {LR}·{agg.dw1.toFixed(3)} = {(W.w1 - LR * agg.dw1).toFixed(3)}</div>
            <div>b₁ ← {W.b1.toFixed(3)} − {LR}·{agg.db1.toFixed(3)} = {(W.b1 - LR * agg.db1).toFixed(3)}</div>
            <div className="text-muted text-[10px] mt-1">"다음 단계 →"를 누르면 다시 1단계(예측)로 — 새 가중치로 같은 사이클.</div>
          </>
        )}
      </div>
    </div>
  );
}

function Conditional({ show, children }: { show: boolean; children: React.ReactNode }) {
  return show ? <>{children}</> : null;
}

/* 직관 카드 — 단계 라벨만 (식 안 보임) */
function IntuitionCard({ stage }: { stage: StageId }) {
  return (
    <div className="card p-3 space-y-2">
      <div className="text-sm font-medium">한 step의 6단계</div>
      <ol className="space-y-1.5">
        {STAGES.map((s) => (
          <li
            key={s.id}
            className={`flex items-start gap-2 rounded px-2 py-1.5 text-sm ${
              s.id === stage ? 'bg-accent-bg text-text border-l-2 border-accent' : 'text-muted'
            }`}
          >
            <span className={`font-mono text-xs mt-0.5 w-5 ${s.id === stage ? 'text-accent' : ''}`}>
              {s.num}
            </span>
            <span className="flex-1">
              <span className={`font-medium ${s.id === stage ? 'text-text' : ''}`}>{s.label}</span>
              <span className="block text-[11px] mt-0.5 font-mono">{s.sub}</span>
            </span>
          </li>
        ))}
      </ol>
      <div className="text-[10px] text-muted leading-snug pt-1 border-t border-border">
        식이 궁금하면 위에서 <strong>식·표</strong> 모드로 바꿔 보세요.
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   손실 곡선
══════════════════════════════════════════════════════════════ */
function LossCurve({ history }: { history: number[] }) {
  const W = 720, H = 130;
  const padL = 36, padR = 12, padT = 14, padB = 24;
  const maxLoss = Math.max(...history, 0.1) * 1.05;
  const sx = (i: number) => padL + (history.length > 1 ? (i / (history.length - 1)) : 0) * (W - padL - padR);
  const sy = (l: number) => H - padB - (Math.min(l, maxLoss) / maxLoss) * (H - padT - padB);
  const path = history.map((l, i) => `${i === 0 ? 'M' : 'L'}${sx(i).toFixed(1)},${sy(l).toFixed(1)}`).join(' ');
  return (
    <div className="card p-2">
      <div className="flex items-baseline justify-between px-1">
        <div className="text-sm font-medium">손실 곡선</div>
        <div className="text-[11px] font-mono text-muted">
          step {history.length - 1} · 손실 {history[history.length - 1].toFixed(3)}
        </div>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full mt-1">
        <line x1={padL} y1={H - padB} x2={W - padR} y2={H - padB} stroke="rgb(var(--color-border))" />
        <line x1={padL} y1={padT} x2={padL} y2={H - padB} stroke="rgb(var(--color-border))" />
        <line x1={padL} y1={sy(0.05)} x2={W - padR} y2={sy(0.05)}
              stroke="rgb(16,185,129)" strokeDasharray="3 3" strokeWidth={0.6} opacity={0.6} />
        <text x={W - padR - 2} y={sy(0.05) - 2} textAnchor="end" fontSize={9} fill="rgb(16,185,129)">완료 0.05</text>
        <text x={padL - 4} y={padT + 8} textAnchor="end" fontSize={9} fill="rgb(var(--color-muted))">{maxLoss.toFixed(1)}</text>
        <text x={padL - 4} y={H - padB + 1} textAnchor="end" fontSize={9} fill="rgb(var(--color-muted))">0</text>
        <text x={W - padR} y={H - 4} textAnchor="end" fontSize={9} fill="rgb(var(--color-muted))">step</text>
        <path d={path} fill="none" stroke="rgb(var(--color-accent))" strokeWidth={1.6} />
        {history.map((l, i) => (
          <circle key={i} cx={sx(i)} cy={sy(l)} r={2} fill="rgb(var(--color-accent))" />
        ))}
      </svg>
    </div>
  );
}

/* 작은 통계 카드 */
function Stat({ label, value, highlight, accent }: {
  label: string; value: string; highlight?: boolean; accent?: boolean;
}) {
  return (
    <div className={`p-2 rounded border text-xs ${
      highlight ? 'border-accent bg-accent-bg' : 'border-border'
    }`}>
      <div className="text-muted text-[10px] uppercase tracking-wide">{label}</div>
      <div className={`text-sm ${accent ? 'text-accent font-semibold' : ''}`}>{value}</div>
    </div>
  );
}
