import { useState } from 'react';

type SubStep = 1 | 2 | 3;

const relu = (x: number) => Math.max(0, x);

export function Phase1() {
  const [sub, setSub] = useState<SubStep>(1);
  const [w1, setW1] = useState(1);
  const [w2, setW2] = useState(1);
  const [b, setB] = useState(0);
  const x1 = 3;
  const x2 = 2;

  const sum = w1 * x1 + w2 * x2 + (sub >= 2 ? b : 0);
  const out = sub >= 3 ? relu(sum) : sum;

  return (
    <article>
      <div className="text-xs font-mono text-muted">PHASE 1</div>
      <h1>인공 뉴런 해부</h1>
      <p className="text-muted mt-2">
        뉴런 하나가 어떻게 작동하는지 한 단계씩 분해해봅시다. 슬라이더를 움직이면 결과가 바로 바뀝니다.
      </p>

      <div className="flex gap-2 mt-6 mb-4 border-b border-border">
        {[
          { n: 1 as SubStep, label: '1-1. 가중치' },
          { n: 2 as SubStep, label: '1-2. 편향' },
          { n: 3 as SubStep, label: '1-3. 활성화 함수' },
        ].map((t) => (
          <button
            key={t.n}
            onClick={() => setSub(t.n)}
            className={`px-3 py-2 text-sm border-b-2 -mb-px transition ${
              sub === t.n
                ? 'border-accent text-accent font-medium'
                : 'border-transparent text-muted hover:text-text'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {sub === 1 && (
        <div className="aside-tip">
          <strong>가중치(weight)</strong>는 입력이 출력에 얼마나 영향을 주는지 결정하는 숫자예요.
          큰 가중치 = 큰 영향, 음수 가중치 = 반대 방향.
        </div>
      )}
      {sub === 2 && (
        <div className="aside-tip">
          <strong>편향(bias)</strong>은 입력과 무관하게 출력에 더해지는 값. "기본 점수" 같은 역할이에요.
        </div>
      )}
      {sub === 3 && (
        <div className="aside-tip">
          <strong>활성화 함수</strong>는 합산 결과를 뉴런이 실제로 내보낼 신호로 변환해요.
          ReLU는 "음수면 0, 양수면 그대로" — 가장 단순하면서 강력합니다.
        </div>
      )}

      <NeuronDiagram x1={x1} x2={x2} w1={w1} w2={w2} b={sub >= 2 ? b : 0} sum={sum} out={out} showRelu={sub >= 3} />

      <div className="grid sm:grid-cols-3 gap-4 mt-6">
        <Slider label="w₁ (가중치 1)" value={w1} setValue={setW1} min={-3} max={3} step={0.1} />
        <Slider label="w₂ (가중치 2)" value={w2} setValue={setW2} min={-3} max={3} step={0.1} />
        {sub >= 2 && (
          <Slider label="b (편향)" value={b} setValue={setB} min={-5} max={5} step={0.1} />
        )}
      </div>

      <div className="mt-6 card p-4 font-mono text-sm">
        <div className="text-muted text-xs mb-2">계산 과정</div>
        <div>
          y = w₁·x₁ + w₂·x₂ {sub >= 2 && '+ b'}{' '}
          {sub >= 3 && '→ ReLU'}
        </div>
        <div className="mt-1">
          y = {w1.toFixed(1)}·{x1} + {w2.toFixed(1)}·{x2}
          {sub >= 2 && ` + ${b.toFixed(1)}`} = <span className="text-accent">{sum.toFixed(2)}</span>
          {sub >= 3 && (
            <>
              {' '}→ ReLU = <span className="text-accent">{out.toFixed(2)}</span>
            </>
          )}
        </div>
      </div>
    </article>
  );
}

function Slider({
  label, value, setValue, min, max, step,
}: { label: string; value: number; setValue: (v: number) => void; min: number; max: number; step: number }) {
  return (
    <label className="block">
      <div className="flex justify-between text-sm mb-1">
        <span>{label}</span>
        <span className="font-mono text-accent">{value.toFixed(1)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => setValue(parseFloat(e.target.value))}
        className="w-full accent-[rgb(var(--color-accent))]"
      />
    </label>
  );
}

function NeuronDiagram({
  x1, x2, w1, w2, b, sum, out, showRelu,
}: { x1: number; x2: number; w1: number; w2: number; b: number; sum: number; out: number; showRelu: boolean }) {
  return (
    <svg viewBox="0 0 520 220" className="w-full mt-6 max-w-2xl mx-auto">
      <g className="text-xs" fontFamily="JetBrains Mono">
        {/* inputs */}
        <Node cx={50} cy={70} label={`x₁=${x1}`} />
        <Node cx={50} cy={150} label={`x₂=${x2}`} />
        {/* weights */}
        <Edge x1={70} y1={70} x2={240} y2={110} label={`w₁=${w1.toFixed(1)}`} active={Math.abs(w1) > 0.05} />
        <Edge x1={70} y1={150} x2={240} y2={110} label={`w₂=${w2.toFixed(1)}`} active={Math.abs(w2) > 0.05} />
        {/* sum node */}
        <circle cx={260} cy={110} r={28} fill="rgb(var(--color-accent-bg))" stroke="rgb(var(--color-accent))" />
        <text x={260} y={114} textAnchor="middle" fill="rgb(var(--color-accent))" fontSize={14} fontWeight={600}>Σ</text>
        <text x={260} y={158} textAnchor="middle" fill="rgb(var(--color-muted))">{sum.toFixed(1)}</text>
        {/* bias */}
        {Math.abs(b) > 0.001 && (
          <>
            <text x={260} y={70} textAnchor="middle" fill="rgb(var(--color-muted))">b={b.toFixed(1)}</text>
            <line x1={260} y1={75} x2={260} y2={82} stroke="rgb(var(--color-muted))" strokeWidth={1.5} />
          </>
        )}
        {/* relu */}
        {showRelu && (
          <>
            <rect x={330} y={88} width={70} height={44} rx={6} fill="rgb(var(--color-accent-bg))" stroke="rgb(var(--color-accent))" />
            <text x={365} y={114} textAnchor="middle" fill="rgb(var(--color-accent))" fontSize={13} fontWeight={600}>ReLU</text>
            <line x1={288} y1={110} x2={330} y2={110} stroke="rgb(var(--color-border))" strokeWidth={1.5} />
            <line x1={400} y1={110} x2={440} y2={110} stroke="rgb(var(--color-border))" strokeWidth={1.5} />
          </>
        )}
        {!showRelu && (
          <line x1={288} y1={110} x2={440} y2={110} stroke="rgb(var(--color-border))" strokeWidth={1.5} />
        )}
        {/* output */}
        <Node cx={460} cy={110} label={`y=${out.toFixed(1)}`} accent />
      </g>
    </svg>
  );
}

function Node({ cx, cy, label, accent }: { cx: number; cy: number; label: string; accent?: boolean }) {
  return (
    <g>
      <circle
        cx={cx}
        cy={cy}
        r={20}
        fill={accent ? 'rgb(var(--color-accent))' : 'rgb(var(--color-surface))'}
        stroke="rgb(var(--color-border))"
      />
      <text x={cx} y={cy + 4} textAnchor="middle" fill={accent ? '#fff' : 'rgb(var(--color-text))'} fontSize={11}>
        {label}
      </text>
    </g>
  );
}

function Edge({
  x1, y1, x2, y2, label, active,
}: { x1: number; y1: number; x2: number; y2: number; label: string; active: boolean }) {
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2 - 8;
  return (
    <g>
      <line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke={active ? 'rgb(var(--color-accent))' : 'rgb(var(--color-border))'}
        strokeWidth={1.5}
      />
      <text x={mx} y={my} textAnchor="middle" fill="rgb(var(--color-muted))">
        {label}
      </text>
    </g>
  );
}
