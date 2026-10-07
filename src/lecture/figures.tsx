// 순전파·오차와 손실·경사하강법 섹션의 그림. NeuronFigure와 같은 색·선·배지 규칙을 쓴다.
import type { ReactNode } from 'react';
import { Badge, ACCENT, ACCENT_BG, MUTED, TEXT, BG, SURFACE, ORANGE, ORANGE_BG, VB_W, VB_H } from './NeuronFigure';
import { fmt } from './common';

function Fade({ show, children, dim }: { show: boolean | undefined; children: ReactNode; dim?: boolean }) {
  return <g className="lec-fade" style={{ opacity: show ? (dim ? 0.3 : 1) : 0 }}>{children}</g>;
}
const Svg = ({ children }: { children: ReactNode }) => (
  <svg viewBox={`0 0 ${VB_W} ${VB_H}`} className="w-full h-full" preserveAspectRatio="xMidYMid meet" fontFamily="Pretendard, system-ui, sans-serif">
    <defs>
      <marker id="fig-fwd" markerWidth="8" markerHeight="8" refX="6.5" refY="4" orient="auto" markerUnits="userSpaceOnUse"><path d="M0,0 L8,4 L0,8 z" fill={ACCENT} /></marker>
      <marker id="fig-fwd-m" markerWidth="8" markerHeight="8" refX="6.5" refY="4" orient="auto" markerUnits="userSpaceOnUse"><path d="M0,0 L8,4 L0,8 z" fill={MUTED} /></marker>
      <marker id="fig-or" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto" markerUnits="userSpaceOnUse"><path d="M0,0 L10,5 L0,10 z" fill={ORANGE} /></marker>
    </defs>
    {children}
  </svg>
);

/* 뉴런 원 (Σ | ReLU) */
function Neuron({ cx, cy, r = 62, hot, relu = true, label }: { cx: number; cy: number; r?: number; hot?: boolean; relu?: boolean; label?: string }) {
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill={ACCENT_BG} stroke={ACCENT} strokeWidth={hot ? 4 : 2.6} />
      <line x1={cx} y1={cy - r + 3} x2={cx} y2={cy + r - 3} stroke={ACCENT} strokeWidth={2} strokeOpacity={0.6} />
      <text x={cx - r * 0.45} y={cy + 12} textAnchor="middle" fill={ACCENT} fontSize={r * 0.55} fontWeight={700}>Σ</text>
      <text x={cx + r * 0.48} y={cy + 7} textAnchor="middle" fill={ACCENT} fontSize={r * 0.3} fontWeight={700} opacity={relu ? 1 : 0.25}>ReLU</text>
      {label && <text x={cx - 14} y={cy + r + 34} textAnchor="end" fill={MUTED} fontSize={18}>{label}</text>}
    </g>
  );
}
function ValueNode({ cx, cy, r = 34, label, accent, hot }: { cx: number; cy: number; r?: number; label: string; accent?: boolean; hot?: boolean }) {
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill={hot ? ACCENT : BG} stroke={accent ? ACCENT : MUTED} strokeWidth={2.4} />
      <text x={cx} y={cy + 8} textAnchor="middle" fill={hot ? '#fff' : accent ? ACCENT : TEXT} fontSize={label.length > 4 ? 21 : 25} fontWeight={700}>{label}</text>
    </g>
  );
}
function Edge({ x1, y1, x2, y2, hot, dashed }: { x1: number; y1: number; x2: number; y2: number; hot?: boolean; dashed?: boolean }) {
  return (
    <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={hot ? ACCENT : MUTED} strokeWidth={hot ? 5 : 3} strokeOpacity={hot ? 0.95 : 0.5}
      strokeLinecap="round" strokeDasharray={dashed ? '12 9' : undefined} className={hot && !dashed ? 'lec-flow' : ''} markerEnd={hot ? 'url(#fig-fwd)' : 'url(#fig-fwd-m)'} />
  );
}
function BiasNode({ cx, cy, ncy, r = 24, value, hot, name = 'b' }: { cx: number; cy: number; ncy: number; r?: number; value?: string; hot?: boolean; name?: string }) {
  return (
    <g>
      <line x1={cx} y1={cy - r - 2} x2={cx} y2={ncy} stroke={hot ? ACCENT : MUTED} strokeWidth={hot ? 5 : 3} strokeOpacity={hot ? 0.95 : 0.5} strokeLinecap="round" className={hot ? 'lec-flow' : ''} markerEnd={hot ? 'url(#fig-fwd)' : 'url(#fig-fwd-m)'} />
      <circle cx={cx} cy={cy} r={r} fill={BG} stroke={hot ? ACCENT : MUTED} strokeWidth={2.4} />
      <text x={cx} y={cy + 8} textAnchor="middle" fill={hot ? ACCENT : TEXT} fontSize={22} fontWeight={700}>{name}</text>
      {value && <Badge cx={cx + r + 12} cy={cy} anchor="start" label={value} color={hot ? ACCENT : MUTED} size={21} />}
    </g>
  );
}

/* ───────── 2-1 직렬 뉴런 ───────── */
export function ChainFigure({ step, relu = true, x = 3, w1 = 2, b1 = -1, w2 = 1, b2 = -3, showValues = true }: { step: number; relu?: boolean; x?: number; w1?: number; b1?: number; w2?: number; b2?: number; showValues?: boolean }) {
  const act = (z: number) => (relu ? Math.max(0, z) : z);
  const z1 = w1 * x + b1, h = act(z1), z2 = w2 * h + b2, y = act(z2);
  const X = 76, N1 = 300, H = 520, N2 = 740, Y = 940, CY = 210, R = 62;
  const BY = 370;
  return (
    <Svg>
      <Edge x1={X + 36} y1={CY} x2={N1 - R - 4} y2={CY} hot={step === 1} />
      <Badge cx={(X + N1) / 2} cy={CY} label={`w₁ = ${fmt(w1)}`} color={step === 1 ? ACCENT : MUTED} size={23} />
      <BiasNode cx={N1} cy={BY} ncy={CY + R + 2} value={`b₁ = ${fmt(b1)}`} hot={step === 1} />
      <Neuron cx={N1} cy={CY} r={R} hot={step === 1 || step === 2} relu={relu} label="뉴런 1" />
      <Fade show={showValues && step >= 1}>
        <line x1={N1} y1={CY - R - 2} x2={N1} y2={CY - R - 22} stroke={MUTED} strokeWidth={2} />
        <Badge cx={N1} cy={CY - R - 42} label={`z₁ = ${fmt(z1)}`} color={step === 1 ? ACCENT : MUTED} size={23} />
      </Fade>
      <Edge x1={N1 + R + 2} y1={CY} x2={H - 36} y2={CY} hot={step === 2} />
      <ValueNode cx={H} cy={CY} label="h" accent hot={step === 2} />
      <text x={H} y={CY + 64} textAnchor="middle" fill={MUTED} fontSize={18}>뉴런 1의 출력 = 뉴런 2의 입력</text>
      <Fade show={showValues && step >= 2}>
        <Badge cx={H} cy={CY - 58} label={`h = ${fmt(h)}`} color={ACCENT} size={23} />
      </Fade>
      <Edge x1={H + 36} y1={CY} x2={N2 - R - 4} y2={CY} hot={step === 3} />
      <Badge cx={(H + N2) / 2} cy={CY} label={`w₂ = ${fmt(w2)}`} color={step === 3 ? ACCENT : MUTED} size={23} />
      <BiasNode cx={N2} cy={BY} ncy={CY + R + 2} value={`b₂ = ${fmt(b2)}`} hot={step === 3} />
      <Neuron cx={N2} cy={CY} r={R} hot={step === 3 || step === 4} relu={relu} label="뉴런 2" />
      <Fade show={showValues && step >= 3}>
        <line x1={N2} y1={CY - R - 2} x2={N2} y2={CY - R - 22} stroke={MUTED} strokeWidth={2} />
        <Badge cx={N2} cy={CY - R - 42} label={`z₂ = ${fmt(z2)}`} color={step === 3 ? ACCENT : MUTED} size={23} />
      </Fade>
      <Edge x1={N2 + R + 2} y1={CY} x2={Y - 36} y2={CY} hot={step === 4} />
      <ValueNode cx={Y} cy={CY} label="ŷ" accent hot={step >= 4} />
      <Fade show={showValues && step >= 4}>
        <Badge cx={Y} cy={CY - 58} label={`ŷ = ${fmt(y)}`} color={ACCENT} size={23} />
      </Fade>
      <ValueNode cx={X} cy={CY} label={`x = ${fmt(x)}`} />
    </Svg>
  );
}

/* ───────── 2-2 3 × 2 × 1 신경망 ───────── */
export function NetFigure({ step }: { step: number }) {
  const xs = [1, 2, 1];
  const W1 = [[1, 1, 0], [0, 1, 1]]; // 은닉 h₁, h₂ 가중치
  const B1 = [0, -1];
  const W2 = [1, 1]; const B2 = -2;
  const h = W1.map((w, j) => Math.max(0, w[0] * xs[0] + w[1] * xs[1] + w[2] * xs[2] + B1[j]));
  const y = Math.max(0, W2[0] * h[0] + W2[1] * h[1] + B2);
  const IX = 80, IY = [96, 210, 324], IR = 32;
  const HX = 440, HY = [140, 300], HR = 54;
  const OX = 760, OY = 220, OR = 54;
  const YX = 940;
  const hotH = (j: number) => step === j + 1;
  const hotO = step === 3;
  return (
    <Svg>
      {/* 입력 → 은닉 */}
      {HY.map((hy, j) => IY.map((iy, i) => {
        const dx = HX - IX, dy = hy - iy, d = Math.hypot(dx, dy);
        const x1 = IX + (dx / d) * (IR + 2), y1 = iy + (dy / d) * (IR + 2);
        const x2 = HX - (dx / d) * (HR + 4), y2 = hy - (dy / d) * (HR + 4);
        const t = j === 0 ? 0.24 : 0.66;
        return (
          <g key={`${j}-${i}`}>
            <Edge x1={x1} y1={y1} x2={x2} y2={y2} hot={hotH(j)} dashed={j === 1} />
            <Badge cx={x1 + (x2 - x1) * t} cy={y1 + (y2 - y1) * t} label={`${W1[j][i]}`} color={hotH(j) ? ACCENT : MUTED} size={20} />
          </g>
        );
      }))}
      {/* 은닉 → 출력 */}
      {HY.map((hy, j) => {
        const dx = OX - HX, dy = OY - hy, d = Math.hypot(dx, dy);
        const x1 = HX + (dx / d) * (HR + 2), y1 = hy + (dy / d) * (HR + 2);
        const x2 = OX - (dx / d) * (OR + 4), y2 = OY - (dy / d) * (OR + 4);
        return (
          <g key={j}>
            <Edge x1={x1} y1={y1} x2={x2} y2={y2} hot={hotO} dashed={j === 1} />
            <Badge cx={(x1 + x2) / 2} cy={(y1 + y2) / 2 + (j === 0 ? -26 : 26)} label={`${W2[j]}`} color={hotO ? ACCENT : MUTED} size={20} />
          </g>
        );
      })}
      {/* 편향 */}
      <BiasNode cx={HX} cy={HY[0] - HR - 50} ncy={HY[0] - HR - 2} r={20} value={`b = ${fmt(B1[0])}`} hot={hotH(0)} />
      <BiasNode cx={HX} cy={HY[1] + HR + 50} ncy={HY[1] + HR + 2} r={20} value={`b = ${fmt(B1[1])}`} hot={hotH(1)} />
      <BiasNode cx={OX} cy={OY + OR + 50} ncy={OY + OR + 2} r={20} value={`b = ${fmt(B2)}`} hot={hotO} />
      {/* 뉴런 */}
      {HY.map((hy, j) => <Neuron key={j} cx={HX} cy={hy} r={HR} hot={hotH(j)} />)}
      <Neuron cx={OX} cy={OY} r={OR} hot={hotO} />
      {/* 값 */}
      {HY.map((hy, j) => (
        <Fade key={j} show={step >= j + 1}>
          <Badge cx={HX + HR + 70} cy={hy + (j === 0 ? -30 : 30)} label={`h${j === 0 ? '₁' : '₂'} = ${fmt(h[j])}`} color={hotH(j) ? ACCENT : TEXT} size={23} />
        </Fade>
      ))}
      <Edge x1={OX + OR + 2} y1={OY} x2={YX - 36} y2={OY} hot={hotO} />
      <ValueNode cx={YX} cy={OY} label="ŷ" accent hot={step >= 3} />
      <Fade show={step >= 3}><Badge cx={YX} cy={OY - 58} label={`ŷ = ${fmt(y)}`} color={ACCENT} size={23} /></Fade>
      {/* 입력 */}
      {IY.map((iy, i) => <ValueNode key={i} cx={IX} cy={iy} r={IR} label={`x${['₁', '₂', '₃'][i]} = ${xs[i]}`} />)}
      <text x={HX} y={HY[1] + HR + 100} textAnchor="middle" fill={MUTED} fontSize={18}>실선은 h₁, 점선은 h₂로 가는 선</text>
    </Svg>
  );
}

/* ───────── 2-3 ReLU 유무 비교 ───────── */
export function ReluCompare({ step }: { step: number }) {
  const xs = [0, 1, 2, 3];
  const no = xs.map((x) => 2 * x - 4);
  const yes = xs.map((x) => Math.max(0, Math.max(0, 2 * x - 1) - 3));
  const Panel = ({ ox, title, vals, show, kink }: { ox: number; title: string; vals: number[]; show: boolean; kink: boolean }) => {
    const w = 360, hgt = 260, oy = 340;
    const sx = (x: number) => ox + 40 + (x / 3) * (w - 80);
    const sy = (v: number) => oy - ((v + 5) / 8) * hgt; // v ∈ [-5, 3]
    return (
      <g>
        <rect x={ox} y={oy - hgt - 40} width={w} height={hgt + 80} rx={12} fill={SURFACE} stroke={MUTED} strokeOpacity={0.3} />
        <text x={ox + 24} y={oy - hgt - 8} textAnchor="start" fill={TEXT} fontSize={24} fontWeight={700}>{title}</text>
        <line x1={sx(0) - 10} y1={sy(0)} x2={sx(3) + 10} y2={sy(0)} stroke={MUTED} strokeWidth={1.5} />
        <line x1={sx(0)} y1={sy(3)} x2={sx(0)} y2={sy(-5)} stroke={MUTED} strokeWidth={1.5} />
        {xs.map((x) => <text key={x} x={sx(x)} y={oy + 26} textAnchor="middle" fill={MUTED} fontSize={19}>x = {x}</text>)}
        {[-4, -2, 0, 2].map((v) => <text key={v} x={sx(0) - 12} y={sy(v) + 6} textAnchor="end" fill={MUTED} fontSize={16}>{fmt(v)}</text>)}
        <Fade show={show}>
          <polyline points={xs.map((x, i) => `${sx(x)},${sy(vals[i])}`).join(' ')} fill="none" stroke={kink ? ORANGE : ACCENT} strokeWidth={4} strokeLinejoin="round" />
          {xs.map((x, i) => (
            <g key={x}>
              <circle cx={sx(x)} cy={sy(vals[i])} r={8} fill={kink ? ORANGE : ACCENT} />
              <text x={sx(x) + (i === 3 ? -4 : 14)} y={sy(vals[i]) - 14} textAnchor={i === 3 ? 'end' : 'start'} fill={TEXT} fontSize={20} fontWeight={700}>{fmt(vals[i])}</text>
            </g>
          ))}
        </Fade>
      </g>
    );
  };
  return (
    <Svg>
      <Panel ox={60} title="ReLU 없음" vals={no} show={step >= 1} kink={false} />
      <Panel ox={580} title="ReLU 있음" vals={yes} show={step >= 2} kink />
      <Fade show={step >= 3}>
        <Badge cx={400} cy={44} anchor="end" label="직선" color={ACCENT} fill={ACCENT_BG} size={26} />
        <Badge cx={920} cy={44} anchor="end" label="꺾인 선" color={ORANGE} fill={ORANGE_BG} size={26} />
      </Fade>
    </Svg>
  );
}

/* ───────── 3-1 한 점의 오차 (수직선) ───────── */
export function ErrorLine({ step }: { step: number }) {
  const y = 5;
  const preds = [3, 4.5, 5, 6, 7];
  const sx = (v: number) => 120 + ((v - 2) / 6) * 760;
  const LY = 200;
  const visible = (i: number) => (step >= 3) || (step >= 1 && i === 0) || (step >= 2 && i === 4);
  return (
    <Svg>
      <line x1={sx(2)} y1={LY} x2={sx(8)} y2={LY} stroke={MUTED} strokeWidth={3} strokeLinecap="round" />
      {[2, 3, 4, 5, 6, 7, 8].map((v) => (
        <g key={v}>
          <line x1={sx(v)} y1={LY - 8} x2={sx(v)} y2={LY + 8} stroke={MUTED} strokeWidth={2} />
          <text x={sx(v)} y={LY + 40} textAnchor="middle" fill={MUTED} fontSize={20}>{v}</text>
        </g>
      ))}
      <text x={sx(8) + 24} y={LY + 8} textAnchor="start" fill={MUTED} fontSize={20}>ŷ</text>
      {/* 정답 */}
      <line x1={sx(y)} y1={LY - 70} x2={sx(y)} y2={LY + 8} stroke={ACCENT} strokeWidth={4} />
      <Badge cx={sx(y)} cy={LY - 92} label={`정답 y = ${y}`} color={ACCENT} fill={ACCENT_BG} size={23} />
      {/* 예측 점 */}
      {preds.map((p, i) => {
        const e = p - y;
        const on = visible(i);
        return (
          <Fade key={i} show={on}>
            <circle cx={sx(p)} cy={LY} r={11} fill={e === 0 ? ACCENT : ORANGE} />
            <text x={sx(p)} y={LY - 24} textAnchor="middle" fill={TEXT} fontSize={21} fontWeight={700}>ŷ = {fmt(p)}</text>
            <Badge cx={sx(p)} cy={LY + 84 + (i % 2) * 42} label={`e = ${fmt(e)}`} color={ORANGE} size={21} />
            <Fade show={step >= 4}>
              <Badge cx={sx(p)} cy={LY + 172 + (i % 2) * 42} label={`e² = ${fmt(e * e)}`} color={TEXT} size={21} />
            </Fade>
          </Fade>
        );
      })}
      {/* 거리 화살표 */}
      <Fade show={step >= 1 && step <= 3}>
        <line x1={sx(3)} y1={LY - 50} x2={sx(5) - 6} y2={LY - 50} stroke={ORANGE} strokeWidth={2.5} markerEnd="url(#fig-or)" />
        <text x={sx(4)} y={LY - 58} textAnchor="middle" fill={ORANGE} fontSize={18}>거리 2</text>
      </Fade>
      <Fade show={step >= 2 && step <= 3}>
        <line x1={sx(7)} y1={LY - 50} x2={sx(5) + 6} y2={LY - 50} stroke={ORANGE} strokeWidth={2.5} markerEnd="url(#fig-or)" />
        <text x={sx(6)} y={LY - 58} textAnchor="middle" fill={ORANGE} fontSize={18}>거리 2</text>
      </Fade>
    </Svg>
  );
}

/* ───────── 3-2 다섯 점과 직선 ŷ = x + 2 ───────── */
export function ScatterFit({ step }: { step: number }) {
  const pts: [number, number][] = [[1, 3], [2, 5], [3, 7], [4, 9], [5, 11]];
  const pred = (x: number) => x + 2;
  const ox = 110, oy = 390, w = 560, h = 360;
  const sx = (x: number) => ox + (x / 6) * w;
  const sy = (v: number) => oy - (v / 12) * h;
  return (
    <Svg>
      <line x1={ox} y1={oy} x2={ox + w} y2={oy} stroke={MUTED} strokeWidth={2} />
      <line x1={ox} y1={oy} x2={ox} y2={oy - h} stroke={MUTED} strokeWidth={2} />
      {[1, 2, 3, 4, 5].map((x) => <text key={x} x={sx(x)} y={oy + 28} textAnchor="middle" fill={MUTED} fontSize={19}>{x}</text>)}
      {[3, 5, 7, 9, 11].map((v) => <text key={v} x={ox - 12} y={sy(v) + 6} textAnchor="end" fill={MUTED} fontSize={17}>{v}</text>)}
      <text x={ox + w + 10} y={oy + 8} fill={MUTED} fontSize={19}>x</text>
      {/* 정답 직선 */}
      <line x1={sx(0.5)} y1={sy(2)} x2={sx(5.5)} y2={sy(12)} stroke={MUTED} strokeWidth={2} strokeDasharray="8 8" />
      <text x={sx(5.2)} y={sy(12) + 2} textAnchor="start" fill={MUTED} fontSize={18}>정답 y = 2x + 1</text>
      {/* 예측 직선 */}
      <Fade show={step >= 1}>
        <line x1={sx(0.5)} y1={sy(2.5)} x2={sx(5.5)} y2={sy(7.5)} stroke={ACCENT} strokeWidth={4} />
        <text x={sx(5.55)} y={sy(7.5) + 8} textAnchor="start" fill={ACCENT} fontSize={20} fontWeight={700}>ŷ = x + 2</text>
      </Fade>
      {/* 오차 막대 */}
      {pts.map(([x, y], i) => {
        return (
          <g key={i}>
            <Fade show={step >= 2}>
              <line x1={sx(x)} y1={sy(y)} x2={sx(x)} y2={sy(pred(x))} stroke={ORANGE} strokeWidth={4} strokeLinecap="round" />
              <circle cx={sx(x)} cy={sy(pred(x))} r={7} fill={BG} stroke={ACCENT} strokeWidth={3} />
            </Fade>
            <circle cx={sx(x)} cy={sy(y)} r={9} fill={ACCENT} />
          </g>
        );
      })}
      {/* 오른쪽 열: e, e² */}
      {pts.map(([x, y], i) => {
        const e = pred(x) - y;
        const ry = 70 + i * 62;
        return (
          <g key={i}>
            <Fade show={step >= 1}><text x={760} y={ry} textAnchor="end" fill={MUTED} fontSize={21}>ŷ = {pred(x)}</text></Fade>
            <Fade show={step >= 2}><Badge cx={800} cy={ry - 7} anchor="start" label={`e = ${fmt(e)}`} color={ORANGE} size={21} /></Fade>
            <Fade show={step >= 3}><Badge cx={905} cy={ry - 7} anchor="start" label={`${fmt(e * e)}`} color={TEXT} size={21} /></Fade>
          </g>
        );
      })}
      <Fade show={step >= 3}>
        <text x={920} y={32} textAnchor="start" fill={MUTED} fontSize={18}>e²</text>
        <line x1={900} y1={372} x2={990} y2={372} stroke={MUTED} strokeWidth={2} />
        <Badge cx={905} cy={400} anchor="start" label="합 30" color={TEXT} size={22} />
      </Fade>
      <Fade show={step >= 4}>
        <Badge cx={780} cy={400} anchor="start" label="MSE = 30 ÷ 5 = 6" color={ACCENT} fill={ACCENT_BG} size={23} />
      </Fade>
    </Svg>
  );
}

/* ───────── 4A 손실 곡선 L = ½(b − 1)² ───────── */
export interface CurveMark { b: number; tangent?: boolean; label?: string; dir?: string; color?: string }
export function LossCurveB({ marks = [], path = [], pathLabel, note, showHalf }: { marks?: CurveMark[]; path?: number[]; pathLabel?: string; note?: string; showHalf?: boolean }) {
  const L = (b: number) => (showHalf ? 1 : 0.5) * (b - 1) ** 2;
  const bmin = -3.2, bmax = 6, lmax = 13;
  const ox = 110, oy = 376, w = 820, h = 330;
  const sx = (b: number) => ox + ((b - bmin) / (bmax - bmin)) * w;
  const sy = (v: number) => oy - (Math.min(v, lmax) / lmax) * h;
  const pts: string[] = [];
  for (let i = 0; i <= 120; i++) {
    const b = bmin + ((bmax - bmin) * i) / 120;
    const v = L(b);
    if (v <= lmax) pts.push(`${sx(b)},${sy(v)}`);
  }
  return (
    <Svg>
      <line x1={ox} y1={oy} x2={ox + w} y2={oy} stroke={MUTED} strokeWidth={2} />
      <line x1={ox} y1={oy} x2={ox} y2={oy - h} stroke={MUTED} strokeWidth={2} />
      {[-3, -2, -1, 0, 1, 2, 3, 4, 5].map((b) => (
        <g key={b}>
          <line x1={sx(b)} y1={oy - 5} x2={sx(b)} y2={oy + 5} stroke={MUTED} strokeWidth={1.5} />
          <text x={sx(b)} y={oy + 30} textAnchor="middle" fill={b === 1 ? ACCENT : MUTED} fontSize={20} fontWeight={b === 1 ? 700 : 400}>{fmt(b)}</text>
        </g>
      ))}
      <text x={ox + w + 8} y={oy + 8} fill={MUTED} fontSize={21}>b</text>
      <text x={ox - 8} y={oy - h + 4} textAnchor="end" fill={MUTED} fontSize={21}>L</text>
      <polyline points={pts.join(' ')} fill="none" stroke={ACCENT} strokeWidth={4} />
      <Badge cx={ox + 10} cy={oy - h + 12} anchor="start" label={showHalf ? 'L = (b − 1)²' : 'L = ½(b − 1)²'} color={ACCENT} fill={ACCENT_BG} size={22} />
      {/* 바닥 */}
      <line x1={sx(1)} y1={oy} x2={sx(1)} y2={sy(0) - 0} stroke={ACCENT} strokeWidth={1} strokeDasharray="4 4" />
      <text x={sx(1)} y={oy + 56} textAnchor="middle" fill={ACCENT} fontSize={18}>바닥</text>
      {/* 경로 */}
      {path.length > 1 && path.map((b, i) => {
        if (i === 0) return null;
        const b0 = path[i - 1];
        return (
          <g key={i} className="lec-fade">
            <line x1={sx(b0)} y1={sy(L(b0))} x2={sx(b)} y2={sy(L(b))} stroke={ORANGE} strokeWidth={3} strokeDasharray="7 6" markerEnd="url(#fig-or)" />
          </g>
        );
      })}
      {path.map((b, i) => (
        <g key={`p${i}`}>
          <circle cx={sx(b)} cy={sy(L(b))} r={i === path.length - 1 ? 11 : 7} fill={ORANGE} />
          {i === path.length - 1 && <Badge cx={sx(b)} cy={sy(L(b)) - 34} label={`b = ${fmt(b)}`} color={ORANGE} size={21} />}
        </g>
      ))}
      {pathLabel && <Badge cx={ox + w - 10} cy={oy - h + 12} anchor="end" label={pathLabel} color={ORANGE} fill={ORANGE_BG} size={23} />}
      {/* 표시점과 접선 */}
      {marks.map((m, i) => {
        const v = L(m.b), slope = (showHalf ? 2 : 1) * (m.b - 1);
        const col = m.color ?? ORANGE;
        return (
          <g key={i} className="lec-fade">
            {m.tangent && <line x1={sx(m.b - 1.2)} y1={sy(v - slope * 1.2)} x2={sx(m.b + 1.2)} y2={sy(v + slope * 1.2)} stroke={col} strokeWidth={4} strokeLinecap="round" />}
            <circle cx={sx(m.b)} cy={sy(v)} r={11} fill={col} />
            {m.label && <Badge cx={sx(m.b)} cy={sy(v) - 40} label={m.label} color={col} size={21} />}
            {m.dir && <text x={sx(m.b)} y={sy(v) - 76} textAnchor="middle" fill={col} fontSize={30} fontWeight={700}>{m.dir}</text>}
          </g>
        );
      })}
      {note && <Badge cx={ox + w - 10} cy={oy - h + 12} anchor="end" label={note} color={MUTED} fill={BG} size={21} bold={false} />}
    </Svg>
  );
}
