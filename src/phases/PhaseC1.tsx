// PhaseC1 — 역전파 알고리즘의 이해
// 입력 1 · 은닉 1 · 출력 1, 데이터 1쌍(x=2, y=5)으로 한 step의 6단계를 따라간다.
// 1쌍으로 단순화 — 평균 없이 e, e_h, dw가 직관적으로 이어진다.
// 다이어그램은 단계마다 *그 단계에서 새로 등장하는 라벨만* 보여 글자 겹침을 제거.

import { useEffect, useRef, useState } from 'react';
import { PHASES } from '../phases';
import { useApp } from '../store';

/* ──────── 모델·데이터 ──────── */
interface Weights { w1: number; b1: number; w2: number; b2: number }
const INIT: Weights = { w1: 0.5, b1: 0.1, w2: 1.5, b2: 0.0 };
const SAMPLE = { x: 2, y: 5 };  // 정답 직선 ŷ = 2x + 1
const LR = 0.05;

const relu = (z: number) => (z > 0 ? z : 0);
const reluD = (z: number) => (z > 0 ? 1 : 0);

interface Trace {
  z1: number; h: number; z2: number; yhat: number; reluP: 0 | 1;
  e: number;
  dw2: number; db2: number;
  eh: number;
  dw1: number; db1: number;
  loss: number;
}
function trace(W: Weights): Trace {
  const z1 = W.w1 * SAMPLE.x + W.b1;
  const reluP = (reluD(z1) as 0 | 1);
  const h = relu(z1);
  const z2 = W.w2 * h + W.b2;
  const yhat = z2;
  const e = yhat - SAMPLE.y;
  const dw2 = e * h;
  const db2 = e;
  const eh = e * W.w2 * reluP;
  const dw1 = eh * SAMPLE.x;
  const db1 = eh;
  const loss = 0.5 * e * e;
  return { z1, h, z2, yhat, reluP, e, dw2, db2, eh, dw1, db1, loss };
}

function applyStep(W: Weights, t: Trace): Weights {
  return {
    w1: W.w1 - LR * t.dw1,
    b1: W.b1 - LR * t.db1,
    w2: W.w2 - LR * t.dw2,
    b2: W.b2 - LR * t.db2,
  };
}

/* ──────── 6단계 정의 ──────── */
type StageId = 'predict' | 'error' | 'outputGrad' | 'hiddenSignal' | 'hiddenGrad' | 'update';
const STAGES: { id: StageId; num: number; label: string; sub: string }[] = [
  { id: 'predict',      num: 1, label: '예측',          sub: 'x → z₁ → h → z₂ → ŷ' },
  { id: 'error',        num: 2, label: '오차',          sub: 'e = ŷ − y' },
  { id: 'outputGrad',   num: 3, label: '출력층 기울기', sub: 'dw₂ = e·h,  db₂ = e' },
  { id: 'hiddenSignal', num: 4, label: '은닉층 신호',   sub: 'e_h = e · w₂ · ReLU′(z₁)  ← 역전파 핵심' },
  { id: 'hiddenGrad',   num: 5, label: '은닉층 기울기', sub: 'dw₁ = e_h·x,  db₁ = e_h' },
  { id: 'update',       num: 6, label: '갱신',          sub: 'w ← w − η·dw' },
];

/* ════════════════════════════════════════════════════════════
   PhaseC1
══════════════════════════════════════════════════════════════ */
export function PhaseC1() {
  const meta = PHASES.find((p) => p.id === 'c1')!;
  const markCompleted = useApp((s) => s.markCompleted);

  const [W, setW] = useState<Weights>(INIT);
  const [stageIdx, setStageIdx] = useState(0);   // 0~5
  const [stepCount, setStepCount] = useState(0);
  const [history, setHistory] = useState<number[]>([trace(INIT).loss]);
  const [auto, setAuto] = useState(false);
  const [showFormula, setShowFormula] = useState(true);

  const t = trace(W);

  const wRef = useRef(W);
  useEffect(() => { wRef.current = W; }, [W]);

  // 다음 단계 → — 한 칸씩 진행. 5→6 진입에서만 가중치 갱신.
  const advance = () => {
    const cur = stageIdx;
    if (cur === STAGES.length - 1) {
      setStageIdx(0);
      return;
    }
    if (cur === STAGES.length - 2) {
      const next_W = applyStep(W, t);
      setW(next_W);
      setHistory((h) => [...h, trace(next_W).loss]);
      setStepCount((s) => s + 1);
    }
    setStageIdx(cur + 1);
  };

  // 자동 학습 — 한 step씩 빠르게
  useEffect(() => {
    if (!auto) return;
    const id = setInterval(() => {
      const cur = wRef.current;
      const tr = trace(cur);
      const nw = applyStep(cur, tr);
      setW(nw);
      setHistory((h) => [...h, trace(nw).loss]);
      setStepCount((s) => s + 1);
      setStageIdx(0);
    }, 180);
    return () => clearInterval(id);
  }, [auto]);

  const completedRef = useRef(false);
  useEffect(() => {
    if (completedRef.current) return;
    if (stepCount >= 1 && t.loss < 0.05) {
      completedRef.current = true;
      markCompleted('c1');
    } else if (stepCount >= 30) {
      completedRef.current = true;
      markCompleted('c1');
    }
  }, [stepCount, t.loss, markCompleted]);

  const reset = () => {
    setW(INIT);
    setStageIdx(0);
    setStepCount(0);
    setHistory([trace(INIT).loss]);
    setAuto(false);
    completedRef.current = false;
  };

  const currentStage = STAGES[stageIdx];

  return (
    <article>
      <div className="text-xs font-mono text-muted">PHASE {meta.num}</div>
      <h1>{meta.title}</h1>
      <p className="text-muted mt-2 text-sm leading-relaxed">
        가장 단순한 *2층 망*(입력 1 · 은닉 1 · 출력 1)에 *데이터 1쌍*(x = {SAMPLE.x}, y = {SAMPLE.y})만 두고
        한 step의 6단계를 따라가요. <strong>다음 단계 →</strong>를 한 번씩 누르며
        예측 → 오차 → 출력층 기울기 → 은닉층 신호 → 은닉층 기울기 → 갱신이 어떤 숫자로 이어지는지 직접 보세요.
        <strong> 은닉층 신호</strong> 단계가 역전파의 핵심입니다.
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
          >식·풀이</button>
        </div>
        <span className="text-xs text-muted">η = {LR}</span>
      </div>

      {/* 메인 */}
      <div className="mt-4 grid lg:grid-cols-[1.4fr_1fr] gap-4 items-start">
        <div className="space-y-3">
          <Diagram W={W} t={t} stage={currentStage.id} />
          <LossCurve history={history} />
        </div>

        <div className="space-y-3">
          <div className="card p-3 space-y-2">
            <div className="grid grid-cols-3 gap-2 text-center font-mono text-xs">
              <Stat label="step" value={stepCount.toString()} />
              <Stat label="손실" value={t.loss.toFixed(3)} highlight={t.loss < 0.05} />
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

          {showFormula ? (
            <FormulaCard W={W} t={t} stage={currentStage.id} />
          ) : (
            <IntuitionCard stage={currentStage.id} />
          )}
        </div>
      </div>

      {/* 하단 — 역전파 박스 */}
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
          이 거꾸로 흐름이 <strong>역전파(backpropagation)</strong>예요.
        </p>
        <p>
          각 가중치는 A4에서 본 <code>dw = e · x</code> 모양의 식을 자기 층 입력 x로 똑같이 써서 갱신돼요.
          {' '}<strong>A5에서 본 한 step의 갱신식이 모든 층에 동시에 적용</strong>된다고 보면 됩니다.
        </p>
      </div>
    </article>
  );
}

/* ════════════════════════════════════════════════════════════
   다이어그램 — 입1·은1·출1
   각 단계에서 *새로 등장하는 라벨만* 보여 글자 겹침을 제거.
══════════════════════════════════════════════════════════════ */
function Diagram({ W, t, stage }: { W: Weights; t: Trace; stage: StageId }) {
  const W_SVG = 720, H_SVG = 260;
  const cy = 110;
  const xCx = 60, z1Cx = 220, hCx = 360, z2Cx = 500, yhCx = 640;

  const fwdActive = stage === 'predict';
  const errActive = stage === 'error';
  const outActive = stage === 'outputGrad';
  const hsigActive = stage === 'hiddenSignal';
  const hgActive = stage === 'hiddenGrad';
  const updActive = stage === 'update';

  // 비활성 역전파 라벨은 0 — 겹침 방지
  const opE     = errActive || hsigActive || hgActive || outActive ? 1 : 0;
  const opDw2   = outActive || updActive ? 1 : 0;
  const opEh    = hsigActive || hgActive ? 1 : 0;
  const opDw1   = hgActive || updActive ? 1 : 0;
  const opFwd   = fwdActive ? 1 : 0.65;  // 항상 보이되 비활성일 때 흐림

  const FWD = 'rgb(var(--color-accent))';
  const BACK = 'rgb(190, 18, 60)';
  const MUTED = 'rgb(140,140,140)';

  return (
    <div className="card p-3">
      <div className="flex items-baseline justify-between mb-1">
        <div className="text-sm font-medium">2층 망 — 데이터 1쌍 (x = {SAMPLE.x}, 정답 y = {SAMPLE.y})</div>
        <div className="text-[11px] font-mono text-muted">
          <span style={{ color: FWD }}>● 순전파</span>
          <span className="ml-3" style={{ color: BACK }}>● 역전파</span>
        </div>
      </div>
      <svg viewBox={`0 0 ${W_SVG} ${H_SVG}`} className="w-full">
        <defs>
          <marker id="c1-arr" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 z" fill={FWD} />
          </marker>
          <marker id="c1-back" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 z" fill={BACK} />
          </marker>
        </defs>

        {/* ── 순전파 엣지 (구조는 항상) ── */}
        <line x1={xCx + 22} y1={cy} x2={z1Cx - 28} y2={cy}
              stroke={FWD} strokeWidth={2} strokeOpacity={opFwd} markerEnd="url(#c1-arr)" />
        <line x1={z1Cx + 22} y1={cy} x2={hCx - 28} y2={cy}
              stroke={FWD} strokeWidth={2} strokeOpacity={opFwd} markerEnd="url(#c1-arr)" />
        <line x1={hCx + 22} y1={cy} x2={z2Cx - 28} y2={cy}
              stroke={FWD} strokeWidth={2} strokeOpacity={opFwd} markerEnd="url(#c1-arr)" />
        <line x1={z2Cx + 22} y1={cy} x2={yhCx - 28} y2={cy}
              stroke={FWD} strokeWidth={2} strokeOpacity={opFwd} markerEnd="url(#c1-arr)" />

        {/* ── 가중치/편향 라벨 (위쪽) ── */}
        {/* w₁ */}
        <text x={(xCx + z1Cx) / 2} y={cy - 14} textAnchor="middle"
              fontSize={12} fontFamily="JetBrains Mono" fill={FWD} opacity={opFwd}>
          × w₁ = {W.w1.toFixed(2)}
        </text>
        {/* b₁ (z₁ 위쪽 ↓) */}
        <text x={z1Cx} y={cy - 46} textAnchor="middle"
              fontSize={11} fontFamily="JetBrains Mono" fill={FWD} opacity={opFwd}>
          + b₁ = {W.b1.toFixed(2)}
        </text>
        <line x1={z1Cx} y1={cy - 36} x2={z1Cx} y2={cy - 24}
              stroke={FWD} strokeWidth={1.4} strokeOpacity={opFwd} />
        {/* ReLU 라벨 */}
        <text x={(z1Cx + hCx) / 2} y={cy - 14} textAnchor="middle"
              fontSize={12} fontFamily="JetBrains Mono" fill={FWD} opacity={opFwd}>
          ReLU
        </text>
        {/* w₂ */}
        <text x={(hCx + z2Cx) / 2} y={cy - 14} textAnchor="middle"
              fontSize={12} fontFamily="JetBrains Mono" fill={FWD} opacity={opFwd}>
          × w₂ = {W.w2.toFixed(2)}
        </text>
        {/* b₂ */}
        <text x={z2Cx} y={cy - 46} textAnchor="middle"
              fontSize={11} fontFamily="JetBrains Mono" fill={FWD} opacity={opFwd}>
          + b₂ = {W.b2.toFixed(2)}
        </text>
        <line x1={z2Cx} y1={cy - 36} x2={z2Cx} y2={cy - 24}
              stroke={FWD} strokeWidth={1.4} strokeOpacity={opFwd} />

        {/* ── 노드 ── */}
        {/* x */}
        <circle cx={xCx} cy={cy} r={22} fill="white" stroke={MUTED} strokeWidth={2} />
        <text x={xCx} y={cy + 4} textAnchor="middle" fontSize={12} fontFamily="JetBrains Mono"
              fill="rgb(var(--color-text))" fontWeight={600}>x</text>
        <text x={xCx} y={cy + 42} textAnchor="middle" fontSize={11} fontFamily="JetBrains Mono"
              fill="rgb(var(--color-muted))">= {SAMPLE.x}</text>
        {/* z₁ */}
        <circle cx={z1Cx} cy={cy} r={22} fill="white" stroke={FWD} strokeWidth={2} opacity={opFwd} />
        <text x={z1Cx} y={cy + 4} textAnchor="middle" fontSize={11} fontFamily="JetBrains Mono"
              fill={FWD} fontWeight={600} opacity={opFwd}>z₁</text>
        <text x={z1Cx} y={cy + 42} textAnchor="middle" fontSize={11} fontFamily="JetBrains Mono"
              fill={FWD} opacity={opFwd}>= {t.z1.toFixed(2)}</text>
        {/* h */}
        <circle cx={hCx} cy={cy} r={22} fill="white" stroke={FWD} strokeWidth={2} opacity={opFwd} />
        <text x={hCx} y={cy + 4} textAnchor="middle" fontSize={12} fontFamily="JetBrains Mono"
              fill={FWD} fontWeight={600} opacity={opFwd}>h</text>
        <text x={hCx} y={cy + 42} textAnchor="middle" fontSize={11} fontFamily="JetBrains Mono"
              fill={FWD} opacity={opFwd}>= {t.h.toFixed(2)}</text>
        {/* z₂ */}
        <circle cx={z2Cx} cy={cy} r={22} fill="white" stroke={FWD} strokeWidth={2} opacity={opFwd} />
        <text x={z2Cx} y={cy + 4} textAnchor="middle" fontSize={11} fontFamily="JetBrains Mono"
              fill={FWD} fontWeight={600} opacity={opFwd}>z₂</text>
        <text x={z2Cx} y={cy + 42} textAnchor="middle" fontSize={11} fontFamily="JetBrains Mono"
              fill={FWD} opacity={opFwd}>= {t.z2.toFixed(2)}</text>
        {/* ŷ */}
        <circle cx={yhCx} cy={cy} r={24} fill="rgb(var(--color-accent-bg))" stroke={FWD} strokeWidth={2.5} opacity={opFwd} />
        <text x={yhCx} y={cy + 4} textAnchor="middle" fontSize={12} fontFamily="JetBrains Mono"
              fill={FWD} fontWeight={700} opacity={opFwd}>ŷ</text>
        <text x={yhCx} y={cy + 44} textAnchor="middle" fontSize={11} fontFamily="JetBrains Mono"
              fill={FWD} opacity={opFwd}>= {t.yhat.toFixed(2)}</text>

        {/* ── 역전파 라벨 (아래쪽) — 단계별로 *하나씩만* ── */}
        {/* 오차 e — ŷ 아래 */}
        {opE > 0 && (
          <g>
            <text x={yhCx} y={cy + 78} textAnchor="middle"
                  fontSize={12} fontFamily="JetBrains Mono" fill={BACK} fontWeight={600}>
              e = {t.e.toFixed(2)}
            </text>
            <text x={yhCx} y={cy + 94} textAnchor="middle"
                  fontSize={10} fontFamily="JetBrains Mono" fill={BACK}>
              = ŷ − y
            </text>
          </g>
        )}

        {/* 출력층 기울기 dw₂ — h↔z₂ 사이 (3단계·6단계만) */}
        {opDw2 > 0 && (
          <g>
            <line x1={z2Cx - 24} y1={cy + 26} x2={hCx + 24} y2={cy + 26}
                  stroke={BACK} strokeWidth={1.5} strokeDasharray="4 3"
                  markerEnd="url(#c1-back)" />
            <text x={(hCx + z2Cx) / 2} y={cy + 78} textAnchor="middle"
                  fontSize={12} fontFamily="JetBrains Mono" fill={BACK} fontWeight={600}>
              dw₂ = {t.dw2.toFixed(2)}
            </text>
            <text x={(hCx + z2Cx) / 2} y={cy + 94} textAnchor="middle"
                  fontSize={10} fontFamily="JetBrains Mono" fill={BACK}>
              = e · h
            </text>
          </g>
        )}

        {/* 은닉층 신호 e_h — h 아래 (4·5단계만) */}
        {opEh > 0 && (
          <g>
            <text x={hCx} y={cy + 78} textAnchor="middle"
                  fontSize={12} fontFamily="JetBrains Mono" fill={BACK} fontWeight={600}>
              e_h = {t.eh.toFixed(2)}
            </text>
            <text x={hCx} y={cy + 94} textAnchor="middle"
                  fontSize={10} fontFamily="JetBrains Mono" fill={BACK}>
              = e · w₂ · ReLU′(z₁)
            </text>
          </g>
        )}

        {/* 은닉층 기울기 dw₁ — x↔z₁ 사이 (5·6단계만) */}
        {opDw1 > 0 && (
          <g>
            <line x1={z1Cx - 24} y1={cy + 26} x2={xCx + 24} y2={cy + 26}
                  stroke={BACK} strokeWidth={1.5} strokeDasharray="4 3"
                  markerEnd="url(#c1-back)" />
            <text x={(xCx + z1Cx) / 2} y={cy + 78} textAnchor="middle"
                  fontSize={12} fontFamily="JetBrains Mono" fill={BACK} fontWeight={600}>
              dw₁ = {t.dw1.toFixed(2)}
            </text>
            <text x={(xCx + z1Cx) / 2} y={cy + 94} textAnchor="middle"
                  fontSize={10} fontFamily="JetBrains Mono" fill={BACK}>
              = e_h · x
            </text>
          </g>
        )}

        {/* 정답 y — error 단계에서만 표시 (다른 단계의 b₂ 라벨과 겹치지 않게) */}
        {errActive && (
          <text x={yhCx} y={cy - 38} textAnchor="middle"
                fontSize={11} fontFamily="JetBrains Mono" fill={MUTED}>
            정답 y = {SAMPLE.y}
          </text>
        )}
      </svg>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   식·풀이 카드 — 각 단계의 식을 *대입 → 결과 → 의미* 3줄로 풀어쓴다
══════════════════════════════════════════════════════════════ */
function FormulaCard({ W, t, stage }: { W: Weights; t: Trace; stage: StageId }) {
  return (
    <div className="card p-3 space-y-2.5 text-sm">
      {stage === 'predict' && <PredictStage W={W} t={t} />}
      {stage === 'error' && <ErrorStage t={t} />}
      {stage === 'outputGrad' && <OutGradStage t={t} />}
      {stage === 'hiddenSignal' && <HSigStage W={W} t={t} />}
      {stage === 'hiddenGrad' && <HGradStage t={t} />}
      {stage === 'update' && <UpdateStage W={W} t={t} />}
    </div>
  );
}

function StepBox({
  title, formula, subs, result, why,
}: {
  title: string; formula: string; subs: string; result: string; why?: string;
}) {
  return (
    <div className="rounded-md border border-border bg-bg/40 px-3 py-2 leading-snug">
      <div className="text-[11px] text-muted mb-0.5">{title}</div>
      <div className="font-mono text-[12.5px] font-semibold">{formula}</div>
      <div className="font-mono text-[11px] text-muted">
        ↓ 값 대입: <span className="text-text">{subs}</span>
      </div>
      <div className="font-mono text-[12.5px] text-accent font-semibold mt-0.5">= {result}</div>
      {why && (
        <div className="text-[11px] text-muted leading-snug pt-1.5 border-t border-border/60 mt-1.5">
          → {why}
        </div>
      )}
    </div>
  );
}

function PredictStage({ W, t }: { W: Weights; t: Trace }) {
  return (
    <>
      <div className="font-medium">1. 예측 — 입력을 한 층씩 통과</div>
      <p className="text-[11.5px] text-muted leading-relaxed">
        x = {SAMPLE.x}을 *은닉층 → 출력층* 두 번 통과시켜 ŷ을 만들어요. 곱·합·활성화 한 묶음을 *두 번* 적용한다고 보면 돼요.
      </p>
      <StepBox
        title="① 첫째 층의 곱·합 (z₁)"
        formula="z₁ = w₁ · x + b₁"
        subs={`${W.w1} · ${SAMPLE.x} + ${W.b1}`}
        result={t.z1.toFixed(2)}
        why="A1에서 본 인공 뉴런 한 개의 곱·합. 입력 x를 가중치로 키우고 편향을 더해요."
      />
      <StepBox
        title="② 활성화 (h)"
        formula="h = ReLU(z₁) = max(0, z₁)"
        subs={`max(0, ${t.z1.toFixed(2)})`}
        result={t.h.toFixed(2)}
        why={t.z1 > 0
          ? `z₁ = ${t.z1.toFixed(2)} > 0 → 그대로 통과 (ReLU′ = 1).`
          : `z₁ = ${t.z1.toFixed(2)} ≤ 0 → 0으로 막힘 (ReLU′ = 0, 일명 Dying ReLU).`}
      />
      <StepBox
        title="③ 둘째 층의 곱·합 (z₂)"
        formula="z₂ = w₂ · h + b₂"
        subs={`${W.w2} · ${t.h.toFixed(2)} + ${W.b2}`}
        result={t.z2.toFixed(2)}
        why="은닉 출력 h를 *다시 한 번* 가중치로 키우고 편향을 더해요. — 이게 '2층'."
      />
      <StepBox
        title="④ 출력 (ŷ)"
        formula="ŷ = z₂"
        subs="(회귀 — 출력층은 활성화 없이 그대로)"
        result={t.yhat.toFixed(2)}
        why={`정답은 y = ${SAMPLE.y}. 차이가 다음 단계의 오차 e가 돼요.`}
      />
    </>
  );
}

function ErrorStage({ t }: { t: Trace }) {
  const sign = t.e < 0 ? '음수' : (t.e > 0 ? '양수' : '0');
  const direction = t.e < 0 ? '*작게*' : '*크게*';
  return (
    <>
      <div className="font-medium">2. 오차 — 예측과 정답의 차</div>
      <p className="text-[11.5px] text-muted leading-relaxed">
        오차 e의 *부호*가 곧 모든 기울기의 부호를 결정해요. 음수면 모든 가중치가 커지는 방향, 양수면 작아지는 방향.
      </p>
      <StepBox
        title="① 오차"
        formula="e = ŷ − y"
        subs={`${t.yhat.toFixed(2)} − ${SAMPLE.y}`}
        result={t.e.toFixed(2)}
        why={`${sign} → 모델이 정답보다 ${direction} 예측 중. 다음 단계부터는 이 e 한 숫자가 모든 기울기를 통해 흘러요.`}
      />
      <div className="text-[11px] text-muted">
        참고: 손실 ½·e² = ½·{t.e.toFixed(2)}² = <span className="text-text font-mono">{t.loss.toFixed(2)}</span>.
        실제 갱신에는 e만 필요(½·e²의 미분이 e).
      </div>
    </>
  );
}

function OutGradStage({ t }: { t: Trace }) {
  return (
    <>
      <div className="font-medium">3. 출력층 기울기 — w₂·b₂를 얼마나 고칠까</div>
      <p className="text-[11.5px] text-muted leading-relaxed">
        A4의 <span className="font-mono">dw = e · x</span> 식을 *그대로* 쓰는데, 출력층 입장에서 *그 층의 입력*은 은닉 출력 h예요.
      </p>
      <StepBox
        title="① w₂의 기울기"
        formula="dw₂ = e · h"
        subs={`${t.e.toFixed(2)} · ${t.h.toFixed(2)}`}
        result={t.dw2.toFixed(2)}
        why="이 기울기의 *반대* 방향으로 w₂를 움직이면 손실이 줄어들어요 (경사하강법)."
      />
      <StepBox
        title="② b₂의 기울기"
        formula="db₂ = e · 1 = e"
        subs={`${t.e.toFixed(2)}`}
        result={t.db2.toFixed(2)}
        why="b는 항상 1이 곱해지는 상수항이라 dw 식에서 x 자리가 1로 바뀐 모양."
      />
      <div className="text-[11px] text-muted leading-relaxed border-l-2 border-accent/40 pl-2">
        여기까지는 A4·A5와 *완전히 같은 식*이에요. 차이는 다음 단계 — *은닉층*의 기울기를 어떻게 구할까?
      </div>
    </>
  );
}

function HSigStage({ W, t }: { W: Weights; t: Trace }) {
  return (
    <>
      <div className="font-medium">4. 은닉층 신호 e_h — *역전파 핵심*</div>
      <p className="text-[11.5px] text-muted leading-relaxed">
        은닉층은 자기 정답이 없어요. 그래서 출력의 오차 e가 *w₂를 거꾸로 통과*해 은닉층까지 책임을 가져옵니다.
      </p>
      <StepBox
        title="① 은닉층까지 전달된 신호"
        formula="e_h = e · w₂ · ReLU′(z₁)"
        subs={`${t.e.toFixed(2)} · ${W.w2} · ${t.reluP}`}
        result={t.eh.toFixed(2)}
        why={t.reluP === 0
          ? `ReLU′(z₁) = 0 — z₁이 음수라 길이 막혀요. 신호가 끊겨 e_h = 0 (Dying ReLU).`
          : `ReLU′(z₁) = 1 — z₁이 양수라 길이 열려 있어요. e가 w₂만큼 *거꾸로 곱해져* 은닉층까지 전달됐어요.`}
      />
      <div className="text-[11.5px] text-muted leading-relaxed border-l-2 border-rose-300 pl-3 py-1">
        <strong className="text-text">왜 거꾸로?</strong> 출력의 오차 e에 가장 책임이 큰 가중치는, 그 오차를 만든 길의 가중치(w₂)예요.
        그래서 e가 w₂를 따라 *역방향*으로 흐르며 은닉층까지 책임을 분배합니다.
        ReLU′는 "그 길이 막혔는지(0)·열렸는지(1)" 결정하는 문지기.
      </div>
      <div className="text-[11px] text-muted leading-relaxed">
        다음 단계에서는 이 <span className="font-mono">e_h = {t.eh.toFixed(2)}</span>을 *은닉층의 오차*처럼 써서 dw₁을 구해요.
      </div>
    </>
  );
}

function HGradStage({ t }: { t: Trace }) {
  return (
    <>
      <div className="font-medium">5. 은닉층 기울기 — w₁·b₁를 얼마나 고칠까</div>
      <p className="text-[11.5px] text-muted leading-relaxed">
        4단계의 <span className="font-mono">e_h</span>를 *그 층의 오차*처럼 써서 A4 식을 다시 적용. 입력은 *이 층의 입력 x*.
      </p>
      <StepBox
        title="① w₁의 기울기"
        formula="dw₁ = e_h · x"
        subs={`${t.eh.toFixed(2)} · ${SAMPLE.x}`}
        result={t.dw1.toFixed(2)}
        why="A4의 dw = e · x 식이 *다시 등장*. 차이는 e 자리가 e_h(전달받은 오차), x 자리가 이 층의 입력 x."
      />
      <StepBox
        title="② b₁의 기울기"
        formula="db₁ = e_h · 1 = e_h"
        subs={`${t.eh.toFixed(2)}`}
        result={t.db1.toFixed(2)}
        why="b는 1이 곱해지는 상수항."
      />
      <div className="text-[11.5px] text-muted leading-relaxed border-l-2 border-accent/40 pl-3">
        결과적으로 *모든 층의 가중치*가 dw 식 한 모양으로 갱신돼요 — 깊은 망에서도 똑같이.
      </div>
    </>
  );
}

function UpdateStage({ W, t }: { W: Weights; t: Trace }) {
  const newW = applyStep(W, t);
  return (
    <>
      <div className="font-medium">6. 갱신 — 4개 가중치를 *한 번에*</div>
      <p className="text-[11.5px] text-muted leading-relaxed">
        모든 기울기에 학습률 η = {LR}을 곱한 만큼 *반대 방향*으로 움직여요. 다음 단계 →를 누르면 이 새 가중치로 1단계(예측)부터 다시 시작.
      </p>
      <UpdateRow name="w₂" cur={W.w2} grad={t.dw2} next={newW.w2} />
      <UpdateRow name="b₂" cur={W.b2} grad={t.db2} next={newW.b2} />
      <UpdateRow name="w₁" cur={W.w1} grad={t.dw1} next={newW.w1} />
      <UpdateRow name="b₁" cur={W.b1} grad={t.db1} next={newW.b1} />
      <div className="text-[11.5px] text-muted leading-relaxed border-l-2 border-accent/40 pl-3 mt-1">
        <strong className="text-text">손실이 줄었을까?</strong> 다음 단계 →를 눌러 새 가중치로 1단계를 다시 보면 ŷ이 정답 y = {SAMPLE.y}에 더 가까워졌는지 확인할 수 있어요.
        손실 곡선도 한 칸 내려갑니다.
      </div>
    </>
  );
}

function UpdateRow({ name, cur, grad, next }: { name: string; cur: number; grad: number; next: number }) {
  return (
    <div className="rounded border border-border bg-bg/40 px-3 py-1.5 font-mono text-[11.5px] leading-snug">
      <div className="text-[10px] text-muted">새 {name} = (현재 {name}) − η · d{name}</div>
      <div>
        <span>{cur.toFixed(2)}</span>
        <span className="text-muted"> − {LR} · </span>
        <span>{grad.toFixed(2)}</span>
        <span className="text-muted"> = </span>
        <span className="text-accent font-semibold">{next.toFixed(3)}</span>
      </div>
    </div>
  );
}

/* 직관 카드 */
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
        식의 *대입 → 결과 → 의미*가 궁금하면 위에서 <strong>식·풀이</strong> 모드로 바꿔 보세요.
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
