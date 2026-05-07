// PhaseA5 — 전체 흐름 완성
// A1(예측), A2(오차), A3(보폭), A4(기울기 식)에서 본 것이 한 step으로 모이는 곳.
// Stage 1: 직관 리플레이 (4단계 라벨 사이클) → Stage 2: 종합 식 카드 (실제 숫자 대입).
import { useEffect, useRef, useState } from 'react';
import { useApp } from '../store';
import { PHASES } from '../phases';

// 한 step이 도는 순서 — A1~A4와 같은 어휘로 그대로 라벨링
type StageLabel = 'predict' | 'error' | 'gradient' | 'update';
const STAGE_ORDER: StageLabel[] = ['predict', 'error', 'gradient', 'update'];
const STAGE_LABEL: Record<StageLabel, string> = {
  predict: '예측',
  error: '오차',
  gradient: '기울기',
  update: '갱신',
};

// Phase5 (옛본) 과 동일 — 단일 뉴런 ŷ = ReLU(w·x + b), 정답선 y = 2x + 1
const DATA: [number, number][] = [
  [1, 3], [2, 5], [3, 7], [4, 9], [5, 11],
];
const LR = 0.05; // A3에서 정한 보폭 → 여기서는 그대로 사용 (학습률 슬라이더 없음)

const reluPrime = (z: number) => (z >= 0 ? 1 : 0);

const lossFn = (w: number, b: number) =>
  DATA.reduce((acc, [x, y]) => {
    const z = w * x + b;
    const yhat = Math.max(0, z);
    return acc + 0.5 * (yhat - y) ** 2;
  }, 0) / DATA.length;

const gradient = (w: number, b: number) => {
  let dw = 0, db = 0, sumE = 0;
  DATA.forEach(([x, y]) => {
    const z = w * x + b;
    const yhat = Math.max(0, z);
    const e = yhat - y;
    const r = reluPrime(z);
    dw += e * r * x;
    db += e * r;
    sumE += e;
  });
  return { dw: dw / DATA.length, db: db / DATA.length, meanE: sumE / DATA.length };
};

export function PhaseA5() {
  const meta = PHASES.find((p) => p.id === 'a5')!;
  const markCompleted = useApp((s) => s.markCompleted);

  const [w, setW] = useState(0);
  const [b, setB] = useState(0);
  const [history, setHistory] = useState<number[]>([lossFn(0, 0)]);
  const [stageIdx, setStageIdx] = useState(0); // 0~3: 마지막으로 강조된 단계
  const [auto, setAuto] = useState(false);
  const stepCount = history.length - 1;

  // setInterval 안에서 stale closure 없이 최신 w·b를 읽기 위한 ref
  const wRef = useRef(w);
  const bRef = useRef(b);
  useEffect(() => { wRef.current = w; bRef.current = b; }, [w, b]);

  const loss = lossFn(w, b);
  const grad = gradient(w, b);
  const completedRef = useRef(false);

  // 한 step = 4단계를 짧게 순회한 뒤 실제 갱신. (UI 사이클 200ms × 4)
  // markCompleted 호출은 history useEffect로 위임 — 여기서는 setState만.
  const stepOnce = () => {
    let i = 0;
    setStageIdx(0);
    const cycle = setInterval(() => {
      i += 1;
      setStageIdx(i);
      if (i >= STAGE_ORDER.length - 1) {
        clearInterval(cycle);
        const cw = wRef.current;
        const cb = bRef.current;
        const g = gradient(cw, cb);
        const nw = cw - LR * g.dw;
        const nb = cb - LR * g.db;
        setW(nw);
        setB(nb);
        setHistory((h) => [...h, lossFn(nw, nb)]);
      }
    }, 220);
  };

  // 단계별 진행 — 학생이 직접 *예측 → 오차 → 기울기 → 갱신*을 한 번씩 클릭하며
  // 각 단계의 변화를 손에 잡히도록 한다.
  // 갱신 타이밍: update 화면에서는 식·숫자만 먼저 보여주고, 다음 클릭(update→predict)
  // 에서야 실제 w·b 가 움직이도록 한 박자 늦춘다. 식 좌변·우변 숫자가 옛값 기준으로
  // 정확히 일치해야 학생이 식과 변화의 인과를 따라갈 수 있다.
  const advanceStage = () => {
    const cur = stageIdx;
    // predict(0) → error(1) → gradient(2) → update(3) → predict(0)으로 다시
    const next = (cur + 1) % STAGE_ORDER.length;
    setStageIdx(next);
    // update 단계에서 다음(predict)으로 넘어갈 때(=cur 3 → next 0) 실제 가중치 갱신
    if (cur === STAGE_ORDER.length - 1) {
      const cw = wRef.current;
      const cb = bRef.current;
      const g = gradient(cw, cb);
      const nw = cw - LR * g.dw;
      const nb = cb - LR * g.db;
      setW(nw);
      setB(nb);
      setHistory((h) => [...h, lossFn(nw, nb)]);
    }
  };

  // 자동 학습 — setInterval 안에서는 setState만 호출하고,
  // markCompleted(zustand 갱신)는 별도 useEffect에서 history 변화를 보고 호출한다.
  useEffect(() => {
    if (!auto) return;
    const id = setInterval(() => {
      const cw = wRef.current;
      const cb = bRef.current;
      const g = gradient(cw, cb);
      const newW = cw - LR * g.dw;
      const newB = cb - LR * g.db;
      const newLoss = lossFn(newW, newB);
      setW(newW);
      setB(newB);
      setHistory((h) => [...h, newLoss]);
      setStageIdx((s) => (s + 1) % STAGE_ORDER.length);
    }, 160);
    return () => clearInterval(id);
  }, [auto]);

  // 손실 수렴 → 완료 처리. 렌더 사이클 밖에서 안전하게 zustand 갱신.
  useEffect(() => {
    const last = history[history.length - 1];
    if (!completedRef.current && last !== undefined && last < 0.05) {
      completedRef.current = true;
      markCompleted('a5');
    }
  }, [history, markCompleted]);

  const reset = () => {
    setW(0); setB(0);
    setHistory([lossFn(0, 0)]);
    setStageIdx(0);
    setAuto(false);
    completedRef.current = false;
  };

  const currentStage = STAGE_ORDER[stageIdx];
  const converged = loss < 0.05;

  // 다이어그램 표시용 — 다섯 점의 "평균 거동". 단위가 5점 표의 db·평균 e와 일치.
  // ē = ŷ̄ − ȳ = db (정확). dw 는 ē·x̄ 가 아니라 5점 e·x 평균이라 5점 표에서 분해돼 보임.
  const meanX = DATA.reduce((s, [xi]) => s + xi, 0) / DATA.length;
  const meanY = DATA.reduce((s, [, yi]) => s + yi, 0) / DATA.length;
  const meanYhat = DATA.reduce((s, [xi]) => s + Math.max(0, w * xi + b), 0) / DATA.length;
  const meanZ = w * meanX + b;
  const meanE = meanYhat - meanY;

  return (
    <article>
      <div className="text-xs font-mono text-muted">PHASE {meta.num}</div>
      <h1>{meta.title}</h1>
      <p className="text-muted mt-2 text-sm">
        지금까지 본 네 가지 — <strong>예측</strong>(A1) · <strong>오차</strong>(A2) ·
        <strong> 보폭</strong>(A3) · <strong>기울기 식</strong>(A4)을 한 step으로 묶어요.
        오른쪽 카드의 다섯 점 표가 매 step마다 다시 계산되고, 강조된 칸이 지금 어느 단계인지 알려줘요.
      </p>

      {/* ── 메인 한 viewport — 좌: 다이어그램+5점 표(넓게) / 우: 컨트롤+손실 곡선 ── */}
      <div className="mt-3 grid lg:grid-cols-[1.7fr_1fr] gap-3 items-start">
        {/* 좌측 컬럼 — 다이어그램 위, 5점 표는 넓은 폭으로 한 줄로 펴짐 */}
        <div className="space-y-2">
          <NeuronView w={w} b={b} grad={grad} stage={currentStage} meanX={meanX} meanY={meanY} meanZ={meanZ} meanYhat={meanYhat} meanE={meanE} />
          <FormulaCard
            w={w} b={b}
            grad={grad}
            current={currentStage}
            stepCount={stepCount}
          />
        </div>

        {/* 우측 컬럼 — 컨트롤(위) → 손실 곡선(아래). 좁은 폭에서도 짧게 유지. */}
        <div className="space-y-2">
          {/* 학습 컨트롤 — 직관/식 모드 공통 */}
          <div className="card p-3 space-y-2">
            <div className="grid grid-cols-3 gap-2 text-center font-mono text-xs">
              <Stat label="w" value={w.toFixed(3)} />
              <Stat label="b" value={b.toFixed(3)} />
              <Stat label="손실" value={loss.toFixed(4)} highlight={converged} />
            </div>
            <div className="text-[11px] text-muted">
              step {stepCount} · 학습률 η = {LR} · 다음 단계: <strong className="text-accent">
                {((stageIdx + 1) % STAGE_ORDER.length) + 1}. {STAGE_LABEL[STAGE_ORDER[(stageIdx + 1) % STAGE_ORDER.length]]}
              </strong>
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={advanceStage} className="btn-primary" disabled={auto}>
                다음 단계 →
              </button>
              <button onClick={stepOnce} className="btn-ghost" disabled={auto}>한 step 통째로</button>
              <button onClick={() => setAuto((v) => !v)} className="btn-ghost">
                {auto ? '⏸ 자동 멈춤' : '▶ 자동 학습'}
              </button>
              <button onClick={reset} className="btn-ghost">초기화</button>
            </div>
            <div className="text-[10px] text-muted leading-snug">
              ※ <strong>다음 단계 →</strong>를 한 번씩 누르며 *예측 → 오차 → 기울기 → 갱신* 4단계가
              어떻게 차례로 변하는지 직접 보세요. 갱신 단계로 넘어갈 때만 실제 가중치가 움직여요.
            </div>
          </div>

          <LossCurve history={history} />
        </div>
      </div>
    </article>
  );
}

/* ────────── 우측: 종합 식 카드 (다섯 점 표 + 평균 + 갱신) ──────────
   학생이 "이 숫자가 어떻게 나왔는지"를 자력으로 설명할 수 있도록,
   대표 한 점 대신 다섯 점 표와 평균까지 한 화면에 노출한다. */
function FormulaCard({
  w, b, grad, current, stepCount,
}: {
  w: number; b: number;
  grad: { dw: number; db: number; meanE: number };
  current: StageLabel; stepCount: number;
}) {
  // 다섯 점 각각의 ŷ_i, e_i, e_i·x_i — 표로 보여줌 (ReLU 통과 반영)
  const rows = DATA.map(([xi, yi]) => {
    const zi = w * xi + b;
    const yhati = Math.max(0, zi);
    const ei = yhati - yi;
    return { x: xi, y: yi, yhat: yhati, e: ei, ex: ei * xi };
  });
  const sumE = rows.reduce((s, r) => s + r.e, 0);
  const sumEx = rows.reduce((s, r) => s + r.ex, 0);

  const stageBg = (s: StageLabel) =>
    current === s ? 'bg-accent-bg' : '';

  return (
    <div className="card p-2.5 space-y-1.5 text-sm">
      <div className="flex items-baseline justify-between gap-2">
        <div className="font-medium text-[13px]">한 step의 모든 계산 — 다섯 점</div>
        <div className="text-[10px] text-muted">step <span className="font-mono text-accent">{stepCount}</span> · dw·db = 표의 평균</div>
      </div>

      {/* ── 1·2단계: 5점 표 (가로로 펼쳐짐) ── */}
      <div className={`rounded-md border border-border overflow-hidden ${stageBg('predict')}${current === 'error' ? ' bg-accent-bg' : ''}`}>
        <div className="flex items-baseline gap-2 px-2 pt-1">
          <span className="font-mono text-[10px] text-accent">1·2</span>
          <span className="text-[11px] font-medium">예측 ŷ_i = ReLU(w·x_i + b), 오차 e_i = ŷ_i − y_i</span>
        </div>
        <table className="w-full text-[11px] font-mono">
          <thead className="text-muted">
            <tr className="border-t border-border/60">
              <th className="text-right px-2 py-0">x</th>
              <th className="text-right">y</th>
              <th className="text-right">ŷ</th>
              <th className="text-right" style={{ color: 'rgb(190,18,60)' }}>e</th>
              <th className="text-right px-2" style={{ color: 'rgb(59,130,246)' }}>e·x</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.x} className="border-t border-border/30 leading-tight">
                <td className="text-right px-2">{r.x}</td>
                <td className="text-right">{r.y}</td>
                <td className="text-right text-accent">{r.yhat.toFixed(2)}</td>
                <td className="text-right" style={{ color: 'rgb(190,18,60)' }}>
                  {r.e >= 0 ? '+' : ''}{r.e.toFixed(2)}
                </td>
                <td className="text-right px-2" style={{ color: 'rgb(59,130,246)' }}>
                  {r.ex >= 0 ? '+' : ''}{r.ex.toFixed(2)}
                </td>
              </tr>
            ))}
            <tr className="border-t border-border bg-surface/40 text-[10px] text-muted leading-tight">
              <td className="text-right px-2" colSpan={3}>합계 →</td>
              <td className="text-right" style={{ color: 'rgb(190,18,60)' }}>
                {sumE >= 0 ? '+' : ''}{sumE.toFixed(2)}
              </td>
              <td className="text-right px-2" style={{ color: 'rgb(59,130,246)' }}>
                {sumEx >= 0 ? '+' : ''}{sumEx.toFixed(2)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* ── 3단계: 평균 (한 줄에 dw·db 동시) ── */}
      <div className={`rounded-md border border-border px-2.5 py-1 ${stageBg('gradient')}`}>
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="font-mono text-[10px] text-accent shrink-0">3 평균</span>
          <span className="font-mono text-[11px] leading-snug">
            dw = {sumEx.toFixed(2)} ÷ {DATA.length} =
            <span className="font-semibold ml-1" style={{ color: 'rgb(59,130,246)' }}>{grad.dw.toFixed(3)}</span>
            <span className="text-muted mx-2">·</span>
            db = {sumE.toFixed(2)} ÷ {DATA.length} =
            <span className="font-semibold ml-1" style={{ color: 'rgb(190,18,60)' }}>{grad.db.toFixed(3)}</span>
          </span>
        </div>
      </div>

      {/* 갱신(4단계)은 NeuronView 하단의 "갱신 식" 박스가 담당 — 중복 제거 */}
    </div>
  );
}

/* ────────── 좌측: 단일 뉴런 다이어그램 (단계별 강조) ──────────
   라벨 단위 = 다섯 점 평균. ē = ŷ̄ − ȳ = db (정확). dw 는 옆 5점 표에서 분해. */
function NeuronView({
  w, b, grad, stage, meanX, meanY, meanZ, meanYhat, meanE,
}: {
  w: number; b: number;
  grad: { dw: number; db: number };
  stage: StageLabel;
  meanX: number; meanY: number; meanZ: number; meanYhat: number; meanE: number;
}) {
  const W = 720, H = 220;
  const fwdY = 110;
  const xCx = 60, sumCx = 240, reluCx = 380, predCx = 520, yCy = 180;

  const aw = Math.min(Math.abs(w), 2);
  const wStrokeW = 1.2 + aw * 2.2;
  const wColor =
    Math.abs(w) < 0.05 ? 'rgb(var(--color-muted))'
    : w >= 0 ? 'rgb(var(--color-accent))' : 'rgb(190, 18, 60)';

  const back = 'rgb(190, 18, 60)';
  const blue = 'rgb(59, 130, 246)';
  const green = 'rgb(16, 185, 129)';
  const dwRatio = Math.min(Math.abs(grad.dw) / 25, 1);
  const dbRatio = Math.min(Math.abs(grad.db) / 7, 1);

  // 단계별 강조 토큰 — 흐름이 어디까지 왔는지 그림에서도 보이게
  const dim = 0.25;
  const opPredict = stage === 'predict' || stage === 'update' ? 1 : 0.6;
  const opError = stage === 'error' || stage === 'gradient' || stage === 'update' ? 1 : dim;
  const opGrad = stage === 'gradient' || stage === 'update' ? 1 : dim;
  const opUpdate = stage === 'update' ? 1 : 0.55;

  // 라벨 단위 = 다섯 점 평균. (이 데이터셋에서 x̄ = 3, ȳ = 7.)
  const x = meanX, yT = meanY;
  const z = meanZ;
  const yhat = meanYhat;
  const e = meanE;

  return (
    <div className="card p-3">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="xMidYMid meet">
        <defs>
          <marker id="a5-arr" markerWidth="5" markerHeight="5" refX="4.5" refY="2.5" orient="auto">
            <path d="M0,0 L5,2.5 L0,5 z" fill="rgb(var(--color-muted))" />
          </marker>
          <marker id="a5-back" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 z" fill={back} />
          </marker>
        </defs>

        {/* x → Σ */}
        <g opacity={opPredict}>
          <line x1={xCx + 22} y1={fwdY} x2={sumCx - 28} y2={fwdY}
            stroke={wColor} strokeWidth={wStrokeW} strokeOpacity={0.9} strokeLinecap="round" />
          <ValueBadge cx={(xCx + sumCx) / 2} cy={fwdY - 22} label={`× w = ${w.toFixed(2)}`} color={wColor} />
          {/* b 위에서 내려옴 */}
          <line x1={sumCx} y1={fwdY - 50} x2={sumCx} y2={fwdY - 26}
            stroke="rgb(var(--color-muted))" strokeWidth={1.4} strokeOpacity={0.7} />
          <ValueBadge cx={sumCx} cy={fwdY - 60} label={`+ b = ${b.toFixed(2)}`} color="rgb(var(--color-text))" />
          {/* Σ → ReLU */}
          <line x1={sumCx + 26} y1={fwdY} x2={reluCx - 28} y2={fwdY}
            stroke="rgb(var(--color-muted))" strokeWidth={1.6} strokeOpacity={0.7} strokeLinecap="round" />
          <ValueBadge cx={(sumCx + reluCx) / 2} cy={fwdY - 18} label={`z̄ = ${z.toFixed(2)}`} color="rgb(var(--color-accent))" />
          {/* ReLU 박스 */}
          <rect x={reluCx - 28} y={fwdY - 18} width={56} height={36} rx={6}
            fill="rgb(var(--color-accent-bg))" stroke="rgb(var(--color-accent))" strokeWidth={1.4} />
          <text x={reluCx} y={fwdY + 5} textAnchor="middle" fill="rgb(var(--color-accent))" fontSize={13} fontWeight={700}>ReLU</text>
          {/* ReLU → ŷ */}
          <line x1={reluCx + 28} y1={fwdY} x2={predCx - 22} y2={fwdY}
            stroke="rgb(var(--color-muted))" strokeWidth={1.6} strokeOpacity={0.7}
            strokeLinecap="round" markerEnd="url(#a5-arr)" />
          {/* x, ŷ, y 노드 */}
          <Node cx={xCx} cy={fwdY} label="x̄" />
          <circle cx={sumCx} cy={fwdY} r={24} fill="rgb(var(--color-accent-bg))" stroke="rgb(var(--color-accent))" strokeWidth={1.4} />
          <text x={sumCx} y={fwdY + 6} textAnchor="middle" fill="rgb(var(--color-accent))" fontSize={18} fontWeight={700}>Σ</text>
          <Node cx={predCx} cy={fwdY} label="ŷ̄" accent />
          <ValueBadge cx={xCx} cy={fwdY - 36} label={`x̄ = ${x}`} color="rgb(var(--color-text))" />
          <ValueBadge cx={predCx + 70} cy={fwdY} label={`ŷ̄ = ${yhat.toFixed(2)}`} color="rgb(var(--color-accent))" />
        </g>

        {/* y 정답 + 오차 점선 (Stage 2 = error 부터 강조) */}
        <g opacity={opError}>
          <Node cx={predCx} cy={yCy} label="ȳ" />
          <ValueBadge cx={predCx + 70} cy={yCy} label={`ȳ = ${yT}`} color="rgb(var(--color-text))" />
          <line x1={predCx} y1={fwdY + 22} x2={predCx} y2={yCy - 22}
            stroke={back} strokeWidth={1.6} strokeDasharray="4 3" />
          <ValueBadge cx={predCx + 78} cy={(fwdY + yCy) / 2 + 4} label={`ē = ${e.toFixed(2)} ( = db)`} color={back} />
        </g>

        {/* dw / db 화살표 — gradient 단계에서 진해짐 */}
        <g opacity={opGrad}>
          <path
            d={`M ${predCx - 10} ${fwdY + 8} C ${(predCx + sumCx) / 2} 200, ${(predCx + sumCx) / 2 - 30} 200, ${(xCx + sumCx) / 2} ${fwdY - 12}`}
            fill="none" stroke={blue} strokeWidth={1.0 + dwRatio * 3.5}
            strokeOpacity={0.25 + dwRatio * 0.7} strokeDasharray="6 4" strokeLinecap="round"
            markerEnd="url(#a5-back)" />
          <ValueBadge cx={(xCx + sumCx) / 2 + 60} cy={fwdY + 70} label={`dw = ${grad.dw.toFixed(2)}`} color={blue} />
          <path
            d={`M ${predCx - 8} ${fwdY - 8} C ${(predCx + sumCx) / 2} 30, ${sumCx + 80} 28, ${sumCx + 28} ${fwdY - 56}`}
            fill="none" stroke={blue} strokeWidth={1.0 + dbRatio * 3.5}
            strokeOpacity={0.25 + dbRatio * 0.7} strokeDasharray="6 4" strokeLinecap="round"
            markerEnd="url(#a5-back)" />
          <ValueBadge cx={predCx - 60} cy={28} label={`db = ${grad.db.toFixed(2)}`} color={blue} />
        </g>

        {/* update 단계 — Δw·Δb 라벨로 화면 하단에 잠깐 강조 */}
        <g opacity={opUpdate}>
          <ValueBadge
            cx={W / 2} cy={H - 14}
            label={`Δw = ${(-LR * grad.dw).toFixed(3)}    Δb = ${(-LR * grad.db).toFixed(3)}`}
            color={green}
          />
        </g>
      </svg>
      <div className={`mt-2 pt-2 px-2 font-mono text-[12px] leading-relaxed space-y-0.5 transition-colors ${
        stage === 'update'
          ? 'border-2 border-accent bg-accent-bg/50 rounded-md py-2 font-bold'
          : 'border-t border-border'
      }`}>
        <div className={`text-[10px] font-sans mb-1 ${stage === 'update' ? 'text-accent font-semibold' : 'text-muted font-normal'}`}>
          {stage === 'update' ? '★ 지금 — 갱신 식이 적용되는 단계' : '갱신 식 (일반형) — 한 step에 w·b 동시 적용'}
        </div>
        <div>
          w ← w − η · dw
          {stage === 'update' && (
            <span className="ml-2 text-muted">
              ({(w - LR * grad.dw).toFixed(3)} = {w.toFixed(3)} − {LR}·{grad.dw < 0 ? `(${grad.dw.toFixed(3)})` : grad.dw.toFixed(3)})
            </span>
          )}
        </div>
        <div>
          b ← b − η · db
          {stage === 'update' && (
            <span className="ml-2 text-muted">
              ({(b - LR * grad.db).toFixed(3)} = {b.toFixed(3)} − {LR}·{grad.db < 0 ? `(${grad.db.toFixed(3)})` : grad.db.toFixed(3)})
            </span>
          )}
        </div>
      </div>
      <div className="text-[10.5px] text-muted px-1 leading-snug mt-1.5">
        라벨은 다섯 점 <strong>평균</strong> — ē = db는 정확히 같음. dw는 옆 5점 표에서 분해.
      </div>
    </div>
  );
}

function Node({ cx, cy, label, accent }: { cx: number; cy: number; label: string; accent?: boolean }) {
  return (
    <g>
      <circle cx={cx} cy={cy} r={22}
        fill={accent ? 'rgb(var(--color-accent))' : 'rgb(var(--color-surface))'}
        stroke={accent ? 'rgb(var(--color-accent))' : 'rgb(var(--color-muted))'}
        strokeWidth={1.4}
        strokeOpacity={accent ? 1 : 0.6} />
      <text x={cx} y={cy + 6} textAnchor="middle"
        fill={accent ? '#fff' : 'rgb(var(--color-text))'} fontSize={17} fontWeight={700}>
        {label}
      </text>
    </g>
  );
}

function ValueBadge({ cx, cy, label, color }: { cx: number; cy: number; label: string; color: string }) {
  const w = label.length * 7 + 14;
  const h = 18;
  return (
    <g>
      <rect x={cx - w / 2} y={cy - h / 2} width={w} height={h} rx={4}
        fill="rgb(var(--color-bg))" stroke={color} strokeOpacity={0.55} strokeWidth={1} />
      <text x={cx} y={cy + 4} textAnchor="middle" fill={color} fontSize={11.5} fontWeight={600}>
        {label}
      </text>
    </g>
  );
}

/* ────────── 좌측 하단: 손실 곡선 ────────── */
function LossCurve({ history }: { history: number[] }) {
  const W = 720, H = 130, padL = 36, padR = 12, padT = 10, padB = 22;
  const N = history.length;
  const Lmax = Math.max(0.5, ...history);
  const sx = (i: number) => padL + (N > 1 ? (i / (N - 1)) : 0) * (W - padL - padR);
  const sy = (L: number) => H - padB - (L / Lmax) * (H - padT - padB);

  let path = '';
  history.forEach((L, i) => { path += `${i === 0 ? 'M' : 'L'}${sx(i)},${sy(L)} `; });

  const last = history[N - 1];
  const prev = N > 1 ? history[N - 2] : last;
  const delta = prev - last;

  return (
    <div className="card p-3">
      <div className="flex items-baseline justify-between">
        <div className="text-sm font-medium">손실 곡선</div>
        <div className="text-[11px] font-mono text-muted">
          step {N - 1} · 손실 <span className="text-accent">{last.toFixed(4)}</span>
          {N > 1 && (
            <span className="ml-2">
              {Math.abs(delta) < 5e-5 ? '≈ 0' : (delta > 0 ? '↓ ' : '↑ ') + Math.abs(delta).toFixed(4)}
            </span>
          )}
        </div>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full mt-1">
        <line x1={padL} y1={H - padB} x2={W - padR} y2={H - padB} stroke="rgb(var(--color-border))" />
        <line x1={padL} y1={padT} x2={padL} y2={H - padB} stroke="rgb(var(--color-border))" />
        <text x={W - padR} y={H - 6} textAnchor="end" fontSize={9} fill="rgb(var(--color-muted))">step</text>
        <text x={padL - 4} y={padT + 8} textAnchor="end" fontSize={9} fill="rgb(var(--color-muted))">손실</text>
        {/* 0.05 기준선 — 학습 종료 임계 */}
        <line x1={padL} y1={sy(0.05)} x2={W - padR} y2={sy(0.05)}
          stroke="rgb(16,185,129)" strokeOpacity={0.5} strokeDasharray="3 3" strokeWidth={1} />
        <path d={path} fill="none" stroke="rgb(var(--color-accent))" strokeWidth={1.6} />
        {history.map((L, i) => (
          <circle key={i} cx={sx(i)} cy={sy(L)} r={2} fill="rgb(var(--color-accent))" />
        ))}
      </svg>
    </div>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`p-1.5 rounded border ${highlight ? 'border-accent bg-accent-bg' : 'border-border'}`}>
      <div className="text-[11px] text-muted">{label}</div>
      <div className="text-sm font-semibold">{value}</div>
    </div>
  );
}
