import { useEffect, useState } from 'react';
import { useApp } from '../store';

// y = 2x + 0.7 데이터.
// 편향을 일부러 0.5의 배수가 아닌 값(0.7)으로 두어,
// "큰칸 0.5"로는 정답에 정확히 도달할 수 없도록 만든다 (정답을 지나치는 경험).
const DATA: [number, number][] = [
  [1, 2.7], [2, 4.7], [3, 6.7], [4, 8.7], [5, 10.7],
];

export function Phase4() {
  const [w, setW] = useState(0);
  const [b, setB] = useState(0);
  const [stepSize, setStepSize] = useState(0.1); // 슬라이더 한 칸의 크기 — 페이즈 5의 학습률(η)과 같은 발상
  const markCompleted = useApp((s) => s.markCompleted);

  // 손실은 페이즈 3·5와 동일하게 평균제곱오차(MSE)로 통일.
  const mse = DATA.reduce((acc, [x, y]) => {
    const pred = w * x + b;
    return acc + (pred - y) ** 2;
  }, 0) / DATA.length;

  useEffect(() => {
    if (mse < 0.2) markCompleted('p4');
  }, [mse, markCompleted]);

  const W = 360, H = 260;
  const sx = (x: number) => 30 + ((x - 0) / 6) * (W - 40);
  const sy = (y: number) => H - 30 - ((y - 0) / 14) * (H - 50);

  const linePts: [number, number][] = [
    [0, w * 0 + b],
    [6, w * 6 + b],
  ];

  return (
    <article>
      <div className="text-xs font-mono text-muted">PHASE 4</div>
      <h1>학습률의 이해</h1>
      <p className="text-muted mt-2">
        데이터에 가장 잘 맞는 직선을 손으로 찾아봅시다. 가중치 <code>w</code>와 편향 <code>b</code>를 조절해서
        <strong> 평균 손실(MSE)</strong>을 가장 작게 만드는 게 목표예요.
      </p>

      <div className="grid md:grid-cols-2 gap-6 mt-6">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full border border-border rounded-md bg-surface/40">
          {/* axes */}
          <line x1={30} y1={H - 30} x2={W - 10} y2={H - 30} stroke="rgb(var(--color-border))" />
          <line x1={30} y1={10} x2={30} y2={H - 30} stroke="rgb(var(--color-border))" />
          {/* data */}
          {DATA.map(([x, y]) => {
            const pred = w * x + b;
            return (
              <g key={x}>
                <line x1={sx(x)} y1={sy(y)} x2={sx(x)} y2={sy(pred)} stroke="rgb(var(--color-accent))" strokeOpacity={0.3} strokeWidth={1.5} />
                <circle cx={sx(x)} cy={sy(y)} r={5} fill="rgb(var(--color-text))" />
              </g>
            );
          })}
          {/* line */}
          <line
            x1={sx(linePts[0][0])} y1={sy(linePts[0][1])}
            x2={sx(linePts[1][0])} y2={sy(linePts[1][1])}
            stroke="rgb(var(--color-accent))" strokeWidth={2}
          />
          <text x={W / 2} y={H - 8} textAnchor="middle" fontSize={11} fill="rgb(var(--color-muted))">x</text>
          <text x={10} y={20} fontSize={11} fill="rgb(var(--color-muted))">y</text>
        </svg>

        <div className="space-y-4">
          <div className="card p-3">
            <div className="text-xs text-muted mb-2">
              한 칸 크기 — 슬라이더를 한 번 움직였을 때 <code>w</code>·<code>b</code>가 바뀌는 양.
              페이즈 5에서는 이 값을 <strong>학습률 η</strong>라고 부릅니다.
            </div>
            <div className="inline-flex rounded-md border border-border overflow-hidden text-xs">
              {[
                { v: 0.5, label: '큰칸 0.5' },
                { v: 0.1, label: '보통 0.1' },
                { v: 0.01, label: '미세 0.01' },
              ].map((opt) => (
                <button
                  key={opt.v}
                  type="button"
                  onClick={() => setStepSize(opt.v)}
                  className={`px-3 py-1.5 ${stepSize === opt.v ? 'bg-accent text-white' : 'bg-surface/40 text-muted'}`}
                >{opt.label}</button>
              ))}
            </div>
            <div className="text-xs text-muted mt-2 leading-relaxed">
              큰칸은 정답에 빠르게 다가가지만 한 칸이 정답을 <strong>지나쳐</strong> 정착이 어렵고,
              미세칸은 매끄럽지만 답답합니다. 직접 바꿔 가며 차이를 느껴 보세요.
            </div>
          </div>

          <Slider label="w (가중치)" value={w} setValue={setW} min={-3} max={5} step={stepSize} />
          <Slider label="b (편향)" value={b} setValue={setB} min={-5} max={5} step={stepSize} />

          <div className="card p-4">
            <div className="text-xs text-muted mb-2">
              평균 손실 MSE = (오차₁² + ⋯ + 오차₅²) ÷ 5
              <span className="ml-1 text-[11px] opacity-70">— 페이즈 3·5와 동일한 정의</span>
            </div>
            <div className={`font-mono text-2xl ${mse < 0.2 ? 'text-accent' : ''}`}>
              {mse.toFixed(3)}
            </div>
            {mse < 0.2 && (
              <div className="text-sm text-accent mt-2">
                훌륭해요! 이게 바로 "학습"이에요. (정답: w = 2, b = 0.7)
              </div>
            )}
            {mse >= 0.2 && stepSize >= 0.5 && (
              <div className="text-xs text-amber-600 dark:text-amber-400 mt-2 leading-relaxed">
                한 칸이 <strong>0.5</strong>로 너무 커서 정답을 정확히 짚을 수 없어요(정답의 <code>b</code>는 0.7이라
                0.5 단위로는 0.5 또는 1.0만 가능). <strong>보통 0.1</strong> 이하로 바꿔야 도달할 수 있습니다.
                실제 학습에서도 학습률 <code>η</code>가 너무 크면 비슷한 일이 일어나요 — 정답 근처에서 <strong>좌우로 진동하거나 발산</strong>해서 결국 도달하지 못합니다(페이즈 5에서 직접 확인).
              </div>
            )}
          </div>

          <table className="w-full text-xs font-mono">
            <thead className="text-muted">
              <tr><th className="text-left">x</th><th>실제</th><th>예측</th><th>오차²</th></tr>
            </thead>
            <tbody>
              {DATA.map(([x, y]) => {
                const pred = w * x + b;
                return (
                  <tr key={x}>
                    <td>{x}</td>
                    <td className="text-center">{y}</td>
                    <td className="text-center">{pred.toFixed(2)}</td>
                    <td className="text-center text-muted">{((pred - y) ** 2).toFixed(2)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </article>
  );
}

function Slider({
  label, value, setValue, min, max, step,
}: { label: string; value: number; setValue: (v: number) => void; min: number; max: number; step: number }) {
  // step에 따라 표시 자릿수 결정 (0.5→1, 0.1→1, 0.01→2)
  const digits = step >= 0.1 ? 1 : 2;
  return (
    <label className="block">
      <div className="flex justify-between text-sm mb-1">
        <span>{label}</span>
        <span className="font-mono text-accent">{value.toFixed(digits)}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => setValue(parseFloat(e.target.value))} className="w-full" />
    </label>
  );
}
