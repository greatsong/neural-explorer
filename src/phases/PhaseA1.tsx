// PhaseA1 — 인공 뉴런의 예측
// 부품(가중치·편향·활성화) → 곱·합·활성화 → 예측값 ŷ 의 한 줄을 한 viewport 안에서 익힌다.
import { useMemo, useState } from 'react';
import { useApp } from '../store';
import { PHASES } from '../phases';

type ActFn = 'relu' | 'sigmoid' | 'linear';

const ACT_LABEL: Record<ActFn, string> = {
  relu: 'ReLU',
  sigmoid: 'sigmoid',
  linear: 'linear',
};

function activate(fn: ActFn, z: number): number {
  if (fn === 'relu') return Math.max(0, z);
  if (fn === 'sigmoid') return 1 / (1 + Math.exp(-z));
  return z;
}

export function PhaseA1() {
  const meta = PHASES.find((p) => p.id === 'a1')!;
  const markCompleted = useApp((s) => s.markCompleted);

  // 슬라이더 상태
  const [x1, setX1] = useState(2);
  const [x2, setX2] = useState(3);
  const [w1, setW1] = useState(1);
  const [w2, setW2] = useState(1);
  const [b, setB] = useState(0);
  const [act, setAct] = useState<ActFn>('relu');

  const z = w1 * x1 + w2 * x2 + b;
  const yhat = activate(act, z);

  // 미니 퀴즈 — 고정된 값으로 직접 계산해 ŷ 입력
  const QUIZ = useMemo(() => {
    const qx1 = 2, qx2 = 3, qw1 = 1.5, qw2 = -1, qb = 2;
    const qz = qw1 * qx1 + qw2 * qx2 + qb; // = 2
    return { qx1, qx2, qw1, qw2, qb, qz, qy: Math.max(0, qz) }; // ReLU
  }, []);

  const [answer, setAnswer] = useState('');
  const [judged, setJudged] = useState<null | 'ok' | 'no'>(null);

  function check() {
    const v = parseFloat(answer);
    if (Number.isNaN(v)) {
      setJudged('no');
      return;
    }
    const ok = Math.abs(v - QUIZ.qy) < 0.05;
    setJudged(ok ? 'ok' : 'no');
    if (ok) markCompleted('a1');
  }

  return (
    <article>
      <div className="text-xs font-mono text-muted">PHASE {meta.num}</div>
      <h1>{meta.title}</h1>
      <p className="text-muted mt-2 text-sm">
        인공 뉴런 하나의 일은 단순합니다. <strong>입력 × 가중치를 더하고, 편향을 보탠 뒤, 활성화 함수를 한 번 통과</strong>시키면
        예측값 ŷ 이 나옵니다. 이 한 줄짜리 계산이 딥러닝의 가장 작은 부품이에요.
      </p>

      {/* 좌: 다이어그램 / 우: 슬라이더 + 활성화 토글 + 현재 ŷ */}
      <div className="grid md:grid-cols-2 gap-4 mt-4 items-start">
        <div className="card p-3">
          <NeuronDiagram x1={x1} x2={x2} w1={w1} w2={w2} b={b} z={z} yhat={yhat} act={act} />
          <div className="mt-2 font-mono text-xs text-muted text-center leading-relaxed">
            z = {w1.toFixed(1)}·{x1.toFixed(0)} + {w2.toFixed(1)}·{x2.toFixed(0)}
            {b !== 0 && ` + ${b.toFixed(1)}`} = <span className="text-accent">{z.toFixed(2)}</span>
            <span className="mx-1">→</span>
            ŷ = {ACT_LABEL[act]}(z) = <span className="text-accent font-semibold">{yhat.toFixed(2)}</span>
          </div>
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Slider label="x₁" value={x1} setValue={setX1} min={-3} max={3} step={1} />
            <Slider label="x₂" value={x2} setValue={setX2} min={-3} max={3} step={1} />
            <Slider label="w₁" value={w1} setValue={setW1} min={-2} max={2} step={0.1} />
            <Slider label="w₂" value={w2} setValue={setW2} min={-2} max={2} step={0.1} />
            <Slider label="b (편향)" value={b} setValue={setB} min={-3} max={3} step={0.1} wide />
          </div>

          <div>
            <div className="text-xs text-muted mb-1">활성화 함수</div>
            <div className="flex gap-1">
              {(['relu', 'sigmoid', 'linear'] as ActFn[]).map((a) => (
                <button
                  key={a}
                  onClick={() => setAct(a)}
                  className={`flex-1 px-2 py-1.5 text-xs rounded-md border transition ${
                    act === a
                      ? 'border-accent text-accent bg-accent-bg/40 font-medium'
                      : 'border-border text-muted hover:bg-surface'
                  }`}
                >
                  {ACT_LABEL[a]}
                </button>
              ))}
            </div>
            <div className="text-[11px] text-muted mt-1.5 leading-snug">
              {act === 'relu' && 'ReLU: 음수면 0, 양수면 그대로. 가장 흔히 쓰입니다.'}
              {act === 'sigmoid' && 'sigmoid: 0~1 사이 값으로 압축. 분류에서 자주 등장.'}
              {act === 'linear' && 'linear: 변환 없이 z 그대로 출력. 회귀의 출력층.'}
            </div>
          </div>

          <div className="card p-2.5 bg-surface/40">
            <div className="text-[11px] text-muted mb-0.5">현재 예측</div>
            <div className="font-mono text-xl text-accent">ŷ = {yhat.toFixed(2)}</div>
          </div>
        </div>
      </div>

      {/* 미니 퀴즈 */}
      <div className="card p-3 mt-4">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <div className="text-sm font-medium">미니 순전파 퀴즈</div>
          <div className="text-[11px] text-muted">
            x₁={QUIZ.qx1}, x₂={QUIZ.qx2}, w₁={QUIZ.qw1}, w₂={QUIZ.qw2}, b={QUIZ.qb}, 활성화 = ReLU
          </div>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className="font-mono text-sm">ŷ =</span>
          <input
            type="number"
            step="0.1"
            value={answer}
            onChange={(e) => { setAnswer(e.target.value); setJudged(null); }}
            placeholder="값 입력"
            className="w-24 px-2 py-1 rounded-md border border-border bg-bg text-sm font-mono"
          />
          <button onClick={check} className="btn-primary !py-1 !px-3 text-xs">확인</button>
          {judged === 'ok' && (
            <span className="text-xs text-accent font-medium">정답! z = {QUIZ.qz}, ŷ = ReLU(z) = {QUIZ.qy}</span>
          )}
          {judged === 'no' && (
            <span className="text-xs" style={{ color: 'rgb(190,18,60)' }}>다시 — z를 먼저 구한 뒤 ReLU를 통과시켜요.</span>
          )}
        </div>
      </div>

      <p className="text-xs text-muted mt-3">
        다음 A2에서는 이렇게 만든 ŷ 이 정답 y 와 얼마나 어긋났는지를 <strong>숫자(MSE)</strong>로 만들어 봅니다.
      </p>
    </article>
  );
}

/* ───────── 슬라이더 ───────── */
function Slider({
  label, value, setValue, min, max, step, wide,
}: {
  label: string;
  value: number;
  setValue: (v: number) => void;
  min: number;
  max: number;
  step: number;
  wide?: boolean;
}) {
  return (
    <label className={`block ${wide ? 'col-span-2' : ''}`}>
      <div className="flex justify-between text-xs mb-0.5">
        <span className="text-muted">{label}</span>
        <span className="font-mono text-accent">{value.toFixed(step < 1 ? 1 : 0)}</span>
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

/* ───────── 뉴런 다이어그램 ───────── */
function NeuronDiagram({
  x1, x2, w1, w2, b, z, yhat, act,
}: {
  x1: number; x2: number; w1: number; w2: number; b: number; z: number; yhat: number; act: ActFn;
}) {
  return (
    <svg viewBox="0 0 520 200" className="w-full">
      <g fontFamily="JetBrains Mono">
        <Node cx={50} cy={60} label={`x₁=${x1}`} />
        <Node cx={50} cy={140} label={`x₂=${x2}`} />
        <Edge x1={70} y1={60} x2={240} y2={100} label={`w₁=${w1.toFixed(1)}`} weight={w1} />
        <Edge x1={70} y1={140} x2={240} y2={100} label={`w₂=${w2.toFixed(1)}`} weight={w2} />
        {/* Σ 노드 */}
        <circle cx={260} cy={100} r={26} fill="rgb(var(--color-accent-bg))" stroke="rgb(var(--color-accent))" />
        <text x={260} y={104} textAnchor="middle" fill="rgb(var(--color-accent))" fontSize={14} fontWeight={600}>Σ</text>
        {/* 편향 표시 */}
        {Math.abs(b) > 0.001 && (
          <>
            <text x={260} y={62} textAnchor="middle" fill="rgb(var(--color-muted))" fontSize={11}>b={b.toFixed(1)}</text>
            <line x1={260} y1={68} x2={260} y2={74} stroke="rgb(var(--color-muted))" strokeWidth={1.5} />
          </>
        )}
        {/* 활성화 박스 */}
        <rect x={326} y={78} width={84} height={44} rx={6}
              fill="rgb(var(--color-accent-bg))" stroke="rgb(var(--color-accent))" />
        <text x={368} y={104} textAnchor="middle" fill="rgb(var(--color-accent))" fontSize={12} fontWeight={600}>
          {ACT_LABEL[act]}
        </text>
        {/* 연결선 */}
        <line x1={286} y1={100} x2={326} y2={100} stroke="rgb(var(--color-muted))" strokeWidth={2} strokeOpacity={0.7} strokeLinecap="round" />
        <line x1={410} y1={100} x2={446} y2={100} stroke="rgb(var(--color-muted))" strokeWidth={2} strokeOpacity={0.7} strokeLinecap="round" />
        {/* z 배지 */}
        <ValueBadge cx={306} cy={86} label={`z=${z.toFixed(1)}`} />
        {/* 출력 */}
        <Node cx={466} cy={100} label={`ŷ=${yhat.toFixed(1)}`} accent />
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
        stroke={accent ? 'rgb(var(--color-accent))' : 'rgb(var(--color-muted))'}
        strokeOpacity={accent ? 1 : 0.6}
      />
      <text x={cx} y={cy + 4} textAnchor="middle"
            fill={accent ? '#fff' : 'rgb(var(--color-text))'} fontSize={11}>
        {label}
      </text>
    </g>
  );
}

function ValueBadge({ cx, cy, label }: { cx: number; cy: number; label: string }) {
  const w = label.length * 6.4 + 10;
  const h = 16;
  return (
    <g>
      <rect
        x={cx - w / 2}
        y={cy - h / 2}
        width={w}
        height={h}
        rx={4}
        fill="rgb(var(--color-bg))"
        stroke="rgb(var(--color-accent))"
        strokeOpacity={0.55}
        strokeWidth={0.8}
      />
      <text x={cx} y={cy + 4} textAnchor="middle" fill="rgb(var(--color-accent))" fontSize={11} fontWeight={600}>
        {label}
      </text>
    </g>
  );
}

function Edge({
  x1, y1, x2, y2, label, weight,
}: { x1: number; y1: number; x2: number; y2: number; label: string; weight: number }) {
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const aw = Math.min(Math.abs(weight), 2);
  const sw = 0.8 + aw * 2.4;
  const isPos = weight >= 0;
  const stroke = Math.abs(weight) < 0.05
    ? 'rgb(var(--color-muted))'
    : isPos
      ? 'rgb(var(--color-accent))'
      : 'rgb(190, 18, 60)';
  const opacity = Math.abs(weight) < 0.05 ? 0.5 : 0.85;
  const labelW = label.length * 6.2 + 10;
  const labelH = 14;
  return (
    <g>
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={stroke} strokeWidth={sw} strokeOpacity={opacity} strokeLinecap="round" />
      <rect
        x={mx - labelW / 2}
        y={my - labelH / 2}
        width={labelW}
        height={labelH}
        rx={3}
        fill="rgb(var(--color-bg))"
        stroke={stroke}
        strokeOpacity={0.55}
        strokeWidth={0.8}
      />
      <text x={mx} y={my + 3.5} textAnchor="middle" fill={stroke} fontSize={10} fontWeight={600}>
        {label}
      </text>
    </g>
  );
}
