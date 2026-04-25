import { useEffect, useRef, useState } from 'react';
import { useApp } from '../store';

const DATA: [number, number][] = [
  [1, 3], [2, 5], [3, 7], [4, 9], [5, 11],
];
// truth: w=2, b=1

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
  const [history, setHistory] = useState<number[]>([lossFn(0, 0)]);
  const [diverged, setDiverged] = useState(false);
  const timer = useRef<number | null>(null);
  const markCompleted = useApp((s) => s.markCompleted);

  const reset = () => {
    setW(0); setB(0); setHistory([lossFn(0, 0)]); setDiverged(false);
    if (timer.current) cancelAnimationFrame(timer.current);
  };

  const step = () => {
    const { dw, db } = gradient(w, b);
    const nw = w - lr * dw;
    const nb = b - lr * db;
    if (!isFinite(nw) || !isFinite(nb) || Math.abs(nw) > 100) {
      setDiverged(true);
      return;
    }
    setW(nw); setB(nb);
    setHistory((h) => [...h.slice(-99), lossFn(nw, nb)]);
  };

  const run = (n: number) => {
    let i = 0;
    const tick = () => {
      step();
      i++;
      if (i < n) timer.current = requestAnimationFrame(tick);
    };
    tick();
  };

  useEffect(() => () => { if (timer.current) cancelAnimationFrame(timer.current); }, []);

  const loss = lossFn(w, b);
  useEffect(() => {
    if (loss < 0.05) markCompleted('p5');
  }, [loss, markCompleted]);

  // loss curve viz
  const W_ = 480, H_ = 200;
  const maxL = Math.max(...history, 1);
  const path = history.map((l, i) => {
    const x = (i / Math.max(history.length - 1, 1)) * (W_ - 30) + 20;
    const y = H_ - 20 - (l / maxL) * (H_ - 30);
    return `${i === 0 ? 'M' : 'L'}${x},${y}`;
  }).join(' ');

  return (
    <article>
      <div className="text-xs font-mono text-muted">PHASE 5</div>
      <h1>자동 학습</h1>
      <p className="text-muted mt-2">
        손으로 슬라이더를 움직였던 걸, 컴퓨터가 자동으로 합니다. 손실이 줄어드는 방향(<strong>기울기</strong>)을
        계산해서 그쪽으로 조금씩 이동 — 이게 <strong>경사 하강법</strong>이에요.
      </p>

      <div className="grid md:grid-cols-2 gap-6 mt-6">
        <div>
          <svg viewBox={`0 0 ${W_} ${H_}`} className="w-full border border-border rounded-md bg-surface/40">
            <text x={20} y={16} fontSize={11} fill="rgb(var(--color-muted))">손실 (낮을수록 좋음)</text>
            <line x1={20} y1={H_ - 20} x2={W_ - 10} y2={H_ - 20} stroke="rgb(var(--color-border))" />
            <line x1={20} y1={10} x2={20} y2={H_ - 20} stroke="rgb(var(--color-border))" />
            <path d={path} stroke="rgb(var(--color-accent))" strokeWidth={2} fill="none" />
            {history.length > 0 && (
              <circle
                cx={((history.length - 1) / Math.max(history.length - 1, 1)) * (W_ - 30) + 20}
                cy={H_ - 20 - (history[history.length - 1] / maxL) * (H_ - 30)}
                r={5} fill="rgb(var(--color-accent))"
              />
            )}
            <text x={W_ - 10} y={H_ - 5} textAnchor="end" fontSize={11} fill="rgb(var(--color-muted))">
              스텝
            </text>
          </svg>

          <div className="mt-3 grid grid-cols-3 gap-2 font-mono text-sm">
            <div className="card p-2">
              <div className="text-xs text-muted">w</div>
              <div className="text-accent">{w.toFixed(3)}</div>
            </div>
            <div className="card p-2">
              <div className="text-xs text-muted">b</div>
              <div className="text-accent">{b.toFixed(3)}</div>
            </div>
            <div className="card p-2">
              <div className="text-xs text-muted">손실</div>
              <div className={loss < 0.05 ? 'text-accent' : ''}>{loss.toFixed(4)}</div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <label className="block">
            <div className="flex justify-between text-sm mb-1">
              <span>학습률 (lr)</span>
              <span className="font-mono text-accent">{lr.toFixed(3)}</span>
            </div>
            <input type="range" min={0.001} max={0.2} step={0.001} value={lr}
              onChange={(e) => setLr(parseFloat(e.target.value))} className="w-full" />
            <div className="text-xs text-muted mt-1">
              너무 크면 발산, 너무 작으면 느림
            </div>
          </label>

          <div className="flex flex-wrap gap-2">
            <button onClick={() => run(1)} className="btn-ghost">1번 갱신</button>
            <button onClick={() => run(20)} className="btn-ghost">20번 갱신</button>
            <button onClick={() => run(100)} className="btn-primary">100번 갱신</button>
            <button onClick={reset} className="btn-ghost">초기화</button>
          </div>

          {diverged && (
            <div className="aside-warn">
              학습률이 너무 커서 발산했어요. 학습률을 낮추고 초기화해보세요.
            </div>
          )}

          {loss < 0.05 && (
            <div className="aside-tip">
              컴퓨터가 정답에 도달했어요. (진짜 정답: w=2, b=1)
              <br />
              사람이 슬라이더로 한 일을 자동으로 한 거예요.
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
