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
          기울기는 "지금 위치에서 어느 방향으로 한 발짝 움직이면 손실이 줄어드는가"를 알려주는 화살표예요.
          그 반대 방향으로 학습률만큼 움직이면 끝입니다.
        </p>
      </div>

      <h2>📐 변화량과 기울기 — 과학 시간에서 시작</h2>
      <p className="text-muted text-sm">
        손실은 2차 함수라 그릇 모양이에요. 컴퓨터가 그릇 바닥으로 굴러가려면 "지금 어느 쪽이 내리막인지"를 알아야 하는데,
        그게 바로 <strong>곡선의 한 점에서의 기울기</strong>입니다. 과학 시간에 본 <strong>속도</strong>가 출발점이에요.
      </p>
      <div className="aside-tip mt-3 text-sm">
        <div className="font-medium">속도 → 직선의 기울기 → 곡선의 한 점 기울기, 모두 같은 발상</div>
        <ul className="mt-2 space-y-1 list-disc pl-5">
          <li><strong>속도</strong> = 거리의 변화량 ÷ 시간의 변화량 (과학 시간에 본 식 그대로)</li>
          <li>거리-시간 그래프로 옮기면 그 값이 곧 <strong>직선의 기울기</strong> = Δy/Δx</li>
          <li>곡선은 위치마다 기울기가 다른데, "한 점에서의 기울기"는 두 점을 <strong>점점 가까이 모은 극한</strong>으로 정해요 — 그게 접선의 기울기.</li>
          <li>이 "접선의 기울기"를 어른들이 부르는 다른 이름이 미분이지만, 우리는 그냥 <strong>"한 점에서의 기울기"</strong>라고 부를게요.</li>
        </ul>
      </div>
      <KeulgiWarmup />

      <h2>🧅 두 층의 기울기를 곱하기 — 양파를 까듯이</h2>
      <p className="text-muted text-sm">
        손실은 그냥 <code>x²</code>이 아니라 <code>(wx + b − y)²</code>예요. <strong>괄호 안에 또 다른 식</strong>이 들어 있는 두 층 구조.
        이럴 땐 "겉층의 기울기"와 "안층의 기울기"를 따로따로 구한 뒤 <strong>곱하면</strong> 전체 기울기가 됩니다. 톱니바퀴 두 개를 맞물린 것과 같은 발상이에요.
      </p>
      <ChainRule w={w} b={b} />

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

      <h2>② 기울기 계산 — 오차로부터 "어느 쪽이 내리막인지" 뽑아내기</h2>
      <p className="text-sm text-muted">
        손실 = (오차)². 두 층의 기울기를 곱하는 방식으로 풀면 <code>w</code>의 기울기는 각 데이터의 <code>오차×입력</code>을 평균낸 값,
        <code>b</code>의 기울기는 오차의 평균이 됩니다.
      </p>
      <details className="mt-3 card p-4 text-sm">
        <summary className="cursor-pointer font-medium">📝 한 줄씩 따라가기 — 미분 안 배운 학생을 위한 단계별 풀이</summary>
        <div className="mt-3 space-y-4 leading-relaxed">
          <Step n="1" title="기호 정리">
            <p>
              데이터 한 점은 (입력 x, 실제 y) 한 쌍이에요. 그 점에서:
            </p>
            <ul className="text-xs text-muted list-disc pl-5 mt-1 space-y-1">
              <li>예측 = w × x + b</li>
              <li>오차 e = 예측 − 실제 = w × x + b − y</li>
              <li>한 점의 손실 = 오차의 제곱 = e × e</li>
              <li>전체 손실 L = (점마다 손실을 모두 더한 값) ÷ (점 개수)</li>
            </ul>
          </Step>
          <Step n="2" title="L의 두 층 구조 알아채기">
            <p>
              <code>L = e²</code>이고 <code>e = w·x + b − y</code>. 즉, 두 단계의 변화 흐름이에요.
            </p>
            <ul className="text-xs text-muted list-disc pl-5 mt-1 space-y-1">
              <li><strong>안층</strong>: w가 변하면 e가 변한다 (e = wx + b − y)</li>
              <li><strong>겉층</strong>: e가 변하면 L이 변한다 (L = e²)</li>
            </ul>
          </Step>
          <Step n="3" title="겉층의 기울기: e가 1 변하면 L은? → 2e">
            <p>
              워밍업에서 본 패턴 그대로. <code>L = e²</code>의 한 점에서 기울기는 <code>2e</code>예요.
              지금 <code>e = 3</code>이면 e를 살짝 늘릴 때 L은 약 6배로 커지고, <code>e = −5</code>면 L은 −10 방향(줄어드는 쪽)으로 갑니다.
            </p>
          </Step>
          <Step n="4" title="안층의 기울기: w가 1 변하면 e는? → x">
            <p>
              <code>e = w·x + b − y</code>에서 <code>x</code>·<code>b</code>·<code>y</code>는 그 점에선 상수예요.
              w 한 값만 1 늘리면 wx 항이 x만큼 커지므로 e도 정확히 <strong>x만큼</strong> 늘어납니다.
            </p>
            <p className="text-xs text-muted mt-1">
              같은 방식으로 b를 1 늘리면 e는 <strong>1만큼</strong>.
            </p>
          </Step>
          <Step n="5" title="두 층의 기울기를 곱한다 (양파 까기)">
            <p>
              w를 1 늘리면 → e가 x만큼 → L이 (2e × x)만큼 변해요.
              w → e → L로 변화가 흐를 때, 각 층의 기울기를 <strong>곱</strong>하면 전체 기울기예요. 톱니바퀴 두 개의 기어비 곱과 같은 발상.
            </p>
            <div className="font-mono text-xs mt-2 p-2 bg-surface/60 border border-border rounded">
              한 점에서 w에 대한 기울기 = (겉층 기울기) × (안층 기울기) = 2 × 오차 × x<br />
              한 점에서 b에 대한 기울기 = 2 × 오차 × 1 = 2 × 오차
            </div>
          </Step>
          <Step n="6" title="모든 데이터에 대해 평균">
            <p>
              한 점이 아니라 N개 데이터 전체 손실은 평균이니까, 기울기도 각 점의 기여를 <strong>평균</strong>합니다.
            </p>
            <div className="font-mono text-xs mt-2 p-2 bg-surface/60 border border-border rounded">
              dw = (모든 점에서 2 × 오차 × x를 더한 합) ÷ (점 개수)<br />
              db = (모든 점에서 2 × 오차를 더한 합) ÷ (점 개수)
            </div>
          </Step>
          <Step n="7" title="부호의 의미와 한 발짝 이동">
            <p>
              dw가 음수면 "여기서 w를 키우면 손실이 줄어든다"는 뜻. 양수면 줄여야 한다는 뜻.
              그래서 다음 한 발짝은 <strong>부호 반대 방향</strong>으로 학습률만큼 움직입니다.
            </p>
            <div className="font-mono text-xs mt-2 p-2 bg-surface/60 border border-border rounded">
              새 w = 지금 w − (학습률 × dw)<br />
              새 b = 지금 b − (학습률 × db)
            </div>
          </Step>
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

      <h2>📈 손실 풍경 — w·b 두 축이 만든 그릇 모양</h2>
      <p className="text-muted text-sm">
        2D는 <code>w</code> 한 축 위의 포물선이지만, 우리 모델은 <code>w</code>·<code>b</code> 두 축이 있어요.
        그래서 손실은 두 축 위에 펼쳐진 <strong>그릇 모양 곡면</strong>이 됩니다(3D).
        그 곡면을 위에서 내려다본 게 오른쪽 등고선이에요.
      </p>
      <div className="grid lg:grid-cols-2 gap-4 mt-4">
        <SliceWPlot w={w} b={b} dw={dw} lr={lr} />
        <GradientBoard w={w} b={b} dw={dw} db={db} history={history} />
      </div>

      <h2>③ 수정 — 기울기 반대 방향으로 학습률만큼 이동</h2>
      <div className="card p-4 mt-3 font-mono text-sm space-y-1">
        <div>새 w = w − (학습률 × dw) = {w.toFixed(3)} − ({lr.toFixed(3)} × {dw.toFixed(3)}) = <span className="text-accent">{(w - lr * dw).toFixed(3)}</span></div>
        <div>새 b = b − (학습률 × db) = {b.toFixed(3)} − ({lr.toFixed(3)} × {db.toFixed(3)}) = <span className="text-accent">{(b - lr * db).toFixed(3)}</span></div>
      </div>
      <details className="mt-3 card p-4 text-sm">
        <summary className="cursor-pointer font-medium">🤔 왜 "빼기"이고, 학습률은 또 뭐지?</summary>
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
            <div className="font-medium">학습률은 "한 발짝 크기"</div>
            <p className="text-muted mt-1">
              기울기는 방향만 알려줄 뿐, 얼마나 멀리 갈지는 말해주지 않아요.
              학습률은 0.05처럼 작은 수를 곱해서 한 번에 너무 멀리 가지 않게 막는 안전장치입니다.
            </p>
            <ul className="text-xs text-muted mt-2 list-disc pl-5 space-y-1">
              <li>너무 크면 → 골짜기 반대편으로 튕겨 나가 발산</li>
              <li>너무 작으면 → 거의 안 움직여서 학습이 답답할 만큼 느림</li>
              <li>적당하면 → 그릇 바닥으로 차근차근 굴러 내려감</li>
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
      <div className="grid lg:grid-cols-[1fr_auto] gap-4 items-start">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
          {/* 축 */}
          <line x1={padL} y1={sy(0)} x2={W - padR} y2={sy(0)} stroke="rgb(var(--color-border))" />
          <line x1={sx(0)} y1={padT} x2={sx(0)} y2={H - padB} stroke="rgb(var(--color-border))" />
          <text x={W - padR} y={sy(0) + 14} textAnchor="end" fontSize={10} fill="rgb(var(--color-muted))">x</text>
          <text x={sx(0) + 4} y={padT + 10} fontSize={10} fill="rgb(var(--color-muted))">y</text>
          {/* y = x² 곡선 */}
          <path d={path} fill="none" stroke="rgb(var(--color-text))" strokeOpacity={0.7} strokeWidth={1.5} />
          {/* 접선(참고, 점선) */}
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
          <p className="text-xs text-muted">
            h를 줄여 보세요. 두 점을 잇는 주황 직선이 점점 회색 점선(한 점에서의 기울기)에 가까워져요.
            그 극한값이 곧 그 점의 기울기 = <strong>2 × x₀</strong>.
          </p>
        </div>
      </div>
    </div>
  );
}

// 합성함수 미분의 직관: w → e → L 두 단계 변화율의 곱
function ChainRule({ w, b }: { w: number; b: number }) {
  const [pickX, setPickX] = useState(3); // 데이터 한 점 골라보기 (1~5)
  const x = pickX, y = 2 * x + 1; // 정답 데이터 (w=2, b=1 가정)
  const e = w * x + b - y;
  const dEdW = x; // 안층 변화율
  const dLdE = 2 * e; // 겉층 변화율
  const dLdW = dLdE * dEdW; // 두 층의 기울기를 곱한 결과

  return (
    <div className="card p-4 mt-3">
      <p className="text-sm text-muted">
        예를 들어 <strong>x = {x}</strong> 데이터(<code>실제 y = {y}</code>)를 골라봅시다.
        지금 모델 <code>(w={w.toFixed(2)}, b={b.toFixed(2)})</code>의 예측은 <code>{(w*x + b).toFixed(2)}</code>이고
        오차 <code>e = {e.toFixed(2)}</code>예요.
      </p>
      <label className="block mt-3 max-w-xs">
        <div className="flex justify-between text-xs mb-1">
          <span>데이터 x를 1~5에서 골라보기</span>
          <span className="font-mono text-accent">x = {x}</span>
        </div>
        <input type="range" min={1} max={5} step={1} value={pickX}
          onChange={(ev) => setPickX(parseInt(ev.target.value))} className="w-full" />
      </label>

      <div className="grid sm:grid-cols-3 gap-2 mt-4 text-sm">
        <ChainBox
          title="①  w가 1 늘면 e는?"
          formula="안층의 기울기 = x"
          value={`= ${dEdW}`}
          desc="안쪽 식 e의 변화량"
        />
        <ChainBox
          title="②  e가 1 늘면 L은?"
          formula="겉층의 기울기 = 2e"
          value={`= ${dLdE.toFixed(2)}`}
          desc="바깥쪽 식 L의 변화량"
          accent="amber"
        />
        <ChainBox
          title="③  두 기울기를 곱한다"
          formula="(겉층) × (안층)"
          value={`= ${dLdE.toFixed(2)} × ${dEdW} = ${dLdW.toFixed(2)}`}
          desc="w가 1 늘 때 L의 변화량"
          accent="accent"
        />
      </div>

      <div className="mt-4 text-sm">
        <div className="font-medium">🔗 흐름 시각화</div>
        <ChainFlow x={x} e={e} dEdW={dEdW} dLdE={dLdE} />
      </div>

      <p className="text-xs text-muted mt-3">
        같은 방식으로 <code>b</code>도: 안층 기울기 = 1, 겉층 기울기 = 2e ⇒ b의 기울기 = <strong>2e × 1 = {(2*e).toFixed(2)}</strong>.
        b는 안층 기울기가 1이라 단순히 <strong>2e</strong>가 그 점의 기여가 됩니다.
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

// w → e → L 변화 흐름을 박스+화살표로
function ChainFlow({ x, e, dEdW, dLdE }: { x: number; e: number; dEdW: number; dLdE: number }) {
  const W = 460, H = 110;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full mt-2">
      <defs>
        <marker id="cf-arrow" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
          <path d="M0,0 L8,4 L0,8 z" fill="rgb(var(--color-muted))" />
        </marker>
      </defs>
      <FlowBox cx={70} cy={H/2} label="w" sub="가중치" color="rgb(96,165,250)" />
      <FlowBox cx={230} cy={H/2} label={`e = ${e.toFixed(2)}`} sub="오차(안층)" color="rgb(251,146,60)" wide />
      <FlowBox cx={400} cy={H/2} label="L = e²" sub="손실(겉층)" color="rgb(16,185,129)" wide />
      {/* 화살표 */}
      <line x1={108} y1={H/2} x2={180} y2={H/2} stroke="rgb(var(--color-muted))" strokeWidth={1.5} markerEnd="url(#cf-arrow)" />
      <text x={144} y={H/2 - 8} textAnchor="middle" fontSize={11} fill="rgb(var(--color-muted))">×{dEdW} (= x)</text>
      <line x1={290} y1={H/2} x2={350} y2={H/2} stroke="rgb(var(--color-muted))" strokeWidth={1.5} markerEnd="url(#cf-arrow)" />
      <text x={320} y={H/2 - 8} textAnchor="middle" fontSize={11} fill="rgb(var(--color-muted))">×{dLdE.toFixed(2)} (= 2e)</text>
      <text x={W/2} y={H - 6} textAnchor="middle" fontSize={11} fill="rgb(var(--color-muted))">
        w가 1만큼 → e는 {x}만큼 → L은 {(dEdW * dLdE).toFixed(2)}만큼 변한다
      </text>
    </svg>
  );
}

function FlowBox({ cx, cy, label, sub, color, wide }: { cx: number; cy: number; label: string; sub: string; color: string; wide?: boolean }) {
  const w = wide ? 70 : 38;
  const h = 30;
  return (
    <g>
      <rect x={cx - w} y={cy - h/2} width={w * 2} height={h} rx={6} fill={color} fillOpacity={0.18} stroke={color} />
      <text x={cx} y={cy + 4} textAnchor="middle" fontSize={12} fill="rgb(var(--color-text))" fontFamily="JetBrains Mono">{label}</text>
      <text x={cx} y={cy + 28} textAnchor="middle" fontSize={10} fill="rgb(var(--color-muted))">{sub}</text>
    </g>
  );
}

// 1D 단면: b 고정, w 변화에 따른 손실 곡선
function SliceWPlot({ w, b, dw, lr }: { w: number; b: number; dw: number; lr: number }) {
  const W = 380, H = 240, padL = 38, padR = 12, padT = 14, padB = 28;
  const wMin = -1, wMax = 4;
  // 손실 최대치 자동 추정
  const samples: { w: number; L: number }[] = [];
  let lMax = 0.1;
  for (let i = 0; i <= 80; i++) {
    const wv = wMin + (i / 80) * (wMax - wMin);
    const L = lossFn(wv, b);
    samples.push({ w: wv, L });
    if (L > lMax) lMax = L;
  }
  const sx = (v: number) => padL + ((v - wMin) / (wMax - wMin)) * (W - padL - padR);
  const sy = (v: number) => H - padB - (v / lMax) * (H - padT - padB);
  const path = samples.map((s, i) => `${i === 0 ? 'M' : 'L'}${sx(s.w)},${sy(s.L)}`).join(' ');
  const Lhere = lossFn(w, b);
  const Lnext = lossFn(w - lr * dw, b);
  // 접선
  const tx1 = wMin, tx2 = wMax;
  const ty1 = dw * (tx1 - w) + Lhere;
  const ty2 = dw * (tx2 - w) + Lhere;
  return (
    <div className="card p-3">
      <div className="text-sm font-medium">단면 — w축의 포물선 (b = {b.toFixed(2)} 고정)</div>
      <p className="text-xs text-muted mt-1">접선의 기울기가 곧 dw. 다음 한 발짝(▲)이 어디에 떨어지는지 보세요.</p>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full mt-2">
        <line x1={padL} y1={H - padB} x2={W - padR} y2={H - padB} stroke="rgb(var(--color-border))" />
        <line x1={padL} y1={padT} x2={padL} y2={H - padB} stroke="rgb(var(--color-border))" />
        <text x={W - padR} y={H - 8} textAnchor="end" fontSize={10} fill="rgb(var(--color-muted))">w</text>
        <text x={padL + 4} y={padT + 10} fontSize={10} fill="rgb(var(--color-muted))">L</text>
        {/* 곡선 */}
        <path d={path} fill="none" stroke="rgb(var(--color-text))" strokeOpacity={0.7} strokeWidth={1.5} />
        {/* 접선 */}
        <line x1={sx(tx1)} y1={sy(Math.max(0, Math.min(lMax, ty1)))} x2={sx(tx2)} y2={sy(Math.max(0, Math.min(lMax, ty2)))}
          stroke="rgb(251, 146, 60)" strokeWidth={1.5} strokeOpacity={0.85} strokeDasharray="4 3" />
        {/* 현재 점 */}
        <circle cx={sx(w)} cy={sy(Lhere)} r={5} fill="rgb(var(--color-accent))" stroke="white" strokeWidth={1.5} />
        {/* 다음 점 */}
        <g transform={`translate(${sx(w - lr * dw)}, ${sy(Lnext)})`}>
          <polygon points="0,-6 5,3 -5,3" fill="rgb(16,185,129)" />
        </g>
        <text x={sx(w) + 8} y={sy(Lhere) - 8} fontSize={10} fill="rgb(var(--color-text))" fontFamily="JetBrains Mono">
          현재 w
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

// (w, b) 평면을 위에서 본 손실 풍경 — 실제 손실값 기반 heatmap + 등고선 + 그라디언트 화살표
function GradientBoard({
  w, b, dw, db, history,
}: { w: number; b: number; dw: number; db: number; history: { w: number; b: number; loss: number }[] }) {
  const W = 380, H = 240, padL = 36, padR = 12, padT = 18, padB = 24;
  const wMin = -1, wMax = 4, bMin = -2, bMax = 4;
  const sx = (v: number) => padL + ((v - wMin) / (wMax - wMin)) * (W - padL - padR);
  const sy = (v: number) => H - padB - ((v - bMin) / (bMax - bMin)) * (H - padT - padB);

  // 손실 격자
  const N = 28;
  const cellW = (W - padL - padR) / N;
  const cellH = (H - padT - padB) / N;
  const grid: { wv: number; bv: number; L: number }[] = [];
  let lMax = 0;
  for (let j = 0; j < N; j++) {
    for (let i = 0; i < N; i++) {
      const wv = wMin + ((i + 0.5) / N) * (wMax - wMin);
      const bv = bMin + ((j + 0.5) / N) * (bMax - bMin);
      const L = lossFn(wv, bv);
      grid.push({ wv, bv, L });
      if (L > lMax) lMax = L;
    }
  }
  // 시각적 강조용 로그 스케일
  const colorOf = (L: number) => {
    const t = Math.log(1 + L) / Math.log(1 + lMax);
    // 보라(낮음) → 청록 → 노랑(높음)
    const r = Math.round(40 + 215 * t);
    const g = Math.round(60 + 140 * (1 - Math.abs(0.5 - t) * 2));
    const bl = Math.round(150 - 130 * t);
    return `rgba(${r}, ${g}, ${bl}, ${0.35 + 0.45 * t})`;
  };

  const aLen = Math.min(40, Math.sqrt(dw * dw + db * db) * 6);
  const norm = Math.sqrt(dw * dw + db * db) || 1;
  const ax = sx(w) - (dw / norm) * aLen;
  const ay = sy(b) + (db / norm) * aLen;

  return (
    <div className="card p-3">
      <div className="text-sm font-medium">위에서 본 풍경 — w·b 평면의 등고선</div>
      <p className="text-xs text-muted mt-1">진한 골짜기가 정답 (2, 1). 화살표 방향이 한 발짝 갈 위치예요.</p>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full mt-2">
        {/* heatmap */}
        {grid.map((g, k) => {
          const i = k % N, j = Math.floor(k / N);
          return (
            <rect key={k}
              x={padL + i * cellW}
              y={padT + (N - 1 - j) * cellH}
              width={cellW + 0.5}
              height={cellH + 0.5}
              fill={colorOf(g.L)}
            />
          );
        })}
        {/* axes */}
        <line x1={padL} y1={H - padB} x2={W - padR} y2={H - padB} stroke="rgb(var(--color-border))" />
        <line x1={padL} y1={padT} x2={padL} y2={H - padB} stroke="rgb(var(--color-border))" />
        <text x={W - padR} y={H - 6} textAnchor="end" fontSize={10} fill="rgb(var(--color-muted))">w</text>
        <text x={padL + 4} y={padT + 10} fontSize={10} fill="rgb(var(--color-muted))">b</text>
        {/* 정답 표시 */}
        <circle cx={sx(2)} cy={sy(1)} r={4} fill="white" stroke="rgb(var(--color-text))" strokeWidth={1} />
        <text x={sx(2) + 6} y={sy(1) + 3} fontSize={10} fill="rgb(var(--color-text))">정답</text>
        {/* trail */}
        {history.length > 1 && (
          <polyline
            points={history.map((h) => `${sx(h.w)},${sy(h.b)}`).join(' ')}
            fill="none" stroke="rgb(var(--color-accent))" strokeOpacity={0.45} strokeWidth={1.5}
          />
        )}
        <defs>
          <marker id="arrow5" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
            <path d="M0,0 L8,4 L0,8 z" fill="rgb(var(--color-accent))" />
          </marker>
        </defs>
        {Math.sqrt(dw * dw + db * db) > 0.05 && (
          <line x1={sx(w)} y1={sy(b)} x2={ax} y2={ay}
            stroke="rgb(var(--color-accent))" strokeWidth={2} markerEnd="url(#arrow5)" />
        )}
        <circle cx={sx(w)} cy={sy(b)} r={6} fill="rgb(var(--color-accent))" stroke="white" strokeWidth={2} />
        <text x={sx(w) + 9} y={sy(b) - 9} fontSize={11} fill="rgb(var(--color-text))" fontFamily="JetBrains Mono">
          ({w.toFixed(2)}, {b.toFixed(2)})
        </text>
      </svg>
    </div>
  );
}
