import { useState } from 'react';
import { useApp } from '../store';

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

  return (
    <article>
      <div className="text-xs font-mono text-muted">PHASE 5</div>
      <h1>자동으로 학습하기</h1>
      <p className="text-muted mt-2">
        페이즈 4에서 슬라이더를 손으로 움직여 오차를 줄였다면, 이제는 컴퓨터가 어느 쪽으로 얼마만큼
        움직여야 하는지 스스로 알아냅니다. 비유로 말하면 <strong>나침반(어느 쪽이 내리막인가) + 보폭(한 발짝의 크기)</strong>의
        반복이에요. 이 한 묶음을 한 <strong>step(=1 에포크)</strong>이라 부릅니다.
      </p>

      <div className="aside-note mt-3 text-sm">
        <div className="font-medium">이 페이지의 흐름</div>
        <ol className="mt-1 list-decimal pl-5 space-y-0.5 text-muted">
          <li><strong>먼저 바라보기</strong> — 학습이 진행될수록 <code>w</code>·<code>b</code>가 어떻게 바뀌고 오차가 줄어드는지 관찰</li>
          <li><strong>숫자로 따라가기</strong> — 식 ①②③이 한 step에 어떻게 작동하는지 직접 계산</li>
          <li><strong>왜 이 식인지 이해하기</strong> — 미분 없이도 보이는 직관 (<a href="#/p5b" className="underline text-accent">페이즈 5+</a>에서 깊이)</li>
          <li><strong>다시 그림으로 종합</strong> — 다이어그램과 손실 풍경을 한 번 더 훑으며 정리</li>
        </ol>
        <p className="mt-2 text-xs text-muted">
          익숙해지면 같은 식을 실제 데이터에 적용해 봅니다 — <a href="#/p5c" className="underline text-accent">페이즈 5* — 서울 기온으로 학습하기</a>.
        </p>
      </div>

      <div className="aside-tip mt-3">
        <div className="font-medium">기호 — 페이즈 4와의 연결</div>
        <ul className="mt-2 text-sm space-y-1 list-disc pl-5">
          <li><code>w</code>·<code>b</code> 가중치·편향 (= 페이즈 4의 두 슬라이더)</li>
          <li><code>ŷ</code> 예측, <code>y</code> 정답, <code>e = ŷ − y</code> 한 점의 오차</li>
          <li><strong>나침반</strong> = <code>dw</code>·<code>db</code> = 컴퓨터가 자동으로 알려주는 "어느 쪽이 내리막인가"</li>
          <li><strong>보폭</strong> = <code>η</code>(에타) = 학습률 = 페이즈 4의 슬라이더 한 칸 크기와 같은 발상</li>
        </ul>
      </div>

      <h2>A. 먼저 바라보기 — 학습 대상과 자동 갱신 채널</h2>
      <p className="text-muted text-sm">
        입력 <code>x</code> 한 개를 받아 <code>z = w·x + b</code>를 계산한 뒤 활성화 함수 <code>ReLU</code>를
        통과시켜 예측 <code>ŷ</code>를 내놓습니다. 학습이란 <code>w</code>·<code>b</code>를 조정해
        <code> ŷ</code>가 정답 <code>y</code>에 가까워지도록 만드는 일이에요.
        아래 다이어그램은 정방향 흐름과, 한 step 실행 시 <strong><code>w</code>와 <code>b</code> 각각으로
        흘러가는 두 갈래 역방향 화살표</strong>를 함께 보여줍니다.
        (이 화살표는 <em>이 한 점</em>이 만드는 변화량이고, 실제 갱신엔 다섯 점의 평균이 쓰입니다.)
      </p>
      <NeuronView w={w} b={b} pulseKey={pulseKey} />

      <p className="text-sm text-muted mt-4">
        ↓ 아래의 <strong>한 단계 진행</strong>을 누르면 <code>w</code>·<code>b</code>가 다음 식대로 갱신됩니다 —
        다이어그램 위 숫자가 어떻게 변하는지 식과 함께 지켜보세요.
      </p>
      <OverviewCard w={w} b={b} dw={dw} db={db} lr={lr} />

      <h2>B. 숫자로 따라가기 — 식이 어떻게 만들어지는가</h2>
      <p className="text-sm text-muted">
        위 식의 <code>dw</code>·<code>db</code>가 어디서 나오는지를 ①②③ 한 단계씩 직접 계산해 봅니다.
        절차는 <strong>① 오차 계산 → ② 변화량(=나침반) 계산 → ③ 매개변수 수정</strong>이에요.
      </p>

      <h2>① 오차 계산</h2>
      <p className="text-sm text-muted">
        다섯 점 각각에 대해 현재 모델의 예측 <code>ŷ</code>와 정답 <code>y</code>의 차이를 구합니다.
        이 표의 <strong>오차</strong> 열이 다음 단계 ②에서 변화량의 재료가 됩니다.
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-xs font-mono mt-2">
          <thead className="text-muted">
            <tr>
              <th className="text-left py-1">x</th>
              <th>실제 y</th>
              <th>z = w·x+b</th>
              <th>예측 ŷ = ReLU(z)</th>
              <th>오차 (ŷ−y)</th>
            </tr>
          </thead>
          <tbody>
            {perPoint.map((p) => (
              <tr key={p.x} className="border-t border-border">
                <td className="py-1">{p.x}</td>
                <td className="text-center">{p.y}</td>
                <td className="text-center text-muted">{p.z.toFixed(2)}</td>
                <td className="text-center">{p.pred.toFixed(2)}</td>
                <td className={`text-center ${Math.abs(p.e) > 0.5 ? 'text-amber-600 dark:text-amber-400' : 'text-muted'}`}>
                  {p.e.toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2>② 변화량(나침반) 계산</h2>
      <p className="text-sm text-muted">
        <code>w</code>의 변화량 <code>dw</code>는 <strong>점마다 (오차 × x)를 더해 평균</strong>한 값,
        <code>b</code>의 변화량 <code>db</code>는 <strong>점마다 오차를 더해 평균</strong>한 값이에요.
        <strong>왜 하필 e × x인지</strong>는 다음 페이지(<a href="#/p5b" className="underline text-accent">페이즈 5+</a>)에서
        미분 없이 직관으로 풀어 봅니다 — 여기선 일단 식을 그대로 받아들이고 자동 학습이 어떻게 흘러가는지 봅니다.
      </p>
      <div className="card p-4 mt-3 font-mono text-sm space-y-2">
        <div className="text-xs text-muted">w의 변화량 dw — 점마다 (오차 × x)를 더한 뒤 점 개수로 나눈 값:</div>
        <div className="flex flex-wrap items-center gap-1">
          <span className="text-muted">[</span>
          {perPoint.map((p, i) => (
            <span key={p.x} className="inline-flex items-center gap-1">
              <span className="text-muted">({p.e.toFixed(2)} × {p.x})</span>
              {i < perPoint.length - 1 && <span className="text-muted">+</span>}
            </span>
          ))}
          <span className="text-muted">]</span>
          <span className="text-muted">÷ {DATA.length}</span>
        </div>
        <div>
          dw = <span className="text-accent">{dw.toFixed(3)}</span>
          {' '}
          {Math.abs(dw) < 0.01 ? '(0에 근접 — 도착)' : dw > 0 ? '(+ → w 감소 방향)' : '(− → w 증가 방향)'}
        </div>
        <div className="border-t border-border pt-2 mt-2 text-xs text-muted">b의 변화량 db — 점마다 오차를 더한 뒤 점 개수로 나눈 값:</div>
        <div className="flex flex-wrap items-center gap-1">
          <span className="text-muted">[</span>
          {perPoint.map((p, i) => (
            <span key={p.x} className="inline-flex items-center gap-1">
              <span className="text-muted">({p.e.toFixed(2)})</span>
              {i < perPoint.length - 1 && <span className="text-muted">+</span>}
            </span>
          ))}
          <span className="text-muted">]</span>
          <span className="text-muted">÷ {DATA.length}</span>
        </div>
        <div>
          db = <span className="text-accent">{db.toFixed(3)}</span>
          {' '}
          {Math.abs(db) < 0.01 ? '(0에 근접)' : db > 0 ? '(+ → b 감소 방향)' : '(− → b 증가 방향)'}
        </div>
      </div>

      <h2>C. 왜 이 식인지 — 짧은 직관 (깊이는 5+에서)</h2>
      <p className="text-sm text-muted">
        식만 보면 마법 같지만, "<strong>x가 큰 점일수록 w를 잘못 잡았을 때 더 크게 어긋난다 → 책임도 더 크게 묻는다</strong>"는
        한 줄로 충분합니다. 그래서 한 점의 w 책임이 <code>e × x</code>, b 책임이 <code>e</code>인 거예요.
        다섯 점의 책임을 평균낸 값이 곧 <code>dw</code>·<code>db</code>입니다.
        자세한 직관과 인터랙션은 <a href="#/p5b" className="underline text-accent font-medium">페이즈 5+ — 책임 분담</a>에서 확인하세요.
      </p>

      <h2>D. 다시 그림으로 종합 — 손실 풍경 단면</h2>
      <p className="text-muted text-sm">
        손실은 <code>w</code>·<code>b</code> 두 축 위에 펼쳐진 그릇 모양 곡면이에요. 두 축을 동시에 보긴 어려우니
        한 축만 잘라본 단면을 봅니다 — <strong>지금 위치에서 어느 쪽이 내리막</strong>인지가 보여요.
      </p>
      <SlicePlot w={w} b={b} dw={dw} db={db} lr={lr} prev={prev} />

      <h2>③ 수정</h2>
      <p className="text-sm text-muted">
        매개변수를 변화량의 <strong>반대 방향</strong>으로 학습률 <code>η</code>(보폭)만큼 옮깁니다.
        오차가 양수이면 <code>dw</code>도 양수가 되어 <code>w</code>를 감소시키는 방향으로,
        음수이면 증가시키는 방향으로 자동 갱신돼요.
      </p>
      <details className="mt-3 card p-4 text-sm">
        <summary className="cursor-pointer font-medium">왜 빼기인가, 학습률 η는 무엇인가</summary>
        <div className="mt-3 space-y-3 leading-relaxed">
          <div>
            <div className="font-medium">왜 빼기인가</div>
            <p className="text-muted mt-1">
              <code>dw</code>·<code>db</code>는 손실이 가장 빠르게 <strong>증가</strong>하는 방향을 가리키는 나침반입니다.
              우리는 손실의 <strong>감소</strong>를 원하니 그 반대 방향으로 가야 해요. 부호를 뒤집기 위해 빼기를 씁니다.
            </p>
          </div>
          <div>
            <div className="font-medium">학습률 η — "보폭"</div>
            <p className="text-muted mt-1">
              나침반은 어느 쪽이 내리막인지 <em>방향</em>만 알려줄 뿐, 한 발짝의 크기는 정해주지 않아요.
              <code>η</code>가 너무 크면 (페이즈 4의 "큰칸") 골짜기 반대편으로 튕겨 나가고,
              너무 작으면 (페이즈 4의 "미세칸") 수렴이 느려요. 적절한 <code>η</code>에서 손실이 매끄럽게 0으로 내려갑니다.
            </p>
          </div>
        </div>
      </details>

      <h2>학습 진행</h2>
      <p className="text-muted text-sm">
        ①②③ 한 묶음을 도는 한 step을 머신러닝에서는 <strong>1 에포크(epoch)</strong>라고 부릅니다.
        매 step마다 가로축 step · 세로축 손실 위에 점이 하나씩 누적되며, 곡선이 0에 가까워지면 학습이 거의 끝난 상태예요.
      </p>
      <div className="mt-3">
        <LossCurve history={history} />
      </div>

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
          <button onClick={step20} className="btn-ghost">20단계 반복 (20 에포크)</button>
          <button onClick={reset} className="btn-ghost">초기화</button>
        </div>
      </div>

      {loss < 0.05 && (
        <div className="aside-tip mt-4">
          <strong>학습 종료.</strong> 모든 매개변수의 변화량이 0에 가까워졌습니다.
          손실을 더 줄일 방향이 남아 있지 않다는 뜻이에요. (정답: w = 2, b = 1)
          <div className="mt-2 text-sm">
            "<strong>왜</strong> 갱신량이 하필 e × x 모양인지" 직관이 궁금하다면
            {' '}<a href="#/p5b" className="underline text-accent font-medium">페이즈 5+ — 책임 분담</a>으로.
          </div>
        </div>
      )}
    </article>
  );
}

function OverviewCard({ w, b, dw, db, lr }:
  { w: number; b: number; dw: number; db: number; lr: number }) {
  const newW = w - lr * dw;
  const newB = b - lr * db;
  return (
    <div className="card p-4 mt-3 font-mono text-sm space-y-3">
      <div className="text-xs text-muted not-italic" style={{ fontFamily: 'system-ui' }}>
        한 step 전체 식 — <strong>새 매개변수 = 지금 매개변수 − 학습률 × 변화량</strong>
      </div>

      {/* 한국어로 풀어 쓴 식 — 기호 없이 의미만 빠르게 */}
      <div className="rounded border border-accent/30 bg-accent/5 p-3 space-y-1" style={{ fontFamily: 'system-ui' }}>
        <div className="text-xs text-muted">한국어로 풀어 쓰면:</div>
        <div className="text-sm">새 <strong>w</strong> = w − 학습률 × <span className="text-accent">평균(오차 × 입력값)</span></div>
        <div className="text-sm">새 <strong>b</strong> = b − 학습률 × <span className="text-accent">평균(오차)</span></div>
      </div>

      {/* 기호 + 지금 값 대입 */}
      <div className="border-t border-border pt-2 space-y-1">
        <div className="text-xs text-muted not-italic" style={{ fontFamily: 'system-ui' }}>지금 값을 대입하면:</div>
        <div>새 w = w − (η × dw) = {w.toFixed(3)} − ({lr.toFixed(3)} × {dw.toFixed(3)}) = <span className="text-accent font-semibold">{newW.toFixed(3)}</span></div>
        <div>새 b = b − (η × db) = {b.toFixed(3)} − ({lr.toFixed(3)} × {db.toFixed(3)}) = <span className="text-accent font-semibold">{newB.toFixed(3)}</span></div>
      </div>

      <div className="border-t border-border pt-2 text-xs space-y-0.5" style={{ fontFamily: 'system-ui' }}>
        <div className="text-muted">기호 ↔ 한국어 대응:</div>
        <div>· η = <span className="text-accent">{lr.toFixed(3)}</span> = 학습률(보폭)</div>
        <div>· dw = <span className="text-accent">{dw.toFixed(3)}</span> = 평균(오차 × 입력값) = w의 변화량</div>
        <div>· db = <span className="text-accent">{db.toFixed(3)}</span> = 평균(오차) = b의 변화량</div>
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

  // 역전파 화살표 두께·진하기 (|e| 비례)
  const eAbs = Math.abs(e);
  const eRatio = Math.min(eAbs / 4, 1);
  const backStrokeW = 1.2 + eRatio * 4;
  const backOpacity = 0.25 + eRatio * 0.65;
  const backColor = 'rgb(190, 18, 60)';

  // 한 점이 dw, db에 기여하는 양
  const dwOnePoint = e * (z >= 0 ? 1 : 0) * x;
  const dbOnePoint = e * (z >= 0 ? 1 : 0);

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
          <marker id="nv-back" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 z" fill={backColor} fillOpacity={backOpacity} />
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
            stroke={backColor} strokeOpacity={0.7} strokeWidth={1.8} strokeDasharray="5 4" />
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

          {/* (a) ŷ → 가중치 라벨 (w로 가는 화살표) */}
          <path d={wPath} fill="none"
            stroke={backColor} strokeOpacity={backOpacity}
            strokeWidth={backStrokeW} strokeDasharray="7 5" strokeLinecap="round"
            markerEnd="url(#nv-back)" />
          <ValueBadge2 cx={(startX + wTargetX) / 2} cy={395}
            label={`w 변화량 = e × x = ${dwOnePoint.toFixed(2)}`} color={backColor} />

          {/* (b) ŷ → b 라벨 (b로 가는 화살표) */}
          <path d={bPath} fill="none"
            stroke={backColor} strokeOpacity={backOpacity}
            strokeWidth={backStrokeW} strokeDasharray="7 5" strokeLinecap="round"
            markerEnd="url(#nv-back)" />
          <ValueBadge2 cx={predCx - 70} cy={28}
            label={`b 변화량 = e = ${dbOnePoint.toFixed(2)}`} color={backColor} />

          {/* 학습 단계 실행 시 펄스 — pulseKey가 바뀌면 두 path 리마운트로 CSS 애니메이션 재생 */}
          {pulseKey > 0 && (
            <>
              <path key={`pw-${pulseKey}`} d={wPath} fill="none" stroke={backColor}
                strokeWidth={Math.max(backStrokeW + 1.5, 3)} strokeDasharray="10 6" strokeLinecap="round"
                markerEnd="url(#nv-back)"
                style={{ animation: 'nv-backflow 1.1s ease-out forwards' }} />
              <path key={`pb-${pulseKey}`} d={bPath} fill="none" stroke={backColor}
                strokeWidth={Math.max(backStrokeW + 1.5, 3)} strokeDasharray="10 6" strokeLinecap="round"
                markerEnd="url(#nv-back)"
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
