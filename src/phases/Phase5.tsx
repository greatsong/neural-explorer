import { useState } from 'react';
import { useApp } from '../store';

const DATA: [number, number][] = [
  [1, 3], [2, 5], [3, 7], [4, 9], [5, 11],
];

const lossFn = (w: number, b: number) =>
  DATA.reduce((acc, [x, y]) => acc + (w * x + b - y) ** 2, 0) / DATA.length;

const gradient = (w: number, b: number) => {
  let dw = 0, db = 0;
  DATA.forEach(([x, y]) => {
    const e = w * x + b - y;
    dw += 2 * e * x;
    db += 2 * e;
  });
  return { dw: dw / DATA.length, db: db / DATA.length };
};

export function Phase5() {
  const [w, setW] = useState(0);
  const [b, setB] = useState(0);
  const [lr, setLr] = useState(0.05);
  const [history, setHistory] = useState<{ w: number; b: number; loss: number }[]>([
    { w: 0, b: 0, loss: lossFn(0, 0) },
  ]);
  const markCompleted = useApp((s) => s.markCompleted);

  const loss = lossFn(w, b);
  const { dw, db } = gradient(w, b);

  const step = () => {
    const nw = w - lr * dw;
    const nb = b - lr * db;
    setW(nw); setB(nb);
    setHistory((h) => [...h, { w: nw, b: nb, loss: lossFn(nw, nb) }]);
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
    setW(cw); setB(cb);
    setHistory((h) => [...h, ...newH]);
    if (lossFn(cw, cb) < 0.05) markCompleted('p5');
  };

  const reset = () => {
    setW(0); setB(0);
    setHistory([{ w: 0, b: 0, loss: lossFn(0, 0) }]);
  };

  // sample contributions for current state (per-data point)
  const perPoint = DATA.map(([x, y]) => {
    const pred = w * x + b;
    const err = pred - y;
    return { x, y, pred, err, dwContrib: 2 * err * x, dbContrib: 2 * err };
  });

  return (
    <article>
      <div className="text-xs font-mono text-muted">PHASE 5</div>
      <h1>기울기와 수정</h1>
      <p className="text-muted mt-2">
        페이즈 4에서 슬라이더로 손수 했던 일을 컴퓨터는 어떻게 자동으로 할까요?
        <strong> 오차 → 기울기 → 수정</strong> 세 단계를 한 번씩 파헤쳐봅시다.
      </p>

      <div className="aside-tip">
        <div className="font-medium">아이디어</div>
        <p className="mt-1 text-sm">
          기울기(gradient)는 "지금 위치에서 어느 방향으로 한 발짝 움직이면 손실이 줄어드는가"를 알려주는 화살표예요.
          그 반대 방향으로 학습률만큼 움직이면 끝입니다.
        </p>
      </div>

      <h2>① 오차 계산 — 데이터 하나하나가 얼마나 어긋나 있나</h2>
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
                <td className={`text-center ${Math.abs(p.err) > 0.5 ? 'text-amber-600 dark:text-amber-400' : 'text-muted'}`}>
                  {p.err.toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2>② 기울기 계산 — 오차로부터 "어디로 가야 하는지" 뽑아내기</h2>
      <p className="text-sm text-muted">
        손실 = (오차)². 미분하면 다음과 같아요. 각 데이터의 <code>오차×입력</code>을 평균낸 게 <code>w</code>의 기울기,
        오차 평균이 <code>b</code>의 기울기입니다.
      </p>
      <details className="mt-3 card p-4 text-sm">
        <summary className="cursor-pointer font-medium">🤔 왜 이런 식이 나올까? (고1 수준 풀이)</summary>
        <div className="mt-3 space-y-3 text-sm leading-relaxed">
          <div>
            <div className="font-medium">1단계 — 손실 = (오차)²로 두는 이유</div>
            <p className="text-muted mt-1">
              오차 = 예측 − 실제. 그냥 더하면 +3과 −3이 상쇄돼서 0이 됩니다(실제론 둘 다 틀린 건데!).
              그래서 부호를 없애려고 <strong>제곱</strong>해요. 절댓값 대신 제곱을 쓰는 건, 제곱이 매끄러운 이차함수라
              뾰족한 모서리가 없고 미분이 깔끔하게 떨어지기 때문이에요.
            </p>
          </div>
          <div>
            <div className="font-medium">2단계 — "기울기"가 뭔지 그림으로</div>
            <p className="text-muted mt-1">
              <code>w</code>를 가로축, 손실을 세로축에 두면 U자 모양 그래프가 나와요(이차함수니까요).
              <strong>기울기(dw)</strong>는 그 곡선의 한 점에서 접선의 기울기입니다.
              U자의 왼쪽 비탈에 있으면 접선이 왼쪽 아래로 향하니 기울기가 <strong>음수</strong>,
              오른쪽 비탈에 있으면 <strong>양수</strong>예요. 골짜기 바닥에선 0.
            </p>
          </div>
          <div>
            <div className="font-medium">3단계 — 식 유도(연쇄법칙 살짝)</div>
            <p className="text-muted mt-1">
              한 점에서 손실을 <code>L = (wx + b − y)²</code>로 쓰면, 안쪽 식 <code>wx + b − y</code>를 <code>e</code>(오차)라고 부를게요.
              합성함수 미분 규칙(고1 끝~고2 초): <code>(e²)' = 2e × e'</code>.
              여기서 <code>w</code>로 미분하면 <code>e'</code>가 <code>x</code>가 돼서 <code>2e·x</code>,
              <code>b</code>로 미분하면 <code>e'</code>가 <code>1</code>이라 <code>2e</code>가 돼요.
              여러 점이면 평균을 내면 됩니다.
            </p>
            <div className="font-mono text-xs mt-2 p-2 bg-surface/60 border border-border rounded">
              dw = (모든 점의 2 × 오차 × 입력) ÷ 데이터 수<br />
              db = (모든 점의 2 × 오차) ÷ 데이터 수
            </div>
          </div>
          <div>
            <div className="font-medium">4단계 — 부호의 의미</div>
            <p className="text-muted mt-1">
              dw가 <strong>음수</strong>면 "여기서 w를 늘리면 손실이 줄어든다"는 뜻이고,
              <strong>양수</strong>면 "여기서 w를 줄여야 한다"는 뜻이에요.
              그래서 다음 단계에서 <strong>부호 반대 방향</strong>으로 움직입니다.
            </p>
          </div>
        </div>
      </details>
      <div className="card p-4 mt-3 font-mono text-sm space-y-2">
        <div className="text-xs text-muted">w의 기울기 (dw):</div>
        <div className="flex flex-wrap items-center gap-1">
          {perPoint.map((p, i) => (
            <span key={p.x} className="inline-flex items-center gap-1">
              <span className="text-muted">2×({p.err.toFixed(2)})×{p.x}</span>
              {i < perPoint.length - 1 && <span className="text-muted">+</span>}
            </span>
          ))}
          <span className="text-muted">÷ {DATA.length}</span>
        </div>
        <div>
          dw = <span className="text-accent">{dw.toFixed(3)}</span>
          {' '}
          {Math.abs(dw) < 0.01 ? '(거의 0 — 도착!)' : dw > 0 ? '(+ → w를 줄여야 함)' : '(− → w를 키워야 함)'}
        </div>
        <div className="border-t border-border pt-2 mt-2 text-xs text-muted">b의 기울기 (db):</div>
        <div>
          db = <span className="text-accent">{db.toFixed(3)}</span>
          {' '}
          {Math.abs(db) < 0.01 ? '(거의 0)' : db > 0 ? '(+ → b를 줄여야 함)' : '(− → b를 키워야 함)'}
        </div>
      </div>

      <h2>③ 수정 — 기울기 반대 방향으로 학습률만큼 이동</h2>
      <div className="card p-4 mt-3 font-mono text-sm space-y-1">
        <div>새 w = w − (학습률 × dw) = {w.toFixed(3)} − ({lr.toFixed(3)} × {dw.toFixed(3)}) = <span className="text-accent">{(w - lr * dw).toFixed(3)}</span></div>
        <div>새 b = b − (학습률 × db) = {b.toFixed(3)} − ({lr.toFixed(3)} × {db.toFixed(3)}) = <span className="text-accent">{(b - lr * db).toFixed(3)}</span></div>
      </div>
      <details className="mt-3 card p-4 text-sm">
        <summary className="cursor-pointer font-medium">🤔 왜 "빼기"이고, 학습률은 또 뭐지? (고1 수준 풀이)</summary>
        <div className="mt-3 space-y-3 leading-relaxed">
          <div>
            <div className="font-medium">왜 빼기일까</div>
            <p className="text-muted mt-1">
              앞서 본 것처럼 기울기는 "손실이 늘어나는 방향"을 가리켜요.
              우리가 원하는 건 손실이 <strong>줄어드는</strong> 방향이니까,
              가리키는 반대 방향으로 가야 합니다. 그래서 부호를 바꿔주는 <strong>빼기</strong>를 써요.
            </p>
          </div>
          <div>
            <div className="font-medium">학습률(η, learning rate)은 "한 발짝 크기"</div>
            <p className="text-muted mt-1">
              기울기는 방향만 알려줄 뿐, 얼마나 멀리 갈지는 말해주지 않아요.
              학습률은 0.05처럼 작은 수를 곱해서 한 번에 너무 멀리 가지 않게 막는 안전장치입니다.
            </p>
            <ul className="text-xs text-muted mt-2 list-disc pl-5 space-y-1">
              <li>너무 크면 → 골짜기 반대편으로 튕겨 나가 발산</li>
              <li>너무 작으면 → 거의 안 움직여서 학습이 답답할 만큼 느림</li>
              <li>적당하면 → U자 곡선의 바닥으로 차근차근 굴러 내려감</li>
            </ul>
          </div>
          <div>
            <div className="font-medium">비유: 안개 낀 산에서 내려오기</div>
            <p className="text-muted mt-1">
              앞이 안 보이는 산에서 발 밑 경사(<strong>기울기</strong>)만 느낄 수 있다고 해봐요.
              경사가 가장 가파르게 <em>올라가는</em> 방향의 반대로 한 발짝(<strong>학습률</strong>) 가고,
              다시 발 밑을 느끼고 또 한 발짝 — 이걸 반복하면 골짜기에 도착해요.
              이게 <strong>경사 하강법(gradient descent)</strong>입니다.
            </p>
          </div>
        </div>
      </details>

      <GradientBoard w={w} b={b} dw={dw} db={db} history={history} />

      <div className="grid sm:grid-cols-3 gap-3 mt-6 font-mono text-sm">
        <Stat label="현재 w" value={w.toFixed(3)} />
        <Stat label="현재 b" value={b.toFixed(3)} />
        <Stat label="손실" value={loss.toFixed(4)} highlight={loss < 0.05} />
      </div>

      <div className="mt-4">
        <label className="block">
          <div className="flex justify-between text-sm mb-1">
            <span>학습률 (한 발짝 크기)</span>
            <span className="font-mono text-accent">{lr.toFixed(3)}</span>
          </div>
          <input type="range" min={0.001} max={0.1} step={0.001} value={lr}
            onChange={(e) => setLr(parseFloat(e.target.value))} className="w-full" />
        </label>
      </div>

      <div className="flex flex-wrap gap-2 mt-4">
        <button onClick={step} className="btn-primary" disabled={loss < 0.001}>① ② ③ 한 번 실행</button>
        <button onClick={step20} className="btn-ghost" disabled={loss < 0.001}>20번 반복</button>
        <button onClick={reset} className="btn-ghost">초기화</button>
      </div>

      {loss < 0.05 && (
        <div className="aside-tip mt-4">
          <strong>도착!</strong> 모든 기울기가 거의 0이 됐어요. 손실이 더 줄어들 방향이 없다는 뜻 — 학습 종료.
          (정답: w=2, b=1)
        </div>
      )}
    </article>
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

function GradientBoard({
  w, b, dw, db, history,
}: { w: number; b: number; dw: number; db: number; history: { w: number; b: number; loss: number }[] }) {
  // (w, b) 평면에 손실 등고선 + 현재 위치 + 기울기 화살표
  const W = 460, H = 240;
  const wMin = -1, wMax = 4, bMin = -3, bMax = 4;
  const sx = (v: number) => 30 + ((v - wMin) / (wMax - wMin)) * (W - 40);
  const sy = (v: number) => H - 20 - ((v - bMin) / (bMax - bMin)) * (H - 30);

  // crude contour: sample
  const contours: string[] = [];
  for (const level of [1, 5, 15, 40]) {
    const pts: string[] = [];
    for (let i = 0; i < 60; i++) {
      const angle = (i / 60) * Math.PI * 2;
      // around target (2, 1) approx
      const r = Math.sqrt(level) * 0.7;
      const wp = 2 + r * Math.cos(angle);
      const bp = 1 + r * Math.sin(angle) * 1.3;
      pts.push(`${sx(wp)},${sy(bp)}`);
    }
    contours.push(pts.join(' '));
  }

  // arrow direction: opposite to gradient
  const aLen = Math.min(40, Math.sqrt(dw * dw + db * db) * 8);
  const norm = Math.sqrt(dw * dw + db * db) || 1;
  const ax = sx(w) - (dw / norm) * aLen;
  const ay = sy(b) + (db / norm) * aLen;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-2xl mt-6 border border-border rounded-md bg-surface/40">
      <text x={20} y={16} fontSize={11} fill="rgb(var(--color-muted))">
        (w, b) 평면 — 가운데가 정답 (2, 1)
      </text>
      {/* axes */}
      <line x1={30} y1={H - 20} x2={W - 10} y2={H - 20} stroke="rgb(var(--color-border))" />
      <line x1={30} y1={20} x2={30} y2={H - 20} stroke="rgb(var(--color-border))" />
      <text x={W - 10} y={H - 6} textAnchor="end" fontSize={11} fill="rgb(var(--color-muted))">w</text>
      <text x={36} y={26} fontSize={11} fill="rgb(var(--color-muted))">b</text>

      {/* contours */}
      {contours.map((pts, i) => (
        <polygon key={i} points={pts} fill="none" stroke="rgb(var(--color-border))" strokeOpacity={0.7} />
      ))}
      {/* target */}
      <circle cx={sx(2)} cy={sy(1)} r={5} fill="rgb(var(--color-border))" />
      <text x={sx(2) + 7} y={sy(1) + 4} fontSize={10} fill="rgb(var(--color-muted))">정답</text>

      {/* trail */}
      {history.length > 1 && (
        <polyline
          points={history.map((h) => `${sx(h.w)},${sy(h.b)}`).join(' ')}
          fill="none" stroke="rgb(var(--color-accent))" strokeOpacity={0.3} strokeWidth={1.5}
        />
      )}

      {/* arrow */}
      <defs>
        <marker id="arrow5" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
          <path d="M0,0 L8,4 L0,8 z" fill="rgb(var(--color-accent))" />
        </marker>
      </defs>
      {Math.sqrt(dw * dw + db * db) > 0.05 && (
        <line
          x1={sx(w)} y1={sy(b)} x2={ax} y2={ay}
          stroke="rgb(var(--color-accent))" strokeWidth={2} markerEnd="url(#arrow5)"
        />
      )}

      {/* current */}
      <circle cx={sx(w)} cy={sy(b)} r={6} fill="rgb(var(--color-accent))" stroke="white" strokeWidth={2} />
      <text x={sx(w) + 9} y={sy(b) - 9} fontSize={11} fill="rgb(var(--color-text))" fontFamily="JetBrains Mono">
        ({w.toFixed(2)}, {b.toFixed(2)})
      </text>
    </svg>
  );
}
