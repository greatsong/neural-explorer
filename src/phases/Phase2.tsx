import { useMemo, useState } from 'react';
import { useApp } from '../store';

type TabId = 'single' | 'series' | 'mlp';
const TABS: { id: TabId; num: string; label: string; sub: string }[] = [
  { id: 'single', num: '1', label: '단일 뉴런',     sub: '입력 2개 → 1개의 뉴런 → 출력 ŷ' },
  { id: 'series', num: '2', label: '뉴런 → 뉴런',   sub: '뉴런 두 개를 직렬 연결 (앞 출력이 뒤 입력)' },
  { id: 'mlp',    num: '3', label: '3 × 2 × 1',     sub: '입력 3개 → 은닉 뉴런 2개 → 출력 1개 (작은 신경망)' },
];

const relu = (z: number) => Math.max(0, z);

export function Phase2() {
  const [tab, setTab] = useState<TabId>('single');
  const [doneSingle, setDoneSingle] = useState(false);
  const [doneSeries, setDoneSeries] = useState(false);
  const [doneMlp, setDoneMlp] = useState(false);
  const markCompleted = useApp((s) => s.markCompleted);

  const allDone = doneSingle && doneSeries && doneMlp;
  if (allDone) markCompleted('p2');

  return (
    <article>
      <div className="text-xs font-mono text-muted">PHASE 2</div>
      <h1>순전파 퀴즈</h1>
      <p className="text-muted mt-2">
        뉴런 하나에서 시작해 작은 신경망까지, <strong>입력에서 출력까지의 흐름(=순전파)</strong>을 한 단계씩 직접 계산해 봅니다.
        다이어그램을 보면서 빈칸을 채워 가세요.
      </p>

      {/* ── 탭 ───────────────────────────── */}
      <nav className="mt-4 flex flex-wrap gap-1 border-b border-border">
        {TABS.map((t) => {
          const active = t.id === tab;
          const done = t.id === 'single' ? doneSingle : t.id === 'series' ? doneSeries : doneMlp;
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`px-3 py-2 text-sm border-b-2 -mb-px transition ${
                active ? 'border-accent text-accent font-medium'
                       : 'border-transparent text-muted hover:text-text hover:border-border'
              }`}>
              <span className="font-mono text-xs mr-1">{t.num}.</span>{t.label}
              {done && <span className="ml-1 text-accent">✓</span>}
            </button>
          );
        })}
      </nav>
      <div className="mt-3 text-xs text-muted">
        <span className="font-mono mr-1">{TABS.find((t) => t.id === tab)!.num}.</span>
        {TABS.find((t) => t.id === tab)!.sub}
      </div>

      {tab === 'single' && <SingleNeuronTab onSolved={() => setDoneSingle(true)} solved={doneSingle} />}
      {tab === 'series' && <SeriesTab onSolved={() => setDoneSeries(true)} solved={doneSeries} />}
      {tab === 'mlp' && <MlpTab onSolved={() => setDoneMlp(true)} solved={doneMlp} />}

      {allDone && (
        <div className="aside-tip mt-6 text-sm">
          <strong>세 단계 모두 완료!</strong> 입력 → 가중치 곱 → 합 → ReLU → 출력의 흐름이 한 뉴런이든 작은 신경망이든 똑같다는 점이 핵심이에요.
          다음 페이즈에서는 "이 출력이 정답과 얼마나 어긋났는지(=오차)"를 다룹니다.
        </div>
      )}
    </article>
  );
}

/* ─────────────────────────────────────────────────────────
   2-1. 단일 뉴런
   x₁=2, x₂=3, w₁=1, w₂=2, b=−1 → z=7, ŷ=ReLU(7)=7
───────────────────────────────────────────────────────── */
function SingleNeuronTab({ onSolved, solved }: { onSolved: () => void; solved: boolean }) {
  const x1 = 2, x2 = 3, w1 = 1, w2 = 2, b = -1;
  const z = w1 * x1 + w2 * x2 + b;
  const yhat = relu(z);

  const slots = useMemo(() => [
    { key: 'z', label: 'z = w₁·x₁ + w₂·x₂ + b', expr: `(${w1})·${x1} + (${w2})·${x2} + (${b})`, ans: z },
    { key: 'yhat', label: 'ŷ = ReLU(z)', expr: `ReLU(${z})`, ans: yhat },
  ], [z, yhat]);

  return (
    <Quiz
      diagram={<SingleDiagram x1={x1} x2={x2} w1={w1} w2={w2} b={b} z={z} yhat={yhat} />}
      params={[
        ['입력', `x₁ = ${x1},  x₂ = ${x2}`],
        ['가중치', `w₁ = ${w1},  w₂ = ${w2}`],
        ['편향', `b = ${b}`],
      ]}
      slots={slots}
      onSolved={onSolved}
      solved={solved}
    />
  );
}

/* ─────────────────────────────────────────────────────────
   2-2. 뉴런 → 뉴런 (직렬)
   x=3 → 뉴런1 (w₁=2, b₁=−1) → h=ReLU(5)=5 → 뉴런2 (w₂=1, b₂=−3) → ŷ=ReLU(2)=2
───────────────────────────────────────────────────────── */
function SeriesTab({ onSolved, solved }: { onSolved: () => void; solved: boolean }) {
  const x = 3, w1 = 2, b1 = -1, w2 = 1, b2 = -3;
  const z1 = w1 * x + b1;
  const h = relu(z1);
  const z2 = w2 * h + b2;
  const yhat = relu(z2);

  const slots = useMemo(() => [
    { key: 'z1', label: '뉴런 1 — z₁ = w₁·x + b₁', expr: `(${w1})·${x} + (${b1})`, ans: z1 },
    { key: 'h',  label: '뉴런 1 출력 h = ReLU(z₁)', expr: `ReLU(${z1})`, ans: h },
    { key: 'z2', label: '뉴런 2 — z₂ = w₂·h + b₂', expr: `(${w2})·${h} + (${b2})`, ans: z2 },
    { key: 'yhat', label: 'ŷ = ReLU(z₂)', expr: `ReLU(${z2})`, ans: yhat },
  ], [x, w1, b1, w2, b2, z1, h, z2, yhat]);

  return (
    <Quiz
      diagram={<SeriesDiagram x={x} w1={w1} b1={b1} h={h} w2={w2} b2={b2} yhat={yhat} z1={z1} z2={z2} />}
      params={[
        ['입력', `x = ${x}`],
        ['뉴런 1', `w₁ = ${w1},  b₁ = ${b1}`],
        ['뉴런 2', `w₂ = ${w2},  b₂ = ${b2}`],
      ]}
      hint="앞 뉴런의 출력 h가 곧 뒤 뉴런의 입력이에요. 두 번 같은 절차를 반복합니다."
      slots={slots}
      onSolved={onSolved}
      solved={solved}
    />
  );
}

/* ─────────────────────────────────────────────────────────
   2-3. 3 × 2 × 1 MLP
   입력 (1, 2, 1), 은닉 2뉴런 (h₁=3, h₂=2), 출력 1뉴런 (ŷ=3)
───────────────────────────────────────────────────────── */
function MlpTab({ onSolved, solved }: { onSolved: () => void; solved: boolean }) {
  const x = [1, 2, 1] as const;
  // 은닉층 W1 (2×3), b1 (2)
  const W1: [number, number, number][] = [[1, 1, 0], [0, 1, 1]];
  const b1 = [0, -1] as const;
  // 출력층 W2 (1×2), b2 (1)
  const W2: [number, number] = [1, 1];
  const b2 = -2;

  const z1_h1 = W1[0][0] * x[0] + W1[0][1] * x[1] + W1[0][2] * x[2] + b1[0]; // 1+2+0+0=3
  const z1_h2 = W1[1][0] * x[0] + W1[1][1] * x[1] + W1[1][2] * x[2] + b1[1]; // 0+2+1-1=2
  const h1 = relu(z1_h1);
  const h2 = relu(z1_h2);
  const z2 = W2[0] * h1 + W2[1] * h2 + b2;     // 3+2-2=3
  const yhat = relu(z2);

  const slots = useMemo(() => [
    { key: 'h1', label: '은닉 뉴런 1 출력 h₁ = ReLU(w·x + b)',
      expr: `ReLU(${W1[0][0]}·${x[0]} + ${W1[0][1]}·${x[1]} + ${W1[0][2]}·${x[2]} + ${b1[0]})`, ans: h1 },
    { key: 'h2', label: '은닉 뉴런 2 출력 h₂ = ReLU(w·x + b)',
      expr: `ReLU(${W1[1][0]}·${x[0]} + ${W1[1][1]}·${x[1]} + ${W1[1][2]}·${x[2]} + (${b1[1]}))`, ans: h2 },
    { key: 'yhat', label: '출력 뉴런 ŷ = ReLU(w·h + b)',
      expr: `ReLU(${W2[0]}·${h1} + ${W2[1]}·${h2} + (${b2}))`, ans: yhat },
  ], [h1, h2, yhat]);

  return (
    <Quiz
      diagram={<MlpDiagram x={x} W1={W1} b1={b1} h1={h1} h2={h2} W2={W2} b2={b2} yhat={yhat} />}
      params={[
        ['입력', `x₁ = ${x[0]},  x₂ = ${x[1]},  x₃ = ${x[2]}`],
        ['은닉층 가중치', `h₁ ← (${W1[0].join(', ')}) + b=${b1[0]} ;  h₂ ← (${W1[1].join(', ')}) + b=${b1[1]}`],
        ['출력층', `(${W2.join(', ')}) + b=${b2}`],
      ]}
      hint="은닉층의 두 뉴런을 먼저 따로 계산해 h₁, h₂를 구한 다음, 그 둘을 출력 뉴런의 입력으로 쓰면 끝이에요."
      slots={slots}
      onSolved={onSolved}
      solved={solved}
    />
  );
}

/* ─────────────────────────────────────────────────────────
   공통 퀴즈 컴포넌트 — 슬롯형 단계별 입력
───────────────────────────────────────────────────────── */
type Slot = { key: string; label: string; expr: string; ans: number };

function Quiz({
  diagram, params, slots, onSolved, solved, hint,
}: {
  diagram: React.ReactNode;
  params: [string, string][];
  slots: Slot[];
  onSolved: () => void;
  solved: boolean;
  hint?: string;
}) {
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [tries, setTries] = useState<Record<string, number>>({});
  const [showSteps, setShowSteps] = useState(false);

  const allCorrect = slots.every((s) => {
    const v = parseFloat(inputs[s.key] ?? '');
    return !isNaN(v) && Math.abs(v - s.ans) < 0.001;
  });
  if (allCorrect && !solved) onSolved();

  const submit = (key: string) => {
    const slot = slots.find((s) => s.key === key)!;
    const v = parseFloat(inputs[key] ?? '');
    if (isNaN(v)) return;
    if (Math.abs(v - slot.ans) >= 0.001) {
      setTries((t) => ({ ...t, [key]: (t[key] ?? 0) + 1 }));
    }
  };

  return (
    <div className="mt-6 grid xl:grid-cols-[1.4fr_1fr] gap-5 items-start">
      <div>
        {diagram}
        <div className="card p-3 mt-3 font-mono text-sm space-y-1">
          {params.map(([k, v]) => (
            <div key={k}><span className="text-muted">{k}:</span> {v}</div>
          ))}
        </div>
        {hint && <div className="aside-note mt-3 text-xs">{hint}</div>}
      </div>

      <div className="space-y-3">
        {slots.map((s) => {
          const val = inputs[s.key] ?? '';
          const t = tries[s.key] ?? 0;
          const correct = !isNaN(parseFloat(val)) && Math.abs(parseFloat(val) - s.ans) < 0.001;
          return (
            <div key={s.key} className={`card p-3 ${correct ? 'border-accent bg-accent/5' : ''}`}>
              <div className="text-xs text-muted">{s.label}</div>
              <div className="font-mono text-sm mt-1 text-muted">= {s.expr} = ?</div>
              <div className="flex gap-2 mt-2">
                <input
                  type="number"
                  value={val}
                  onChange={(e) => setInputs((i) => ({ ...i, [s.key]: e.target.value }))}
                  onKeyDown={(e) => e.key === 'Enter' && submit(s.key)}
                  disabled={correct}
                  placeholder="값 입력"
                  className="flex-1 px-3 py-1.5 rounded-md border border-border bg-bg font-mono text-sm"
                />
                <button onClick={() => submit(s.key)} disabled={correct}
                  className="btn-primary text-sm py-1.5 px-3 disabled:opacity-50">확인</button>
              </div>
              {correct && (
                <div className="text-xs text-accent mt-2 font-mono">정답! = {s.ans}</div>
              )}
              {!correct && t >= 1 && (
                <div className="text-xs text-amber-600 dark:text-amber-400 mt-2">
                  다시 한 번 천천히 계산해 보세요.
                </div>
              )}
            </div>
          );
        })}

        {!allCorrect && Object.values(tries).some((v) => v >= 2) && !showSteps && (
          <button onClick={() => setShowSteps(true)} className="btn-ghost text-sm w-full">
            단계별 풀이 보기
          </button>
        )}
        {showSteps && (
          <div className="aside-note text-xs font-mono space-y-1">
            {slots.map((s) => (
              <div key={s.key}>{s.label} → {s.expr} = <span className="text-accent">{s.ans}</span></div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   다이어그램 컴포넌트 (페이즈 1과 같은 디자인 언어)
───────────────────────────────────────────────────────── */
function SingleDiagram({
  x1, x2, w1, w2, b, z, yhat,
}: { x1: number; x2: number; w1: number; w2: number; b: number; z: number; yhat: number }) {
  return (
    <svg viewBox="0 0 540 220" className="w-full max-w-2xl mx-auto">
      <g fontFamily="JetBrains Mono">
        <Node cx={50} cy={70} label={`x₁=${x1}`} />
        <Node cx={50} cy={150} label={`x₂=${x2}`} />
        <Edge x1={70} y1={70} x2={250} y2={110} label={`w₁=${w1}`} weight={w1} />
        <Edge x1={70} y1={150} x2={250} y2={110} label={`w₂=${w2}`} weight={w2} />
        <SumNode cx={270} cy={110} />
        <BiasLabel cx={270} cy={64} b={b} />
        <Arrow x1={298} y1={110} x2={342} y2={110} />
        <ReluBox cx={377} cy={110} />
        <ValueBadge cx={320} cy={92} label={`z=${z}`} accent />
        <Arrow x1={412} y1={110} x2={456} y2={110} />
        <Node cx={476} cy={110} label={`ŷ=${yhat}`} accent />
      </g>
    </svg>
  );
}

function SeriesDiagram({
  x, w1, b1, h, w2, b2, yhat, z1, z2,
}: { x: number; w1: number; b1: number; h: number; w2: number; b2: number; yhat: number; z1: number; z2: number }) {
  return (
    <svg viewBox="0 0 720 200" className="w-full max-w-3xl mx-auto">
      <g fontFamily="JetBrains Mono">
        {/* x → 뉴런1 */}
        <Node cx={50} cy={100} label={`x=${x}`} />
        <Edge x1={70} y1={100} x2={195} y2={100} label={`w₁=${w1}`} weight={w1} />
        <SumNode cx={215} cy={100} />
        <BiasLabel cx={215} cy={54} b={b1} suffix="₁" />
        <Arrow x1={243} y1={100} x2={272} y2={100} />
        <ReluBox cx={307} cy={100} />
        <ValueBadge cx={258} cy={84} label={`z₁=${z1}`} accent />
        <Arrow x1={342} y1={100} x2={388} y2={100} />
        <Node cx={408} cy={100} label={`h=${h}`} accent />
        {/* 뉴런2 */}
        <Edge x1={428} y1={100} x2={533} y2={100} label={`w₂=${w2}`} weight={w2} />
        <SumNode cx={553} cy={100} />
        <BiasLabel cx={553} cy={54} b={b2} suffix="₂" />
        <Arrow x1={581} y1={100} x2={610} y2={100} />
        <ReluBox cx={645} cy={100} />
        <ValueBadge cx={596} cy={84} label={`z₂=${z2}`} accent />
        <Arrow x1={680} y1={100} x2={696} y2={100} />
        <Node cx={706} cy={100} label={`ŷ=${yhat}`} accent />
      </g>
    </svg>
  );
}

function MlpDiagram({
  x, W1, b1, h1, h2, W2, b2, yhat,
}: {
  x: readonly [number, number, number];
  W1: [number, number, number][];
  b1: readonly [number, number];
  h1: number; h2: number;
  W2: [number, number]; b2: number; yhat: number;
}) {
  // 좌표
  const cx_in = 60;
  const cx_h  = 280;
  const cx_out = 500;
  const ys_in = [60, 130, 200];
  const ys_h  = [95, 165];
  const cy_out = 130;

  return (
    <svg viewBox="0 0 580 260" className="w-full max-w-3xl mx-auto">
      <g fontFamily="JetBrains Mono">
        {/* 입력 → 은닉 가중치 선들 */}
        {ys_in.map((yi, i) => ys_h.map((yh, j) => (
          <Edge key={`in-${i}-${j}`}
            x1={cx_in + 18} y1={yi}
            x2={cx_h - 22} y2={yh}
            label={`${W1[j][i]}`} weight={W1[j][i]} small />
        )))}
        {/* 은닉 → 출력 */}
        {ys_h.map((yh, j) => (
          <Edge key={`out-${j}`}
            x1={cx_h + 22} y1={yh}
            x2={cx_out - 22} y2={cy_out}
            label={`${W2[j]}`} weight={W2[j]} small />
        ))}

        {/* 입력 노드 */}
        {ys_in.map((y, i) => (
          <Node key={`x${i}`} cx={cx_in} cy={y} label={`x${i + 1}=${x[i]}`} />
        ))}

        {/* 은닉 뉴런 (Σ + ReLU 통합 노드) */}
        <HiddenNode cx={cx_h} cy={ys_h[0]} label={`h₁=${h1}`} bias={b1[0]} />
        <HiddenNode cx={cx_h} cy={ys_h[1]} label={`h₂=${h2}`} bias={b1[1]} />

        {/* 출력 뉴런 */}
        <HiddenNode cx={cx_out} cy={cy_out} label={`ŷ=${yhat}`} bias={b2} accent />
      </g>
    </svg>
  );
}

/* ─────────────────────────────────────────────────────────
   원자 컴포넌트
───────────────────────────────────────────────────────── */
function Node({ cx, cy, label, accent }: { cx: number; cy: number; label: string; accent?: boolean }) {
  return (
    <g>
      <circle cx={cx} cy={cy} r={20}
        fill={accent ? 'rgb(var(--color-accent))' : 'rgb(var(--color-surface))'}
        stroke={accent ? 'rgb(var(--color-accent))' : 'rgb(var(--color-muted))'}
        strokeOpacity={accent ? 1 : 0.6} />
      <text x={cx} y={cy + 4} textAnchor="middle"
        fill={accent ? '#fff' : 'rgb(var(--color-text))'} fontSize={11}>
        {label}
      </text>
    </g>
  );
}

function SumNode({ cx, cy }: { cx: number; cy: number }) {
  return (
    <g>
      <circle cx={cx} cy={cy} r={26}
        fill="rgb(var(--color-accent-bg))"
        stroke="rgb(var(--color-accent))" strokeWidth={1.4} />
      <text x={cx} y={cy + 6} textAnchor="middle"
        fill="rgb(var(--color-accent))" fontSize={18} fontWeight={700}>Σ</text>
    </g>
  );
}

function ReluBox({ cx, cy }: { cx: number; cy: number }) {
  return (
    <g>
      <rect x={cx - 35} y={cy - 18} width={70} height={36} rx={6}
        fill="rgb(var(--color-accent-bg))" stroke="rgb(var(--color-accent))" strokeWidth={1.4} />
      <text x={cx} y={cy + 5} textAnchor="middle"
        fill="rgb(var(--color-accent))" fontSize={12} fontWeight={700}>ReLU</text>
    </g>
  );
}

function HiddenNode({ cx, cy, label, bias, accent }:
  { cx: number; cy: number; label: string; bias: number; accent?: boolean }) {
  return (
    <g>
      <circle cx={cx} cy={cy} r={22}
        fill={accent ? 'rgb(var(--color-accent))' : 'rgb(var(--color-accent-bg))'}
        stroke="rgb(var(--color-accent))" strokeWidth={1.4} />
      <text x={cx} y={cy + 4} textAnchor="middle"
        fill={accent ? '#fff' : 'rgb(var(--color-accent))'} fontSize={11} fontWeight={700}>
        {label}
      </text>
      <text x={cx} y={cy - 30} textAnchor="middle"
        fill="rgb(var(--color-muted))" fontSize={10}>
        +ReLU, b={bias}
      </text>
    </g>
  );
}

function BiasLabel({ cx, cy, b, suffix = '' }: { cx: number; cy: number; b: number; suffix?: string }) {
  return (
    <g>
      <text x={cx} y={cy + 4} textAnchor="middle" fill="rgb(var(--color-muted))" fontSize={11}>
        b{suffix}={b}
      </text>
      <line x1={cx} y1={cy + 10} x2={cx} y2={cy + 22} stroke="rgb(var(--color-muted))" strokeWidth={1.4} />
    </g>
  );
}

function Arrow({ x1, y1, x2, y2 }: { x1: number; y1: number; x2: number; y2: number }) {
  return (
    <line x1={x1} y1={y1} x2={x2} y2={y2}
      stroke="rgb(var(--color-muted))" strokeWidth={1.6} strokeOpacity={0.7} strokeLinecap="round" />
  );
}

function ValueBadge({ cx, cy, label, accent }: { cx: number; cy: number; label: string; accent?: boolean }) {
  const w = label.length * 7.4 + 12;
  const h = 18;
  const color = accent ? 'rgb(var(--color-accent))' : 'rgb(var(--color-text))';
  return (
    <g>
      <rect x={cx - w / 2} y={cy - h / 2} width={w} height={h} rx={4}
        fill="rgb(var(--color-bg))" stroke={color} strokeOpacity={0.55} strokeWidth={0.9} />
      <text x={cx} y={cy + 4} textAnchor="middle" fill={color} fontSize={11} fontWeight={600}>
        {label}
      </text>
    </g>
  );
}

function Edge({
  x1, y1, x2, y2, label, weight, small,
}: { x1: number; y1: number; x2: number; y2: number; label: string; weight: number; small?: boolean }) {
  const aw = Math.min(Math.abs(weight), 2);
  const sw = (small ? 0.6 : 0.9) + aw * (small ? 1.6 : 2.4);
  const isPos = weight >= 0;
  const stroke = Math.abs(weight) < 0.05
    ? 'rgb(var(--color-muted))'
    : isPos ? 'rgb(var(--color-accent))' : 'rgb(239, 68, 68)';
  const opacity = Math.abs(weight) < 0.05 ? 0.5 : 0.85;
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const labelW = label.length * (small ? 5.4 : 6.2) + (small ? 8 : 10);
  const labelH = small ? 12 : 14;
  return (
    <g>
      <line x1={x1} y1={y1} x2={x2} y2={y2}
        stroke={stroke} strokeWidth={sw} strokeOpacity={opacity} strokeLinecap="round" />
      <rect x={mx - labelW / 2} y={my - labelH / 2} width={labelW} height={labelH} rx={3}
        fill="rgb(var(--color-bg))" stroke={stroke} strokeOpacity={0.5} strokeWidth={0.7} />
      <text x={mx} y={my + (small ? 3 : 3.5)} textAnchor="middle"
        fill={stroke} fontSize={small ? 9 : 10} fontWeight={600}>
        {label}
      </text>
    </g>
  );
}
