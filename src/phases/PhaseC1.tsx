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

  // 다음 단계 → — 한 칸씩 진행. 6→1로 빠질 때 실제 W 갱신.
  // 그래야 6단계(갱신)에서 *지금 W → 새 W* 변환이 보이고, 다음 누름에서 실제 적용된다.
  const advance = () => {
    const cur = stageIdx;
    if (cur === STAGES.length - 1) {
      // 6 → 1: 갱신을 실제로 적용하고 다음 사이클의 1단계(예측)로
      const next_W = applyStep(W, t);
      setW(next_W);
      setHistory((h) => [...h, trace(next_W).loss]);
      setStepCount((s) => s + 1);
      setStageIdx(0);
      return;
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
    }, 700);
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

      {/* 메인 — 좌: 다이어그램(SVG + 활성 단계 수식) + 손실곡선 / 우: 컨트롤 + 단계 진행표 */}
      <div className="mt-4 grid lg:grid-cols-[1.4fr_1fr] gap-4 items-start">
        <div className="space-y-3">
          <Diagram W={W} t={t} stage={currentStage.id} showFormula={showFormula} />
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
              ※ 1~6단계는 *지금 W로 계산된 값*만 보여 줘요. 6단계(갱신)에서 다음 단계 →를 한 번 더 누르면 실제로 가중치가 움직여 다음 사이클의 1단계로 넘어갑니다.
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
   SVG 바로 아래에 *활성 단계의 수식 풀이*를 함께 띄워, 그림과 식이 한 시야에 들어오게 함.
══════════════════════════════════════════════════════════════ */
function Diagram({ W, t, stage, showFormula }: { W: Weights; t: Trace; stage: StageId; showFormula: boolean }) {
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

      {showFormula && <ActiveFormulaStrip W={W} t={t} stage={stage} />}

      <UpdatePreview W={W} t={t} />
    </div>
  );
}

/* 다이어그램 카드 하단 — 4개 가중치 갱신식 항상 표시 (단계 무관) */
function UpdatePreview({ W, t }: { W: Weights; t: Trace }) {
  const newW = applyStep(W, t);
  return (
    <div className="border-t border-border mt-3 pt-2.5 px-1 font-mono text-[11.5px] leading-relaxed space-y-0.5">
      <div className="text-[10px] text-muted font-sans mb-1">갱신 식 — 한 step 후 새 값 (4개 동시 적용)</div>
      <div>w₂ ← <Sub>{W.w2.toFixed(2)} − {LR}·{t.dw2.toFixed(2)}</Sub> = <Acc>{newW.w2.toFixed(3)}</Acc></div>
      <div>b₂ ← <Sub>{W.b2.toFixed(2)} − {LR}·{t.db2.toFixed(2)}</Sub> = <Acc>{newW.b2.toFixed(3)}</Acc></div>
      <div>w₁ ← <Sub>{W.w1.toFixed(2)} − {LR}·{t.dw1.toFixed(2)}</Sub> = <Acc>{newW.w1.toFixed(3)}</Acc></div>
      <div>b₁ ← <Sub>{W.b1.toFixed(2)} − {LR}·{t.db1.toFixed(2)}</Sub> = <Acc>{newW.b1.toFixed(3)}</Acc></div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   활성 단계 수식 띠 — 다이어그램 카드 안 SVG 바로 아래에 위치.
   현재 단계의 식 → 값 대입 → 결과 → 의미를 색 구분과 함께 표시. 모든 숫자 실시간.
══════════════════════════════════════════════════════════════ */
function ActiveFormulaStrip({ W, t, stage }: { W: Weights; t: Trace; stage: StageId }) {
  const meta = STAGES.find((s) => s.id === stage)!;
  const newW = applyStep(W, t);

  return (
    <div className="border-t border-border mt-3 pt-3 px-1">
      <div className="flex items-baseline gap-2 mb-1.5">
        <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-accent text-white">
          {meta.num}
        </span>
        <span className="text-[12.5px] font-medium">{meta.label}</span>
      </div>
      <div className="font-mono text-[12px] leading-relaxed space-y-0.5">
        {stage === 'predict' && (
          <>
            <div>z₁ = w₁·x + b₁ = <Sub>{W.w1.toFixed(2)}·{SAMPLE.x} + {W.b1.toFixed(2)}</Sub> = <Acc>{t.z1.toFixed(2)}</Acc></div>
            <div>h = ReLU(z₁) = <Sub>max(0, {t.z1.toFixed(2)})</Sub> = <Acc>{t.h.toFixed(2)}</Acc>
              {' '}<Note>{t.reluP === 1 ? '(z₁ > 0 → 그대로 통과, ReLU′=1)' : '(z₁ ≤ 0 → 0으로 막힘, ReLU′=0)'}</Note>
            </div>
            <div>z₂ = w₂·h + b₂ = <Sub>{W.w2.toFixed(2)}·{t.h.toFixed(2)} + {W.b2.toFixed(2)}</Sub> = <Acc>{t.z2.toFixed(2)}</Acc></div>
            <div>ŷ = z₂ = <Acc>{t.yhat.toFixed(2)}</Acc></div>
          </>
        )}
        {stage === 'error' && (
          <>
            <div>e = ŷ − y = <Sub>{t.yhat.toFixed(2)} − {SAMPLE.y}</Sub> = <Err>{t.e.toFixed(2)}</Err></div>
            <div><Note>참고: 손실 ½·e² = {t.loss.toFixed(2)} (실제 갱신에는 e만 필요)</Note></div>
          </>
        )}
        {stage === 'outputGrad' && (
          <>
            <div>dw₂ = e·h = <Sub><Err>{t.e.toFixed(2)}</Err>·{t.h.toFixed(2)}</Sub> = <Acc>{t.dw2.toFixed(2)}</Acc></div>
            <div>db₂ = e = <Err>{t.db2.toFixed(2)}</Err> <Note>(b는 1이 곱해지는 상수항)</Note></div>
          </>
        )}
        {stage === 'hiddenSignal' && (
          <div>e_h = e·w₂·ReLU′(z₁) = <Sub><Err>{t.e.toFixed(2)}</Err>·{W.w2.toFixed(2)}·{t.reluP}</Sub> = <Err>{t.eh.toFixed(2)}</Err></div>
        )}
        {stage === 'hiddenGrad' && (
          <>
            <div>dw₁ = e_h·x = <Sub><Err>{t.eh.toFixed(2)}</Err>·{SAMPLE.x}</Sub> = <Acc>{t.dw1.toFixed(2)}</Acc></div>
            <div>db₁ = e_h = <Err>{t.db1.toFixed(2)}</Err></div>
          </>
        )}
        {stage === 'update' && (
          <>
            <div>w₂ ← <Sub>{W.w2.toFixed(2)} − {LR}·{t.dw2.toFixed(2)}</Sub> = <Acc>{newW.w2.toFixed(3)}</Acc></div>
            <div>b₂ ← <Sub>{W.b2.toFixed(2)} − {LR}·{t.db2.toFixed(2)}</Sub> = <Acc>{newW.b2.toFixed(3)}</Acc></div>
            <div>w₁ ← <Sub>{W.w1.toFixed(2)} − {LR}·{t.dw1.toFixed(2)}</Sub> = <Acc>{newW.w1.toFixed(3)}</Acc></div>
            <div>b₁ ← <Sub>{W.b1.toFixed(2)} − {LR}·{t.db1.toFixed(2)}</Sub> = <Acc>{newW.b1.toFixed(3)}</Acc></div>
          </>
        )}
      </div>
      <div className="text-[10.5px] text-muted leading-snug pt-1.5 mt-1.5 border-t border-border/50">
        → {whyFor(stage, t)}
      </div>
    </div>
  );
}

function whyFor(stage: StageId, t: Trace): string {
  if (stage === 'predict') return 'A1에서 본 곱·합·활성화 한 묶음을 두 번 적용. 출력층은 회귀라 ReLU 없이 그대로.';
  if (stage === 'error') return t.e < 0
    ? 'e의 부호가 모든 기울기의 부호를 결정. 음수라 모든 가중치가 *커지는* 방향으로 움직일 예정.'
    : t.e > 0
      ? 'e의 부호가 모든 기울기의 부호를 결정. 양수라 모든 가중치가 *작아지는* 방향으로 움직일 예정.'
      : 'e가 0이라 갱신 없음 — 이미 정답.';
  if (stage === 'outputGrad') return 'A4의 dw = e·x 식 그대로. 출력층 입장에서 그 층의 입력은 은닉 출력 h.';
  if (stage === 'hiddenSignal') return t.reluP === 0
    ? 'ReLU′(z₁)=0 — 길이 막혀 신호 끊김 (Dying ReLU). 은닉층 가중치는 갱신 안 됨.'
    : '출력의 e가 w₂를 거꾸로 곱해져 은닉층까지 전달. 이 거꾸로 흐름이 곧 *역전파*.';
  if (stage === 'hiddenGrad') return 'A4의 dw = e·x 식이 다시. e 자리에 e_h(전달받은 오차), x 자리에 이 층의 입력 x.';
  return '모든 기울기에 η를 곱해 *반대 방향*으로 4개 가중치를 동시에 움직임. 다음 step에서 ŷ이 정답에 더 가까워져 손실이 줄어요.';
}

/* ════════════════════════════════════════════════════════════
   우측 통합 식 카드 — 6단계 전체를 한눈에 보여주는 reference.
   다이어그램 내부 ActiveFormulaStrip(현재 단계)와 짝이 되어,
   "지금" 단계는 그림 옆에서, 6단계 흐름은 우측에서 비교 가능.
══════════════════════════════════════════════════════════════ */
function FormulaCard({ W, t, stage }: { W: Weights; t: Trace; stage: StageId }) {
  const newW = applyStep(W, t);

  return (
    <div className="card p-3 space-y-2 text-sm">
      <div className="font-medium">한 step의 6단계 — 모든 숫자가 *지금의 가중치*로 다시 계산</div>
      <p className="text-[11px] text-muted leading-snug">
        x = {SAMPLE.x}, y = {SAMPLE.y}, η = {LR}. 다음 단계 →나 자동 학습을 누르면 가중치가 갱신되고 6단계 모든 칸이 새 값으로 다시 채워져요.
        {' '}<span style={{ color: 'rgb(var(--color-accent))' }}>강조된 칸</span>이 지금 단계.
      </p>

      <StageBox id="predict" num={1} label="예측 — x를 두 층 통과" stage={stage}
        why="A1에서 본 곱·합·활성화 한 묶음을 *두 번* 적용. 출력층은 회귀라 ReLU 없이 그대로.">
        <Line>
          z₁ = w₁·x + b₁ = <Sub>{W.w1.toFixed(2)}·{SAMPLE.x} + {W.b1.toFixed(2)}</Sub> = <Acc>{t.z1.toFixed(2)}</Acc>
        </Line>
        <Line>
          h = ReLU(z₁) = <Sub>max(0, {t.z1.toFixed(2)})</Sub> = <Acc>{t.h.toFixed(2)}</Acc>
          {' '}<Note>{t.reluP === 1 ? '(z₁ > 0 → 그대로 통과, ReLU′=1)' : '(z₁ ≤ 0 → 0으로 막힘, ReLU′=0)'}</Note>
        </Line>
        <Line>
          z₂ = w₂·h + b₂ = <Sub>{W.w2.toFixed(2)}·{t.h.toFixed(2)} + {W.b2.toFixed(2)}</Sub> = <Acc>{t.z2.toFixed(2)}</Acc>
        </Line>
        <Line>
          ŷ = z₂ = <Acc>{t.yhat.toFixed(2)}</Acc>
        </Line>
      </StageBox>

      <StageBox id="error" num={2} label="오차 — 예측과 정답의 차" stage={stage}
        why={`e의 부호가 모든 기울기의 부호를 결정. ${t.e < 0 ? '음수 → 모든 가중치가 *커지는* 방향.' : t.e > 0 ? '양수 → 모든 가중치가 *작아지는* 방향.' : '0이라 갱신 없음.'}`}>
        <Line>
          e = ŷ − y = <Sub>{t.yhat.toFixed(2)} − {SAMPLE.y}</Sub> = <Err>{t.e.toFixed(2)}</Err>
        </Line>
        <Line>
          <Note>참고: 손실 ½·e² = {t.loss.toFixed(2)} (실제 갱신에는 e만 필요 — ½·e²의 미분이 e)</Note>
        </Line>
      </StageBox>

      <StageBox id="outputGrad" num={3} label="출력층 기울기 — w₂·b₂를 얼마나" stage={stage}
        why="A4의 dw = e·x 식 그대로. 출력층 입장에서 *그 층의 입력*은 은닉 출력 h.">
        <Line>
          dw₂ = e·h = <Sub><Err>{t.e.toFixed(2)}</Err>·{t.h.toFixed(2)}</Sub> = <Acc>{t.dw2.toFixed(2)}</Acc>
        </Line>
        <Line>
          db₂ = e = <Err>{t.db2.toFixed(2)}</Err>
          {' '}<Note>(b는 1이 곱해지는 상수항)</Note>
        </Line>
      </StageBox>

      <StageBox id="hiddenSignal" num={4} label="은닉층 신호 e_h ★ 역전파 핵심" stage={stage}
        why={t.reluP === 0
          ? 'ReLU′(z₁)=0 — z₁이 음수라 길이 막힘. 신호가 끊겨 e_h=0 (Dying ReLU). 은닉층 가중치는 갱신 안 됨.'
          : '출력의 e가 w₂를 *거꾸로 곱해져* 은닉층까지 전달. ReLU′(z₁)=1이라 길이 열림. — 이 거꾸로 흐름이 곧 *역전파*.'}>
        <Line>
          e_h = e·w₂·ReLU′(z₁) = <Sub><Err>{t.e.toFixed(2)}</Err>·{W.w2.toFixed(2)}·{t.reluP}</Sub> = <Err>{t.eh.toFixed(2)}</Err>
        </Line>
      </StageBox>

      <StageBox id="hiddenGrad" num={5} label="은닉층 기울기 — w₁·b₁를 얼마나" stage={stage}
        why="A4의 dw = e·x 식이 다시. e 자리에 e_h(전달받은 오차), x 자리에 이 층의 입력 x. 깊은 망에서도 모든 층이 같은 모양.">
        <Line>
          dw₁ = e_h·x = <Sub><Err>{t.eh.toFixed(2)}</Err>·{SAMPLE.x}</Sub> = <Acc>{t.dw1.toFixed(2)}</Acc>
        </Line>
        <Line>
          db₁ = e_h = <Err>{t.db1.toFixed(2)}</Err>
        </Line>
      </StageBox>

      <StageBox id="update" num={6} label={`갱신 — w ← w − η·dw  (η=${LR})`} stage={stage}
        why="모든 기울기에 η를 곱해 *반대 방향*으로 4개 가중치를 동시에 움직임. 다음 step에서 ŷ이 정답 y에 더 가까워져 손실이 줄어요.">
        <Line>
          w₂ ← <Sub>{W.w2.toFixed(2)} − {LR}·{t.dw2.toFixed(2)}</Sub> = <Acc>{newW.w2.toFixed(3)}</Acc>
        </Line>
        <Line>
          b₂ ← <Sub>{W.b2.toFixed(2)} − {LR}·{t.db2.toFixed(2)}</Sub> = <Acc>{newW.b2.toFixed(3)}</Acc>
        </Line>
        <Line>
          w₁ ← <Sub>{W.w1.toFixed(2)} − {LR}·{t.dw1.toFixed(2)}</Sub> = <Acc>{newW.w1.toFixed(3)}</Acc>
        </Line>
        <Line>
          b₁ ← <Sub>{W.b1.toFixed(2)} − {LR}·{t.db1.toFixed(2)}</Sub> = <Acc>{newW.b1.toFixed(3)}</Acc>
        </Line>
      </StageBox>

      <div className="text-[10.5px] text-muted leading-snug pt-1 border-t border-border">
        색 안내 — <Err>e·e_h·db</Err>(오차 계열) · <Acc>dw·새 가중치</Acc>(갱신 계열) · <Note>대입한 숫자</Note>는 흐림.
      </div>
    </div>
  );
}

/* 단계 박스 — 활성 시 배경 강조 + why 노트 펼침 */
function StageBox({
  id, num, label, stage, why, children,
}: {
  id: StageId; num: number; label: string; stage: StageId; why: string; children: React.ReactNode;
}) {
  const active = stage === id;
  return (
    <div className={`rounded-md border px-3 py-2 transition-colors ${
      active ? 'border-accent bg-accent-bg/50' : 'border-border bg-bg/30'
    }`}>
      <div className="flex items-baseline gap-2 mb-1">
        <span className={`font-mono text-[10px] px-1.5 py-0.5 rounded ${
          active ? 'bg-accent text-white' : 'bg-surface text-muted'
        }`}>
          {num}
        </span>
        <span className={`text-[12px] font-medium ${active ? 'text-text' : 'text-muted'}`}>
          {label}
        </span>
      </div>
      <div className="font-mono text-[11.5px] leading-relaxed space-y-0.5">{children}</div>
      {active && (
        <div className="text-[11px] text-muted leading-snug pt-1.5 border-t border-border/60 mt-1.5">
          → {why}
        </div>
      )}
    </div>
  );
}

/* 색 헬퍼 — 식 안에서 숫자 부류를 시각적으로 구분 */
function Line({ children }: { children: React.ReactNode }) {
  return <div>{children}</div>;
}
function Sub({ children }: { children: React.ReactNode }) {
  return <span className="text-muted">{children}</span>;
}
function Acc({ children }: { children: React.ReactNode }) {
  return <span style={{ color: 'rgb(var(--color-accent))', fontWeight: 600 }}>{children}</span>;
}
function Err({ children }: { children: React.ReactNode }) {
  return <span style={{ color: 'rgb(190,18,60)', fontWeight: 600 }}>{children}</span>;
}
function Note({ children }: { children: React.ReactNode }) {
  return <span className="text-muted text-[10.5px]">{children}</span>;
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
