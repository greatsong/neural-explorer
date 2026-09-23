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
  update: '업데이트',
};

// Phase5 (옛본) 과 동일 — 단일 뉴런 ŷ = ReLU(w·x + b), 정답선 y = 2x + 1
type Point = [number, number];
const DATA_FIVE: Point[] = [
  [1, 3], [2, 5], [3, 7], [4, 9], [5, 11],
];
// 특강 손계산용 — 다섯 점 중 가운데 한 점만. 평균이 곧 그 점의 값이다.
const DATA_ONE: Point[] = [[3, 7]];
type DataMode = 5 | 1;
const dataFor = (mode: DataMode) => (mode === 1 ? DATA_ONE : DATA_FIVE);

// 기본은 데이터 1개. #/a5?data=5 → 데이터 5개 (#/a5?data=1 도 데이터 1개로 허용)
const readDataModeFromHash = (): DataMode => {
  const hash = window.location.hash;
  const q = hash.indexOf('?');
  if (q < 0) return 1;
  const params = new URLSearchParams(hash.slice(q + 1).split('#')[0]);
  return params.get('data') === '5' ? 5 : 1;
};

const LR = 0.05; // A3에서 정한 보폭 → 여기서는 그대로 사용 (학습률 슬라이더 없음)

const reluPrime = (z: number) => (z >= 0 ? 1 : 0);

const lossFn = (data: Point[], w: number, b: number) =>
  data.reduce((acc, [x, y]) => {
    const z = w * x + b;
    const yhat = Math.max(0, z);
    return acc + 0.5 * (yhat - y) ** 2;
  }, 0) / data.length;

const gradient = (data: Point[], w: number, b: number) => {
  let dw = 0, db = 0, sumE = 0;
  data.forEach(([x, y]) => {
    const z = w * x + b;
    const yhat = Math.max(0, z);
    const e = yhat - y;
    const r = reluPrime(z);
    dw += e * r * x;
    db += e * r;
    sumE += e;
  });
  return { dw: dw / data.length, db: db / data.length, meanE: sumE / data.length };
};

export function PhaseA5() {
  const meta = PHASES.find((p) => p.id === 'a5')!;
  const markCompleted = useApp((s) => s.markCompleted);
  const present = useApp((s) => s.present);

  // 데이터 모드 — 1(기본, 점 (3, 7) 하나) / 5(다섯 점)
  const [dataMode, setDataMode] = useState<DataMode>(() => readDataModeFromHash());
  const DATA = dataFor(dataMode);
  const one = dataMode === 1;

  const [w, setW] = useState(0);
  const [b, setB] = useState(0);
  const [history, setHistory] = useState<number[]>(() => [lossFn(dataFor(dataMode), 0, 0)]);
  const [stageIdx, setStageIdx] = useState(0); // 0~3: 마지막으로 강조된 단계
  const [auto, setAuto] = useState(false);
  // "한 step 통째로"가 단계를 도는 동안 true — 다른 버튼이 끼어들어 순서가 섞이거나 두 번 갱신되지 않게 막는다
  const [cycling, setCycling] = useState(false);
  const stepCount = history.length - 1;

  // setInterval 안에서 stale closure 없이 최신 w·b·데이터를 읽기 위한 ref
  const wRef = useRef(w);
  const bRef = useRef(b);
  const dataRef = useRef(DATA);
  useEffect(() => { wRef.current = w; bRef.current = b; }, [w, b]);
  useEffect(() => { dataRef.current = DATA; }, [DATA]);
  // "한 step 통째로" 사이클 — 모드 전환·초기화 때 중간에 끊기 위해 보관
  const cycleRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loss = lossFn(DATA, w, b);
  const grad = gradient(DATA, w, b);
  const completedRef = useRef(false);

  // 한 step = 예측 → 오차 → 기울기 → 업데이트를 차례로 보여 준 뒤, 업데이트 화면을 떠날 때 실제 갱신하고
  // 다음 step의 예측으로 돌아간다. "다음 단계 →"와 같은 순서라, 업데이트 화면에는 방금 적용할 옛값 → 새값이 보인다.
  // (예전에는 업데이트 화면을 띄우는 순간 갱신해, 화면에 그다음 step의 값이 보이고 이어서 누른 "다음 단계 →"가 한 번 더 갱신했다.)
  // 기울기 단계의 역전파 화살표가 차례로 그려질 시간을 주려고 한 단계를 600ms로 둔다.
  // markCompleted 호출은 history useEffect로 위임 — 여기서는 setState만.
  const stepOnce = () => {
    let i = 0;
    setStageIdx(0);
    setCycling(true);
    if (cycleRef.current) clearInterval(cycleRef.current);
    const cycle = setInterval(() => {
      i += 1;
      if (i < STAGE_ORDER.length) {
        setStageIdx(i);
        return;
      }
      clearInterval(cycle);
      cycleRef.current = null;
      const data = dataRef.current;
      const cw = wRef.current;
      const cb = bRef.current;
      const g = gradient(data, cw, cb);
      const nw = cw - LR * g.dw;
      const nb = cb - LR * g.db;
      setW(nw);
      setB(nb);
      setHistory((h) => [...h, lossFn(data, nw, nb)]);
      setStageIdx(0);
      setCycling(false);
    }, 600);
    cycleRef.current = cycle;
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
      const data = dataRef.current;
      const cw = wRef.current;
      const cb = bRef.current;
      const g = gradient(data, cw, cb);
      const nw = cw - LR * g.dw;
      const nb = cb - LR * g.db;
      setW(nw);
      setB(nb);
      setHistory((h) => [...h, lossFn(data, nw, nb)]);
    }
  };

  // 자동 학습 — setInterval 안에서는 setState만 호출하고,
  // markCompleted(zustand 갱신)는 별도 useEffect에서 history 변화를 보고 호출한다.
  useEffect(() => {
    if (!auto) return;
    const id = setInterval(() => {
      const data = dataRef.current;
      const cw = wRef.current;
      const cb = bRef.current;
      const g = gradient(data, cw, cb);
      const newW = cw - LR * g.dw;
      const newB = cb - LR * g.db;
      const newLoss = lossFn(data, newW, newB);
      setW(newW);
      setB(newB);
      setHistory((h) => [...h, newLoss]);
      // 한 번 돌 때마다 한 step 전체(예측→오차→기울기→업데이트)를 적용한다.
      // 단계 표시를 따로 돌리면 실제 처리와 어긋나므로, 다음 step의 시작인 예측에 둔다.
      setStageIdx(0);
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

  const resetFor = (mode: DataMode) => {
    if (cycleRef.current) { clearInterval(cycleRef.current); cycleRef.current = null; }
    setCycling(false);
    setW(0); setB(0);
    setHistory([lossFn(dataFor(mode), 0, 0)]);
    setStageIdx(0);
    setAuto(false);
    completedRef.current = false;
  };
  const reset = () => resetFor(dataMode);

  // 모드 전환 — w=0, b=0, step 0으로 초기화. URL도 맞춰 두되 hashchange는 일으키지 않는다.
  const switchDataMode = (mode: DataMode) => {
    if (mode === dataMode) return;
    setDataMode(mode);
    resetFor(mode);
    const base = window.location.hash.split('?')[0] || '#/a5';
    const nextHash = mode === 5 ? `${base}?data=5` : base;
    window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}${nextHash}`);
  };

  // 같은 A5 화면에서 주소만 바뀐 경우(#/a5 ↔ #/a5?data=5)에도 모드를 따라간다.
  const dataModeRef = useRef(dataMode);
  useEffect(() => { dataModeRef.current = dataMode; }, [dataMode]);
  useEffect(() => {
    const onHash = () => {
      const mode = readDataModeFromHash();
      if (mode !== dataModeRef.current) {
        setDataMode(mode);
        resetFor(mode);
      }
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
    // resetFor는 setState와 ref만 다루므로 최초 1회 등록으로 충분하다.
  }, []);

  const currentStage = STAGE_ORDER[stageIdx];
  const converged = loss < 0.05;

  // 다이어그램 표시용 — 데이터 5개 모드에서는 다섯 점의 평균값, 1개 모드에서는 그 점의 값.
  const meanX = DATA.reduce((s, [xi]) => s + xi, 0) / DATA.length;
  const meanY = DATA.reduce((s, [, yi]) => s + yi, 0) / DATA.length;
  const meanYhat = DATA.reduce((s, [xi]) => s + Math.max(0, w * xi + b), 0) / DATA.length;
  const meanZ = w * meanX + b;
  const meanE = meanYhat - meanY;

  // 칸마다 한 번만 정의해 두고, 보통 화면과 발표 모드 화면에서 배치만 달리한다.
  const neuronView = (
    <NeuronView w={w} b={b} grad={grad} stage={currentStage} meanX={meanX} meanY={meanY} meanZ={meanZ} meanYhat={meanYhat} meanE={meanE} one={one} />
  );
  const formulaCard = (
    <FormulaCard
      data={DATA}
      w={w} b={b}
      grad={grad}
      current={currentStage}
      stepCount={stepCount}
    />
  );
  const controlsCard = (
    // 발표 모드에서는 가로 막대로 펼쳐 그림 위에 둔다 — 버튼과 그림이 1280×720 한 화면에 함께 보이게
    <div className={present ? 'card p-3 flex flex-wrap items-center gap-x-6 gap-y-2' : 'card p-3 space-y-2'}>
      {/* 데이터 모드 토글 — 기존 버튼 스타일(선택=primary, 나머지=ghost)을 작게 */}
      <div className="flex gap-1.5" role="group">
        {([1, 5] as DataMode[]).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => switchDataMode(m)}
            aria-pressed={dataMode === m}
            className={`${dataMode === m ? 'btn-primary border border-accent' : 'btn-ghost'} px-2.5 py-1 text-xs`}
          >
            {m === 5 ? '데이터 5개' : '데이터 1개'}
          </button>
        ))}
      </div>
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
        <button onClick={advanceStage} className="btn-primary" disabled={auto || cycling}>
          다음 단계 →
        </button>
        <button onClick={stepOnce} className="btn-ghost" disabled={auto || cycling}>한 step 통째로</button>
        <button onClick={() => setAuto((v) => !v)} className="btn-ghost" disabled={cycling}>
          {auto ? '⏸ 자동 멈춤' : '▶ 자동 학습'}
        </button>
        <button onClick={reset} className="btn-ghost">초기화</button>
      </div>
      <div className="text-[10px] text-muted leading-snug" data-present="hide">
        ※ <strong>다음 단계 →</strong>를 한 번씩 누르며 *예측 → 오차 → 기울기 → 업데이트* 4단계가
        어떻게 차례로 변하는지 직접 보세요. 업데이트 단계로 넘어갈 때만 실제 가중치가 움직여요.
      </div>
    </div>
  );

  return (
    <article>
      <div className="text-xs font-mono text-muted" data-present="hide">PHASE {meta.num}</div>
      <h1>{meta.title}</h1>
      <p className="text-muted mt-2 text-sm" data-present="hide">
        지금까지 본 네 가지 — <strong>예측</strong>(A1) · <strong>오차</strong>(A2) ·
        <strong> 보폭</strong>(A3) · <strong>기울기 식</strong>(A4)을 한 step으로 묶어요.
        {!one && <> 오른쪽 카드의 다섯 점 표가 매 step마다 다시 계산되고, 강조된 칸이 지금 어느 단계인지 알려줘요.</>}
      </p>

      {present ? (
        /* 발표 모드 — 조작 막대(위) → 전체 폭 뉴런 그림(라벨이 커진다) → 계산표·손실 곡선(아래) */
        <div className="mt-3 space-y-3">
          {controlsCard}
          {neuronView}
          <div className="grid lg:grid-cols-2 gap-3 items-start">
            {formulaCard}
            <LossCurve history={history} />
          </div>
        </div>
      ) : (
        /* ── 메인 한 viewport — 좌: 다이어그램+5점 표(넓게) / 우: 컨트롤+손실 곡선 ── */
        <div className="mt-3 grid lg:grid-cols-[1.7fr_1fr] gap-3 items-start">
          {/* 좌측 컬럼 — 다이어그램 위, 5점 표는 넓은 폭으로 한 줄로 펴짐 */}
          <div className="space-y-2">
            {neuronView}
            {formulaCard}
          </div>

          {/* 우측 컬럼 — 컨트롤(위) → 손실 곡선(아래). 좁은 폭에서도 짧게 유지. */}
          <div className="space-y-2">
            {controlsCard}
            <LossCurve history={history} />
          </div>
        </div>
      )}
    </article>
  );
}

/* ────────── 우측: 종합 식 카드 (다섯 점 표 + 평균 + 갱신) ──────────
   학생이 "이 숫자가 어떻게 나왔는지"를 자력으로 설명할 수 있도록,
   대표 한 점 대신 다섯 점 표와 평균까지 한 화면에 노출한다. */
function FormulaCard({
  data, w, b, grad, current, stepCount,
}: {
  data: Point[];
  w: number; b: number;
  grad: { dw: number; db: number; meanE: number };
  current: StageLabel; stepCount: number;
}) {
  // 데이터 1개 모드: 평균 = 그 점의 값이므로 합계 행과 "÷ n" 평균 표기를 숨긴다.
  const one = data.length === 1;
  // 다섯 점 각각의 ŷ_i, e_i, e_i·x_i — 표로 보여줌 (ReLU 통과 반영)
  const rows = data.map(([xi, yi]) => {
    const zi = w * xi + b;
    const yhati = Math.max(0, zi);
    const ei = yhati - yi;
    return { x: xi, y: yi, yhat: yhati, e: ei, ex: ei * xi };
  });
  const sumE = rows.reduce((s, r) => s + r.e, 0);
  const sumEx = rows.reduce((s, r) => s + r.ex, 0);

  const stageBg = (s: StageLabel) =>
    current === s ? 'bg-accent-bg' : '';
  // 아직 계산하지 않은 값은 ?로 둔다 — e는 오차 단계부터, e·x·합계·dw·db는 기울기 단계부터 (뉴런 그림과 같은 순서)
  const stageNo = STAGE_ORDER.indexOf(current);
  const showE = stageNo >= 1;
  const showGrad = stageNo >= 2;
  const q = <span className="text-muted">?</span>;

  return (
    <div className="card p-2.5 space-y-1.5 text-sm">
      <div className="flex items-baseline justify-between gap-2">
        <div className="font-medium text-[13px]">한 step의 모든 계산{!one && ' — 다섯 점'}</div>
        <div className="text-[10px] text-muted">step <span className="font-mono text-accent">{stepCount}</span>{!one && ' · dw·db = 표의 평균'}</div>
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
                  {showE ? <>{r.e >= 0 ? '+' : ''}{r.e.toFixed(2)}</> : q}
                </td>
                <td className="text-right px-2" style={{ color: 'rgb(59,130,246)' }}>
                  {showGrad ? <>{r.ex >= 0 ? '+' : ''}{r.ex.toFixed(2)}</> : q}
                </td>
              </tr>
            ))}
            {!one && (
              <tr className="border-t border-border bg-surface/40 text-[10px] text-muted leading-tight">
                <td className="text-right px-2" colSpan={3}>합계 →</td>
                <td className="text-right" style={{ color: 'rgb(190,18,60)' }}>
                  {showGrad ? <>{sumE >= 0 ? '+' : ''}{sumE.toFixed(2)}</> : q}
                </td>
                <td className="text-right px-2" style={{ color: 'rgb(59,130,246)' }}>
                  {showGrad ? <>{sumEx >= 0 ? '+' : ''}{sumEx.toFixed(2)}</> : q}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ── 3단계: 평균 (한 줄에 dw·db 동시) ── */}
      <div className={`rounded-md border border-border px-2.5 py-1 ${stageBg('gradient')}`}>
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="font-mono text-[10px] text-accent shrink-0">{one ? '3' : '3 평균'}</span>
          <span className="font-mono text-[11px] leading-snug">
            {one || !showGrad ? 'dw =' : <>dw = {sumEx.toFixed(2)} ÷ {data.length} =</>}
            <span className="font-semibold ml-1" style={{ color: 'rgb(59,130,246)' }}>{showGrad ? grad.dw.toFixed(3) : q}</span>
            <span className="text-muted mx-2">·</span>
            {one || !showGrad ? 'db =' : <>db = {sumE.toFixed(2)} ÷ {data.length} =</>}
            <span className="font-semibold ml-1" style={{ color: 'rgb(190,18,60)' }}>{showGrad ? grad.db.toFixed(3) : q}</span>
          </span>
        </div>
      </div>

      {/* 갱신(4단계)은 NeuronView 하단의 "업데이트 식" 박스가 담당 — 중복 제거 */}
    </div>
  );
}

/* ────────── 좌측: 단일 뉴런 다이어그램 (단계별 강조) ──────────
   데이터 1개 모드: 그 점의 값 그대로(x = 3, y = 7). 데이터 5개 모드: 라벨 앞에 "평균".
   단계 규칙 — 아직 계산하지 않은 값은 숨기고, 지난 단계 값은 그대로 두고, 지금 단계 값만 진하게.
     예측: z·ŷ 강조 / 오차: e 등장·강조 / 기울기: dw(× w 옆)·db(+ b 옆) 등장·강조
     업데이트: w·b 라벨 자리에 "옛값 → 새값" 강조 */
function NeuronView({
  w, b, grad, stage, meanX, meanY, meanZ, meanYhat, meanE, one,
}: {
  w: number; b: number;
  grad: { dw: number; db: number };
  stage: StageLabel;
  meanX: number; meanY: number; meanZ: number; meanYhat: number; meanE: number;
  one: boolean;
}) {
  const pre = one ? '' : '평균 ';
  const W = 760, H = 210;
  const fwdY = 100;
  const xCx = 60, sumCx = 260, reluCx = 410, predCx = 540, yCy = 180;
  const labelLeft = predCx + 22 + 10; // ŷ·y·e 라벨의 왼쪽 끝

  const aw = Math.min(Math.abs(w), 2);
  const wStrokeW = 1.2 + aw * 2.2;
  const wColor =
    Math.abs(w) < 0.05 ? 'rgb(var(--color-muted))'
    : w >= 0 ? 'rgb(var(--color-accent))' : 'rgb(190, 18, 60)';

  const text = 'rgb(var(--color-text))';
  const accent = 'rgb(var(--color-accent))';
  // 밝은·어두운 테마 모두에서 읽히는 중간 명도
  const red = 'rgb(225, 29, 72)';
  const blue = 'rgb(59, 130, 246)';
  const green = 'rgb(5, 150, 105)';

  const stageNo = STAGE_ORDER.indexOf(stage); // 0 예측 · 1 오차 · 2 기울기 · 3 업데이트
  const showE = stageNo >= 1;
  const showGrad = stageNo >= 2;
  const isUpdate = stageNo === 3;

  const x = meanX, yT = meanY, z = meanZ, yhat = meanYhat, e = meanE;
  const newW = w - LR * grad.dw;
  const newB = b - LR * grad.db;

  const wLabel = isUpdate ? `w: ${fmt(w)} → ${fmt(newW)}` : `× w = ${w.toFixed(2)}`;
  const bLabel = isUpdate ? `b: ${fmt(b)} → ${fmt(newB)}` : `+ b = ${b.toFixed(2)}`;
  const dbLabel = `db = ${grad.db.toFixed(2)}`;
  const wEdgeCx = (xCx + 22 + sumCx - 24) / 2;
  const bCy = 34;
  const dbCx = sumCx + badgeWidth(bLabel) / 2 + 8 + badgeWidth(dbLabel) / 2;
  const yhatLabel = `${pre}ŷ = ${yhat.toFixed(2)}`;
  const yLabel = `${pre}y = ${yT}`;
  const eLabel = `${pre}e = ŷ − y = ${e.toFixed(2)}`;

  return (
    <div className="card p-3">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="xMidYMid meet">
        <defs>
          <marker id="a5-arr" markerWidth="5" markerHeight="5" refX="4.5" refY="2.5" orient="auto">
            <path d="M0,0 L5,2.5 L0,5 z" fill="rgb(var(--color-muted))" />
          </marker>
          <marker id="a5-back" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 z" fill={red} />
          </marker>
        </defs>

        {/* ── 선 ── */}
        {/* x → Σ (굵기 = |w|) */}
        <line x1={xCx + 22} y1={fwdY} x2={sumCx - 24} y2={fwdY}
          stroke={wColor} strokeWidth={wStrokeW} strokeOpacity={0.9} strokeLinecap="round" />
        {/* b 위에서 Σ로 */}
        <line x1={sumCx} y1={bCy + 10} x2={sumCx} y2={fwdY - 24}
          stroke="rgb(var(--color-muted))" strokeWidth={1.4} />
        {/* Σ → ReLU */}
        <line x1={sumCx + 24} y1={fwdY} x2={reluCx - 28} y2={fwdY}
          stroke="rgb(var(--color-muted))" strokeWidth={1.6} strokeLinecap="round" />
        {/* ReLU → ŷ */}
        <line x1={reluCx + 28} y1={fwdY} x2={predCx - 22} y2={fwdY}
          stroke="rgb(var(--color-muted))" strokeWidth={1.6}
          strokeLinecap="round" markerEnd="url(#a5-arr)" />
        {/* ŷ ↔ y 오차 점선 — 오차 단계부터 */}
        {showE && (
          <line x1={predCx} y1={fwdY + 22} x2={predCx} y2={yCy - 22}
            stroke={red} strokeWidth={1.8} strokeDasharray="4 3" />
        )}
        {/* 역전파 — 기울기 단계부터. 순서가 핵심이라 구간별로 차례로 나타난다(index.css .bp-step).
              ① 오차 e가 ŷ에서 출발 → ReLU 쪽으로  ② ReLU를 지나 Σ로  ③ Σ에서 갈라져 dw(× x)와 db로
            #/backprop(뉴런 2개)과 같은 빨간 점선 화살표. 노드보다 먼저 그려 노드가 선을 덮게 한다.
            경로는 배지를 피한다: 가로선은 dw 배지 높이(fwdY + 22), db 쪽은 b 배지 아래·z 배지 위(y 54)로 돌아간다. */}
        {showGrad && (
          <g opacity={stageNo === 2 ? 1 : 0.45}>
            <g className="bp-step" style={{ animationDelay: '0s' }}>
              <line x1={predCx - 4} y1={fwdY + 22} x2={reluCx + 36} y2={fwdY + 22}
                stroke={red} strokeWidth={1.8} strokeDasharray="5 3" markerEnd="url(#a5-back)" />
              <text x={(reluCx + 28 + predCx - 22) / 2} y={fwdY + 42} textAnchor="middle" fill={red} fontSize={12} fontWeight={700}>역전파</text>
            </g>
            <g className="bp-step" style={{ animationDelay: '0.25s' }}>
              <line x1={reluCx + 22} y1={fwdY + 22} x2={sumCx + 30} y2={fwdY + 22}
                stroke={red} strokeWidth={1.8} strokeDasharray="5 3" markerEnd="url(#a5-back)" />
            </g>
            <g className="bp-step" style={{ animationDelay: '0.5s' }}>
              <line x1={sumCx - 16} y1={fwdY + 22} x2={wEdgeCx + badgeWidth(`dw = ${grad.dw.toFixed(2)}`) / 2 + 6} y2={fwdY + 22}
                stroke={red} strokeWidth={1.8} strokeDasharray="5 3" markerEnd="url(#a5-back)" />
              <polyline points={`${sumCx + 14},${fwdY - 20} ${sumCx + 14},54 ${dbCx - 20},54 ${dbCx - 20},${bCy + 12}`}
                fill="none" stroke={red} strokeWidth={1.8} strokeDasharray="5 3" markerEnd="url(#a5-back)" />
            </g>
            <g className="bp-step" style={{ animationDelay: '0.7s' }}>
              <text x={wEdgeCx} y={fwdY + 48} textAnchor="middle" fill={red} fontSize={11} fontFamily="JetBrains Mono">{one ? '= e·x' : '= 평균(e·x)'}</text>
              <text x={dbCx + badgeWidth(dbLabel) / 2 + 6} y={bCy + 4} textAnchor="start" fill={red} fontSize={11} fontFamily="JetBrains Mono">{one ? '= e' : '= 평균(e)'}</text>
            </g>
          </g>
        )}

        {/* ── 노드 ── */}
        <Node cx={xCx} cy={fwdY} label="x" />
        <circle cx={sumCx} cy={fwdY} r={24} fill="rgb(var(--color-accent-bg))" stroke={accent} strokeWidth={1.4} />
        <text x={sumCx} y={fwdY + 6} textAnchor="middle" fill={accent} fontSize={18} fontWeight={700}>Σ</text>
        <rect x={reluCx - 28} y={fwdY - 18} width={56} height={36} rx={6}
          fill="rgb(var(--color-accent-bg))" stroke={accent} strokeWidth={1.4} />
        <text x={reluCx} y={fwdY + 5} textAnchor="middle" fill={accent} fontSize={13} fontWeight={700}>ReLU</text>
        <Node cx={predCx} cy={fwdY} label="ŷ" accent />
        <Node cx={predCx} cy={yCy} label="y" />

        {/* ── 값 라벨 ── */}
        <ValueBadge cx={xCx} cy={fwdY + 40} label={`${pre}x = ${x}`} color={text} />
        {/* w (업데이트 단계에서는 옛값 → 새값) + 바로 아래 dw */}
        <ValueBadge cx={wEdgeCx} cy={fwdY - 22} label={wLabel}
          color={isUpdate ? green : text} strong={isUpdate} />
        {showGrad && (
          <g className="bp-step" style={{ animationDelay: '0.7s' }}>
            <ValueBadge cx={wEdgeCx} cy={fwdY + 22} label={`dw = ${grad.dw.toFixed(2)}`}
              color={blue} strong={stageNo === 2} />
          </g>
        )}
        {/* b (업데이트 단계에서는 옛값 → 새값) + 바로 오른쪽 db */}
        <ValueBadge cx={sumCx} cy={bCy} label={bLabel}
          color={isUpdate ? green : text} strong={isUpdate} />
        {showGrad && (
          <g className="bp-step" style={{ animationDelay: '0.7s' }}>
            <ValueBadge cx={dbCx} cy={bCy} label={dbLabel} color={blue} strong={stageNo === 2} />
          </g>
        )}
        <ValueBadge cx={(sumCx + 24 + reluCx - 28) / 2} cy={fwdY - 30} label={`${pre}z = ${z.toFixed(2)}`}
          color={accent} strong={stageNo === 0} />
        <ValueBadge cx={labelLeft + badgeWidth(yhatLabel) / 2} cy={fwdY} label={yhatLabel}
          color={accent} strong={stageNo === 0} />
        <ValueBadge cx={labelLeft + badgeWidth(yLabel) / 2} cy={yCy} label={yLabel} color={text} />
        {showE && (
          <ValueBadge cx={labelLeft + badgeWidth(eLabel) / 2} cy={(fwdY + yCy) / 2} label={eLabel}
            color={red} strong={stageNo === 1} />
        )}
      </svg>
      <div className={`mt-2 pt-2 px-2 font-mono text-[12px] leading-relaxed space-y-0.5 transition-colors ${
        stage === 'update'
          ? 'border-2 border-accent bg-accent-bg/50 rounded-md py-2 font-bold'
          : 'border-t border-border'
      }`}>
        <div className={`text-[10px] font-sans mb-1 ${stage === 'update' ? 'text-accent font-semibold' : 'text-muted font-normal'}`}>
          {stage === 'update' ? '★ 지금 — 업데이트 식이 적용되는 단계' : '업데이트 식 (일반형) — 한 step에 w·b 동시 적용'}
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

// 라벨 폭 추정 — 한글은 넓게, 나머지는 고정폭 근사
function badgeWidth(label: string) {
  let w = 0;
  for (const ch of label) w += /[\u3130-\u318f\uac00-\ud7a3]/.test(ch) ? 12 : 7.2;
  return Math.round(w + 16);
}

// 업데이트 라벨용 숫자 — 소수 셋째 자리까지, 끝의 0은 생략 (0, 1.05, 0.35)
function fmt(n: number) {
  return String(Number(n.toFixed(3)));
}

function ValueBadge({ cx, cy, label, color, strong }: {
  cx: number; cy: number; label: string; color: string; strong?: boolean;
}) {
  const w = badgeWidth(label);
  const h = 20;
  return (
    <g>
      <rect x={cx - w / 2} y={cy - h / 2} width={w} height={h} rx={4}
        fill="rgb(var(--color-bg))" stroke={color}
        strokeOpacity={strong ? 1 : 0.6} strokeWidth={strong ? 2 : 1} />
      {strong && (
        <rect x={cx - w / 2} y={cy - h / 2} width={w} height={h} rx={4} fill={color} fillOpacity={0.12} />
      )}
      <text x={cx} y={cy + 4.5} textAnchor="middle" fill={color} fontSize={12} fontWeight={strong ? 800 : 600}>
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
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full mt-1" data-present-svg>
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
