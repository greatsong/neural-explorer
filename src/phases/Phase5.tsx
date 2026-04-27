import { useState } from 'react';
import { useApp } from '../store';
import { DerivationContent } from './Phase5B';
import { PracticalContent } from './Phase5C';

type TabId = 'see' | 'formula' | 'derive' | 'recap' | 'real';
const TABS: { id: TabId; num: string; label: string; sub: string }[] = [
  { id: 'see',     num: '1', label: '직관',         sub: '다이어그램으로 변화 보기' },
  { id: 'formula', num: '2', label: '수식 이해',    sub: '업데이트 식 + 평균 계산' },
  { id: 'derive',  num: '3', label: '수식 유도',    sub: '11단계 한 줄씩' },
  { id: 'recap',   num: '4', label: '전체 종합',    sub: '그림 + 식 한 화면' },
  { id: 'real',    num: '5', label: '실생활 적용', sub: '서울 기온 두 모델' },
];

const DATA: [number, number][] = [
  [1, 3], [2, 5], [3, 7], [4, 9], [5, 11],
];

// 모델: ŷ = ReLU(w·x + b). 페이즈 1과 동일한 단일 뉴런 구조.
// 데이터 (1,3)~(5,11)은 모두 양수이고 정답(w=2, b=1) 근처에서 z>0이라 ReLU(z)=z로 동작.
// z=0 경계에서는 관습적으로 ReLU'(0)=1로 처리해 학습이 멈추지 않도록 한다.
const reluPrime = (z: number) => (z >= 0 ? 1 : 0);

const lossFn = (w: number, b: number) =>
  DATA.reduce((acc, [x, y]) => {
    const z = w * x + b;
    const yhat = Math.max(0, z);
    return acc + 0.5 * (yhat - y) ** 2;
  }, 0) / DATA.length;

const gradient = (w: number, b: number) => {
  let dw = 0, db = 0;
  DATA.forEach(([x, y]) => {
    const z = w * x + b;
    const yhat = Math.max(0, z);
    const e = yhat - y;
    const r = reluPrime(z);
    dw += e * r * x;
    db += e * r;
  });
  return { dw: dw / DATA.length, db: db / DATA.length };
};

export function Phase5() {
  const [w, setW] = useState(0);
  const [b, setB] = useState(0);
  const [lr, setLr] = useState(0.1);
  const [history, setHistory] = useState<{ w: number; b: number; loss: number }[]>([
    { w: 0, b: 0, loss: lossFn(0, 0) },
  ]);
  const [prev, setPrev] = useState<{ w: number; b: number } | null>(null);
  const [pulseKey, setPulseKey] = useState(0);
  const markCompleted = useApp((s) => s.markCompleted);

  const loss = lossFn(w, b);
  const { dw, db } = gradient(w, b);

  const step = () => {
    const nw = w - lr * dw;
    const nb = b - lr * db;
    setPrev({ w, b });
    setW(nw); setB(nb);
    setHistory((h) => [...h, { w: nw, b: nb, loss: lossFn(nw, nb) }]);
    setPulseKey((k) => k + 1);
    if (lossFn(nw, nb) < 0.05) markCompleted('p5');
  };

  const step20 = () => {
    let cw = w, cb = b;
    const newH: { w: number; b: number; loss: number }[] = [];
    for (let i = 0; i < 20; i++) {
      const g = gradient(cw, cb);
      cw -= lr * g.dw;
      cb -= lr * g.db;
      newH.push({ w: cw, b: cb, loss: lossFn(cw, cb) });
    }
    setPrev({ w, b });
    setW(cw); setB(cb);
    setHistory((h) => [...h, ...newH]);
    setPulseKey((k) => k + 1);
    if (lossFn(cw, cb) < 0.05) markCompleted('p5');
  };

  const reset = () => {
    setW(0); setB(0);
    setPrev(null);
    setHistory([{ w: 0, b: 0, loss: lossFn(0, 0) }]);
  };

  const perPoint = DATA.map(([x, y]) => {
    const z = w * x + b;
    const pred = Math.max(0, z);
    const e = pred - y;
    return { x, y, z, pred, e };
  });

  const [tab, setTab] = useState<TabId>('see');
  const goNext = () => {
    const i = TABS.findIndex((t) => t.id === tab);
    if (i < TABS.length - 1) {
      setTab(TABS[i + 1].id);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };
  const showControls = tab === 'see' || tab === 'formula' || tab === 'recap';

  return (
    <article>
      <div className="text-xs font-mono text-muted">PHASE 5</div>
      <h1>자동으로 학습하기</h1>
      <p className="text-muted mt-2">
        페이즈 4에서 슬라이더를 손으로 움직여 오차를 줄였다면, 이제는 컴퓨터가 어느 쪽으로 얼마만큼 움직여야 하는지
        스스로 알아냅니다. 아래 5개 탭을 순서대로 진행하면 됩니다 — <strong>직관 → 수식 → 유도 → 종합 → 실생활</strong>.
      </p>

      {/* ── 탭 헤더 ───────────────────────────────────────────────── */}
      <nav className="mt-4 flex flex-wrap gap-1 border-b border-border">
        {TABS.map((t) => {
          const active = t.id === tab;
          return (
            <button key={t.id} onClick={() => { setTab(t.id); window.scrollTo({ top: 0 }); }}
              className={`px-3 py-2 text-sm border-b-2 -mb-px transition ${
                active
                  ? 'border-accent text-accent font-medium'
                  : 'border-transparent text-muted hover:text-text hover:border-border'
              }`}>
              <span className="font-mono text-xs mr-1">{t.num}.</span>{t.label}
            </button>
          );
        })}
      </nav>
      <div className="mt-3 text-xs text-muted">
        <span className="font-mono mr-1">{TABS.find((t) => t.id === tab)!.num}.</span>
        {TABS.find((t) => t.id === tab)!.sub}
      </div>

      {/* ── 탭 1: 직관 — 다이어그램과 손실 곡선이 한 화면에 ──────── */}
      {tab === 'see' && (
        <div className="mt-6 space-y-3">
          <p className="text-muted text-sm">
            단일 뉴런 <code>ŷ = ReLU(w · x + b)</code>를 다섯 점 (1,3)·(2,5)·(3,7)·(4,9)·(5,11)에 맞추도록 자동 학습시킵니다.
            아래 <strong>한 단계 진행</strong>을 눌러 보세요 — 왼쪽 다이어그램의 <code>w</code>·<code>b</code>·빨간 화살표 굵기가
            바뀌면서, 오른쪽 손실 곡선이 0으로 내려가는 모습을 한 눈에 확인할 수 있어요. 식은 다음 탭에서 자세히.
          </p>
          <div className="grid xl:grid-cols-[2fr_1fr] gap-4 items-start">
            <NeuronView w={w} b={b} pulseKey={pulseKey} />
            <div className="card p-3">
              <div className="text-sm font-medium">학습 진행 곡선</div>
              <p className="text-xs text-muted mt-1">매 step마다 손실 점이 하나씩 쌓입니다. 0에 가까워지면 학습 거의 끝.</p>
              <div className="mt-2 grid grid-cols-3 gap-1 text-xs font-mono">
                <div className="text-muted">step</div>
                <div className="text-muted">손실</div>
                <div className="text-muted text-right">↓ 줄어듦</div>
                <div>{history.length - 1}</div>
                <div>{loss.toFixed(4)}</div>
                <div className="text-right text-accent">{history.length > 1 ? ((history[history.length - 2].loss - loss) >= 0 ? '−' : '+') + Math.abs(history[history.length - 2].loss - loss).toFixed(4) : '—'}</div>
              </div>
              <div className="mt-2">
                <LossCurve history={history} />
              </div>
            </div>
          </div>
          <p className="text-xs text-muted">
            ※ 빨간 화살표 굵기는 그 점이 만드는 변화량(<code>w</code>는 <code>e × x</code>, <code>b</code>는 <code>e</code>)에 비례.
            학습이 끝나갈수록 화살표가 가늘고 옅어집니다.
          </p>
        </div>
      )}

      {/* ── 탭 2: 수식 이해 ───────────────────────────────────────── */}
      {tab === 'formula' && (
        <div className="mt-6 space-y-6">
          <section>
            <h2 className="text-base font-medium">2-1. 업데이트 식</h2>
            <p className="text-sm text-muted mt-1">
              한 step에 일어나는 일을 한 줄로 요약하면 다음과 같습니다.
              버튼을 누를 때마다 이 식이 그대로 적용돼요.
            </p>
            <UpdateFormulaCard w={w} b={b} dw={dw} db={db} lr={lr} />
          </section>

          <section>
            <h2 className="text-base font-medium">2-2. 평균은 어떻게 계산되나</h2>
            <p className="text-sm text-muted mt-1">
              <code>dw</code>·<code>db</code>의 정체는 다섯 점에서 만든 값을 평균낸 결과입니다.
              아래 표와 카드가 그 계산 과정을 그대로 보여줘요.
            </p>
            <div className="overflow-x-auto mt-3">
              <table className="w-full text-xs font-mono">
                <thead className="text-muted">
                  <tr>
                    <th className="text-left py-1">x</th>
                    <th>실제 y</th>
                    <th>z = w·x+b</th>
                    <th>예측 ŷ = ReLU(z)</th>
                    <th>오차 e = ŷ−y</th>
                    <th>e × x</th>
                  </tr>
                </thead>
                <tbody>
                  {perPoint.map((p) => (
                    <tr key={p.x} className="border-t border-border">
                      <td className="py-1">{p.x}</td>
                      <td className="text-center">{p.y}</td>
                      <td className="text-center text-muted">{p.z.toFixed(3)}</td>
                      <td className="text-center">{p.pred.toFixed(3)}</td>
                      <td className={`text-center ${Math.abs(p.e) > 0.5 ? 'text-amber-600 dark:text-amber-400' : 'text-muted'}`}>
                        {p.e.toFixed(3)}
                      </td>
                      <td className="text-center text-accent">{(p.e * p.x).toFixed(3)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <AverageCalcCard dw={dw} db={db} perPoint={perPoint} />
          </section>
        </div>
      )}

      {/* ── 탭 3: 수식 유도 ───────────────────────────────────────── */}
      {tab === 'derive' && (
        <div className="mt-6">
          <DerivationContent />
        </div>
      )}

      {/* ── 탭 4: 전체 종합 ───────────────────────────────────────── */}
      {tab === 'recap' && (
        <div className="mt-6 space-y-5">
          <p className="text-sm text-muted">
            지금까지 본 것을 한 화면에 모으고, 식과 함께 다시 한 번 정리합니다. 다음 탭에서 실데이터에 적용하기 전 마지막 점검.
          </p>
          <NeuronView w={w} b={b} pulseKey={pulseKey} />
          <UpdateFormulaCard w={w} b={b} dw={dw} db={db} lr={lr} />
          <SlicePlot w={w} b={b} dw={dw} db={db} lr={lr} prev={prev} />
          <div>
            <div className="text-sm font-medium">학습 곡선</div>
            <div className="mt-2">
              <LossCurve history={history} />
            </div>
          </div>
          <div className="aside-note text-sm">
            <div className="font-medium">한 줄로 정리</div>
            <p className="mt-1 text-muted">
              <strong>매 step마다</strong> 다섯 점의 오차로 평균(오차 × 입력값)·평균(오차)을 만들어,
              <strong> 새 w = w − 학습률 × dw</strong>, <strong>새 b = b − 학습률 × db</strong>로 갱신.
              이걸 손실이 0에 가까워질 때까지 반복하면 끝.
            </p>
          </div>
        </div>
      )}

      {/* ── 탭 5: 실생활 적용 ────────────────────────────────────── */}
      {tab === 'real' && (
        <div className="mt-6">
          <PracticalContent />
        </div>
      )}

      {/* ── 학습 컨트롤 (직관/수식/종합 탭에서만 표시) ────────────── */}
      {showControls && (
        <div className="sticky bottom-2 z-20 mt-6 rounded-lg border border-border bg-bg/85 backdrop-blur-md shadow-lg p-3">
          <div className="grid sm:grid-cols-3 gap-2 font-mono text-sm">
            <Stat label="현재 w" value={w.toFixed(3)} />
            <Stat label="현재 b" value={b.toFixed(3)} />
            <Stat label="손실" value={loss.toFixed(4)} highlight={loss < 0.05} />
          </div>
          <label className="block mt-3">
            <div className="flex justify-between text-xs mb-1">
              <span>학습률 η (보폭)</span>
              <span className="font-mono text-accent">{lr.toFixed(3)}</span>
            </div>
            <input type="range" min={0.001} max={0.1} step={0.001} value={lr}
              onChange={(e) => setLr(parseFloat(e.target.value))} className="w-full" />
          </label>
          <div className="flex flex-wrap gap-2 mt-3">
            <button onClick={step} className="btn-primary">한 단계 진행 (1 에포크)</button>
            <button onClick={step20} className="btn-ghost">20단계 반복</button>
            <button onClick={reset} className="btn-ghost">초기화</button>
          </div>
        </div>
      )}

      {/* ── 다음 탭 버튼 ──────────────────────────────────────────── */}
      {tab !== 'real' && (
        <div className="mt-8 flex justify-end">
          <button onClick={goNext} className="btn-primary">
            다음 탭으로 →&nbsp;{TABS[TABS.findIndex((t) => t.id === tab) + 1].label}
          </button>
        </div>
      )}

      {loss < 0.05 && tab !== 'real' && (
        <div className="aside-tip mt-4 text-sm">
          <strong>학습 종료.</strong> 변화량이 0에 가까워졌어요 (정답: w=2, b=1).
          왜 식이 e·x 모양인지 궁금하면 <strong>3. 수식 유도</strong> 탭으로.
        </div>
      )}
    </article>
  );
}

// 한 step 업데이트 식 — 한국어 + 기호 + 지금 값 대입을 한 카드에
function UpdateFormulaCard({ w, b, dw, db, lr }: {
  w: number; b: number; dw: number; db: number; lr: number;
}) {
  const newW = w - lr * dw;
  const newB = b - lr * db;
  return (
    <div className="card p-4 mt-3 space-y-3" style={{ fontFamily: 'system-ui' }}>
      <div className="rounded border border-accent/30 bg-accent/5 p-3 space-y-1">
        <div className="text-xs text-muted">한 step에 일어나는 일 (한국어):</div>
        <div className="text-sm">새 <strong>w</strong> = w − 학습률 × <span className="text-accent">평균(오차 × 입력값)</span></div>
        <div className="text-sm">새 <strong>b</strong> = b − 학습률 × <span className="text-accent">평균(오차)</span></div>
      </div>
      <div className="border-t border-border pt-2 font-mono text-sm space-y-1">
        <div className="text-xs not-italic text-muted" style={{ fontFamily: 'system-ui' }}>지금 값을 대입하면:</div>
        <div>새 w = {w.toFixed(3)} − ({lr.toFixed(3)} × {dw.toFixed(3)}) = <span className="text-accent font-semibold">{newW.toFixed(3)}</span></div>
        <div>새 b = {b.toFixed(3)} − ({lr.toFixed(3)} × {db.toFixed(3)}) = <span className="text-accent font-semibold">{newB.toFixed(3)}</span></div>
      </div>
    </div>
  );
}

// 다섯 점에서 dw·db가 어떻게 평균으로 만들어지는지 그대로 보여주는 카드.
// 각 항 / 합계 / 결과의 표시 자릿수를 모두 같은 정밀도(소수 셋째 자리)로 맞춰
// "0.01 ÷ 5 = 0.003" 같은 반올림 모순이 보이지 않도록 한다.
function AverageCalcCard({ dw, db, perPoint }: {
  dw: number; db: number; perPoint: { x: number; e: number }[];
}) {
  const N = perPoint.length;
  const sumEx = perPoint.reduce((s, p) => s + p.e * p.x, 0);
  const sumE = perPoint.reduce((s, p) => s + p.e, 0);
  return (
    <div className="card p-4 mt-3 font-mono text-sm space-y-3">
      <div>
        <div className="text-xs text-muted not-italic" style={{ fontFamily: 'system-ui' }}>dw = 평균(e × x):</div>
        <div className="break-all mt-1">
          dw = (
          {perPoint.map((p, i) => (
            <span key={p.x}>
              {i > 0 && ' + '}
              {p.e.toFixed(3)}×{p.x}
            </span>
          ))}
          ) ÷ {N} = {sumEx.toFixed(3)} ÷ {N} = <span className="text-accent font-semibold">{dw.toFixed(3)}</span>
        </div>
      </div>
      <div className="border-t border-border pt-2">
        <div className="text-xs text-muted not-italic" style={{ fontFamily: 'system-ui' }}>db = 평균(e):</div>
        <div className="break-all mt-1">
          db = (
          {perPoint.map((p, i) => (
            <span key={p.x}>
              {i > 0 && ' + '}
              {p.e.toFixed(3)}
            </span>
          ))}
          ) ÷ {N} = {sumE.toFixed(3)} ÷ {N} = <span className="text-accent font-semibold">{db.toFixed(3)}</span>
        </div>
      </div>
    </div>
  );
}


// 단일 뉴런 다이어그램 — 페이즈 1과 같은 디자인 언어.
// 정방향: x → ×w → Σ(여기 b 합산) → z 배지 → ReLU → ŷ, 그리고 정답 y.
// 역방향: ŷ에서 두 갈래 빨간 화살표가 분기하여 각각 가중치 라벨(w)과 편향 라벨(b)로 흐른다.
function NeuronView({ w, b, pulseKey }: { w: number; b: number; pulseKey: number }) {
  const [pickX, setPickX] = useState(3);
  const x = pickX;
  const y = 2 * x + 1;
  const z = w * x + b;
  const pred = Math.max(0, z);
  const e = pred - y;

  const W = 760, H = 420;
  const fwdY = 110;
  const xCx = 80, sumCx = 260, reluCx = 420, predCx = 580;
  const yCy = 240;
  const bCx = sumCx, bCy = fwdY - 56; // Σ 위쪽에서 들어오는 편향 라벨 위치
  const wLabelX = (xCx + sumCx) / 2;
  const wLabelY = fwdY - 28;

  // 가중치 선 두께·색
  const aw = Math.min(Math.abs(w), 2);
  const wStrokeW = 1.2 + aw * 2.6;
  const wColor = Math.abs(w) < 0.05
    ? 'rgb(var(--color-muted))'
    : w >= 0 ? 'rgb(var(--color-accent))' : 'rgb(190, 18, 60)';
  const wOpacity = Math.abs(w) < 0.05 ? 0.5 : 0.9;

  const backColor = 'rgb(190, 18, 60)';

  // 한 점이 dw, db에 기여하는 양
  const dwOnePoint = e * (z >= 0 ? 1 : 0) * x;
  const dbOnePoint = e * (z >= 0 ? 1 : 0);

  // 두 화살표 각각 자기 변화량 크기에 비례한 두께·진하기
  // 데이터 (1,3)~(5,11)에서 |e·x| 최대 ~55, |e| 최대 ~11. 클램프 기준은 그 절반쯤(=학습 초기 인상값).
  const dwRatio = Math.min(Math.abs(dwOnePoint) / 25, 1);
  const dbRatio = Math.min(Math.abs(dbOnePoint) / 8, 1);
  const wBackStrokeW = 1.0 + dwRatio * 4.5;
  const wBackOpacity = 0.18 + dwRatio * 0.72;
  const bBackStrokeW = 1.0 + dbRatio * 4.5;
  const bBackOpacity = 0.18 + dbRatio * 0.72;
  // 정답 ŷ↔y 점선과 마커는 둘 중 큰 것 기준
  const maxRatio = Math.max(dwRatio, dbRatio);
  const eOpacity = 0.25 + maxRatio * 0.65;

  // 두 갈래 역전파 곡선 (ŷ 노드 아래에서 시작)
  // (a) ŷ → 아래쪽으로 휘어 가중치 라벨까지 (w로 가는 화살표)
  const startX = predCx;
  const startY = fwdY + 28;
  const wTargetX = wLabelX;
  const wTargetY = wLabelY + 14; // 가중치 라벨 바로 아래로 도달
  const wPath = `M ${startX} ${startY} C ${startX - 60} 360, ${wTargetX + 60} 360, ${wTargetX} ${wTargetY}`;

  // (b) ŷ → 위쪽으로 솟아 b 라벨까지 (b로 가는 화살표)
  const bTargetX = bCx;
  const bTargetY = bCy + 12;
  const bPath = `M ${startX} ${startY - 8} C ${startX} ${startY - 90}, ${bTargetX + 90} ${bTargetY - 40}, ${bTargetX + 28} ${bTargetY}`;

  return (
    <div className="card p-4 mt-3">
      <style>{`
        @keyframes nv-backflow {
          0%   { stroke-opacity: 0; }
          15%  { stroke-opacity: 1; }
          70%  { stroke-opacity: 1; }
          100% { stroke-opacity: 0; }
        }
      `}</style>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="xMidYMid meet">
        <defs>
          <marker id="nv-arr" markerWidth="5" markerHeight="5" refX="4.5" refY="2.5" orient="auto">
            <path d="M0,0 L5,2.5 L0,5 z" fill="rgb(var(--color-muted))" />
          </marker>
          <marker id="nv-back-w" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 z" fill={backColor} fillOpacity={wBackOpacity} />
          </marker>
          <marker id="nv-back-b" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 z" fill={backColor} fillOpacity={bBackOpacity} />
          </marker>
        </defs>
        <g fontFamily="JetBrains Mono">
          {/* ────── 정방향 (가로 흐름) ────── */}

          {/* x → Σ : 가중치 선 */}
          <line x1={xCx + 24} y1={fwdY} x2={sumCx - 30} y2={fwdY}
            stroke={wColor} strokeWidth={wStrokeW} strokeOpacity={wOpacity} strokeLinecap="round" />
          <ValueBadge2 cx={wLabelX} cy={wLabelY} label={`× w (= ${w.toFixed(2)})`} color={wColor} />

          {/* b → Σ : 위에서 내려오는 작은 선 + b 배지 */}
          <line x1={sumCx} y1={bCy + 12} x2={sumCx} y2={fwdY - 28}
            stroke="rgb(var(--color-muted))" strokeWidth={1.5} strokeOpacity={0.7} />
          <ValueBadge2 cx={bCx} cy={bCy} label={`+ b (= ${b.toFixed(2)})`} color="rgb(var(--color-text))" />

          {/* Σ → ReLU */}
          <line x1={sumCx + 30} y1={fwdY} x2={reluCx - 32} y2={fwdY}
            stroke="rgb(var(--color-muted))" strokeWidth={1.8} strokeOpacity={0.75}
            strokeLinecap="round" />
          <ValueBadge2 cx={(sumCx + reluCx) / 2} cy={fwdY - 22} label={`z = ${z.toFixed(2)}`} color="rgb(var(--color-accent))" />

          {/* ReLU 박스 */}
          <rect x={reluCx - 32} y={fwdY - 20} width={64} height={40} rx={6}
            fill="rgb(var(--color-accent-bg))" stroke="rgb(var(--color-accent))" strokeWidth={1.5} />
          <text x={reluCx} y={fwdY + 6} textAnchor="middle" fill="rgb(var(--color-accent))" fontSize={14} fontWeight={700}>ReLU</text>

          {/* ReLU → ŷ */}
          <line x1={reluCx + 32} y1={fwdY} x2={predCx - 24} y2={fwdY}
            stroke="rgb(var(--color-muted))" strokeWidth={1.8} strokeOpacity={0.75}
            strokeLinecap="round" markerEnd="url(#nv-arr)" />

          {/* ŷ ↕ y : 세로 점선 (오차 시각화) */}
          <line x1={predCx} y1={fwdY + 26} x2={predCx} y2={yCy - 26}
            stroke={backColor} strokeOpacity={eOpacity} strokeWidth={1.8} strokeDasharray="5 4" />
          <ValueBadge2 cx={predCx + 96} cy={(fwdY + yCy) / 2} label={`e = ŷ − y = ${e.toFixed(2)}`} color={backColor} />

          {/* 노드들 */}
          <Node2 cx={xCx} cy={fwdY} label="x" />
          <circle cx={sumCx} cy={fwdY} r={28} fill="rgb(var(--color-accent-bg))" stroke="rgb(var(--color-accent))" strokeWidth={1.5} />
          <text x={sumCx} y={fwdY + 7} textAnchor="middle" fill="rgb(var(--color-accent))" fontSize={20} fontWeight={700}>Σ</text>
          <Node2 cx={predCx} cy={fwdY} label="ŷ" accent />
          <Node2 cx={predCx} cy={yCy} label="y" />

          {/* 노드 옆 값 배지 */}
          <ValueBadge2 cx={xCx} cy={fwdY - 42} label={`x = ${x}`} color="rgb(var(--color-text))" />
          <ValueBadge2 cx={predCx + 78} cy={fwdY} label={`ŷ = ${pred.toFixed(2)}`} color="rgb(var(--color-accent))" />
          <ValueBadge2 cx={predCx + 78} cy={yCy} label={`y = ${y}`} color="rgb(var(--color-text))" />

          {/* ────── 역전파 — 두 갈래 화살표 ────── */}

          {/* (a) ŷ → 가중치 라벨 (w로 가는 화살표) — |e × x|에 비례한 두께·진하기 */}
          <path d={wPath} fill="none"
            stroke={backColor} strokeOpacity={wBackOpacity}
            strokeWidth={wBackStrokeW} strokeDasharray="7 5" strokeLinecap="round"
            markerEnd="url(#nv-back-w)" />
          <ValueBadge2 cx={(startX + wTargetX) / 2} cy={395}
            label={`w 변화량 = e × x = ${dwOnePoint.toFixed(2)}`} color={backColor} />

          {/* (b) ŷ → b 라벨 (b로 가는 화살표) — |e|에 비례한 두께·진하기 */}
          <path d={bPath} fill="none"
            stroke={backColor} strokeOpacity={bBackOpacity}
            strokeWidth={bBackStrokeW} strokeDasharray="7 5" strokeLinecap="round"
            markerEnd="url(#nv-back-b)" />
          <ValueBadge2 cx={predCx - 70} cy={28}
            label={`b 변화량 = e = ${dbOnePoint.toFixed(2)}`} color={backColor} />

          {/* 학습 단계 실행 시 펄스 — pulseKey가 바뀌면 두 path 리마운트로 CSS 애니메이션 재생 */}
          {pulseKey > 0 && (
            <>
              <path key={`pw-${pulseKey}`} d={wPath} fill="none" stroke={backColor}
                strokeWidth={Math.max(wBackStrokeW + 1.5, 3)} strokeDasharray="10 6" strokeLinecap="round"
                markerEnd="url(#nv-back-w)"
                style={{ animation: 'nv-backflow 1.1s ease-out forwards' }} />
              <path key={`pb-${pulseKey}`} d={bPath} fill="none" stroke={backColor}
                strokeWidth={Math.max(bBackStrokeW + 1.5, 3)} strokeDasharray="10 6" strokeLinecap="round"
                markerEnd="url(#nv-back-b)"
                style={{ animation: 'nv-backflow 1.1s ease-out forwards' }} />
            </>
          )}
        </g>
      </svg>

      <div className="grid sm:grid-cols-[auto_1fr] gap-3 mt-4 items-start">
        <label className="block sm:max-w-[260px]">
          <div className="flex justify-between text-xs mb-1">
            <span>입력 x를 1~5에서 선택</span>
            <span className="font-mono text-accent">x = {x}</span>
          </div>
          <input type="range" min={1} max={5} step={1} value={pickX}
            onChange={(ev) => setPickX(parseInt(ev.target.value))} className="w-full" />
          <div className="font-mono text-xs space-y-1 p-2 rounded border border-border bg-surface/40 mt-2">
            <div>z = w·x + b = <span className="text-accent">{z.toFixed(2)}</span></div>
            <div>예측 ŷ = ReLU(z) = <span className="text-accent">{pred.toFixed(2)}</span></div>
            <div>실제 y = <span>{y}</span></div>
            <div className={Math.abs(e) > 0.5 ? 'text-amber-500' : 'text-muted'}>
              오차 e = ŷ − y = {e.toFixed(2)}
            </div>
          </div>
        </label>
        <p className="text-xs text-muted leading-relaxed">
          아래의 <strong>한 단계 진행</strong>을 누르면 오차 <code>e</code>가 두 갈래로 분기되어
          <strong> 가중치 <code>w</code>와 편향 <code>b</code> 각각</strong>으로 흐르며 자동 갱신됩니다.
          빨간 화살표 두 개는 <em>이 한 점</em>이 만드는 변화량이고, 실제 갱신엔 다섯 점의 평균이 사용돼요.
          오차 <code>|e|</code>가 클수록 화살표가 굵고 진하게 표시됩니다.
        </p>
      </div>
    </div>
  );
}

function Node2({ cx, cy, label, accent }: { cx: number; cy: number; label: string; accent?: boolean }) {
  return (
    <g>
      <circle cx={cx} cy={cy} r={26}
        fill={accent ? 'rgb(var(--color-accent))' : 'rgb(var(--color-surface))'}
        stroke={accent ? 'rgb(var(--color-accent))' : 'rgb(var(--color-muted))'}
        strokeWidth={1.5}
        strokeOpacity={accent ? 1 : 0.6} />
      <text x={cx} y={cy + 7} textAnchor="middle"
        fill={accent ? '#fff' : 'rgb(var(--color-text))'} fontSize={20} fontWeight={700}>
        {label}
      </text>
    </g>
  );
}

function ValueBadge2({ cx, cy, label, color }: { cx: number; cy: number; label: string; color: string }) {
  const w = label.length * 7.6 + 14;
  const h = 20;
  return (
    <g>
      <rect x={cx - w / 2} y={cy - h / 2} width={w} height={h} rx={5}
        fill="rgb(var(--color-bg))" stroke={color} strokeOpacity={0.6} strokeWidth={1} />
      <text x={cx} y={cy + 5} textAnchor="middle" fill={color} fontSize={13} fontWeight={600}>
        {label}
      </text>
    </g>
  );
}

// 1D 단면: 한 축(w 또는 b)을 따라 잘라본 손실 곡선
function SlicePlot({ w, b, dw, db, lr, prev }: { w: number; b: number; dw: number; db: number; lr: number; prev: { w: number; b: number } | null }) {
  const [axis, setAxis] = useState<'w' | 'b'>('w');
  const W = 480, H = 220, padL = 38, padR = 14, padT = 14, padB = 30;
  const range = axis === 'w' ? [-1, 4] : [-3, 4];
  const sx = (v: number) => padL + ((v - range[0]) / (range[1] - range[0])) * (W - padL - padR);

  // 곡선 데이터
  const N = 80;
  const pts: { v: number; L: number }[] = [];
  for (let i = 0; i <= N; i++) {
    const v = range[0] + (i / N) * (range[1] - range[0]);
    const L = axis === 'w' ? lossFn(v, b) : lossFn(w, v);
    pts.push({ v, L });
  }
  const Lmax = Math.max(0.5, ...pts.map((p) => p.L));
  const sy = (L: number) => H - padB - (L / Lmax) * (H - padT - padB);

  let path = '';
  pts.forEach((p, i) => { path += `${i === 0 ? 'M' : 'L'}${sx(p.v)},${sy(p.L)} `; });

  // 지금 위치 / 한 step 후 위치
  const cur = axis === 'w' ? w : b;
  const nxt = axis === 'w' ? w - lr * dw : b - lr * db;
  const Lcur = axis === 'w' ? lossFn(cur, b) : lossFn(w, cur);
  const Lnxt = axis === 'w' ? lossFn(nxt, b) : lossFn(w, nxt);
  const prv = prev ? (axis === 'w' ? prev.w : prev.b) : null;
  const Lprv = prv != null ? (axis === 'w' ? lossFn(prv, b) : lossFn(w, prv)) : null;

  return (
    <div className="card p-4 mt-3">
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm font-medium">손실의 1차원 단면</div>
        <div className="flex gap-1">
          <button onClick={() => setAxis('w')} className={`text-xs px-2 py-1 rounded ${axis === 'w' ? 'bg-accent text-white' : 'border border-border'}`}>w 축</button>
          <button onClick={() => setAxis('b')} className={`text-xs px-2 py-1 rounded ${axis === 'b' ? 'bg-accent text-white' : 'border border-border'}`}>b 축</button>
        </div>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
        <line x1={padL} y1={H - padB} x2={W - padR} y2={H - padB} stroke="rgb(var(--color-border))" />
        <line x1={padL} y1={padT} x2={padL} y2={H - padB} stroke="rgb(var(--color-border))" />
        <text x={W - padR} y={H - 8} textAnchor="end" fontSize={10} fill="rgb(var(--color-muted))">{axis}</text>
        <text x={padL - 4} y={padT + 10} textAnchor="end" fontSize={10} fill="rgb(var(--color-muted))">손실</text>
        <path d={path} fill="none" stroke="rgb(var(--color-text))" strokeOpacity={0.7} strokeWidth={1.5} />
        {/* 직전 위치 */}
        {prv != null && Lprv != null && (
          <>
            <line x1={sx(prv)} y1={sy(Lprv)} x2={sx(cur)} y2={sy(Lcur)}
              stroke="rgb(96,165,250)" strokeWidth={1.6} strokeDasharray="4 3" />
            <circle cx={sx(prv)} cy={sy(Lprv)} r={4} fill="rgb(96,165,250)" stroke="white" strokeWidth={1.2} />
          </>
        )}
        {/* 지금 → 다음 */}
        <line x1={sx(cur)} y1={sy(Lcur)} x2={sx(nxt)} y2={sy(Lnxt)}
          stroke="rgb(251, 146, 60)" strokeWidth={2} />
        <circle cx={sx(cur)} cy={sy(Lcur)} r={5} fill="rgb(var(--color-accent))" stroke="white" strokeWidth={1.5} />
        <circle cx={sx(nxt)} cy={sy(Lnxt)} r={4} fill="rgb(251, 146, 60)" stroke="white" strokeWidth={1.5} />
      </svg>
      <div className="text-xs text-muted mt-2 leading-relaxed">
        파란 점선 = 직전 step에서 출발한 위치, <span className="text-accent">파랑 ●</span> = 지금 위치,
        <span className="text-amber-500"> 주황 ●</span> = 한 step 후 도착할 위치. 두 점 사이 길이가 <strong>η × |변화량|</strong>(= 보폭)이에요.
      </div>
    </div>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`p-2 rounded border ${highlight ? 'border-accent bg-accent-bg' : 'border-border'}`}>
      <div className="text-xs text-muted">{label}</div>
      <div className="text-base">{value}</div>
    </div>
  );
}

// 학습 진행에 따른 손실 곡선 — 가로축 step, 세로축 손실
function LossCurve({ history }: { history: { w: number; b: number; loss: number }[] }) {
  const W = 640, H = 200, padL = 40, padR = 14, padT = 14, padB = 30;
  const N = history.length;
  const Lmax = Math.max(0.5, ...history.map((h) => h.loss));
  const sx = (i: number) => padL + (N > 1 ? (i / (N - 1)) : 0) * (W - padL - padR);
  const sy = (L: number) => H - padB - (L / Lmax) * (H - padT - padB);

  let path = '';
  history.forEach((h, i) => { path += `${i === 0 ? 'M' : 'L'}${sx(i)},${sy(h.loss)} `; });

  return (
    <div className="card p-3">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
        <line x1={padL} y1={H - padB} x2={W - padR} y2={H - padB} stroke="rgb(var(--color-border))" />
        <line x1={padL} y1={padT} x2={padL} y2={H - padB} stroke="rgb(var(--color-border))" />
        <text x={W - padR} y={H - 8} textAnchor="end" fontSize={10} fill="rgb(var(--color-muted))">step</text>
        <text x={padL - 4} y={padT + 10} textAnchor="end" fontSize={10} fill="rgb(var(--color-muted))">손실</text>
        <path d={path} fill="none" stroke="rgb(var(--color-accent))" strokeWidth={1.8} />
        {history.map((h, i) => (
          <circle key={i} cx={sx(i)} cy={sy(h.loss)} r={2.5} fill="rgb(var(--color-accent))" />
        ))}
      </svg>
    </div>
  );
}
