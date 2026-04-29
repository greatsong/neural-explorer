// PhaseC3 — 모델 복잡도 + 역전파
// 한 페이지 + 상단 트랙 탭으로 두 시각화를 분리.
//
//   트랙 1 — "역전파 한 step 검산 (작은 모델)"
//     입력 1 → 은닉 2 (ReLU) → 출력 1 (linear). 데이터는 A5와 같은 5점.
//     학생이 화면의 모든 숫자를 자기 손으로 검산할 수 있도록, 5점 표 + 평균 + 갱신식까지
//     한 step의 6단계가 실제 가중치와 함께 노출된다. 한 step 진행/자동 학습은 *진짜* 갱신.
//     체인룰 식·∂ 기호 노출 0. 모든 식은 `dw = 평균(e·x)` 형태의 한국어 식만.
//
//   트랙 2 — "은닉 슬라이더 (Phase11 단축판)"
//     도트 3종 active train/eval (B5와 동일)을 createDeepMLP + trainStep으로 *진짜* 학습.
//     "은닉 0층 (=B5 결과)" vs "은닉 1층 N뉴런" 두 옵션을 슬라이더로 비교, ScatterChart로 묶어 본다.
//
// 하단: PLAN ## 10-1 #6 역전파 박스 — 트랙과 무관하게 항상 노출.

import { useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '../store';
import { PHASES } from '../phases';
import {
  createDeepMLP,
  trainStep,
  evaluate,
  paramCount,
  shuffle,
  type MLP,
  type TrainSample,
} from '../lib/nn';
import { useActiveTrain, useActiveEval } from '../dotStore';
import { SHAPE_LABELS, type ShapeLabel } from '../data/dotShapes';

/* ════════════════════════════════════════════════════════════
   트랙 1 — 작은 모델(입력 1·은닉 2·출력 1) 한 step 검산
   ════════════════════════════════════════════════════════════ */

// A5와 같은 5점. 정답: y = 2x + 1
const T1_DATA: [number, number][] = [
  [1, 3], [2, 5], [3, 7], [4, 9], [5, 11],
];
const T1_LR = 0.05;

// 학생이 의미 있게 보도록 수동 초기화 — 두 번째 은닉 뉴런이 처음엔 죽어 있다(Dying ReLU).
const T1_INIT = {
  w1_1: 0.4, b1_1: 0.0,
  w1_2: -0.2, b1_2: 0.5,
  w2_1: 1.5, w2_2: 0.8, b2: 0.3,
};

interface T1Weights {
  w1_1: number; b1_1: number;
  w1_2: number; b1_2: number;
  w2_1: number; w2_2: number; b2: number;
}

interface T1RowDetail {
  x: number; y: number;
  z1_1: number; z1_2: number;
  h1: number; h2: number;
  z2: number; yhat: number;
  e: number;
  e_h1: number; e_h2: number;
  e_h1_x: number; e_h2_x: number;
  e_h1_only: number; e_h2_only: number;
}

function t1Compute(W: T1Weights, x: number, y: number): T1RowDetail {
  const z1_1 = W.w1_1 * x + W.b1_1;
  const z1_2 = W.w1_2 * x + W.b1_2;
  const h1 = z1_1 > 0 ? z1_1 : 0;
  const h2 = z1_2 > 0 ? z1_2 : 0;
  const z2 = W.w2_1 * h1 + W.w2_2 * h2 + W.b2;
  const yhat = z2; // 출력 linear
  const e = yhat - y;
  // 은닉층 신호 — A4의 모양과 같음. 이 페이지의 *역전파 핵심*.
  const r1 = z1_1 > 0 ? 1 : 0;
  const r2 = z1_2 > 0 ? 1 : 0;
  const e_h1 = e * W.w2_1 * r1;
  const e_h2 = e * W.w2_2 * r2;
  return {
    x, y,
    z1_1, z1_2, h1, h2, z2, yhat, e,
    e_h1, e_h2,
    e_h1_x: e_h1 * x,
    e_h2_x: e_h2 * x,
    e_h1_only: e_h1,
    e_h2_only: e_h2,
  };
}

interface T1Aggregate {
  rows: T1RowDetail[];
  // 출력층 기울기 — 평균(e·h_i), 평균(e)
  dw2_1: number; dw2_2: number; db2: number;
  // 은닉층 기울기 — 평균(e_h_i · x), 평균(e_h_i)
  dw1_1: number; dw1_2: number; db1_1: number; db1_2: number;
  // 은닉층 신호 평균 (디스플레이용)
  meanEH1: number; meanEH2: number;
  // 손실 (MSE 평균)
  loss: number;
}

function t1Aggregate(W: T1Weights): T1Aggregate {
  const rows = T1_DATA.map(([x, y]) => t1Compute(W, x, y));
  const N = rows.length;
  let sum_eh1 = 0, sum_eh2 = 0, sum_e = 0;
  let sum_eh1_h1 = 0, sum_eh2_h2 = 0;
  let sum_eh1_x = 0, sum_eh2_x = 0;
  let sum_eH1 = 0, sum_eH2 = 0;
  let sumLoss = 0;
  for (const r of rows) {
    sum_eh1_h1 += r.e * r.h1;
    sum_eh2_h2 += r.e * r.h2;
    sum_e += r.e;
    sum_eh1_x += r.e_h1_x;
    sum_eh2_x += r.e_h2_x;
    sum_eH1 += r.e_h1;
    sum_eH2 += r.e_h2;
    sumLoss += 0.5 * (r.yhat - r.y) ** 2;
    // unused single sums
    sum_eh1 += r.e * r.h1;
    sum_eh2 += r.e * r.h2;
  }
  void sum_eh1; void sum_eh2;
  return {
    rows,
    dw2_1: sum_eh1_h1 / N,
    dw2_2: sum_eh2_h2 / N,
    db2: sum_e / N,
    dw1_1: sum_eh1_x / N,
    dw1_2: sum_eh2_x / N,
    db1_1: sum_eH1 / N,
    db1_2: sum_eH2 / N,
    meanEH1: sum_eH1 / N,
    meanEH2: sum_eH2 / N,
    loss: sumLoss / N,
  };
}

function t1Step(W: T1Weights): T1Weights {
  const g = t1Aggregate(W);
  return {
    w1_1: W.w1_1 - T1_LR * g.dw1_1,
    b1_1: W.b1_1 - T1_LR * g.db1_1,
    w1_2: W.w1_2 - T1_LR * g.dw1_2,
    b1_2: W.b1_2 - T1_LR * g.db1_2,
    w2_1: W.w2_1 - T1_LR * g.dw2_1,
    w2_2: W.w2_2 - T1_LR * g.dw2_2,
    b2: W.b2 - T1_LR * g.db2,
  };
}

/* ════════════════════════════════════════════════════════════
   메인 컴포넌트 — 트랙 탭 + 하단 역전파 박스
   ════════════════════════════════════════════════════════════ */

type Track = 't1' | 't2';

export function PhaseC3() {
  const meta = PHASES.find((p) => p.id === 'c3')!;
  const [track, setTrack] = useState<Track>('t1');

  return (
    <article>
      <div className="text-xs font-mono text-muted">PHASE {meta.num}</div>
      <h1>{meta.title}</h1>
      <p className="text-muted mt-2 text-sm leading-relaxed">
        은닉층이 생기면 한 step 안에서 숫자가 어떻게 흐르는지부터 봐요. 그다음에 은닉 뉴런 수를 늘려가며
        모델이 실제로 더 잘 풀게 되는지 확인해요.
      </p>

      {/* ── 트랙 탭 ── */}
      <div className="mt-4 inline-flex rounded-md border border-border overflow-hidden">
        <button
          onClick={() => setTrack('t1')}
          className={`px-3 py-1.5 text-sm transition ${
            track === 't1' ? 'bg-accent text-white' : 'bg-bg text-muted hover:bg-surface'
          }`}
        >
          트랙 1 · 역전파 한 step 검산
        </button>
        <button
          onClick={() => setTrack('t2')}
          className={`px-3 py-1.5 text-sm transition ${
            track === 't2' ? 'bg-accent text-white' : 'bg-bg text-muted hover:bg-surface'
          }`}
        >
          트랙 2 · 모델 복잡도 슬라이더
        </button>
      </div>

      <div className="mt-4">
        {track === 't1' ? <Track1 /> : <Track2 />}
      </div>

      {/* ── 하단 역전파 박스 (PLAN ## 10-1 #6 본문 그대로) ── */}
      <div
        className="mt-6 rounded-md border px-4 py-3 text-sm leading-relaxed"
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
   트랙 1 본체 — 좌: 작은 네트워크 다이어그램(숫자 라벨) / 우: 6단계 카드
   ════════════════════════════════════════════════════════════ */

const T1_STEPS: { id: number; label: string; sub: string }[] = [
  { id: 1, label: '순전파', sub: 'z₁ → h → z₂ → ŷ' },
  { id: 2, label: '출력 오차', sub: 'e = ŷ − y' },
  { id: 3, label: '출력층 기울기', sub: '평균(e·h), 평균(e)' },
  { id: 4, label: '은닉층 신호', sub: 'e_h = e · w₂ · ReLU′' },
  { id: 5, label: '은닉층 기울기', sub: '평균(e_h·x), 평균(e_h)' },
  { id: 6, label: '갱신', sub: 'w ← w − η · dw' },
];

function Track1() {
  const markCompleted = useApp((s) => s.markCompleted);
  const [W, setW] = useState<T1Weights>({ ...T1_INIT });
  const agg = useMemo(() => t1Aggregate(W), [W]);
  const [history, setHistory] = useState<number[]>([agg.loss]);
  const [stepIdx, setStepIdx] = useState(0); // 0~5 — 마지막 강조 단계
  const [auto, setAuto] = useState(false);
  const [showFormula, setShowFormula] = useState(true);
  const stepCount = history.length - 1;

  const wRef = useRef(W);
  useEffect(() => { wRef.current = W; }, [W]);
  const completedRef = useRef(false);

  // 한 step = 6단계 220ms × 6 → 마지막 단계에서 실제 갱신
  const onStepOnce = () => {
    if (auto) return;
    let i = 0;
    setStepIdx(0);
    const id = setInterval(() => {
      i += 1;
      setStepIdx(Math.min(i, T1_STEPS.length - 1));
      if (i >= T1_STEPS.length - 1) {
        clearInterval(id);
        const next = t1Step(wRef.current);
        const a = t1Aggregate(next);
        setW(next);
        setHistory((h) => [...h, a.loss]);
      }
    }, 220);
  };

  // 자동 학습 — 빠른 step (실제 학습)
  useEffect(() => {
    if (!auto) return;
    const id = setInterval(() => {
      const next = t1Step(wRef.current);
      const a = t1Aggregate(next);
      setW(next);
      setHistory((h) => [...h, a.loss]);
      setStepIdx((s) => (s + 1) % T1_STEPS.length);
    }, 140);
    return () => clearInterval(id);
  }, [auto]);

  // 자동 정지 — 80 step
  const autoLimitRef = useRef(false);
  useEffect(() => {
    if (auto && stepCount >= 80 && !autoLimitRef.current) {
      autoLimitRef.current = true;
      queueMicrotask(() => setAuto(false));
    }
    if (!auto) autoLimitRef.current = false;
  }, [auto, stepCount]);

  // 완료 — 한 step만 진행해도 충족 (손실이 실제로 줄어드는 게 보이는 시점)
  useEffect(() => {
    if (!completedRef.current && stepCount >= 1) {
      completedRef.current = true;
      markCompleted('c3');
    }
  }, [stepCount, markCompleted]);

  const reset = () => {
    setW({ ...T1_INIT });
    setHistory([t1Aggregate(T1_INIT).loss]);
    setStepIdx(0);
    setAuto(false);
  };

  const currentStep = stepIdx; // 0..5

  return (
    <div className="space-y-3">
      {/* 모드 토글 */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="inline-flex rounded-md border border-border overflow-hidden">
          <button
            onClick={() => setShowFormula(false)}
            className={`px-3 py-1.5 text-xs transition ${
              !showFormula ? 'bg-accent text-white' : 'bg-bg text-muted hover:bg-surface'
            }`}
          >
            직관
          </button>
          <button
            onClick={() => setShowFormula(true)}
            className={`px-3 py-1.5 text-xs transition ${
              showFormula ? 'bg-accent text-white' : 'bg-bg text-muted hover:bg-surface'
            }`}
          >
            식 보기
          </button>
        </div>
        <span className="text-[11px] text-muted">
          {showFormula ? '6단계의 모든 식과 5점 평균을 함께 표시.' : '먼저 흐름부터 — 식 카드는 토글로 꺼둠.'}
        </span>
      </div>

      <div className="grid lg:grid-cols-[1.4fr_1fr] gap-4 items-start">
        {/* 좌: 다이어그램 + 손실 곡선 */}
        <div className="space-y-3">
          <T1Diagram W={W} agg={agg} stepIdx={currentStep} />
          <T1LossCurve history={history} />
        </div>

        {/* 우: 컨트롤(상단) + 6단계 카드 */}
        <div className="space-y-3">
          {/* 핵심 인터랙션을 첫 viewport에 — 컨트롤을 식 카드 위로 */}
          <div className="card p-3 space-y-2">
            <div className="grid grid-cols-3 gap-2 text-center font-mono text-xs">
              <Stat label="step" value={`${stepCount}`} />
              <Stat label="η" value={`${T1_LR}`} />
              <Stat label="손실" value={agg.loss.toFixed(3)} highlight={agg.loss < 0.1} />
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={onStepOnce} disabled={auto} className="btn-primary">
                ▶ 한 step 진행
              </button>
              <button onClick={() => setAuto((v) => !v)} className="btn-ghost">
                {auto ? '⏸ 자동 멈춤' : '▶ 자동 학습'}
              </button>
              <button onClick={reset} className="btn-ghost">초기화</button>
            </div>
          </div>

          {showFormula ? (
            <T1FormulaCard W={W} agg={agg} stepIdx={currentStep} />
          ) : (
            <T1IntuitionCard stepIdx={currentStep} stepCount={stepCount} />
          )}

          <div className="text-[10px] text-muted leading-snug px-1">
            ※ 두 번째 은닉 뉴런 h₂는 처음에 z₁₂ &lt; 0이라 0으로 죽어 있어요(<strong>Dying ReLU</strong>).
            그래서 자기 책임 e_h₂ = 0 — 가중치도 안 움직여요. 흐름이 살아 있는 h₁만 먼저 학습.
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── 트랙 1: 직관 모드 — 6단계 라벨만 ── */
function T1IntuitionCard({ stepIdx, stepCount }: { stepIdx: number; stepCount: number }) {
  return (
    <div className="card p-3">
      <div className="text-sm font-medium">한 step 안에서 일어나는 일</div>
      <p className="text-[11px] text-muted mt-1">
        한 step은 6단계로 한 바퀴 돌아요. 1·2·3은 출력층, 4·5는 은닉층, 6은 모든 가중치 갱신.
      </p>
      <ol className="mt-3 space-y-1.5">
        {T1_STEPS.map((s, i) => {
          const active = i === stepIdx;
          return (
            <li
              key={s.id}
              className={`flex items-start gap-3 rounded-md px-3 py-2 border transition ${
                active ? 'border-accent bg-accent-bg text-text' : 'border-border bg-bg text-muted'
              }`}
            >
              <span className={`font-mono text-xs mt-0.5 ${active ? 'text-accent' : 'text-muted'}`}>
                {s.id}
              </span>
              <span className="flex-1">
                <span className={`text-[13px] font-medium ${active ? 'text-text' : ''}`}>
                  {s.label}
                </span>
                <span className="block text-[11px] mt-0.5 font-mono">{s.sub}</span>
              </span>
            </li>
          );
        })}
      </ol>
      <div className="mt-3 text-[11px] text-muted">
        누른 횟수: <span className="font-mono text-accent">{stepCount}</span>
      </div>
    </div>
  );
}

/* ── 트랙 1: 식 카드 — 6단계의 실제 숫자 ── */
function T1FormulaCard({
  W, agg, stepIdx,
}: { W: T1Weights; agg: T1Aggregate; stepIdx: number }) {
  const isOn = (i: number) => i === stepIdx;
  const bg = (i: number) => (isOn(i) ? 'bg-accent-bg' : '');

  // 갱신 후 가중치 (단계 6 표시용)
  const next = t1Step(W);

  return (
    <div className="card p-3 space-y-2 text-sm">
      <div className="font-medium">한 step의 모든 계산</div>
      <p className="text-[11px] text-muted leading-snug">
        다섯 점 모두에 같은 가중치를 적용. 모든 dw·db는 다섯 점 평균이에요.
      </p>

      {/* 1·2단계: 5점 표 — x, y, ŷ, e */}
      <div className={`rounded-md border border-border overflow-hidden ${bg(0)}${isOn(1) ? ' bg-accent-bg' : ''}`}>
        <div className="flex items-baseline gap-2 px-2 pt-1.5">
          <span className="font-mono text-[10px] text-accent">1·2</span>
          <span className="text-[11px] font-medium">순전파 + 출력 오차</span>
        </div>
        <table className="w-full text-[10.5px] font-mono mt-1">
          <thead className="text-muted">
            <tr className="border-t border-border/60">
              <th className="text-right px-2 py-0.5">x</th>
              <th className="text-right">y</th>
              <th className="text-right">h₁</th>
              <th className="text-right">h₂</th>
              <th className="text-right">ŷ</th>
              <th className="text-right" style={{ color: 'rgb(190,18,60)' }}>e</th>
            </tr>
          </thead>
          <tbody>
            {agg.rows.map((r) => (
              <tr key={r.x} className="border-t border-border/30">
                <td className="text-right px-2">{r.x}</td>
                <td className="text-right">{r.y}</td>
                <td className="text-right">{r.h1.toFixed(2)}</td>
                <td className="text-right" style={{ color: r.h2 === 0 ? 'rgb(190,18,60)' : undefined }}>
                  {r.h2.toFixed(2)}
                </td>
                <td className="text-right text-accent">{r.yhat.toFixed(2)}</td>
                <td className="text-right" style={{ color: 'rgb(190,18,60)' }}>
                  {r.e >= 0 ? '+' : ''}{r.e.toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 3단계: 출력층 평균 */}
      <div className={`rounded-md border border-border px-2.5 py-1.5 ${bg(2)}`}>
        <div className="flex items-baseline gap-2">
          <span className="font-mono text-[10px] text-accent">3</span>
          <span className="text-[11px] font-medium">출력층 기울기 (평균)</span>
        </div>
        <div className="font-mono text-[11px] mt-0.5 leading-relaxed">
          dw₂₁ = 평균(e·h₁) = <span style={{ color: 'rgb(59,130,246)' }}>{agg.dw2_1.toFixed(3)}</span>
          <br />
          dw₂₂ = 평균(e·h₂) = <span style={{ color: 'rgb(59,130,246)' }}>{agg.dw2_2.toFixed(3)}</span>
          <br />
          db₂ = 평균(e) = <span style={{ color: 'rgb(190,18,60)' }}>{agg.db2.toFixed(3)}</span>
        </div>
      </div>

      {/* 4단계: 은닉층 신호 e_h */}
      <div className={`rounded-md border border-border px-2.5 py-1.5 ${bg(3)}`} style={{ borderColor: isOn(3) ? 'rgb(190,18,60)' : undefined }}>
        <div className="flex items-baseline gap-2">
          <span className="font-mono text-[10px]" style={{ color: 'rgb(190,18,60)' }}>4</span>
          <span className="text-[11px] font-medium">은닉층 신호 — 역전파 핵심</span>
        </div>
        <div className="font-mono text-[11px] mt-0.5 leading-relaxed">
          e_h₁ = 평균(e · w₂₁ · ReLU′) = <span style={{ color: 'rgb(190,18,60)' }}>{agg.meanEH1.toFixed(3)}</span>
          <br />
          e_h₂ = 평균(e · w₂₂ · ReLU′) = <span style={{ color: 'rgb(190,18,60)' }}>{agg.meanEH2.toFixed(3)}</span>
          {agg.meanEH2 === 0 && (
            <>
              <br />
              <span className="text-[10px] text-muted">↑ h₂가 죽어 있어 ReLU′ = 0 → 자기 책임 0</span>
            </>
          )}
        </div>
      </div>

      {/* 5단계: 은닉층 기울기 */}
      <div className={`rounded-md border border-border px-2.5 py-1.5 ${bg(4)}`}>
        <div className="flex items-baseline gap-2">
          <span className="font-mono text-[10px] text-accent">5</span>
          <span className="text-[11px] font-medium">은닉층 기울기 (평균)</span>
        </div>
        <div className="font-mono text-[11px] mt-0.5 leading-relaxed">
          dw₁₁ = 평균(e_h₁ · x) = <span style={{ color: 'rgb(59,130,246)' }}>{agg.dw1_1.toFixed(3)}</span>
          <br />
          dw₁₂ = 평균(e_h₂ · x) = <span style={{ color: 'rgb(59,130,246)' }}>{agg.dw1_2.toFixed(3)}</span>
          <br />
          db₁₁ = 평균(e_h₁) = <span style={{ color: 'rgb(190,18,60)' }}>{agg.db1_1.toFixed(3)}</span>,
          {' '}db₁₂ = 평균(e_h₂) = <span style={{ color: 'rgb(190,18,60)' }}>{agg.db1_2.toFixed(3)}</span>
        </div>
      </div>

      {/* 6단계: 갱신 */}
      <div className={`rounded-md border border-border px-2.5 py-1.5 ${bg(5)}`}>
        <div className="flex items-baseline gap-2">
          <span className="font-mono text-[10px] text-accent">6</span>
          <span className="text-[11px] font-medium">갱신 — η = {T1_LR}</span>
        </div>
        <div className="font-mono text-[10.5px] mt-0.5 leading-relaxed">
          w₁₁ ← {W.w1_1.toFixed(3)} − {T1_LR}·{agg.dw1_1.toFixed(3)} =
          <span className="font-semibold text-accent ml-1">{next.w1_1.toFixed(3)}</span>
          <br />
          w₁₂ ← {W.w1_2.toFixed(3)} − {T1_LR}·{agg.dw1_2.toFixed(3)} =
          <span className="font-semibold text-accent ml-1">{next.w1_2.toFixed(3)}</span>
          <br />
          w₂₁ ← {W.w2_1.toFixed(3)} − {T1_LR}·{agg.dw2_1.toFixed(3)} =
          <span className="font-semibold text-accent ml-1">{next.w2_1.toFixed(3)}</span>
          <br />
          w₂₂ ← {W.w2_2.toFixed(3)} − {T1_LR}·{agg.dw2_2.toFixed(3)} =
          <span className="font-semibold text-accent ml-1">{next.w2_2.toFixed(3)}</span>
          <br />
          b₂ ← {W.b2.toFixed(3)} − {T1_LR}·{agg.db2.toFixed(3)} =
          <span className="font-semibold text-accent ml-1">{next.b2.toFixed(3)}</span>
        </div>
      </div>
    </div>
  );
}

/* ── 트랙 1: 다이어그램 (입력 1, 은닉 2, 출력 1) — 모든 노드/엣지에 실제 숫자 ── */
function T1Diagram({
  W, agg, stepIdx,
}: { W: T1Weights; agg: T1Aggregate; stepIdx: number }) {
  const Wd = 720, H = 240;
  // 좌→우: x, h(2), yhat, y(정답)
  const xCx = 70;
  const hCx = 320;
  const yhatCx = 560;
  const yCx = 670;
  const h1Cy = 80;
  const h2Cy = 180;
  const xCy = 130;
  const yhatCy = 130;

  // 대표 점 — A5와 같은 x = 3
  const sample = agg.rows.find((r) => r.x === 3) ?? agg.rows[0];

  const back = 'rgb(190, 18, 60)';
  const blue = 'rgb(59, 130, 246)';

  // 단계별 강조
  const dim = 0.25;
  const opForward = stepIdx <= 0 ? 1 : 0.7;
  const opError = stepIdx >= 1 ? 1 : dim;
  const opOutGrad = stepIdx >= 2 ? 1 : dim;
  const opHiddenSig = stepIdx >= 3 ? 1 : dim;
  const opHiddenGrad = stepIdx >= 4 ? 1 : dim;

  const wColor = (w: number) =>
    Math.abs(w) < 0.05 ? 'rgb(var(--color-muted))'
    : w >= 0 ? 'rgb(var(--color-accent))' : back;
  const wStroke = (w: number) => 1.2 + Math.min(Math.abs(w), 2) * 1.6;

  return (
    <div className="card p-3">
      <div className="flex items-baseline justify-between">
        <div className="text-sm font-medium">작은 네트워크 — 입력 1 · 은닉 2 · 출력 1</div>
        <div className="text-[10.5px] font-mono text-muted">
          <span style={{ color: 'rgb(var(--color-accent))' }}>● 가중치/순전파</span>
          <span className="ml-2" style={{ color: back }}>● 오차/역전파</span>
        </div>
      </div>
      <svg viewBox={`0 0 ${Wd} ${H}`} className="w-full mt-1" preserveAspectRatio="xMidYMid meet">
        <defs>
          <marker id="c3-fwd" markerWidth="5" markerHeight="5" refX="4.5" refY="2.5" orient="auto">
            <path d="M0,0 L5,2.5 L0,5 z" fill="rgb(var(--color-muted))" />
          </marker>
          <marker id="c3-back" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 z" fill={back} />
          </marker>
        </defs>

        {/* 컬럼 라벨 */}
        <text x={xCx} y={22} textAnchor="middle" fontSize={10.5}
          fill="rgb(var(--color-muted))" fontWeight={600}>입력</text>
        <text x={hCx} y={22} textAnchor="middle" fontSize={10.5}
          fill="rgb(var(--color-muted))" fontWeight={600}>은닉 (ReLU)</text>
        <text x={yhatCx} y={22} textAnchor="middle" fontSize={10.5}
          fill="rgb(var(--color-muted))" fontWeight={600}>출력</text>
        <text x={yCx} y={22} textAnchor="middle" fontSize={10.5}
          fill="rgb(var(--color-muted))" fontWeight={600}>정답</text>

        {/* x → h1, x → h2 (입력 가중치) */}
        <g opacity={opForward}>
          <line x1={xCx + 22} y1={xCy} x2={hCx - 22} y2={h1Cy}
            stroke={wColor(W.w1_1)} strokeWidth={wStroke(W.w1_1)} strokeOpacity={0.85} strokeLinecap="round" />
          <line x1={xCx + 22} y1={xCy} x2={hCx - 22} y2={h2Cy}
            stroke={wColor(W.w1_2)} strokeWidth={wStroke(W.w1_2)} strokeOpacity={0.85} strokeLinecap="round" />
          {/* 가중치 라벨 */}
          <ValueBadge cx={(xCx + hCx) / 2} cy={(xCy + h1Cy) / 2 - 14}
            label={`w₁₁ = ${W.w1_1.toFixed(2)}`} color={wColor(W.w1_1)} />
          <ValueBadge cx={(xCx + hCx) / 2} cy={(xCy + h2Cy) / 2 + 14}
            label={`w₁₂ = ${W.w1_2.toFixed(2)}`} color={wColor(W.w1_2)} />
          {/* h1, h2 → yhat */}
          <line x1={hCx + 22} y1={h1Cy} x2={yhatCx - 22} y2={yhatCy}
            stroke={wColor(W.w2_1)} strokeWidth={wStroke(W.w2_1)} strokeOpacity={0.85} strokeLinecap="round"
            markerEnd="url(#c3-fwd)" />
          <line x1={hCx + 22} y1={h2Cy} x2={yhatCx - 22} y2={yhatCy}
            stroke={wColor(W.w2_2)} strokeWidth={wStroke(W.w2_2)} strokeOpacity={0.85} strokeLinecap="round"
            markerEnd="url(#c3-fwd)" />
          <ValueBadge cx={(hCx + yhatCx) / 2} cy={(h1Cy + yhatCy) / 2 - 14}
            label={`w₂₁ = ${W.w2_1.toFixed(2)}`} color={wColor(W.w2_1)} />
          <ValueBadge cx={(hCx + yhatCx) / 2} cy={(h2Cy + yhatCy) / 2 + 14}
            label={`w₂₂ = ${W.w2_2.toFixed(2)}`} color={wColor(W.w2_2)} />
        </g>

        {/* 노드 — x */}
        <g opacity={opForward}>
          <Node cx={xCx} cy={xCy} label="x" />
          <ValueBadge cx={xCx} cy={xCy - 36} label={`x = ${sample.x}`} color="rgb(var(--color-text))" />
        </g>

        {/* 노드 — h1, h2 */}
        <g opacity={opForward}>
          <Node cx={hCx} cy={h1Cy} label="h₁" mid />
          <ValueBadge cx={hCx} cy={h1Cy - 30}
            label={`z=${sample.z1_1.toFixed(2)} → h₁=${sample.h1.toFixed(2)}`}
            color="rgb(var(--color-accent))" />
          <Node cx={hCx} cy={h2Cy} label="h₂" mid={sample.h2 > 0} dead={sample.h2 === 0} />
          <ValueBadge cx={hCx} cy={h2Cy + 30}
            label={`z=${sample.z1_2.toFixed(2)} → h₂=${sample.h2.toFixed(2)}`}
            color={sample.h2 === 0 ? back : 'rgb(var(--color-accent))'} />
        </g>

        {/* 노드 — yhat */}
        <g opacity={opForward}>
          <Node cx={yhatCx} cy={yhatCy} label="ŷ" accent />
          <ValueBadge cx={yhatCx} cy={yhatCy - 36}
            label={`ŷ = ${sample.yhat.toFixed(2)}`} color="rgb(var(--color-accent))" />
        </g>

        {/* 정답 y + 오차 e (단계 2~) */}
        <g opacity={opError}>
          <Node cx={yCx} cy={yhatCy} label="y" />
          <ValueBadge cx={yCx} cy={yhatCy - 36} label={`y = ${sample.y}`} color="rgb(var(--color-text))" />
          <line x1={yhatCx + 22} y1={yhatCy} x2={yCx - 22} y2={yhatCy}
            stroke={back} strokeWidth={1.6} strokeDasharray="4 3" />
          <ValueBadge cx={(yhatCx + yCx) / 2} cy={yhatCy - 16}
            label={`e = ${sample.e.toFixed(2)}`} color={back} />
        </g>

        {/* 출력층 기울기 화살표 (단계 3) */}
        <g opacity={opOutGrad}>
          <path d={`M ${yhatCx - 8} ${yhatCy + 8} C ${(yhatCx + hCx) / 2} 220, ${(yhatCx + hCx) / 2 - 30} 220, ${hCx + 8} ${h1Cy + 14}`}
            fill="none" stroke={blue} strokeWidth={1.6} strokeOpacity={0.7}
            strokeDasharray="6 4" markerEnd="url(#c3-back)" />
          <ValueBadge cx={(yhatCx + hCx) / 2} cy={H - 18}
            label={`dw₂₁ = ${agg.dw2_1.toFixed(2)}    dw₂₂ = ${agg.dw2_2.toFixed(2)}    db₂ = ${agg.db2.toFixed(2)}`}
            color={blue} />
        </g>

        {/* 은닉층 신호 — 빨간 점선이 e가 e·w₂·ReLU′를 거쳐 e_h가 되는 곱셈을 라벨로 표시 (단계 4) */}
        <g opacity={opHiddenSig}>
          {/* yhat → h1 (역방향 빨간 점선) */}
          <path d={`M ${yhatCx - 8} ${yhatCy - 6} Q ${(yhatCx + hCx) / 2} ${h1Cy - 30} ${hCx + 8} ${h1Cy}`}
            fill="none" stroke={back} strokeWidth={1.6} strokeOpacity={0.85}
            strokeDasharray="7 5" markerEnd="url(#c3-back)" />
          <ValueBadge cx={(yhatCx + hCx) / 2 + 30} cy={h1Cy - 36}
            label={`e · w₂₁ · ReLU′ → e_h₁ = ${agg.meanEH1.toFixed(2)}`} color={back} />
          {/* yhat → h2 */}
          <path d={`M ${yhatCx - 8} ${yhatCy + 6} Q ${(yhatCx + hCx) / 2} ${h2Cy + 30} ${hCx + 8} ${h2Cy}`}
            fill="none" stroke={back} strokeWidth={1.6} strokeOpacity={0.85}
            strokeDasharray="7 5" markerEnd="url(#c3-back)" />
          <ValueBadge cx={(yhatCx + hCx) / 2 + 30} cy={h2Cy + 36}
            label={`e · w₂₂ · ReLU′ → e_h₂ = ${agg.meanEH2.toFixed(2)}`} color={back} />
        </g>

        {/* 은닉층 기울기 — h → x 방향 화살표 (단계 5) */}
        <g opacity={opHiddenGrad}>
          <path d={`M ${hCx - 8} ${h1Cy - 6} Q ${(hCx + xCx) / 2} ${h1Cy - 40} ${xCx + 8} ${xCy - 4}`}
            fill="none" stroke={blue} strokeWidth={1.6} strokeOpacity={0.7}
            strokeDasharray="6 4" markerEnd="url(#c3-back)" />
          <ValueBadge cx={(xCx + hCx) / 2 + 4} cy={h1Cy - 50}
            label={`dw₁₁ = ${agg.dw1_1.toFixed(2)}`} color={blue} />
          <path d={`M ${hCx - 8} ${h2Cy + 6} Q ${(hCx + xCx) / 2} ${h2Cy + 40} ${xCx + 8} ${xCy + 4}`}
            fill="none" stroke={blue} strokeWidth={1.6} strokeOpacity={0.7}
            strokeDasharray="6 4" markerEnd="url(#c3-back)" />
          <ValueBadge cx={(xCx + hCx) / 2 + 4} cy={h2Cy + 50}
            label={`dw₁₂ = ${agg.dw1_2.toFixed(2)}`} color={blue} />
        </g>
      </svg>
      <div className="text-[10.5px] text-muted px-1 leading-snug">
        대표 점 x = 3 (정답 y = 7)으로 그렸어요. 5점 평균은 우측 카드의 표·식이 담당.
        가중치 선의 굵기는 |w|에 비례, 빨간 점선은 e가 다음 층으로 거꾸로 흘러가는 모습.
      </div>
    </div>
  );
}

/* ── 트랙 1: 손실 곡선 ── */
function T1LossCurve({ history }: { history: number[] }) {
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
          step {N - 1} · 손실 <span className="text-accent">{last.toFixed(3)}</span>
          {N > 1 && (
            <span className="ml-2">
              {Math.abs(delta) < 5e-5 ? '≈ 0' : (delta > 0 ? '↓ ' : '↑ ') + Math.abs(delta).toFixed(3)}
            </span>
          )}
        </div>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full mt-1">
        <line x1={padL} y1={H - padB} x2={W - padR} y2={H - padB} stroke="rgb(var(--color-border))" />
        <line x1={padL} y1={padT} x2={padL} y2={H - padB} stroke="rgb(var(--color-border))" />
        <text x={W - padR} y={H - 6} textAnchor="end" fontSize={9} fill="rgb(var(--color-muted))">step</text>
        <text x={padL - 4} y={padT + 8} textAnchor="end" fontSize={9} fill="rgb(var(--color-muted))">손실</text>
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

/* ════════════════════════════════════════════════════════════
   트랙 2 — 은닉 슬라이더 (도트 3종, 진짜 학습)
   ════════════════════════════════════════════════════════════ */

interface T2Result {
  layers: number[];
  params: number;
  trainAcc: number;
  evalAcc: number;
  hiddenN: number; // 0 = 은닉 없음
  losses: number[]; // 에폭별 손실
}

function Track2() {
  const markCompleted = useApp((s) => s.markCompleted);
  const train = useActiveTrain();
  const evalSet = useActiveEval();

  const [hiddenOn, setHiddenOn] = useState(true);
  const [hiddenN, setHiddenN] = useState(8);
  const [training, setTraining] = useState(false);
  const [progress, setProgress] = useState<{ epoch: number; loss: number } | null>(null);
  const [results, setResults] = useState<T2Result[]>([]);

  // 도트 → TrainSample 변환 (3클래스 softmax)
  const trainSamples: TrainSample[] = useMemo(
    () => train.map((s) => ({
      x: new Float32Array(s.pixels),
      y: SHAPE_LABELS.indexOf(s.label as ShapeLabel),
    })),
    [train]
  );
  const evalSamples: TrainSample[] = useMemo(
    () => evalSet.map((s) => ({
      x: new Float32Array(s.pixels),
      y: SHAPE_LABELS.indexOf(s.label as ShapeLabel),
    })),
    [evalSet]
  );

  const layers = hiddenOn ? [64, hiddenN, 3] : [64, 3];
  const params = paramCount({ layers });
  const completedRef = useRef(false);

  const startTrain = async () => {
    if (training) return;
    if (trainSamples.length === 0) return;
    setTraining(true);
    setProgress(null);
    const m: MLP = createDeepMLP(layers);
    const epochs = 25;
    const lr = 0.05;
    const batchSize = 8;
    const losses: number[] = [];

    for (let ep = 0; ep < epochs; ep++) {
      const batches = shuffle(trainSamples);
      let lossSum = 0;
      let nB = 0;
      for (let i = 0; i < batches.length; i += batchSize) {
        const batch = batches.slice(i, i + batchSize);
        lossSum += trainStep(m, batch, lr);
        nB++;
      }
      const avgLoss = lossSum / Math.max(nB, 1);
      losses.push(avgLoss);
      setProgress({ epoch: ep + 1, loss: avgLoss });
      // 비동기 yield (UI 갱신)
      await new Promise((r) => setTimeout(r, 0));
    }

    const trainAcc = evaluate(m, trainSamples);
    const evalAcc = evaluate(m, evalSamples);
    const result: T2Result = {
      layers,
      params,
      trainAcc,
      evalAcc,
      hiddenN: hiddenOn ? hiddenN : 0,
      losses,
    };
    // 같은 hiddenN 결과는 덮어쓰기, 아니면 추가
    setResults((prev) => {
      const filtered = prev.filter((r) => r.hiddenN !== result.hiddenN);
      return [...filtered, result].sort((a, b) => a.params - b.params);
    });
    setTraining(false);
    if (!completedRef.current) {
      completedRef.current = true;
      markCompleted('c3');
    }
  };

  return (
    <div className="grid lg:grid-cols-[1fr_1.2fr] gap-4 items-start">
      {/* 좌: 컨트롤 */}
      <div className="card p-3 space-y-3">
        <div className="text-sm font-medium">은닉층 옵션</div>
        <p className="text-[11px] text-muted leading-snug">
          B5에서 본 도트 3종 데이터로 은닉층의 효과를 확인해요. 학습은 진짜 — 매번 새 모델로 25 에폭.
        </p>

        <div className="flex items-center justify-between gap-3">
          <span className="text-[12px]">은닉층</span>
          <div className="inline-flex rounded-md border border-border overflow-hidden">
            <button
              onClick={() => setHiddenOn(false)}
              disabled={training}
              className={`px-3 py-1.5 text-xs transition ${
                !hiddenOn ? 'bg-accent text-white' : 'bg-bg text-muted hover:bg-surface'
              } disabled:opacity-50`}
            >
              0층 (=B5 결과)
            </button>
            <button
              onClick={() => setHiddenOn(true)}
              disabled={training}
              className={`px-3 py-1.5 text-xs transition ${
                hiddenOn ? 'bg-accent text-white' : 'bg-bg text-muted hover:bg-surface'
              } disabled:opacity-50`}
            >
              1층
            </button>
          </div>
        </div>

        <div className={hiddenOn ? '' : 'opacity-40 pointer-events-none'}>
          <div className="flex items-baseline justify-between text-[12px]">
            <span>은닉 뉴런 수 N</span>
            <span className="font-mono text-accent">{hiddenN}</span>
          </div>
          <input
            type="range"
            min={1}
            max={16}
            value={hiddenN}
            onChange={(e) => setHiddenN(Number(e.target.value))}
            disabled={!hiddenOn || training}
            className="w-full accent-violet-600"
          />
          <div className="flex justify-between text-[10px] font-mono text-muted">
            <span>1</span>
            <span>8</span>
            <span>16</span>
          </div>
        </div>

        <div className="border border-border rounded-md p-2 font-mono text-[11px]">
          <div className="text-muted">구조 → <span className="text-text">{layers.join(' → ')}</span></div>
          <div className="text-muted">파라미터 → <span className="text-accent">{params.toLocaleString()}개</span></div>
          <div className="text-muted">
            학습 데이터 → <span className="text-text">{trainSamples.length}개</span> · 평가 → {evalSamples.length}개
          </div>
        </div>

        <button onClick={startTrain} disabled={training || trainSamples.length === 0} className="btn-primary">
          {training ? `▶ 학습 중… (epoch ${progress?.epoch ?? 0}/25)` : '▶ 학습 시작'}
        </button>
        {progress && (
          <div className="text-[11px] font-mono text-muted">
            현재 손실 = <span className="text-accent">{progress.loss.toFixed(4)}</span>
          </div>
        )}

        <div className="text-[10.5px] text-muted leading-snug">
          은닉 N뉴런이면 모델은 더 복잡한 패턴을 잡을 수 있어요. 단, C2에서 본 갈림점도 더 빨리 와요 —
          학습 정확도가 평가 정확도보다 훨씬 높으면 "외운 흔적"이에요.
        </div>
      </div>

      {/* 우: 결과 + ScatterChart */}
      <div className="space-y-3">
        <T2Results results={results} />
        {results.length >= 1 && <T2Scatter results={results} />}
        {results.length === 0 && (
          <div className="card p-6 text-center text-muted text-sm">
            학습을 시작하면 결과가 여기 모여요. 은닉 0층 / 4뉴런 / 8뉴런 / 16뉴런을 차례로 비교해 보세요.
          </div>
        )}
      </div>
    </div>
  );
}

function T2Results({ results }: { results: T2Result[] }) {
  if (results.length === 0) return null;
  return (
    <div className="card p-3">
      <div className="text-sm font-medium">학습한 모델들</div>
      <table className="w-full text-[11px] font-mono mt-2">
        <thead className="text-muted">
          <tr>
            <th className="text-left">은닉</th>
            <th className="text-right">파라미터</th>
            <th className="text-right" style={{ color: 'rgb(59,130,246)' }}>train</th>
            <th className="text-right" style={{ color: 'rgb(16,185,129)' }}>eval</th>
            <th className="text-right">갈림점</th>
          </tr>
        </thead>
        <tbody>
          {results.map((r) => {
            const gap = r.trainAcc - r.evalAcc;
            return (
              <tr key={`${r.hiddenN}-${r.params}`} className="border-t border-border/30">
                <td className="text-left py-1">
                  {r.hiddenN === 0 ? '0층' : `1층 · ${r.hiddenN}뉴런`}
                </td>
                <td className="text-right">{r.params.toLocaleString()}</td>
                <td className="text-right" style={{ color: 'rgb(59,130,246)' }}>
                  {(r.trainAcc * 100).toFixed(1)}%
                </td>
                <td className="text-right" style={{ color: 'rgb(16,185,129)' }}>
                  {(r.evalAcc * 100).toFixed(1)}%
                </td>
                <td className="text-right" style={{ color: gap > 0.1 ? 'rgb(190,18,60)' : 'rgb(var(--color-muted))' }}>
                  {(gap * 100).toFixed(1)}%p
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="text-[10px] text-muted mt-2">
        ※ 갈림점 = train − eval. 클수록 과적합. 같은 은닉 옵션을 다시 학습하면 결과가 덮어써요.
      </div>
    </div>
  );
}

function T2Scatter({ results }: { results: T2Result[] }) {
  const W = 520, H = 220;
  if (results.length === 0) return null;
  const maxParams = Math.max(...results.map((r) => r.params), 1);
  const xFor = (p: number) => 50 + (p / maxParams) * (W - 70);
  const yFor = (acc: number) => H - 30 - acc * (H - 50);
  return (
    <div className="card p-3">
      <div className="text-sm font-medium">파라미터 수 vs 정확도</div>
      <p className="text-[11px] text-muted mt-1">
        오른쪽 = 파라미터 ↑ · 위 = 정확도 ↑. 파란 점이 train, 녹색 점이 eval.
      </p>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full mt-1">
        <line x1={50} y1={H - 30} x2={W - 20} y2={H - 30} stroke="rgb(var(--color-border))" />
        <line x1={50} y1={20} x2={50} y2={H - 30} stroke="rgb(var(--color-border))" />
        <text x={W - 20} y={H - 14} textAnchor="end" fontSize={10} fill="rgb(var(--color-muted))">파라미터 수 →</text>
        <text x={50} y={16} fontSize={10} fill="rgb(var(--color-muted))">↑ 정확도</text>
        {[0.5, 0.75, 0.9, 1].map((t) => (
          <g key={t}>
            <line x1={50} y1={yFor(t)} x2={W - 20} y2={yFor(t)}
              stroke="rgb(var(--color-border))" strokeDasharray="2 3" strokeWidth={0.4} />
            <text x={46} y={yFor(t) + 3} textAnchor="end" fontSize={9} fill="rgb(var(--color-muted))">
              {Math.round(t * 100)}%
            </text>
          </g>
        ))}
        {/* train 라인 */}
        <path
          d={results.map((r, i) => `${i === 0 ? 'M' : 'L'}${xFor(r.params)},${yFor(r.trainAcc)}`).join(' ')}
          fill="none" stroke="rgb(59,130,246)" strokeWidth={1.4} strokeOpacity={0.6} strokeDasharray="3 3"
        />
        {/* eval 라인 */}
        <path
          d={results.map((r, i) => `${i === 0 ? 'M' : 'L'}${xFor(r.params)},${yFor(r.evalAcc)}`).join(' ')}
          fill="none" stroke="rgb(16,185,129)" strokeWidth={1.6}
        />
        {/* 점들 */}
        {results.map((r) => (
          <g key={`pt-${r.hiddenN}`}>
            <circle cx={xFor(r.params)} cy={yFor(r.trainAcc)} r={4} fill="rgb(59,130,246)" />
            <circle cx={xFor(r.params)} cy={yFor(r.evalAcc)} r={5} fill="rgb(16,185,129)" />
            <text x={xFor(r.params)} y={yFor(r.evalAcc) - 10} textAnchor="middle"
              fontSize={10} fill="rgb(var(--color-text))" fontWeight={600}>
              {r.hiddenN === 0 ? '0층' : `${r.hiddenN}뉴런`}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   공용 작은 컴포넌트
   ════════════════════════════════════════════════════════════ */

function Node({
  cx, cy, label, accent, mid, dead,
}: { cx: number; cy: number; label: string; accent?: boolean; mid?: boolean; dead?: boolean }) {
  const fill = dead
    ? 'rgba(190,18,60,0.12)'
    : accent
    ? 'rgb(var(--color-accent))'
    : mid
    ? 'rgb(var(--color-accent-bg))'
    : 'rgb(var(--color-surface))';
  const stroke = dead
    ? 'rgb(190,18,60)'
    : accent
    ? 'rgb(var(--color-accent))'
    : 'rgb(var(--color-muted))';
  const txt = accent ? '#fff' : dead ? 'rgb(190,18,60)' : 'rgb(var(--color-text))';
  return (
    <g>
      <circle cx={cx} cy={cy} r={20} fill={fill} stroke={stroke} strokeWidth={1.4}
        strokeOpacity={accent || dead ? 1 : 0.7} />
      <text x={cx} y={cy + 5} textAnchor="middle" fontSize={14} fontWeight={700} fill={txt}>
        {label}
      </text>
    </g>
  );
}

function ValueBadge({ cx, cy, label, color }: { cx: number; cy: number; label: string; color: string }) {
  const w = label.length * 6.4 + 14;
  const h = 16;
  return (
    <g>
      <rect x={cx - w / 2} y={cy - h / 2} width={w} height={h} rx={4}
        fill="rgb(var(--color-bg))" stroke={color} strokeOpacity={0.5} strokeWidth={1} />
      <text x={cx} y={cy + 4} textAnchor="middle" fill={color} fontSize={10.5} fontWeight={600}>
        {label}
      </text>
    </g>
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
