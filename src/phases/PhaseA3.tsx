// PhaseA3 — 경사하강법 (Phase3 뒷부분 GD + Phase4 학습률 비교 흡수)
// 변수 토글로 w·b 두 변수 모두 실습 가능.
// 한 viewport (wide): 좌측 손실 곡선 + 현재 점/접선/다음 step 미리보기,
// 우측 학습률 슬라이더 + step 컨트롤 + 미니 손실 추이.
// 하단 4개 시나리오 칩 (발산/진동/수렴/느림) — 변수에 따라 학습률 표가 자동 조정됨.

import { useEffect, useMemo, useState } from 'react';
import { PHASES } from '../phases';
import { useApp } from '../store';

// 정답: y = 2x + 1 — A2~A5 가 공유하는 데이터.
const DATA: [number, number][] = [
  [1, 3], [2, 5], [3, 7], [4, 9], [5, 11],
];
const W_TRUE = 2;
const B_TRUE = 1;
const N = DATA.length;

type VarMode = 'w' | 'b';

/* 모드별 설정 — 변수 범위, 시작점, 학습률 슬라이더 범위, 시나리오 학습률 */
const CONF: Record<VarMode, {
  vMin: number; vMax: number; vStart: number;
  fixedLabel: string;
  lrMin: number; lrMax: number; lrStep: number; lrInit: number;
  ticks: number[];
  varLabel: string;
  fixedDesc: string;
  axisLabel: string;
  curvature: string; // 안정 조건 설명용
}> = {
  b: {
    vMin: -3, vMax: 5, vStart: -2,
    fixedLabel: `w = ${W_TRUE} (고정)`,
    lrMin: 0.01, lrMax: 2.6, lrStep: 0.01, lrInit: 0.5,
    ticks: [-2, -1, 0, 1, 2, 3, 4, 5],
    varLabel: 'b',
    fixedDesc: 'w를 정답값으로 고정한 채 b만 움직여 봐요.',
    axisLabel: 'b',
    curvature: '0 < η < 2 (½MSE 기준 b 단면의 곡률은 1)',
  },
  w: {
    vMin: -1, vMax: 5, vStart: -0.5,
    fixedLabel: `b = ${B_TRUE} (고정)`,
    lrMin: 0.001, lrMax: 0.3, lrStep: 0.001, lrInit: 0.05,
    ticks: [-1, 0, 1, 2, 3, 4, 5],
    varLabel: 'w',
    fixedDesc: 'b를 정답값으로 고정한 채 w만 움직여 봐요.',
    axisLabel: 'w',
    curvature: '0 < η < 약 0.18 (w 단면 곡률은 11 = x² 의 평균)',
  },
};

const TRUE_OF = (mode: VarMode) => (mode === 'b' ? B_TRUE : W_TRUE);

// 손실 L = ½ · MSE = (1/(2N)) · Σ e² — A4 의 ½ 도입과 일치시켜 둔다.
const lossAt = (v: number, mode: VarMode) => {
  const w = mode === 'w' ? v : W_TRUE;
  const b = mode === 'b' ? v : B_TRUE;
  return DATA.reduce((s, [x, y]) => {
    const e = (w * x + b) - y;
    return s + e * e;
  }, 0) / (2 * N);
};

// ½MSE 의 기울기 — db = (1/N) Σ e, dw = (1/N) Σ x · e (인수 2가 ½ 와 약분).
const slopeAt = (v: number, mode: VarMode) => {
  const w = mode === 'w' ? v : W_TRUE;
  const b = mode === 'b' ? v : B_TRUE;
  return DATA.reduce((s, [x, y]) => {
    const factor = mode === 'w' ? x : 1;
    return s + factor * ((w * x + b) - y);
  }, 0) / N;
};

type Scenario = {
  id: 'diverge' | 'big' | 'mid' | 'small';
  label: string;
  color: string;
  note: string;
};
const SCENARIOS: Scenario[] = [
  { id: 'diverge', label: '발산', color: 'rgb(190,18,60)' , note: '발산' },
  { id: 'big',     label: '진동', color: 'rgb(251,146,60)', note: '진동' },
  { id: 'mid',     label: '수렴', color: 'rgb(16,185,129)', note: '수렴' },
  { id: 'small',   label: '느림', color: 'rgb(59,130,246)', note: '느림' },
];

// 변수별 시나리오 학습률 — ½MSE 기준 critical η: b=2, w=2/11≈0.1818.
// w 의 진동 칩은 정확히 critical 값으로 둬 한 step 만에 반대편 같은 거리로 떨어지는 모습을 보인다.
const SC_LR: Record<VarMode, Record<Scenario['id'], number>> = {
  b: { diverge: 2.5, big: 2.0, mid: 0.5, small: 0.05 },
  w: { diverge: 0.25, big: 2 / 11, mid: 0.05, small: 0.005 },
};

type Trail = { points: { v: number; mse: number }[]; color: string; label: string; id: Scenario['id'] };

// 칩에 표시할 학습률 포맷터 — 무한소수는 소수점 3자리에서 자른다(반올림 X, "0.1818..." 회피).
const fmtLr = (lr: number) => (Math.trunc(lr * 1000) / 1000).toString();

export function PhaseA3() {
  const meta = PHASES.find((p) => p.id === 'a3')!;
  const markCompleted = useApp((s) => s.markCompleted);

  const [mode, setMode] = useState<VarMode>('w');
  const conf = CONF[mode];

  // 직접 조작
  const [v, setV] = useState(conf.vStart);
  const [lr, setLr] = useState(conf.lrInit);
  const [history, setHistory] = useState<{ v: number; mse: number }[]>([
    { v: conf.vStart, mse: lossAt(conf.vStart, mode) },
  ]);

  // 4개 시나리오 자취
  const [trails, setTrails] = useState<Record<Scenario['id'], Trail | null>>({
    diverge: null, big: null, mid: null, small: null,
  });
  const [activeScenario, setActiveScenario] = useState<Scenario['id'] | null>(null);
  // seen은 state로 — render 중 ref.current 읽기 lint 회피
  const [seen, setSeen] = useState<Set<Scenario['id']>>(new Set());

  // 모드 전환 시 상태 초기화
  const switchMode = (next: VarMode) => {
    if (next === mode) return;
    const c = CONF[next];
    setMode(next);
    setV(c.vStart);
    setLr(c.lrInit);
    setHistory([{ v: c.vStart, mse: lossAt(c.vStart, next) }]);
    setTrails({ diverge: null, big: null, mid: null, small: null });
    setActiveScenario(null);
    setSeen(new Set());
  };

  const mse = lossAt(v, mode);
  const slope = slopeAt(v, mode);
  const nextV = v - lr * slope;
  const nextMse = lossAt(nextV, mode);
  const reached = mse < 0.05;

  // 완료 처리: 직접 수렴 도달 또는 4개 시나리오를 모드 어디서든 모두 본 적 있을 때
  useEffect(() => {
    if (reached || seen.size >= 4) markCompleted('a3');
  }, [reached, seen, markCompleted]);

  const stepOnce = () => {
    setV(nextV);
    setHistory((h) => [...h, { v: nextV, mse: lossAt(nextV, mode) }]);
  };

  const reset = () => {
    setV(conf.vStart);
    setHistory([{ v: conf.vStart, mse: lossAt(conf.vStart, mode) }]);
  };

  const runScenario = (sc: Scenario) => {
    const sLr = SC_LR[mode][sc.id];
    let vv = conf.vStart;
    const points: { v: number; mse: number }[] = [{ v: vv, mse: lossAt(vv, mode) }];
    for (let i = 0; i < 10; i++) {
      const g = slopeAt(vv, mode);
      const next = vv - sLr * g;
      if (!isFinite(next) || Math.abs(next) > 50) {
        points.push({ v: vv, mse: lossAt(vv, mode) });
        break;
      }
      vv = next;
      points.push({ v: vv, mse: lossAt(vv, mode) });
    }
    setTrails((t) => ({ ...t, [sc.id]: { points, color: sc.color, label: sc.label, id: sc.id } }));
    setActiveScenario(sc.id);
    setSeen((s) => {
      if (s.has(sc.id)) return s;
      const ns = new Set(s);
      ns.add(sc.id);
      return ns;
    });
  };

  const clearTrails = () => {
    setTrails({ diverge: null, big: null, mid: null, small: null });
    setActiveScenario(null);
  };

  const trueV = TRUE_OF(mode);

  return (
    <article>
      <div className="text-xs font-mono text-muted">PHASE {meta.num}</div>
      <h1>{meta.title}</h1>
      <p className="text-muted mt-2">
        손실을 줄이려면 <strong>기울기 방향의 반대로</strong> 움직여요 — 그래서 식에 빼기가 들어갑니다.
        한 step에 얼마나 옮길지 정하는 보폭이 <strong className="text-accent">학습률 η</strong> —
        새 {conf.varLabel} = {conf.varLabel} − η × 기울기. 이 한 줄이 경사하강법의 전부예요.
      </p>
      <div className="aside-note mt-3 text-[12px]">
        <strong>여기 손실 L 은 ½ · MSE</strong> = MSE ÷ 2 예요. A2 에서 본 MSE 와 똑같은 모양의 곡선이고
        세로축 값만 정확히 절반 — ½ 을 곱해 두면 다음 A4 에서 미분할 때 제곱에서 나오는 2 와 약분돼 식이 깔끔해집니다.
      </div>

      {/* ── 변수 토글 ────────────────────────────────────────── */}
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <span className="text-sm text-muted">어떤 변수를 만져볼까요?</span>
        <div className="inline-flex rounded-md border border-border overflow-hidden">
          <button
            onClick={() => switchMode('w')}
            className={`px-3 py-1.5 text-sm font-mono transition ${
              mode === 'w' ? 'bg-accent text-white' : 'bg-bg text-muted hover:bg-surface'
            }`}>
            가중치 w
          </button>
          <button
            onClick={() => switchMode('b')}
            className={`px-3 py-1.5 text-sm font-mono transition ${
              mode === 'b' ? 'bg-accent text-white' : 'bg-bg text-muted hover:bg-surface'
            }`}>
            편향 b
          </button>
        </div>
        <span className="text-xs text-muted">{conf.fixedDesc}</span>
      </div>

      {/* ── 핵심 비주얼: 좌(곡선) + 우(컨트롤·추이) ───────────────── */}
      <div className="mt-4 grid lg:grid-cols-[3fr_2fr] gap-4">
        <LossCurve
          mode={mode}
          conf={conf}
          v={v} mse={mse} slope={slope}
          nextV={nextV} nextMse={nextMse}
          trails={trails} activeScenario={activeScenario}
          trueV={trueV}
        />

        <div className="flex flex-col gap-3">
          <div className="card p-4">
            <label className="block">
              <div className="flex justify-between text-sm mb-1">
                <span>현재 {conf.varLabel} <span className="text-muted text-xs">(드래그해서 직접 옮겨 보기)</span></span>
                <span className="font-mono text-accent">{conf.varLabel} = {v.toFixed(2)}</span>
              </div>
              <input
                type="range" min={conf.vMin} max={conf.vMax} step={0.05}
                value={v}
                onChange={(e) => {
                  const nv = parseFloat(e.target.value);
                  setV(nv);
                  setHistory([{ v: nv, mse: lossAt(nv, mode) }]);
                }}
                className="w-full"
              />
              <div className="flex justify-between text-[11px] text-muted mt-0.5">
                <span>{conf.vMin}</span><span>{conf.vMax}</span>
              </div>
            </label>
            <label className="block mt-3">
              <div className="flex justify-between text-sm mb-1">
                <span>학습률 η <span className="text-muted text-xs">(보폭)</span></span>
                <span className="font-mono text-accent">η = {lr.toFixed(4).replace(/\.?0+$/, '') || '0'}</span>
              </div>
              <input
                type="range" min={conf.lrMin} max={conf.lrMax} step={conf.lrStep}
                value={lr}
                onChange={(e) => setLr(parseFloat(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between text-[11px] text-muted mt-0.5">
                <span>{conf.lrMin}</span><span>{conf.lrMax}</span>
              </div>
            </label>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs font-mono">
              <Stat label={`현재 ${conf.varLabel}`} value={v.toFixed(3)} />
              <Stat label="손실 L" value={mse.toFixed(3)} highlight={reached} />
              <Stat label="기울기" value={slope.toFixed(3)} />
              <Stat label={`다음 ${conf.varLabel}`} value={nextV.toFixed(3)} accent />
            </div>
            <div className="flex gap-2 mt-3">
              <button onClick={stepOnce} className="btn-primary text-sm py-1.5 px-3 flex-1"
                disabled={Math.abs(slope) < 1e-3}>
                한 step 진행
              </button>
              <button onClick={reset} className="btn-ghost text-sm py-1.5 px-3">초기화</button>
            </div>
            <div className="text-[11px] text-muted mt-2 leading-snug">
              새 {conf.varLabel} = {v.toFixed(2)} − {lr.toFixed(4).replace(/\.?0+$/, '') || '0'} × ({slope.toFixed(2)})
              = <span className="text-accent">{nextV.toFixed(3)}</span>
            </div>
          </div>

          <div className="card p-3">
            <div className="flex items-baseline justify-between">
              <div className="text-sm font-medium">손실 추이</div>
              <div className="text-[11px] text-muted font-mono">
                step {history.length - 1} · L {mse.toFixed(3)}
              </div>
            </div>
            <MiniLossHistory history={history} />
          </div>
        </div>
      </div>

      {/* ── 강조: η = 학습률 = 한 step의 보폭 ──────────────────── */}
      <div className="aside-tip mt-4 text-sm">
        <strong>η = 학습률 = 한 step의 보폭.</strong>{' '}
        매 step마다 기울기 방향으로 얼마나 옮길지를 정하는 한 숫자예요.
        같은 곡선·같은 출발점이어도 이 한 숫자만 바꾸면 결과가 이렇게 달라집니다 ↓
      </div>

      {/* ── 4개 시나리오 비교 ─────────────────────────────────────── */}
      <div className="mt-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted mr-1">자동 비교 ({conf.varLabel}):</span>
          {SCENARIOS.map((sc) => {
            const isSeen = seen.has(sc.id);
            const active = activeScenario === sc.id;
            const sLr = SC_LR[mode][sc.id];
            return (
              <button
                key={sc.id}
                onClick={() => runScenario(sc)}
                className="text-xs font-mono py-1.5 px-3 rounded-full border transition"
                style={{
                  borderColor: sc.color,
                  background: active ? sc.color : 'transparent',
                  color: active ? 'white' : sc.color,
                  fontWeight: 600,
                }}
              >
                {isSeen && !active && <span className="mr-1">✓</span>}
                η = {fmtLr(sLr)} <span className="opacity-70 ml-1">{sc.note}</span>
              </button>
            );
          })}
          <button onClick={clearTrails} className="btn-ghost text-xs py-1 px-2 ml-auto">
            자취 지우기
          </button>
        </div>
        <div className="grid sm:grid-cols-4 gap-2 mt-3">
          {SCENARIOS.map((sc) => {
            const tr = trails[sc.id];
            const last = tr?.points[tr.points.length - 1];
            const final = last ? lossAt(last.v, mode) : null;
            const diverged = last ? Math.abs(last.v) >= 50 : false;
            const sLr = SC_LR[mode][sc.id];
            return (
              <div key={sc.id} className="card p-2.5"
                style={{ borderColor: tr ? sc.color : undefined, borderWidth: tr ? 1.5 : 1 }}>
                <div className="text-xs font-mono" style={{ color: sc.color }}>
                  η = {fmtLr(sLr)}
                </div>
                <div className="text-xs text-muted mt-1">{sc.note}</div>
                {tr && final !== null && (
                  <div className="font-mono text-[11px] mt-1">
                    {diverged
                      ? <span style={{ color: sc.color }}>발산 ({conf.varLabel} ≫ 곡선 밖)</span>
                      : <>10 step → L <span style={{ color: sc.color, fontWeight: 700 }}>{final.toFixed(3)}</span></>
                    }
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <p className="text-[11px] text-muted mt-2 leading-relaxed">
          이 곡선의 안정 조건은 <code>{conf.curvature}</code>.{' '}
          {mode === 'w' ? (
            <>같은 알고리즘인데 <strong>w 곡선이 b 곡선보다 훨씬 가팔라서</strong> 발산 한계도 작아요 — 입력 x의 크기가 곡률에 들어가기 때문이에요.</>
          ) : (
            <>실제 학습에서는 곡률이 데이터·모델마다 달라 "딱 맞는 보폭"도 매번 다릅니다 — 학습률 튜닝이 학습의 핵심 작업인 이유.</>
          )}
        </p>
      </div>
    </article>
  );
}

/* ─────────────────────────────────────────────────────────
   손실 곡선 — 현재 v, 접선, 다음 step 미리보기, 시나리오 자취
───────────────────────────────────────────────────────── */
function LossCurve({
  mode, conf, v, mse, slope, nextV, nextMse, trails, activeScenario, trueV,
}: {
  mode: VarMode;
  conf: typeof CONF[VarMode];
  v: number; mse: number; slope: number; nextV: number; nextMse: number;
  trails: Record<Scenario['id'], Trail | null>;
  activeScenario: Scenario['id'] | null;
  trueV: number;
}) {
  const W = 600, H = 360;
  const padL = 44, padR = 16, padT = 18, padB = 34;
  const lMax = Math.max(lossAt(conf.vMin, mode), lossAt(conf.vMax, mode)) * 1.05;

  const sx = useMemo(
    () => (vv: number) => padL + ((vv - conf.vMin) / (conf.vMax - conf.vMin)) * (W - padL - padR),
    [conf.vMin, conf.vMax]
  );
  const sy = useMemo(
    () => (lv: number) => H - padB - (Math.min(Math.max(lv, 0), lMax) / lMax) * (H - padT - padB),
    [lMax]
  );

  const curve = useMemo(() => {
    const parts: string[] = [];
    const step = (conf.vMax - conf.vMin) / 200;
    for (let vv = conf.vMin; vv <= conf.vMax + 0.0001; vv += step) {
      parts.push(`${parts.length === 0 ? 'M' : 'L'}${sx(vv).toFixed(2)},${sy(lossAt(vv, mode)).toFixed(2)}`);
    }
    return parts.join(' ');
  }, [mode, conf.vMin, conf.vMax, sx, sy]);

  // 접선
  const tanLen = (conf.vMax - conf.vMin) * 0.13;
  const tanY = (vv: number) => mse + slope * (vv - v);
  const clipLow = (vv: number) => {
    const y = tanY(vv);
    if (y >= 0 || Math.abs(slope) < 1e-6) return vv;
    return v + (0 - mse) / slope;
  };
  const t1 = Math.max(conf.vMin, clipLow(v - tanLen));
  const t2 = Math.min(conf.vMax, clipLow(v + tanLen));

  // 다음 step 미리보기
  const nb = Math.max(conf.vMin - 0.5, Math.min(conf.vMax + 0.5, nextV));
  const inBoundNext = nb >= conf.vMin && nb <= conf.vMax;
  const nextX = sx(nb);
  const nextY = sy(Math.min(nextMse, lMax));

  return (
    <div className="card p-2">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="xMidYMid meet">
        <defs>
          <marker id="a3-arr" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 z" fill="rgb(var(--color-accent))" />
          </marker>
        </defs>

        {/* axes */}
        <line x1={padL} y1={H - padB} x2={W - padR} y2={H - padB} stroke="rgb(var(--color-border))" />
        <line x1={padL} y1={padT} x2={padL} y2={H - padB} stroke="rgb(var(--color-border))" />
        {conf.ticks.map((vv) => (
          <text key={vv} x={sx(vv)} y={H - padB + 16} textAnchor="middle"
            fontSize={11} fill="rgb(var(--color-muted))">{vv}</text>
        ))}
        <text x={W - padR - 4} y={H - padB - 6} textAnchor="end" fontSize={11} fill="rgb(var(--color-muted))">{conf.axisLabel}</text>
        <text x={padL + 6} y={padT + 12} fontSize={11} fill="rgb(var(--color-muted))">L</text>

        {/* 정답 v 수직선 */}
        <line x1={sx(trueV)} y1={padT} x2={sx(trueV)} y2={H - padB}
          stroke="rgb(var(--color-muted))" strokeDasharray="3 3" opacity={0.6} />
        <text x={sx(trueV) + 4} y={padT + 12} fontSize={10} fill="rgb(var(--color-muted))">
          {conf.varLabel} = {trueV} (최저)
        </text>

        {/* 손실 곡선 */}
        <path d={curve} fill="none" stroke="rgb(var(--color-accent))" strokeWidth={2.2} opacity={0.85} />

        {/* 시나리오 자취 */}
        {SCENARIOS.map((sc) => {
          const tr = trails[sc.id];
          if (!tr) return null;
          const dim = activeScenario && activeScenario !== sc.id ? 0.25 : 0.9;
          const path = tr.points.map((p, i) => {
            const cx = sx(Math.max(conf.vMin, Math.min(conf.vMax, p.v)));
            const cy = sy(Math.min(p.mse, lMax));
            return `${i === 0 ? 'M' : 'L'}${cx.toFixed(2)},${cy.toFixed(2)}`;
          }).join(' ');
          return (
            <g key={sc.id} opacity={dim}>
              <path d={path} fill="none" stroke={sc.color} strokeWidth={1.6}
                strokeDasharray="3 3" />
              {tr.points.map((p, i) => {
                const cx = sx(Math.max(conf.vMin, Math.min(conf.vMax, p.v)));
                const cy = sy(Math.min(p.mse, lMax));
                const inB = p.v >= conf.vMin && p.v <= conf.vMax;
                if (!inB) return null;
                return <circle key={i} cx={cx} cy={cy} r={2.6} fill={sc.color} opacity={0.8} />;
              })}
            </g>
          );
        })}

        {/* 접선 */}
        {Math.abs(slope) > 0.005 && (
          <line
            x1={sx(t1)} y1={sy(tanY(t1))}
            x2={sx(t2)} y2={sy(tanY(t2))}
            stroke="rgb(251,146,60)" strokeWidth={2} opacity={0.85} />
        )}

        {/* 다음 step 화살표 */}
        {inBoundNext && Math.abs(nextV - v) > 0.001 && (
          <line
            x1={sx(v)} y1={sy(mse)}
            x2={nextX} y2={nextY}
            stroke="rgb(var(--color-accent))" strokeWidth={2}
            strokeDasharray="5 4" opacity={0.7}
            markerEnd="url(#a3-arr)" />
        )}
        {inBoundNext && (
          <circle cx={nextX} cy={nextY} r={5}
            fill="white" stroke="rgb(var(--color-accent))" strokeWidth={2} opacity={0.9} />
        )}

        {/* 현재 점 */}
        <circle cx={sx(v)} cy={sy(mse)} r={7}
          fill="rgb(190,18,60)" stroke="white" strokeWidth={2} />
        <text
          x={v > conf.vMax - (conf.vMax - conf.vMin) * 0.2 ? sx(v) - 10 : sx(v) + 12}
          y={sy(mse) - 10}
          textAnchor={v > conf.vMax - (conf.vMax - conf.vMin) * 0.2 ? 'end' : 'start'}
          fontSize={11} fill="rgb(var(--color-text))" fontWeight={600}>
          {conf.varLabel} = {v.toFixed(2)}, L = {mse.toFixed(2)}
        </text>
      </svg>
      <div className="text-[11px] text-muted px-2 pb-2 leading-snug">
        가로축 = {conf.varLabel} 후보, 세로축 = 손실 L = ½·MSE ({conf.fixedLabel}).{' '}
        <span style={{ color: 'rgb(190,18,60)' }}>● 빨강</span>=현재 위치,{' '}
        <span style={{ color: 'rgb(251,146,60)' }}>주황 선</span>=현재 기울기(접선),{' '}
        <span className="text-accent">점선 화살표</span>=현재 η로 한 step 옮긴 위치.
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   미니 손실 추이 (직접 step 진행)
───────────────────────────────────────────────────────── */
function MiniLossHistory({ history }: { history: { v: number; mse: number }[] }) {
  const W = 280, H = 110, padL = 28, padR = 8, padT = 8, padB = 18;
  const N1 = history.length;
  const Lmax = Math.max(0.3, ...history.map((h) => h.mse));
  const sx = (i: number) => padL + (N1 > 1 ? (i / (N1 - 1)) : 0) * (W - padL - padR);
  const sy = (l: number) => H - padB - (Math.min(l, Lmax) / Lmax) * (H - padT - padB);
  const path = history.map((h, i) => `${i === 0 ? 'M' : 'L'}${sx(i).toFixed(1)},${sy(h.mse).toFixed(1)}`).join(' ');

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full mt-1">
      <line x1={padL} y1={H - padB} x2={W - padR} y2={H - padB} stroke="rgb(var(--color-border))" />
      <line x1={padL} y1={padT} x2={padL} y2={H - padB} stroke="rgb(var(--color-border))" />
      <text x={padL - 4} y={padT + 8} textAnchor="end" fontSize={9} fill="rgb(var(--color-muted))">{Lmax.toFixed(1)}</text>
      <text x={padL - 4} y={H - padB + 1} textAnchor="end" fontSize={9} fill="rgb(var(--color-muted))">0</text>
      <text x={W - padR} y={H - 4} textAnchor="end" fontSize={9} fill="rgb(var(--color-muted))">step</text>
      <path d={path} fill="none" stroke="rgb(var(--color-accent))" strokeWidth={1.6} />
      {history.map((h, i) => (
        <circle key={i} cx={sx(i)} cy={sy(h.mse)} r={2.2} fill="rgb(var(--color-accent))" />
      ))}
    </svg>
  );
}

/* ─────────────────────────────────────────────────────────
   작은 통계 카드
───────────────────────────────────────────────────────── */
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
