import { useRef, useState } from 'react';
import { useApp } from '../store';

const DATA: [number, number][] = [
  [1, 3], [2, 5], [3, 7], [4, 9], [5, 11],
];

// 손실 = 평균 ½ × (예측 − 실제)². ½은 미분할 때 2가 깔끔히 사라지도록 붙인 트릭.
// 부호 약속은 페이즈 3·4와 동일 (오차 = 예측 − 실제).
const lossFn = (w: number, b: number) =>
  DATA.reduce((acc, [x, y]) => {
    const yhat = w * x + b;
    return acc + 0.5 * (yhat - y) ** 2;
  }, 0) / DATA.length;

// 오차 e = 예측 − 실제 = w·x + b − y
//   한 점에서 ∂L/∂w = e·x,   ∂L/∂b = e
//   업데이트: w ← w − 학습률 · 평균(e·x)
const gradient = (w: number, b: number) => {
  let dw = 0, db = 0;
  DATA.forEach(([x, y]) => {
    const e = w * x + b - y;
    dw += e * x;
    db += e;
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
    const pred = w * x + b;
    const e = pred - y; // 오차 = 예측 − 실제 (페이즈 3·4와 같은 약속)
    return { x, y, pred, e, dwContrib: e * x, dbContrib: e };
  });

  return (
    <article>
      <div className="text-xs font-mono text-muted">PHASE 5</div>
      <h1>기울기와 수정</h1>
      <p className="text-muted mt-2">
        페이즈 4에서 슬라이더를 손으로 움직여 오차를 줄였다면, 이제는 컴퓨터가 어느 쪽으로 얼마만큼 움직여야 하는지 스스로 알아냅니다.
        절차는 <strong>① 오차 계산 → ② 기울기 계산 → ③ 매개변수 수정</strong> 세 단계이며,
        이 묶음을 한 번 도는 것을 한 <strong>step</strong>이라 부릅니다.
      </p>

      <h2>학습 대상 — 단일 뉴런 모델</h2>
      <p className="text-muted text-sm">
        이번 페이즈에서 학습시키는 모델은 입력 <code>x</code> 하나를 받아 예측 <code>ŷ = w·x + b</code>를 출력하는 단일 뉴런입니다.
        학습이란 가중치 <code>w</code>와 편향 <code>b</code>를 조정해 예측 <code>ŷ</code>가 정답 <code>y</code>에 가까워지도록 만드는 일입니다.
        아래에서 입력 <code>x</code>를 하나 골라 보면, 현재 모델의 정방향 계산과 역전파 채널을 한 그림으로 확인할 수 있습니다.
      </p>
      <NeuronView w={w} b={b} pulseKey={pulseKey} />

      <h2>준비 — 곡선의 기울기와 두 층의 기울기</h2>
      <p className="text-muted text-sm">
        손실은 매개변수에 대한 2차 함수이므로 그릇 모양 곡면을 이룹니다. 그 곡면 위에서 어느 쪽이 내리막인지를 알려주는 양이 <strong>한 점에서의 기울기</strong>입니다.
        손실식 <code>(w·x + b − y)²</code>은 괄호 안에 또 다른 식이 들어 있는 두 층 구조이므로,
        전체 기울기는 <strong>겉층의 기울기와 안층의 기울기를 곱해</strong> 구합니다. 아래 두 도구로 차례로 확인합니다.
      </p>
      <KeulgiWarmup />
      <ChainRule w={w} b={b} />

      <h2>① 오차 계산</h2>
      <p className="text-sm text-muted">
        학습 데이터 다섯 점에 대해 현재 모델의 예측 <code>w·x + b</code>와 실제 <code>y</code>의 차이를 점마다 구합니다.
        이 표의 <strong>오차</strong> 열이 다음 단계 ②에서 기울기를 만드는 재료가 됩니다.
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-xs font-mono mt-2">
          <thead className="text-muted">
            <tr>
              <th className="text-left py-1">x</th>
              <th>실제 y</th>
              <th>예측 (w·x+b)</th>
              <th>오차 (예측−실제)</th>
            </tr>
          </thead>
          <tbody>
            {perPoint.map((p) => (
              <tr key={p.x} className="border-t border-border">
                <td className="py-1">{p.x}</td>
                <td className="text-center">{p.y}</td>
                <td className="text-center">{p.pred.toFixed(2)}</td>
                <td className={`text-center ${Math.abs(p.e) > 0.5 ? 'text-amber-600 dark:text-amber-400' : 'text-muted'}`}>
                  {p.e.toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2>② 기울기 계산</h2>
      <p className="text-sm text-muted">
        한 점에서 <code>w</code>에 대한 손실의 기울기는 <strong>오차 × x</strong>, <code>b</code>에 대한 기울기는 <strong>오차</strong>입니다.
        학습 데이터가 N개이면 점마다의 기여를 평균한 값을 각각 <code>dw</code>, <code>db</code>로 정의합니다.
        아래 카드는 현재 매개변수에서 다섯 점이 <code>dw</code>·<code>db</code>에 기여하는 양을 그대로 보여줍니다.
      </p>
      <details className="mt-3 card p-4 text-sm">
        <summary className="cursor-pointer font-medium">유도 과정 한 줄씩 따라가기</summary>
        <div className="mt-3 space-y-4 leading-relaxed">

          <Step n="1" title="손실 정의에 ½을 곱한 형태를 사용">
            <p>
              한 점의 손실을 <code>L = ½ × (예측 − 실제)² = ½ × e²</code>로 정의합니다.
              ½은 미분 결과를 깔끔하게 만들기 위한 상수 배율로, 손실이 최소가 되는 매개변수 위치는 그대로 유지됩니다.
            </p>
          </Step>

          <Step n="2" title="경사 하강법의 출발 식">
            <p>
              손실이 가장 빠르게 증가하는 방향이 기울기이므로, 그 <strong>반대 방향</strong>으로 한 발짝 움직이면 손실이 감소합니다.
            </p>
            <div className="font-mono text-xs mt-2 p-2 bg-surface/60 border border-border rounded">
              새 w = 지금 w − (w에 대한 손실의 기울기)
            </div>
          </Step>

          <Step n="3" title="겉층의 기울기">
            <p>
              <code>L = ½ × e²</code>를 <code>e</code>에 대한 식으로 보면, <code>e</code>가 1만큼 변할 때 <code>L</code>은 <code>e</code>만큼 변합니다.
              ½ × 2 = 1이 되어 ½의 효과가 여기서 정확히 상쇄됩니다.
            </p>
            <div className="font-mono text-xs mt-2 p-2 bg-surface/60 border border-border rounded">
              ∂L/∂e = e
            </div>
          </Step>

          <Step n="4" title="안층의 기울기">
            <p>
              오차 <code>e = w·x + b − y</code>에서 한 점의 <code>x</code>·<code>y</code>·<code>b</code>는 상수이므로,
              <code>w</code>가 1만큼 변하면 <code>e</code>는 <code>x</code>만큼 변합니다.
              같은 방식으로 <code>b</code>가 1만큼 변하면 <code>e</code>는 1만큼 변합니다.
            </p>
            <div className="font-mono text-xs mt-2 p-2 bg-surface/60 border border-border rounded">
              ∂e/∂w = x,   ∂e/∂b = 1
            </div>
          </Step>

          <Step n="5" title="두 층 기울기를 곱한다 (연쇄 법칙)">
            <p>
              <code>w → e → L</code>로 변화가 흐를 때 각 층의 기울기를 <strong>곱하면</strong> 전체 기울기가 됩니다.
            </p>
            <div className="font-mono text-xs mt-2 p-2 bg-surface/60 border border-border rounded">
              ∂L/∂w = (∂L/∂e) × (∂e/∂w) = e × x<br />
              ∂L/∂b = (∂L/∂e) × (∂e/∂b) = e × 1 = e
            </div>
          </Step>

          <Step n="6" title="여러 점이면 평균낸다">
            <p>
              점이 N개일 때 점마다의 기여를 평균한 값을 <code>dw</code>, <code>db</code>로 정의합니다.
            </p>
            <div className="font-mono text-xs mt-2 p-2 bg-surface/60 border border-border rounded">
              dw = ( Σ 점마다 (e × x) ) ÷ N<br />
              db = ( Σ 점마다 e ) ÷ N
            </div>
          </Step>

        </div>
      </details>
      <div className="card p-4 mt-3 font-mono text-sm space-y-2">
        <div className="text-xs text-muted">w의 기울기 dw — 점마다 오차 × x의 평균:</div>
        <div className="flex flex-wrap items-center gap-1">
          {perPoint.map((p, i) => (
            <span key={p.x} className="inline-flex items-center gap-1">
              <span className="text-muted">({p.e.toFixed(2)})×{p.x}</span>
              {i < perPoint.length - 1 && <span className="text-muted">+</span>}
            </span>
          ))}
          <span className="text-muted">÷ {DATA.length}</span>
        </div>
        <div>
          dw = <span className="text-accent">{dw.toFixed(3)}</span>
          {' '}
          {Math.abs(dw) < 0.01 ? '(0에 근접 — 도착)' : dw > 0 ? '(+ → w 감소 방향)' : '(− → w 증가 방향)'}
        </div>
        <div className="border-t border-border pt-2 mt-2 text-xs text-muted">b의 기울기 db — 점마다 오차의 평균:</div>
        <div>
          db = <span className="text-accent">{db.toFixed(3)}</span>
          {' '}
          {Math.abs(db) < 0.01 ? '(0에 근접)' : db > 0 ? '(+ → b 감소 방향)' : '(− → b 증가 방향)'}
        </div>
      </div>

      <h2>손실 풍경</h2>
      <p className="text-muted text-sm">
        손실은 <code>w</code>·<code>b</code> 두 축 위에 펼쳐진 그릇 모양 곡면입니다.
        아래 세 그림은 같은 손실을 (1) 한 축 단면, (2) 3차원 곡면, (3) 학습 진행에 따른 시간축으로 본 것입니다.
      </p>
      <div className="grid lg:grid-cols-3 gap-4 mt-4">
        <SlicePlot w={w} b={b} dw={dw} db={db} lr={lr} prev={prev} />
        <GradientBoard w={w} b={b} dw={dw} db={db} history={history} prev={prev} />
        <LossCurve history={history} />
      </div>

      <h2>③ 수정</h2>
      <p className="text-sm text-muted">
        매개변수를 기울기의 반대 방향으로 학습률 <code>η</code>만큼 이동시킵니다.
        오차가 양수이면 <code>dw</code>도 양수가 되어 <code>w</code>를 감소시키는 방향으로,
        음수이면 증가시키는 방향으로 자동 갱신됩니다.
      </p>
      <div className="card p-4 mt-3 font-mono text-sm space-y-1">
        <div>새 w = w − (η × dw) = {w.toFixed(3)} − ({lr.toFixed(3)} × {dw.toFixed(3)}) = <span className="text-accent">{(w - lr * dw).toFixed(3)}</span></div>
        <div>새 b = b − (η × db) = {b.toFixed(3)} − ({lr.toFixed(3)} × {db.toFixed(3)}) = <span className="text-accent">{(b - lr * db).toFixed(3)}</span></div>
      </div>
      <details className="mt-3 card p-4 text-sm">
        <summary className="cursor-pointer font-medium">왜 빼기인가, 학습률 η는 무엇인가</summary>
        <div className="mt-3 space-y-3 leading-relaxed">
          <div>
            <div className="font-medium">왜 빼기인가</div>
            <p className="text-muted mt-1">
              기울기는 손실이 가장 빠르게 <strong>증가</strong>하는 방향을 가리킵니다.
              학습의 목표는 손실의 <strong>감소</strong>이므로, 갱신은 그 반대 방향으로 진행해야 합니다.
              부호를 뒤집기 위해 빼기를 사용합니다.
            </p>
          </div>
          <div>
            <div className="font-medium">학습률 η</div>
            <p className="text-muted mt-1">
              기울기는 방향만 알려줄 뿐, 한 발짝의 크기는 정해주지 않습니다.
              학습률 <code>η</code>는 한 발짝의 크기를 결정하는 양수 상수입니다.
              만약 <code>η</code> 없이 <code>w ← w − dw</code>로 갱신하면 한 발짝이 기울기 자체가 되어,
              기울기가 큰 위치에서는 골짜기 반대편으로 튕겨 발산할 수 있습니다.
            </p>
            <ul className="text-xs text-muted mt-2 list-disc pl-5 space-y-1">
              <li><code>η</code>가 너무 크면 손실이 진동하거나 발산합니다.</li>
              <li><code>η</code>가 너무 작으면 수렴이 매우 느립니다.</li>
              <li>적절한 <code>η</code>에서 손실이 매끄럽게 0으로 수렴합니다.</li>
            </ul>
          </div>
        </div>
      </details>

      <div className="sticky bottom-2 z-20 mt-6 rounded-lg border border-border bg-bg/85 backdrop-blur-md shadow-lg p-3">
        <div className="grid sm:grid-cols-3 gap-2 font-mono text-sm">
          <Stat label="현재 w" value={w.toFixed(3)} />
          <Stat label="현재 b" value={b.toFixed(3)} />
          <Stat label="손실" value={loss.toFixed(4)} highlight={loss < 0.05} />
        </div>
        <label className="block mt-3">
          <div className="flex justify-between text-xs mb-1">
            <span>학습률 η (한 발짝의 크기)</span>
            <span className="font-mono text-accent">{lr.toFixed(3)}</span>
          </div>
          <input type="range" min={0.001} max={0.1} step={0.001} value={lr}
            onChange={(e) => setLr(parseFloat(e.target.value))} className="w-full" />
        </label>
        <div className="flex flex-wrap gap-2 mt-3">
          <button onClick={step} className="btn-primary" disabled={loss < 0.001}>한 단계 진행</button>
          <button onClick={step20} className="btn-ghost" disabled={loss < 0.001}>20단계 반복</button>
          <button onClick={reset} className="btn-ghost">초기화</button>
        </div>
      </div>

      {loss < 0.05 && (
        <div className="aside-tip mt-4">
          <strong>학습 종료.</strong> 모든 매개변수의 기울기가 0에 가까워졌습니다.
          손실을 더 줄일 방향이 남아있지 않다는 뜻입니다. (정답: w = 2, b = 1)
        </div>
      )}
    </article>
  );
}

function Step({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <div className="border-l-2 border-accent/40 pl-3">
      <div className="font-medium">
        <span className="inline-block w-6 h-6 rounded-full bg-accent/15 text-accent text-xs font-mono text-center leading-6 mr-2">{n}</span>
        {title}
      </div>
      <div className="text-sm text-muted mt-1">{children}</div>
    </div>
  );
}

// 단일 뉴런 다이어그램 — 페이즈 1과 동일한 디자인 언어 (가중치 선의 두께·색·라벨 배지)
// 정방향 계산 x → Σ+b → ŷ 와 정답 y, 그리고 학습 단계 실행 시 강조되는 역전파 채널을 함께 보여준다.
function NeuronView({ w, b, pulseKey }: { w: number; b: number; pulseKey: number }) {
  const [pickX, setPickX] = useState(3);
  const x = pickX;
  const y = 2 * x + 1;
  const pred = w * x + b;
  const e = pred - y;

  const W = 640, H = 260;
  const cy = 100;
  const xCx = 60, sumCx = 250, predCx = 430, yCx = 580;

  const aw = Math.min(Math.abs(w), 2);
  const wStrokeW = 0.8 + aw * 2.6;
  const wColor = Math.abs(w) < 0.05
    ? 'rgb(var(--color-muted))'
    : w >= 0
      ? 'rgb(var(--color-accent))'
      : 'rgb(239, 68, 68)';
  const wOpacity = Math.abs(w) < 0.05 ? 0.5 : 0.85;

  // 역전파 곡선 경로 (예측 노드 → 합산 노드 아래 → 입력 노드 아래)
  const backPath = `M ${predCx} ${cy + 28} Q ${(predCx + xCx) / 2} ${cy + 110} ${xCx} ${cy + 28}`;

  return (
    <div className="card p-4 mt-3">
      <style>{`
        @keyframes nv-backflow {
          0%   { stroke-opacity: 0;    stroke-dashoffset: 0; }
          15%  { stroke-opacity: 0.95; }
          70%  { stroke-opacity: 0.95; }
          100% { stroke-opacity: 0;    stroke-dashoffset: -120; }
        }
      `}</style>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="xMidYMid meet">
        <defs>
          <marker id="nv-arr" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
            <path d="M0,0 L8,4 L0,8 z" fill="rgb(var(--color-muted))" />
          </marker>
          <marker id="nv-back" markerWidth="9" markerHeight="9" refX="6" refY="4.5" orient="auto">
            <path d="M0,0 L9,4.5 L0,9 z" fill="rgb(239, 68, 68)" />
          </marker>
        </defs>
        <g fontFamily="JetBrains Mono">
          {/* x → Σ : 가중치 w (두께·색이 |w|·부호에 따라 변함) */}
          <line x1={xCx + 22} y1={cy} x2={sumCx - 30} y2={cy}
            stroke={wColor} strokeWidth={wStrokeW} strokeOpacity={wOpacity} strokeLinecap="round" />
          <ValueBadge2 cx={(xCx + sumCx) / 2} cy={cy} label={`w = ${w.toFixed(2)}`} color={wColor} />

          {/* Σ → ŷ */}
          <line x1={sumCx + 30} y1={cy} x2={predCx - 22} y2={cy}
            stroke="rgb(var(--color-muted))" strokeWidth={1.8} strokeOpacity={0.7}
            strokeLinecap="round" markerEnd="url(#nv-arr)" />

          {/* ŷ vs y 비교 (오차 시각화) */}
          <line x1={predCx + 22} y1={cy} x2={yCx - 22} y2={cy}
            stroke="rgb(239, 68, 68)" strokeOpacity={0.6} strokeWidth={1.6} strokeDasharray="5 4" />
          <ValueBadge2 cx={(predCx + yCx) / 2} cy={cy - 22} label={`e = ŷ − y = ${e.toFixed(2)}`} color="rgb(239, 68, 68)" />

          {/* 입력 노드 */}
          <Node2 cx={xCx} cy={cy} label="x" />
          {/* Σ + b 노드 */}
          <circle cx={sumCx} cy={cy} r={28} fill="rgb(var(--color-accent-bg))" stroke="rgb(var(--color-accent))" strokeWidth={1.5} />
          <text x={sumCx} y={cy + 6} textAnchor="middle" fill="rgb(var(--color-accent))" fontSize={18} fontWeight={700}>Σ</text>
          <text x={sumCx} y={cy - 42} textAnchor="middle" fontSize={14} fill="rgb(var(--color-muted))">b = {b.toFixed(2)}</text>
          <line x1={sumCx} y1={cy - 36} x2={sumCx} y2={cy - 28} stroke="rgb(var(--color-muted))" strokeWidth={1.4} />
          {/* 예측 ŷ 노드 (강조) */}
          <Node2 cx={predCx} cy={cy} label="ŷ" accent />
          {/* 정답 y 노드 */}
          <Node2 cx={yCx} cy={cy} label="y" />

          {/* 노드 아래 값 배지 */}
          <ValueBadge2 cx={xCx} cy={cy + 42} label={`x = ${x}`} color="rgb(var(--color-text))" />
          <ValueBadge2 cx={predCx} cy={cy + 42} label={`ŷ = ${pred.toFixed(2)}`} color="rgb(var(--color-accent))" />
          <ValueBadge2 cx={yCx} cy={cy + 42} label={`y = ${y}`} color="rgb(var(--color-text))" />

          {/* 역전파 채널 (항상 옅게 표시) */}
          <path d={backPath} fill="none" stroke="rgb(239, 68, 68)" strokeOpacity={0.18} strokeWidth={1.6} strokeDasharray="6 4" />
          <text x={(predCx + xCx) / 2} y={cy + 132} textAnchor="middle" fontSize={13} fill="rgb(239, 68, 68)" fillOpacity={0.75}>
            역전파 — 오차가 거꾸로 흘러 w·b를 갱신
          </text>

          {/* 학습 단계 실행 시 역전파 펄스 — pulseKey가 바뀌면 path가 리마운트되어 CSS animation 재생 */}
          {pulseKey > 0 && (
            <path key={pulseKey} d={backPath} fill="none" stroke="rgb(239, 68, 68)"
              strokeWidth={3} strokeDasharray="8 5" strokeLinecap="round"
              markerEnd="url(#nv-back)"
              style={{ animation: 'nv-backflow 1.1s ease-out forwards' }} />
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
            <div>예측 ŷ = w·x + b = <span className="text-accent">{pred.toFixed(2)}</span></div>
            <div>실제 y = <span>{y}</span></div>
            <div className={Math.abs(e) > 0.5 ? 'text-amber-500' : 'text-muted'}>
              오차 e = ŷ − y = {e.toFixed(2)}
            </div>
          </div>
        </label>
        <p className="text-xs text-muted leading-relaxed">
          아래의 <strong>한 단계 진행</strong>을 누르면 오차 <code>e</code>가 역방향(빨간 곡선)으로 흐르며
          <code> w</code>, <code>b</code>가 갱신됩니다.
          가중치 선의 두께·색, <code>Σ</code> 위의 <code>b</code> 값, 그리고 예측 <code>ŷ</code>가 정답 <code>y</code>에 가까워지는지 확인해 보세요.
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

// y = x² 위의 두 점을 잇는 직선의 기울기를, 두 점이 가까워질수록 접선의 기울기에 수렴하는 모습으로 보여줌
function KeulgiWarmup() {
  const [x0, setX0] = useState(2);
  const [h, setH] = useState(1);
  const W = 380, H = 240, padL = 36, padR = 12, padT = 14, padB = 28;
  const xMin = -3, xMax = 3, yMin = -1, yMax = 9.5;
  const sx = (v: number) => padL + ((v - xMin) / (xMax - xMin)) * (W - padL - padR);
  const sy = (v: number) => H - padB - ((v - yMin) / (yMax - yMin)) * (H - padT - padB);

  // y = x² 곡선
  let path = '';
  for (let i = 0; i <= 80; i++) {
    const xv = xMin + (i / 80) * (xMax - xMin);
    path += `${i === 0 ? 'M' : 'L'}${sx(xv)},${sy(xv * xv)} `;
  }

  // 두 점
  const P0x = x0, P0y = x0 * x0;
  const P1x = x0 + h, P1y = P1x * P1x;
  const dx = h;
  const dy = P1y - P0y;
  const secantSlope = dy / dx;       // 두 점을 잇는 직선의 기울기
  const tangentSlope = 2 * x0;       // 두 점이 무한히 가까울 때의 값

  // 두 점을 잇는 직선을 화면 끝까지 연장
  const sec1y = secantSlope * (xMin - P0x) + P0y;
  const sec2y = secantSlope * (xMax - P0x) + P0y;
  // 접선 (참고용 점선)
  const tan1y = tangentSlope * (xMin - P0x) + P0y;
  const tan2y = tangentSlope * (xMax - P0x) + P0y;

  return (
    <div className="card p-4 mt-3">
      <div className="text-sm font-medium">한 점에서의 기울기 — 두 점 거리를 0에 가깝게</div>
      <div className="grid lg:grid-cols-[1fr_auto] gap-4 items-start mt-2">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
          {/* 축 */}
          <line x1={padL} y1={sy(0)} x2={W - padR} y2={sy(0)} stroke="rgb(var(--color-border))" />
          <line x1={sx(0)} y1={padT} x2={sx(0)} y2={H - padB} stroke="rgb(var(--color-border))" />
          <text x={W - padR} y={sy(0) + 14} textAnchor="end" fontSize={10} fill="rgb(var(--color-muted))">x</text>
          <text x={sx(0) + 4} y={padT + 10} fontSize={10} fill="rgb(var(--color-muted))">y</text>
          {/* y = x² 곡선 */}
          <path d={path} fill="none" stroke="rgb(var(--color-text))" strokeOpacity={0.7} strokeWidth={1.5} />
          {/* 접선 (참고, 점선) */}
          <line x1={sx(xMin)} y1={sy(tan1y)} x2={sx(xMax)} y2={sy(tan2y)}
            stroke="rgb(var(--color-muted))" strokeWidth={1} strokeDasharray="3 3" />
          {/* 두 점을 잇는 직선 */}
          <line x1={sx(xMin)} y1={sy(sec1y)} x2={sx(xMax)} y2={sy(sec2y)}
            stroke="rgb(251, 146, 60)" strokeWidth={2} />
          {/* 변화량 표시 (수직·수평선) */}
          <line x1={sx(P0x)} y1={sy(P0y)} x2={sx(P1x)} y2={sy(P0y)} stroke="rgb(96,165,250)" strokeWidth={1.2} />
          <line x1={sx(P1x)} y1={sy(P0y)} x2={sx(P1x)} y2={sy(P1y)} stroke="rgb(96,165,250)" strokeWidth={1.2} />
          <text x={(sx(P0x) + sx(P1x)) / 2} y={sy(P0y) + 12} textAnchor="middle" fontSize={10} fill="rgb(96,165,250)">Δx</text>
          <text x={sx(P1x) + 4} y={(sy(P0y) + sy(P1y)) / 2} fontSize={10} fill="rgb(96,165,250)">Δy</text>
          {/* 점 */}
          <circle cx={sx(P0x)} cy={sy(P0y)} r={5} fill="rgb(var(--color-accent))" stroke="white" strokeWidth={1.5} />
          <circle cx={sx(P1x)} cy={sy(P1y)} r={4} fill="rgb(251, 146, 60)" stroke="white" strokeWidth={1.5} />
        </svg>
        <div className="text-sm space-y-3 lg:max-w-[240px]">
          <label className="block">
            <div className="flex justify-between text-xs mb-1">
              <span>점 위치 x₀</span><span className="font-mono text-accent">{x0.toFixed(2)}</span>
            </div>
            <input type="range" min={-2.5} max={2.5} step={0.1} value={x0}
              onChange={(e) => setX0(parseFloat(e.target.value))} className="w-full" />
          </label>
          <label className="block">
            <div className="flex justify-between text-xs mb-1">
              <span>두 점 사이 거리 h (Δx)</span><span className="font-mono text-amber-500">{h.toFixed(3)}</span>
            </div>
            <input type="range" min={0.01} max={1.5} step={0.01} value={h}
              onChange={(e) => setH(parseFloat(e.target.value))} className="w-full" />
            <div className="text-[10px] text-muted mt-1">슬라이더를 왼쪽으로 끝까지 → h가 0에 가까워짐</div>
          </label>
          <div className="font-mono text-xs space-y-1 p-2 rounded border border-border bg-surface/40">
            <div>Δx = <span className="text-blue-500">{dx.toFixed(3)}</span></div>
            <div>Δy = <span className="text-blue-500">{dy.toFixed(3)}</span></div>
            <div className="border-t border-border pt-1 mt-1">
              두 점을 잇는 직선의 기울기 = Δy ÷ Δx = <span className="text-amber-500">{secantSlope.toFixed(3)}</span>
            </div>
            <div className="text-muted">↓ h를 0에 가깝게 하면…</div>
            <div>한 점에서의 기울기 ≈ 2 × x₀ = <span className="text-accent">{tangentSlope.toFixed(3)}</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}

// 손실 = ½ × (예측 − 실제)². 부호 약속은 페이즈 3·4와 동일 (오차 = 예측 − 실제).
function ChainRule({ w, b }: { w: number; b: number }) {
  const [pickX, setPickX] = useState(3); // 데이터 한 점 골라보기 (1~5)
  const x = pickX, y = 2 * x + 1; // 정답 데이터 (w=2, b=1 기준)
  const pred = w * x + b;
  const e = pred - y;     // 오차 = 예측 − 실제
  const dInner = x;       // 안층 기울기: w가 1 늘면 e는 x만큼
  const dOuter = e;       // 겉층 기울기: ½ × e² 에서 e가 1 늘면 손실은 e만큼
  const dLdW = dOuter * dInner; // 두 층 곱 = e·x

  return (
    <div className="card p-4 mt-3">
      <div className="text-sm font-medium">두 층 기울기의 곱 — 한 점이 dw에 기여하는 양</div>
      <p className="text-sm text-muted mt-1">
        예시로 <strong>x = {x}</strong> 데이터 (<code>실제 y = {y}</code>)를 골라봅니다.
        현재 모델 <code>(w = {w.toFixed(2)}, b = {b.toFixed(2)})</code>의 예측은 <code>{pred.toFixed(2)}</code>,
        오차는 <code>e = {e.toFixed(2)}</code>입니다.
      </p>
      <label className="block mt-3 max-w-xs">
        <div className="flex justify-between text-xs mb-1">
          <span>데이터 x를 1~5에서 선택</span>
          <span className="font-mono text-accent">x = {x}</span>
        </div>
        <input type="range" min={1} max={5} step={1} value={pickX}
          onChange={(ev) => setPickX(parseInt(ev.target.value))} className="w-full" />
      </label>

      <div className="grid sm:grid-cols-3 gap-2 mt-4 text-sm">
        <ChainBox
          title="① w가 1 변하면 e는?"
          formula="안층의 기울기 ∂e/∂w = x"
          value={`= ${dInner}`}
          desc="안쪽 식 e의 변화량"
        />
        <ChainBox
          title="② e가 1 변하면 L은?"
          formula="겉층의 기울기 ∂L/∂e = e"
          value={`= ${dOuter.toFixed(2)}`}
          desc="½ × e² 에 ½ 트릭이 작용"
          accent="amber"
        />
        <ChainBox
          title="③ 두 기울기를 곱한다"
          formula="∂L/∂w = e × x"
          value={`= ${dOuter.toFixed(2)} × ${dInner} = ${dLdW.toFixed(2)}`}
          desc="한 점이 dw에 기여하는 양"
          accent="accent"
        />
      </div>

      <div className="mt-4 text-sm">
        <div className="font-medium">흐름 시각화</div>
        <ChainFlow x={x} e={e} dInner={dInner} dOuter={dOuter} />
      </div>

      <p className="text-xs text-muted mt-3">
        <code>b</code>도 같은 방식으로: 안층 기울기 <code>∂e/∂b = 1</code>, 겉층 기울기 <code>∂L/∂e = e</code> ⇒
        <code> ∂L/∂b = e × 1 = {e.toFixed(2)}</code>.
      </p>
    </div>
  );
}

function ChainBox({ title, formula, value, desc, accent = 'muted' }: { title: string; formula: string; value: string; desc: string; accent?: 'muted' | 'amber' | 'accent' }) {
  const color = accent === 'amber' ? 'text-amber-500' : accent === 'accent' ? 'text-accent' : 'text-muted';
  return (
    <div className="border border-border rounded-md p-3 bg-surface/40">
      <div className="text-xs text-muted">{title}</div>
      <div className="font-mono text-xs mt-1">{formula}</div>
      <div className={`font-mono text-base mt-1 ${color}`}>{value}</div>
      <div className="text-[10px] text-muted mt-1">{desc}</div>
    </div>
  );
}

// w → e(예측−실제) → 손실 흐름을 박스+화살표로
function ChainFlow({ x, e, dInner, dOuter }: { x: number; e: number; dInner: number; dOuter: number }) {
  const W = 540, H = 150;
  const rowY = 60;
  // 박스 정의: 중심 x, 반폭(half-width)
  const boxes = [
    { cx: 60, hw: 36, label: 'w', sub: '가중치', color: 'rgb(96,165,250)' },
    { cx: 270, hw: 78, label: `e = ${e.toFixed(2)}`, sub: '예측 − 실제 (안층)', color: 'rgb(251,146,60)' },
    { cx: 480, hw: 60, label: 'L = ½e²', sub: '손실 (겉층)', color: 'rgb(16,185,129)' },
  ];
  const gap = 6; // 박스와 화살표 사이 여백
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full mt-2">
      <defs>
        <marker id="cf-arrow" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
          <path d="M0,0 L8,4 L0,8 z" fill="rgb(var(--color-muted))" />
        </marker>
      </defs>
      {boxes.map((b) => (
        <FlowBox key={b.label} cx={b.cx} cy={rowY} hw={b.hw} label={b.label} sub={b.sub} color={b.color} />
      ))}
      {/* 화살표 1: w → e */}
      {(() => {
        const x1 = boxes[0].cx + boxes[0].hw + gap;
        const x2 = boxes[1].cx - boxes[1].hw - gap;
        const mid = (x1 + x2) / 2;
        return (
          <g>
            <line x1={x1} y1={rowY} x2={x2} y2={rowY} stroke="rgb(var(--color-muted))" strokeWidth={1.5} markerEnd="url(#cf-arrow)" />
            <text x={mid} y={rowY - 10} textAnchor="middle" fontSize={11} fill="rgb(var(--color-muted))">×{dInner} (= x)</text>
          </g>
        );
      })()}
      {/* 화살표 2: e → L */}
      {(() => {
        const x1 = boxes[1].cx + boxes[1].hw + gap;
        const x2 = boxes[2].cx - boxes[2].hw - gap;
        const mid = (x1 + x2) / 2;
        return (
          <g>
            <line x1={x1} y1={rowY} x2={x2} y2={rowY} stroke="rgb(var(--color-muted))" strokeWidth={1.5} markerEnd="url(#cf-arrow)" />
            <text x={mid} y={rowY - 10} textAnchor="middle" fontSize={11} fill="rgb(var(--color-muted))">×{dOuter.toFixed(2)} (= e)</text>
          </g>
        );
      })()}
      <text x={W / 2} y={H - 10} textAnchor="middle" fontSize={11} fill="rgb(var(--color-muted))">
        w가 1만큼 → e는 {x}만큼 → L은 {(dInner * dOuter).toFixed(2)}만큼 변한다
      </text>
    </svg>
  );
}

function FlowBox({ cx, cy, hw, label, sub, color }: { cx: number; cy: number; hw: number; label: string; sub: string; color: string }) {
  const h = 32;
  return (
    <g>
      <rect x={cx - hw} y={cy - h / 2} width={hw * 2} height={h} rx={6} fill={color} fillOpacity={0.18} stroke={color} />
      <text x={cx} y={cy + 4} textAnchor="middle" fontSize={12} fill="rgb(var(--color-text))" fontFamily="JetBrains Mono">{label}</text>
      <text x={cx} y={cy + h / 2 + 14} textAnchor="middle" fontSize={10} fill="rgb(var(--color-muted))">{sub}</text>
    </g>
  );
}

// 1D 단면: 한 축(w 또는 b)을 따라 잘라본 손실 곡선
function SlicePlot({ w, b, dw, db, lr, prev }: { w: number; b: number; dw: number; db: number; lr: number; prev: { w: number; b: number } | null }) {
  const [axis, setAxis] = useState<'w' | 'b'>('w');
  const W = 380, H = 240, padL = 38, padR = 12, padT = 14, padB = 28;
  const isW = axis === 'w';
  const vMin = isW ? -1 : -2;
  const vMax = isW ? 4 : 4;
  const cur = isW ? w : b;
  const grad = isW ? dw : db;
  const fixedLabel = isW ? `b = ${b.toFixed(2)}` : `w = ${w.toFixed(2)}`;
  const axisLabel = isW ? 'w' : 'b';

  const lossAt = (v: number) => isW ? lossFn(v, b) : lossFn(w, v);

  const samples: { v: number; L: number }[] = [];
  let lMax = 0.1;
  for (let i = 0; i <= 80; i++) {
    const vv = vMin + (i / 80) * (vMax - vMin);
    const L = lossAt(vv);
    samples.push({ v: vv, L });
    if (L > lMax) lMax = L;
  }
  const sx = (v: number) => padL + ((v - vMin) / (vMax - vMin)) * (W - padL - padR);
  const sy = (v: number) => H - padB - (v / lMax) * (H - padT - padB);
  const path = samples.map((s, i) => `${i === 0 ? 'M' : 'L'}${sx(s.v)},${sy(s.L)}`).join(' ');
  const Lhere = lossAt(cur);
  const next = cur - lr * grad;
  const Lnext = lossAt(next);
  // 접선
  const ty1 = grad * (vMin - cur) + Lhere;
  const ty2 = grad * (vMax - cur) + Lhere;
  return (
    <div className="card p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="text-sm font-medium">단면 — {axisLabel}축의 포물선 ({fixedLabel} 고정)</div>
        <div className="inline-flex rounded-md border border-border overflow-hidden text-xs">
          <button
            type="button"
            onClick={() => setAxis('w')}
            className={`px-2 py-1 ${isW ? 'bg-accent text-white' : 'bg-surface/40 text-muted'}`}
          >w축</button>
          <button
            type="button"
            onClick={() => setAxis('b')}
            className={`px-2 py-1 ${!isW ? 'bg-accent text-white' : 'bg-surface/40 text-muted'}`}
          >b축</button>
        </div>
      </div>
      <p className="text-xs text-muted mt-1">
        접선의 기울기가 곧 d{axisLabel}. 다음 한 발짝(▲)이 어디에 떨어지는지 확인합니다.
      </p>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full mt-2">
        <defs>
          <marker id="slice-arrow" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
            <path d="M0,0 L8,4 L0,8 z" fill="rgb(var(--color-accent))" />
          </marker>
        </defs>
        <line x1={padL} y1={H - padB} x2={W - padR} y2={H - padB} stroke="rgb(var(--color-border))" />
        <line x1={padL} y1={padT} x2={padL} y2={H - padB} stroke="rgb(var(--color-border))" />
        <text x={W - padR} y={H - 8} textAnchor="end" fontSize={10} fill="rgb(var(--color-muted))">{axisLabel}</text>
        <text x={padL + 4} y={padT + 10} fontSize={10} fill="rgb(var(--color-muted))">L</text>
        <path d={path} fill="none" stroke="rgb(var(--color-text))" strokeOpacity={0.7} strokeWidth={1.5} />
        <line x1={sx(vMin)} y1={sy(Math.max(0, Math.min(lMax, ty1)))} x2={sx(vMax)} y2={sy(Math.max(0, Math.min(lMax, ty2)))}
          stroke="rgb(251, 146, 60)" strokeWidth={1.5} strokeOpacity={0.85} strokeDasharray="4 3" />
        {/* 이전 위치(잔상) + 이전 → 현재 화살표 */}
        {prev && (() => {
          const prevV = isW ? prev.w : prev.b;
          const Lprev = lossAt(prevV);
          // 그래프 범위를 벗어나면 잔상 생략
          if (prevV < vMin || prevV > vMax) return null;
          const px = sx(prevV), py = sy(Lprev);
          const cxp = sx(cur), cyp = sy(Lhere);
          // 점이 거의 같으면 화살표 생략
          const tooClose = Math.hypot(px - cxp, py - cyp) < 6;
          return (
            <g>
              <circle cx={px} cy={py} r={4} fill="none" stroke="rgb(var(--color-accent))" strokeOpacity={0.5} strokeWidth={1.5} strokeDasharray="2 2" />
              {!tooClose && (
                <line x1={px} y1={py} x2={cxp} y2={cyp}
                  stroke="rgb(var(--color-accent))" strokeOpacity={0.6} strokeWidth={1.4} markerEnd="url(#slice-arrow)" />
              )}
            </g>
          );
        })()}
        <circle cx={sx(cur)} cy={sy(Lhere)} r={5} fill="rgb(var(--color-accent))" stroke="white" strokeWidth={1.5} />
        <g transform={`translate(${sx(next)}, ${sy(Lnext)})`}>
          <polygon points="0,-6 5,3 -5,3" fill="rgb(16,185,129)" />
        </g>
        <text x={sx(cur) + 8} y={sy(Lhere) - 8} fontSize={10} fill="rgb(var(--color-text))" fontFamily="JetBrains Mono">
          현재 {axisLabel}
        </text>
      </svg>
    </div>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`p-3 rounded-md border ${highlight ? 'border-accent bg-accent-bg' : 'border-border bg-surface/40'}`}>
      <div className="text-xs text-muted">{label}</div>
      <div className={`text-lg ${highlight ? 'text-accent font-semibold' : ''}`}>{value}</div>
    </div>
  );
}

// 학습 진행에 따른 손실 곡선 — 가로축 step, 세로축 손실
function LossCurve({ history }: { history: { w: number; b: number; loss: number }[] }) {
  const W = 380, H = 240, padL = 40, padR = 14, padT = 14, padB = 28;
  const N = history.length;
  const lMax = Math.max(...history.map((h) => h.loss), 0.1);
  const lMin = 0;
  const sx = (i: number) => padL + (N <= 1 ? 0.5 : i / (N - 1)) * (W - padL - padR);
  const sy = (L: number) => H - padB - ((L - lMin) / (lMax - lMin || 1)) * (H - padT - padB);
  const path = history.map((h, i) => `${i === 0 ? 'M' : 'L'}${sx(i).toFixed(1)},${sy(h.loss).toFixed(1)}`).join(' ');
  const cur = history[N - 1];
  const minLoss = Math.min(...history.map((h) => h.loss));

  return (
    <div className="card p-3">
      <div className="text-sm font-medium">학습 곡선 — step에 따른 손실</div>
      <p className="text-xs text-muted mt-1">
        한 단계 진행할 때마다 점이 하나씩 추가됩니다. 0에 가까워지면 학습이 완료된 상태입니다.
      </p>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full mt-2">
        {/* 축 */}
        <line x1={padL} y1={H - padB} x2={W - padR} y2={H - padB} stroke="rgb(var(--color-border))" />
        <line x1={padL} y1={padT} x2={padL} y2={H - padB} stroke="rgb(var(--color-border))" />
        <text x={W - padR} y={H - 8} textAnchor="end" fontSize={10} fill="rgb(var(--color-muted))">step</text>
        <text x={padL + 4} y={padT + 10} fontSize={10} fill="rgb(var(--color-muted))">L</text>
        {/* y축 라벨: 0과 최대값 */}
        <text x={padL - 4} y={sy(0) + 3} textAnchor="end" fontSize={9} fill="rgb(var(--color-muted))">0</text>
        <text x={padL - 4} y={sy(lMax) + 3} textAnchor="end" fontSize={9} fill="rgb(var(--color-muted))">{lMax.toFixed(2)}</text>
        {/* 곡선 */}
        {N > 1 && (
          <path d={path} fill="none" stroke="rgb(var(--color-accent))" strokeOpacity={0.85} strokeWidth={1.6} />
        )}
        {/* 모든 점 (작게) */}
        {N <= 60 && history.map((h, i) => (
          <circle key={i} cx={sx(i)} cy={sy(h.loss)} r={2} fill="rgb(var(--color-accent))" fillOpacity={0.5} />
        ))}
        {/* 현재 점 강조 */}
        <circle cx={sx(N - 1)} cy={sy(cur.loss)} r={5} fill="rgb(var(--color-accent))" stroke="white" strokeWidth={1.5} />
        <text x={Math.min(sx(N - 1) + 6, W - padR - 4)} y={Math.max(sy(cur.loss) - 8, padT + 10)}
          textAnchor="start" fontSize={10} fill="rgb(var(--color-text))" fontFamily="JetBrains Mono">
          L = {cur.loss.toFixed(3)}
        </text>
      </svg>
      <div className="text-xs text-muted mt-1 font-mono">
        진행 step {N - 1} · 최저 손실 {minLoss.toFixed(4)}
      </div>
    </div>
  );
}

// 손실 풍경을 3D 와이어프레임으로 — w·b·L 세 축의 그릇 모양을 비스듬히 본 시점
function GradientBoard({
  w, b, dw, db, history, prev,
}: { w: number; b: number; dw: number; db: number; history: { w: number; b: number; loss: number }[]; prev: { w: number; b: number } | null }) {
  const W = 380, H = 280;
  const cx = W / 2, cy = H * 0.78;

  const wMin = -1, wMax = 4, bMin = -2, bMax = 4;
  const wMid = (wMin + wMax) / 2;
  const bMid = (bMin + bMax) / 2;

  // 손실 최대값 자동 추정(스케일링용)
  let lMax = 0.1;
  for (let i = 0; i <= 10; i++) for (let j = 0; j <= 10; j++) {
    const wv = wMin + (i / 10) * (wMax - wMin);
    const bv = bMin + (j / 10) * (bMax - bMin);
    const L = lossFn(wv, bv);
    if (L > lMax) lMax = L;
  }

  // 시점(드래그/슬라이더로 변경 가능)
  const [azimuth, setAzimuth] = useState(0.55); // z축 회전 (좌우)
  const [tilt, setTilt] = useState(0.62);       // 위에서 내려다보는 각도
  const dragRef = useRef<{ x: number; y: number; az: number; ti: number } | null>(null);
  const onPointerDown = (ev: React.PointerEvent<SVGSVGElement>) => {
    (ev.currentTarget as Element).setPointerCapture(ev.pointerId);
    dragRef.current = { x: ev.clientX, y: ev.clientY, az: azimuth, ti: tilt };
  };
  const onPointerMove = (ev: React.PointerEvent<SVGSVGElement>) => {
    if (!dragRef.current) return;
    const dx = ev.clientX - dragRef.current.x;
    const dy = ev.clientY - dragRef.current.y;
    setAzimuth(dragRef.current.az + dx * 0.01);
    setTilt(Math.max(0.1, Math.min(1.4, dragRef.current.ti + dy * 0.008)));
  };
  const onPointerUp = (ev: React.PointerEvent<SVGSVGElement>) => {
    dragRef.current = null;
    try { (ev.currentTarget as Element).releasePointerCapture(ev.pointerId); } catch { /* noop */ }
  };
  const sW = 28, sB = 28;   // w·b 한 칸 픽셀
  const sL = 0.55;          // 손실 1 단위당 픽셀
  const cosA = Math.cos(azimuth), sinA = Math.sin(azimuth);
  const cosT = Math.cos(tilt), sinT = Math.sin(tilt);

  const project = (wv: number, bv: number, L: number) => {
    const x0 = (wv - wMid) * sW;
    const y0 = (bv - bMid) * sB;
    const z0 = L * sL;
    const xr = x0 * cosA + y0 * sinA;
    const yr = -x0 * sinA + y0 * cosA;
    return { sx: cx + xr, sy: cy - yr * sinT - z0 * cosT, depth: yr };
  };

  const N = 14;
  type Line = { points: string; depth: number; color: string };
  const meshLines: Line[] = [];

  // w 방향 선 (b 고정)
  for (let j = 0; j <= N; j++) {
    const bv = bMin + (j / N) * (bMax - bMin);
    const pts: string[] = [];
    let depthSum = 0;
    for (let i = 0; i <= N; i++) {
      const wv = wMin + (i / N) * (wMax - wMin);
      const L = lossFn(wv, bv);
      const p = project(wv, bv, L);
      pts.push(`${p.sx.toFixed(1)},${p.sy.toFixed(1)}`);
      depthSum += p.depth;
    }
    meshLines.push({ points: pts.join(' '), depth: depthSum / (N + 1), color: 'rgb(96, 165, 250)' });
  }
  // b 방향 선 (w 고정)
  for (let i = 0; i <= N; i++) {
    const wv = wMin + (i / N) * (wMax - wMin);
    const pts: string[] = [];
    let depthSum = 0;
    for (let j = 0; j <= N; j++) {
      const bv = bMin + (j / N) * (bMax - bMin);
      const L = lossFn(wv, bv);
      const p = project(wv, bv, L);
      pts.push(`${p.sx.toFixed(1)},${p.sy.toFixed(1)}`);
      depthSum += p.depth;
    }
    meshLines.push({ points: pts.join(' '), depth: depthSum / (N + 1), color: 'rgb(168, 85, 247)' });
  }
  // 뒤쪽(depth가 큰)부터 앞쪽으로 그려서 가까운 선이 위에 오도록
  meshLines.sort((a, b) => b.depth - a.depth);

  const curL = lossFn(w, b);
  const cur = project(w, b, curL);
  const opt = project(2, 1, 0);

  // 그라디언트 반대 방향으로 한 발짝 (지표 표시용)
  const norm = Math.sqrt(dw * dw + db * db) || 1;
  const stepLen = 0.6; // 시각용 보폭 (학습률과 다름)
  const wTo = w - (dw / norm) * stepLen;
  const bTo = b - (db / norm) * stepLen;
  const lTo = lossFn(wTo, bTo);
  const arr = project(wTo, bTo, lTo);

  // 바닥 모서리 4개 (테두리 표시)
  const corners = [
    project(wMin, bMin, 0), project(wMax, bMin, 0),
    project(wMax, bMax, 0), project(wMin, bMax, 0),
  ];

  // 축 라벨용 끝점
  const wTipBase = project(wMax + 0.3, bMin, 0);
  const wOriginBase = project(wMin, bMin, 0);
  const bTipBase = project(wMin, bMax + 0.3, 0);
  const bOriginBase = project(wMin, bMin, 0);
  const lTip = project(wMin, bMin, lMax * 1.05);
  const lOriginBase = project(wMin, bMin, 0);

  return (
    <div className="card p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="text-sm font-medium">3D 손실 풍경 — w·b·L 곡면</div>
        <button
          type="button"
          onClick={() => { setAzimuth(0.55); setTilt(0.62); }}
          className="text-[11px] px-2 py-1 rounded-md border border-border bg-surface/40 text-muted hover:text-text"
        >시점 초기화</button>
      </div>
      <p className="text-xs text-muted mt-1">표면이 곧 손실. 골짜기 바닥이 정답 (2, 1). 화살표가 다음 한 발짝. <span className="text-accent">드래그</span>로 시점을 회전시킬 수 있습니다.</p>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full mt-2 touch-none cursor-grab active:cursor-grabbing select-none"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {/* 바닥 사각형 (참고용) */}
        <polygon
          points={corners.map((p) => `${p.sx.toFixed(1)},${p.sy.toFixed(1)}`).join(' ')}
          fill="rgba(120, 120, 160, 0.06)"
          stroke="rgb(var(--color-border))"
          strokeWidth={0.6}
          strokeDasharray="3 3"
        />
        {/* 축 (바닥) */}
        <line x1={wOriginBase.sx} y1={wOriginBase.sy} x2={wTipBase.sx} y2={wTipBase.sy}
          stroke="rgb(var(--color-muted))" strokeWidth={0.8} />
        <text x={wTipBase.sx + 4} y={wTipBase.sy + 4} fontSize={10} fill="rgb(var(--color-muted))">w</text>
        <line x1={bOriginBase.sx} y1={bOriginBase.sy} x2={bTipBase.sx} y2={bTipBase.sy}
          stroke="rgb(var(--color-muted))" strokeWidth={0.8} />
        <text x={bTipBase.sx - 12} y={bTipBase.sy - 2} fontSize={10} fill="rgb(var(--color-muted))">b</text>
        {/* L 축 (수직) */}
        <line x1={lOriginBase.sx} y1={lOriginBase.sy} x2={lTip.sx} y2={lTip.sy}
          stroke="rgb(var(--color-muted))" strokeWidth={0.8} />
        <text x={lTip.sx - 10} y={lTip.sy - 4} fontSize={10} fill="rgb(var(--color-muted))">L</text>

        {/* 와이어프레임 표면 */}
        {meshLines.map((ln, i) => (
          <polyline key={i} points={ln.points}
            fill="none" stroke={ln.color}
            strokeWidth={0.7} strokeOpacity={0.55} />
        ))}

        {/* 자취 */}
        {history.length > 1 && (
          <polyline
            points={history.map((h) => {
              const p = project(h.w, h.b, h.loss);
              return `${p.sx.toFixed(1)},${p.sy.toFixed(1)}`;
            }).join(' ')}
            fill="none" stroke="rgb(var(--color-accent))" strokeOpacity={0.7} strokeWidth={1.6}
          />
        )}

        {/* 정답 마커(바닥) */}
        <circle cx={opt.sx} cy={opt.sy} r={4} fill="white" stroke="rgb(var(--color-text))" strokeWidth={1} />
        <text x={opt.sx + 6} y={opt.sy + 3} fontSize={10} fill="rgb(var(--color-text))">정답 (2, 1)</text>

        <defs>
          <marker id="arrow5" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
            <path d="M0,0 L8,4 L0,8 z" fill="rgb(var(--color-accent))" />
          </marker>
        </defs>
        {Math.sqrt(dw * dw + db * db) > 0.05 && (
          <line x1={cur.sx} y1={cur.sy} x2={arr.sx} y2={arr.sy}
            stroke="rgb(var(--color-accent))" strokeWidth={2} markerEnd="url(#arrow5)" />
        )}
        {/* 이전 위치 잔상 + 이전 → 현재 강조선 */}
        {prev && (() => {
          const Lp = lossFn(prev.w, prev.b);
          const pp = project(prev.w, prev.b, Lp);
          const tooClose = Math.hypot(pp.sx - cur.sx, pp.sy - cur.sy) < 6;
          return (
            <g>
              <circle cx={pp.sx} cy={pp.sy} r={5} fill="none" stroke="rgb(var(--color-accent))" strokeOpacity={0.55} strokeWidth={1.5} strokeDasharray="2 2" />
              {!tooClose && (
                <line x1={pp.sx} y1={pp.sy} x2={cur.sx} y2={cur.sy}
                  stroke="rgb(var(--color-accent))" strokeOpacity={0.85} strokeWidth={2} />
              )}
            </g>
          );
        })()}
        {/* 현재 점 (표면 위) */}
        <circle cx={cur.sx} cy={cur.sy} r={6} fill="rgb(var(--color-accent))" stroke="white" strokeWidth={2} />
        <text x={cur.sx + 9} y={cur.sy - 9} fontSize={11} fill="rgb(var(--color-text))" fontFamily="JetBrains Mono">
          ({w.toFixed(2)}, {b.toFixed(2)})
        </text>
      </svg>
    </div>
  );
}
