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
const STAGE_DESC: Record<StageLabel, string> = {
  predict: '입력 x로 ŷ을 계산',
  error: 'ŷ 과 정답 y 의 차이',
  gradient: '평균(e·x), 평균(e)',
  update: 'w·b 한 step 이동',
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
  const [showFormula, setShowFormula] = useState(false);
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
  // 각 단계의 변화를 손에 잡히도록 한다. 갱신 단계(3 → 4)에서만 실제 가중치가 움직임.
  // manualStage: 다음에 보여 줄 단계 인덱스. 0~3 cycle.
  const advanceStage = () => {
    const cur = stageIdx;
    // predict(0) → error(1) → gradient(2) → update(3) → predict(0)으로 다시
    const next = (cur + 1) % STAGE_ORDER.length;
    setStageIdx(next);
    // update 단계로 진입할 때(=cur 2 → next 3) 실제 가중치 갱신
    if (cur === STAGE_ORDER.length - 2) {
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

  // 자동 학습 80 step 도달 시 자동 정지 — setInterval cleanup이 처리하도록 ref 가드.
  // (effect 안에서 setAuto를 직접 호출하는 패턴은 cascading render 경고를 유발)
  const autoLimitRef = useRef(false);
  useEffect(() => {
    if (auto && stepCount >= 80 && !autoLimitRef.current) {
      autoLimitRef.current = true;
      // 마이크로태스크로 미뤄 렌더 사이클 외부에서 갱신
      queueMicrotask(() => setAuto(false));
    }
    if (!auto) autoLimitRef.current = false;
  }, [auto, stepCount]);

  const reset = () => {
    setW(0); setB(0);
    setHistory([lossFn(0, 0)]);
    setStageIdx(0);
    setAuto(false);
    completedRef.current = false;
  };

  const currentStage = STAGE_ORDER[stageIdx];
  const converged = loss < 0.05;

  // 다이어그램 표시용 — 한 점(x=3)을 대표로 쓴다
  const sampleX = 3;
  const sampleY = 2 * sampleX + 1;
  const sampleZ = w * sampleX + b;
  const sampleYhat = Math.max(0, sampleZ);
  const sampleE = sampleYhat - sampleY;

  return (
    <article>
      <div className="text-xs font-mono text-muted">PHASE {meta.num}</div>
      <h1>{meta.title}</h1>
      <p className="text-muted mt-2 text-sm">
        지금까지 본 네 가지 — <strong>예측</strong>(A1) · <strong>오차</strong>(A2) ·
        <strong> 보폭</strong>(A3) · <strong>기울기 식</strong>(A4)을 한 step으로 묶어요.
        한 단계 진행 버튼을 누르면 다이어그램과 손실 곡선이 동시에 갱신되고, 오른쪽 라벨이 어디까지 왔는지 알려줘요.
      </p>

      {/* 모드 토글 — Stage 1(직관) ↔ Stage 2(식 보기) */}
      <div className="mt-4 flex flex-wrap gap-2 items-center">
        <div className="inline-flex rounded-md border border-border overflow-hidden">
          <button
            onClick={() => setShowFormula(false)}
            className={`px-3 py-1.5 text-sm transition ${!showFormula ? 'bg-accent text-white' : 'bg-bg text-muted hover:bg-surface'}`}
          >
            직관
          </button>
          <button
            onClick={() => setShowFormula(true)}
            className={`px-3 py-1.5 text-sm transition ${showFormula ? 'bg-accent text-white' : 'bg-bg text-muted hover:bg-surface'}`}
          >
            식 보기
          </button>
        </div>
        <span className="text-xs text-muted">
          {showFormula ? '같은 화면에 한 step의 식과 실제 숫자값을 함께 표시.' : '먼저 한 바퀴가 돌아가는 모습부터 — 식은 토글로 등장.'}
        </span>
      </div>

      {/* ── 메인 한 viewport — 좌: 다이어그램+손실 / 우: 4단계 라벨 또는 식 카드 ── */}
      <div className="mt-4 grid lg:grid-cols-[1.7fr_1fr] gap-4 items-start">
        {/* 좌측 컬럼 */}
        <div className="space-y-3">
          <NeuronView w={w} b={b} grad={grad} stage={currentStage} />
          <LossCurve history={history} />
        </div>

        {/* 우측 컬럼 — 컨트롤(위) → 단계 라벨/식 카드(아래). C1과 동일한 우선순위. */}
        <div className="space-y-3">
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

          {!showFormula ? (
            <StageLabels current={currentStage} stepCount={stepCount} />
          ) : (
            <FormulaCard
              w={w} b={b}
              grad={grad}
              x={sampleX} y={sampleY} z={sampleZ} yhat={sampleYhat} e={sampleE}
              current={currentStage}
              stepCount={stepCount}
            />
          )}

          {converged && (
            <div className="aside-tip text-sm">
              <strong>학습 종료.</strong> 손실이 0.05 이하로 내려갔어요 (정답: w = 2, b = 1).
              한 step의 흐름이 손에 익었으면 다음 페이즈에서 실제 데이터로 굴려봐요.
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

/* ────────── 우측: Stage 1 — 4단계 라벨 (식 없음) ────────── */
function StageLabels({ current, stepCount }: { current: StageLabel; stepCount: number }) {
  return (
    <div className="card p-3">
      <div className="text-sm font-medium">한 step 안에서 일어나는 일</div>
      <p className="text-[12px] text-muted mt-1">
        지금 어느 단계인지 굵게 표시해요. 식은 아직 보지 마세요 — 흐름부터.
      </p>
      <ol className="mt-3 space-y-2">
        {STAGE_ORDER.map((s, i) => {
          const active = s === current;
          return (
            <li
              key={s}
              className={`flex items-start gap-3 rounded-md px-3 py-2 border transition ${
                active
                  ? 'border-accent bg-accent-bg text-text'
                  : 'border-border bg-bg text-muted'
              }`}
            >
              <span className={`font-mono text-xs mt-0.5 ${active ? 'text-accent' : 'text-muted'}`}>
                {i + 1}
              </span>
              <span className="flex-1">
                <span className={`text-sm font-medium ${active ? 'text-text' : ''}`}>
                  {STAGE_LABEL[s]}
                </span>
                <span className="block text-[12px] mt-0.5">{STAGE_DESC[s]}</span>
              </span>
            </li>
          );
        })}
      </ol>
      <div className="mt-3 text-[11px] text-muted leading-snug">
        ※ 한 step = 1번 → 2번 → 3번 → 4번까지가 한 묶음. 누른 횟수: <span className="font-mono text-accent">{stepCount}</span>
      </div>
    </div>
  );
}

/* ────────── 우측: Stage 2 — 종합 식 카드 (다섯 점 표 + 평균 + 갱신) ──────────
   학생이 "이 숫자가 어떻게 나왔는지"를 자력으로 설명할 수 있도록,
   대표 한 점 대신 다섯 점 표와 평균까지 한 화면에 노출한다. */
function FormulaCard({
  w, b, grad, current, stepCount,
}: {
  w: number; b: number;
  grad: { dw: number; db: number; meanE: number };
  x: number; y: number; z: number; yhat: number; e: number;
  current: StageLabel; stepCount: number;
}) {
  const newW = w - LR * grad.dw;
  const newB = b - LR * grad.db;

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
    <div className="card p-3 space-y-2 text-sm">
      <div className="font-medium">한 step의 모든 계산</div>
      <p className="text-[11px] text-muted leading-snug">
        다섯 점 모두에 같은 w·b를 적용해 ŷ을 만들고, 오차를 잰 뒤 평균으로 dw·db를 만듭니다.
        화면의 모든 숫자는 *지금의 w·b로* 다시 계산된 값이에요.
      </p>

      {/* ── 1·2단계: 5점 표 ── */}
      <div className={`rounded-md border border-border overflow-hidden ${stageBg('predict')}${current === 'error' ? ' bg-accent-bg' : ''}`}>
        <div className="flex items-baseline gap-2 px-2 pt-1.5">
          <span className="font-mono text-[10px] text-accent">1·2</span>
          <span className="text-[11px] font-medium">예측 ŷ_i = ReLU(w·x_i + b), 오차 e_i = ŷ_i − y_i</span>
        </div>
        <table className="w-full text-[11px] font-mono mt-1">
          <thead className="text-muted">
            <tr className="border-t border-border/60">
              <th className="text-right px-2 py-0.5">x</th>
              <th className="text-right">y</th>
              <th className="text-right">ŷ</th>
              <th className="text-right" style={{ color: 'rgb(190,18,60)' }}>e</th>
              <th className="text-right" style={{ color: 'rgb(59,130,246)' }}>e·x</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.x} className="border-t border-border/30">
                <td className="text-right px-2">{r.x}</td>
                <td className="text-right">{r.y}</td>
                <td className="text-right text-accent">{r.yhat.toFixed(2)}</td>
                <td className="text-right" style={{ color: 'rgb(190,18,60)' }}>
                  {r.e >= 0 ? '+' : ''}{r.e.toFixed(2)}
                </td>
                <td className="text-right" style={{ color: 'rgb(59,130,246)' }}>
                  {r.ex >= 0 ? '+' : ''}{r.ex.toFixed(2)}
                </td>
              </tr>
            ))}
            <tr className="border-t border-border bg-surface/40 text-[10px] text-muted">
              <td className="text-right px-2" colSpan={3}>합계 →</td>
              <td className="text-right" style={{ color: 'rgb(190,18,60)' }}>
                {sumE >= 0 ? '+' : ''}{sumE.toFixed(2)}
              </td>
              <td className="text-right" style={{ color: 'rgb(59,130,246)' }}>
                {sumEx >= 0 ? '+' : ''}{sumEx.toFixed(2)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* ── 3단계: 평균 ── */}
      <div className={`rounded-md border border-border px-2.5 py-1.5 ${stageBg('gradient')}`}>
        <div className="flex items-baseline gap-2">
          <span className="font-mono text-[10px] text-accent">3</span>
          <span className="text-[11px] font-medium">평균 — A4의 dw·db 식</span>
        </div>
        <div className="font-mono text-[12px] mt-0.5 leading-relaxed">
          dw = (합 e·x) ÷ N = {sumEx.toFixed(2)} ÷ {DATA.length} =
          <span className="font-semibold ml-1" style={{ color: 'rgb(59,130,246)' }}>{grad.dw.toFixed(3)}</span>
          <br />
          db = (합 e) ÷ N = {sumE.toFixed(2)} ÷ {DATA.length} =
          <span className="font-semibold ml-1" style={{ color: 'rgb(190,18,60)' }}>{grad.db.toFixed(3)}</span>
        </div>
      </div>

      {/* ── 4단계: 갱신 ── */}
      <div className={`rounded-md border border-border px-2.5 py-1.5 ${stageBg('update')}`}>
        <div className="flex items-baseline gap-2">
          <span className="font-mono text-[10px] text-accent">4</span>
          <span className="text-[11px] font-medium">갱신 — η = {LR}</span>
        </div>
        <div className="font-mono text-[12px] mt-0.5 leading-relaxed">
          w ← {w.toFixed(3)} − {LR}·{grad.dw.toFixed(3)} =
          <span className="font-semibold text-accent ml-1">{newW.toFixed(3)}</span>
          <br />
          b ← {b.toFixed(3)} − {LR}·{grad.db.toFixed(3)} =
          <span className="font-semibold text-accent ml-1">{newB.toFixed(3)}</span>
        </div>
      </div>

      <div className="border-t border-border pt-1.5 text-[10px] text-muted">
        누른 횟수: <span className="font-mono text-accent">{stepCount}</span>
        <span className="ml-2">"한 step 진행"을 누르면 위 표 전체가 새 w·b로 다시 계산돼요.</span>
      </div>
    </div>
  );
}

/* ────────── 좌측: 단일 뉴런 다이어그램 (단계별 강조) ────────── */
function NeuronView({
  w, b, grad, stage,
}: {
  w: number; b: number;
  grad: { dw: number; db: number };
  stage: StageLabel;
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

  // 대표 점(x=3)으로 표시
  const x = 3, yT = 2 * x + 1;
  const z = w * x + b;
  const yhat = Math.max(0, z);
  const e = yhat - yT;

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
          <ValueBadge cx={(sumCx + reluCx) / 2} cy={fwdY - 18} label={`z = ${z.toFixed(2)}`} color="rgb(var(--color-accent))" />
          {/* ReLU 박스 */}
          <rect x={reluCx - 28} y={fwdY - 18} width={56} height={36} rx={6}
            fill="rgb(var(--color-accent-bg))" stroke="rgb(var(--color-accent))" strokeWidth={1.4} />
          <text x={reluCx} y={fwdY + 5} textAnchor="middle" fill="rgb(var(--color-accent))" fontSize={13} fontWeight={700}>ReLU</text>
          {/* ReLU → ŷ */}
          <line x1={reluCx + 28} y1={fwdY} x2={predCx - 22} y2={fwdY}
            stroke="rgb(var(--color-muted))" strokeWidth={1.6} strokeOpacity={0.7}
            strokeLinecap="round" markerEnd="url(#a5-arr)" />
          {/* x, ŷ, y 노드 */}
          <Node cx={xCx} cy={fwdY} label="x" />
          <circle cx={sumCx} cy={fwdY} r={24} fill="rgb(var(--color-accent-bg))" stroke="rgb(var(--color-accent))" strokeWidth={1.4} />
          <text x={sumCx} y={fwdY + 6} textAnchor="middle" fill="rgb(var(--color-accent))" fontSize={18} fontWeight={700}>Σ</text>
          <Node cx={predCx} cy={fwdY} label="ŷ" accent />
          <ValueBadge cx={xCx} cy={fwdY - 36} label={`x = ${x}`} color="rgb(var(--color-text))" />
          <ValueBadge cx={predCx + 70} cy={fwdY} label={`ŷ = ${yhat.toFixed(2)}`} color="rgb(var(--color-accent))" />
        </g>

        {/* y 정답 + 오차 점선 (Stage 2 = error 부터 강조) */}
        <g opacity={opError}>
          <Node cx={predCx} cy={yCy} label="y" />
          <ValueBadge cx={predCx + 70} cy={yCy} label={`y = ${yT}`} color="rgb(var(--color-text))" />
          <line x1={predCx} y1={fwdY + 22} x2={predCx} y2={yCy - 22}
            stroke={back} strokeWidth={1.6} strokeDasharray="4 3" />
          <ValueBadge cx={predCx + 78} cy={(fwdY + yCy) / 2 + 4} label={`e = ${e.toFixed(2)}`} color={back} />
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
        <div>w ← w − η · dw</div>
        <div>b ← b − η · db</div>
      </div>
      <div className="text-[10.5px] text-muted px-1 leading-snug mt-1.5">
        대표 점 x = 3 (정답 y = 7)으로 그렸어요. 가중치 선 굵기는 |w|, 파란 화살표 굵기는 다섯 점 평균 |dw|·|db|에 비례.
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
