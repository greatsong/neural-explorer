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
      strokeLinecap="round" strokeDasharray={dashed ? '12 9' : undefined} className={hot ? (dashed ? 'lec-dash' : 'lec-flow') : ''} markerEnd={hot ? 'url(#fig-fwd)' : 'url(#fig-fwd-m)'} />
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
export function ChainFigure({ step, ask = false, relu = true, x = 3, w1 = 2, b1 = -1, w2 = 1, b2 = -3, showValues = true }: { step: number; ask?: boolean; relu?: boolean; x?: number; w1?: number; b1?: number; w2?: number; b2?: number; showValues?: boolean }) {
  const act = (z: number) => (relu ? Math.max(0, z) : z);
  const z1 = w1 * x + b1, h = act(z1), z2 = w2 * h + b2, y = act(z2);
  // ask: 지금 단계(step)의 값은 아직 묻는 중이라 '?'로 둔다
  const v = (k: number, val: number) => (ask && step === k ? '?' : fmt(val));
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
        <Badge cx={N1} cy={CY - R - 42} label={`z₁ = ${v(1, z1)}`} color={step === 1 ? ACCENT : MUTED} size={23} />
      </Fade>
      <Edge x1={N1 + R + 2} y1={CY} x2={H - 36} y2={CY} hot={step === 2} />
      <ValueNode cx={H} cy={CY} label="h" accent hot={step === 2} />
      <text x={H} y={CY + 64} textAnchor="middle" fill={MUTED} fontSize={18}>뉴런 1의 출력 = 뉴런 2의 입력</text>
      <Fade show={showValues && step >= 2}>
        <Badge cx={H} cy={CY - 58} label={`h = ${v(2, h)}`} color={ACCENT} size={23} />
      </Fade>
      <Edge x1={H + 36} y1={CY} x2={N2 - R - 4} y2={CY} hot={step === 3} />
      <Badge cx={(H + N2) / 2} cy={CY} label={`w₂ = ${fmt(w2)}`} color={step === 3 ? ACCENT : MUTED} size={23} />
      <BiasNode cx={N2} cy={BY} ncy={CY + R + 2} value={`b₂ = ${fmt(b2)}`} hot={step === 3} />
      <Neuron cx={N2} cy={CY} r={R} hot={step === 3 || step === 4} relu={relu} label="뉴런 2" />
      <Fade show={showValues && step >= 3}>
        <line x1={N2} y1={CY - R - 2} x2={N2} y2={CY - R - 22} stroke={MUTED} strokeWidth={2} />
        <Badge cx={N2} cy={CY - R - 42} label={`z₂ = ${v(3, z2)}`} color={step === 3 ? ACCENT : MUTED} size={23} />
      </Fade>
      <Edge x1={N2 + R + 2} y1={CY} x2={Y - 36} y2={CY} hot={step === 4} />
      <ValueNode cx={Y} cy={CY} label="ŷ" accent hot={step >= 4} />
      <Fade show={showValues && step >= 4}>
        <Badge cx={Y} cy={CY - 58} label={`ŷ = ${v(4, y)}`} color={ACCENT} size={23} />
      </Fade>
      <ValueNode cx={X} cy={CY} label={`x = ${fmt(x)}`} />
    </Svg>
  );
}

/* ───────── 2-2 3 × 2 × 1 신경망 ───────── */
export function NetFigure({ step, ask = false }: { step: number; ask?: boolean }) {
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
          <Badge cx={HX + HR + 70} cy={hy + (j === 0 ? -30 : 30)} label={`h${j === 0 ? '₁' : '₂'} = ${ask && step === j + 1 ? '?' : fmt(h[j])}`} color={hotH(j) ? ACCENT : TEXT} size={23} />
        </Fade>
      ))}
      <Edge x1={OX + OR + 2} y1={OY} x2={YX - 36} y2={OY} hot={hotO} />
      <ValueNode cx={YX} cy={OY} label="ŷ" accent hot={step >= 3} />
      <Fade show={step >= 3}><Badge cx={YX} cy={OY - 58} label={`ŷ = ${ask && step === 3 ? '?' : fmt(y)}`} color={ACCENT} size={23} /></Fade>
      {/* 입력 */}
      {IY.map((iy, i) => <ValueNode key={i} cx={IX} cy={iy} r={IR} label={`x${['₁', '₂', '₃'][i]} = ${xs[i]}`} />)}
      <text x={40} y={VB_H - 10} textAnchor="start" fill={MUTED} fontSize={18}>실선은 h₁로, 점선은 h₂로 가는 선</text>
    </Svg>
  );
}

/* ───────── 2-3 ReLU 유무 비교 ───────── */
export function ReluCompare({ step }: { step: number }) {
  // 1: 왼쪽 시범(x = 0)만, 2: 왼쪽 전부, 3: 오른쪽 시범, 4: 오른쪽 h 줄, 5: 오른쪽 ŷ 전부, 7: 직선·꺾인 선 배지
  const xs = [0, 1, 2, 3];
  const no = xs.map((x) => 2 * x - 4);
  const hs = xs.map((x) => Math.max(0, 2 * x - 1));
  const yes = hs.map((h) => Math.max(0, h - 3));
  const Panel = ({ ox, title, vals, n, kink, hRow }: { ox: number; title: string; vals: number[]; n: number; kink: boolean; hRow?: number[] }) => {
    const w = 360, hgt = 260, oy = 340;
    const sx = (x: number) => ox + 40 + (x / 3) * (w - 80);
    const sy = (v: number) => oy - ((v + 5) / 8) * hgt; // v ∈ [-5, 3]
    const col = kink ? ORANGE : ACCENT;
    return (
      <g>
        <rect x={ox} y={oy - hgt - 40} width={w} height={hgt + 80} rx={12} fill={SURFACE} stroke={MUTED} strokeOpacity={0.3} />
        <text x={ox + 24} y={oy - hgt - 8} textAnchor="start" fill={TEXT} fontSize={24} fontWeight={700}>{title}</text>
        <line x1={sx(0) - 10} y1={sy(0)} x2={sx(3) + 10} y2={sy(0)} stroke={MUTED} strokeWidth={1.5} />
        <line x1={sx(0)} y1={sy(3)} x2={sx(0)} y2={sy(-5)} stroke={MUTED} strokeWidth={1.5} />
        {xs.map((x) => <text key={x} x={sx(x)} y={oy + 26} textAnchor="middle" fill={MUTED} fontSize={19}>x = {x}</text>)}
        {[-4, -2, 0, 2].map((v) => <text key={v} x={sx(0) - 12} y={sy(v) + 6} textAnchor="end" fill={MUTED} fontSize={16}>{fmt(v)}</text>)}
        {hRow && <Fade show>
          {hRow.map((h, i) => <text key={i} x={sx(i)} y={oy + 62} textAnchor="middle" fill={ORANGE} fontSize={19} fontWeight={700}>h = {fmt(h)}</text>)}
        </Fade>}
        <Fade show={n >= 4}>
          <polyline points={xs.map((x, i) => `${sx(x)},${sy(vals[i])}`).join(' ')} fill="none" stroke={col} strokeWidth={4} strokeLinejoin="round" />
        </Fade>
        {xs.map((x, i) => (
          <Fade key={x} show={i < n}>
            <circle cx={sx(x)} cy={sy(vals[i])} r={8} fill={col} />
            <text x={sx(x) + (i === 3 ? -4 : 14)} y={sy(vals[i]) - 14} textAnchor={i === 3 ? 'end' : 'start'} fill={TEXT} fontSize={20} fontWeight={700}>{fmt(vals[i])}</text>
          </Fade>
        ))}
      </g>
    );
  };
  return (
    <Svg>
      <Panel ox={60} title="ReLU 없음" vals={no} n={step >= 2 ? 4 : step >= 1 ? 1 : 0} kink={false} />
      <Panel ox={580} title="ReLU 있음" vals={yes} n={step >= 5 ? 4 : step >= 3 ? 1 : 0} kink hRow={step >= 4 ? hs : step >= 3 ? hs.slice(0, 1) : undefined} />
      <Fade show={step >= 7}>
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
  const sx = (v: number) => 170 + ((v - 2) / 6) * 660;
  const LY = 180;
  // 학생이 먼저 생각하도록 예측 점을 보여 준 다음 단계에서 오차를 보여 준다 (3 → −2, 7 → 2, 나머지 셋은 함께).
  // 합은 활동지처럼 같은 거리에 있는 ŷ = 3과 7 두 개만 비교하므로, 그 단계에서는 나머지 셋을 흐리게 한다
  const dotAt = [1, 5, 5, 5, 3], eAt = [2, 6, 6, 6, 4]; // 가운데 셋의 e는 질문(5) 다음 단계(6)에 공개
  const pair = step >= 7;
  const R1 = LY + 110, R2 = LY + 180; // e 줄, e² 줄
  return (
    <Svg>
      <line x1={sx(2)} y1={LY} x2={sx(8)} y2={LY} stroke={MUTED} strokeWidth={3} strokeLinecap="round" />
      {[2, 3, 4, 5, 6, 7, 8].map((v) => (
        <g key={v}>
          <line x1={sx(v)} y1={LY - 8} x2={sx(v)} y2={LY + 8} stroke={MUTED} strokeWidth={2} />
          <text x={sx(v)} y={LY + 42} textAnchor="middle" fill={v === y ? ACCENT : MUTED} fontSize={22} fontWeight={v === y ? 700 : 400}>{v}</text>
        </g>
      ))}
      <text x={sx(8) + 28} y={LY + 8} textAnchor="start" fill={MUTED} fontSize={22}>예측 ŷ</text>
      {/* 정답 */}
      <line x1={sx(y)} y1={LY - 64} x2={sx(y)} y2={LY} stroke={ACCENT} strokeWidth={4} />
      <Badge cx={sx(y)} cy={LY - 86} label={`정답 y = ${y}`} color={ACCENT} fill={ACCENT_BG} size={23} />
      {/* 줄 머리 */}
      <Fade show={step >= 2}><text x={sx(2) - 20} y={R1 + 9} textAnchor="end" fill={MUTED} fontSize={22}>오차 e = ŷ − 5</text></Fade>
      <Fade show={step >= 6}><text x={sx(2) - 20} y={R2 + 9} textAnchor="end" fill={MUTED} fontSize={22}>e²</text></Fade>
      {/* 예측 점과 값 */}
      {preds.map((p, i) => {
        const e = p - y;
        const hot = i === 0 || i === 4;
        return (
          <Fade key={i} show={step >= dotAt[i]}>
           <g className="lec-fade" style={{ opacity: pair && !hot ? 0.2 : 1 }}>
            <circle cx={sx(p)} cy={LY} r={12} fill={e === 0 ? ACCENT : ORANGE} />
            {p === 4.5 && <text x={sx(p)} y={LY + 42} textAnchor="middle" fill={MUTED} fontSize={22}>4.5</text>}
            <Fade show={step >= eAt[i]}>
              <line x1={sx(p)} y1={LY + 54} x2={sx(p)} y2={R1 - 26} stroke={MUTED} strokeOpacity={0.3} strokeWidth={1.5} strokeDasharray="4 4" />
              <text x={sx(p)} y={R1 + 9} textAnchor="middle" fill={ORANGE} fontSize={hot && (step <= 4 || pair) ? 30 : 26} fontWeight={700}>{fmt(e)}</text>
            </Fade>
            <Fade show={step >= 6}>
              <text x={sx(p)} y={R2 + 9} textAnchor="middle" fill={TEXT} fontSize={hot && pair ? 30 : 26} fontWeight={700}>{fmt(e * e)}</text>
            </Fade>
           </g>
          </Fade>
        );
      })}
      {/* 같은 거리 */}
      <Fade show={step === 4 || pair}>
        <line x1={sx(3) + 16} y1={LY - 34} x2={sx(5) - 8} y2={LY - 34} stroke={ORANGE} strokeWidth={2.5} markerEnd="url(#fig-or)" />
        <line x1={sx(7) - 16} y1={LY - 34} x2={sx(5) + 8} y2={LY - 34} stroke={ORANGE} strokeWidth={2.5} markerEnd="url(#fig-or)" />
        <text x={sx(4)} y={LY - 44} textAnchor="middle" fill={ORANGE} fontSize={20}>거리 2</text>
        <text x={sx(6)} y={LY - 44} textAnchor="middle" fill={ORANGE} fontSize={20}>거리 2</text>
      </Fade>
      {/* 합 */}
      <Fade show={step >= 8}>
        <Badge cx={sx(8) + 40} cy={R1} anchor="start" label="합 (−2) + 2 = 0" color={MUTED} size={22} bold={false} />
      </Fade>
      <Fade show={step >= 8}>
        <Badge cx={sx(8) + 40} cy={R2} anchor="start" label="합 4 + 4 = 8" color={ORANGE} fill={ORANGE_BG} size={22} />
      </Fade>
    </Svg>
  );
}

/* ───────── 3-2 다섯 점과 직선 ŷ = x + 2 ───────── */
export function ScatterFit({ step }: { step: number }) {
  // 활동지 3-2 표: 열마다 시범 줄(x = 1)을 질문 단계에 보이고, 다음 단계에서 나머지 줄을 공개한다
  const yhatRows = step >= 2 ? 5 : step >= 1 ? 1 : 0;
  const eRows = step >= 4 ? 5 : step >= 3 ? 1 : 0;
  const e2Rows = step >= 6 ? 5 : step >= 5 ? 1 : 0;
  const pts: [number, number][] = [[1, 3], [2, 5], [3, 7], [4, 9], [5, 11]];
  const pred = (x: number) => x + 2;
  const ox = 90, oy = 390, w = 470, h = 340;
  const sx = (x: number) => ox + (x / 6) * w;
  const sy = (v: number) => oy - (v / 12) * h;
  const TX = [640, 716, 800, 892, 976]; // 표 열: x, y, ŷ, e, e²
  const TY0 = 76, TH = 50;
  return (
    <Svg>
      <line x1={ox} y1={oy} x2={ox + w} y2={oy} stroke={MUTED} strokeWidth={2} />
      <line x1={ox} y1={oy} x2={ox} y2={oy - h} stroke={MUTED} strokeWidth={2} />
      {[1, 2, 3, 4, 5].map((x) => <text key={x} x={sx(x)} y={oy + 28} textAnchor="middle" fill={MUTED} fontSize={19}>{x}</text>)}
      {[3, 5, 7, 9, 11].map((v) => <text key={v} x={ox - 12} y={sy(v) + 6} textAnchor="end" fill={MUTED} fontSize={17}>{v}</text>)}
      <text x={ox + w + 10} y={oy + 8} fill={MUTED} fontSize={19}>x</text>
      {/* 정답 직선 */}
      <line x1={sx(0.6)} y1={sy(2.2)} x2={sx(5.4)} y2={sy(11.8)} stroke={MUTED} strokeWidth={2} strokeDasharray="8 8" />
      <text x={sx(5.4) + 10} y={sy(11.8) + 7} textAnchor="start" fill={MUTED} fontSize={18}>y = 2x + 1</text>
      {/* 예측 직선 */}
      <Fade show={step >= 1}>
        <line x1={sx(0.6)} y1={sy(2.6)} x2={sx(5.4)} y2={sy(7.4)} stroke={ACCENT} strokeWidth={4} />
        <text x={sx(5.4) + 10} y={sy(7.4) + 8} textAnchor="start" fill={ACCENT} fontSize={20} fontWeight={700}>ŷ = x + 2</text>
      </Fade>
      {/* 오차 막대 */}
      {pts.map(([x, y], i) => (
        <g key={i}>
          <Fade show={step >= 3}>
            <line x1={sx(x)} y1={sy(y)} x2={sx(x)} y2={sy(pred(x))} stroke={ORANGE} strokeWidth={4} strokeLinecap="round" />
            <circle cx={sx(x)} cy={sy(pred(x))} r={7} fill={BG} stroke={ACCENT} strokeWidth={3} />
          </Fade>
          <circle cx={sx(x)} cy={sy(y)} r={9} fill={ACCENT} />
        </g>
      ))}
      {/* 표 */}
      <text x={TX[0]} y={TY0} textAnchor="middle" fill={MUTED} fontSize={20}>x</text>
      <text x={TX[1]} y={TY0} textAnchor="middle" fill={MUTED} fontSize={20}>정답 y</text>
      <Fade show={step >= 1}><text x={TX[2]} y={TY0} textAnchor="middle" fill={ACCENT} fontSize={20} fontWeight={700}>ŷ</text></Fade>
      <Fade show={step >= 3}><text x={TX[3]} y={TY0} textAnchor="middle" fill={ORANGE} fontSize={20} fontWeight={700}>e = ŷ − y</text></Fade>
      <Fade show={step >= 5}><text x={TX[4]} y={TY0} textAnchor="middle" fill={TEXT} fontSize={20} fontWeight={700}>e²</text></Fade>
      <line x1={TX[0] - 30} y1={TY0 + 14} x2={TX[4] + 30} y2={TY0 + 14} stroke={MUTED} strokeWidth={1.5} />
      {pts.map(([x, y], i) => {
        const e = pred(x) - y;
        const ry = TY0 + 48 + i * TH;
        return (
          <g key={i}>
            <text x={TX[0]} y={ry} textAnchor="middle" fill={TEXT} fontSize={24} fontWeight={700}>{x}</text>
            <text x={TX[1]} y={ry} textAnchor="middle" fill={TEXT} fontSize={24}>{y}</text>
            <Fade show={i < yhatRows}><text x={TX[2]} y={ry} textAnchor="middle" fill={ACCENT} fontSize={24} fontWeight={700}>{pred(x)}</text></Fade>
            <Fade show={i < eRows}><text x={TX[3]} y={ry} textAnchor="middle" fill={ORANGE} fontSize={24} fontWeight={700}>{fmt(e)}</text></Fade>
            <Fade show={i < e2Rows}><text x={TX[4]} y={ry} textAnchor="middle" fill={TEXT} fontSize={24} fontWeight={700}>{fmt(e * e)}</text></Fade>
          </g>
        );
      })}
      <Fade show={step >= 6}>
        <line x1={TX[4] - 30} y1={TY0 + 48 + 5 * TH - 32} x2={TX[4] + 30} y2={TY0 + 48 + 5 * TH - 32} stroke={MUTED} strokeWidth={1.5} />
        <text x={TX[4]} y={TY0 + 48 + 5 * TH} textAnchor="middle" fill={TEXT} fontSize={24} fontWeight={700}>30</text>
        <text x={TX[4] - 40} y={TY0 + 48 + 5 * TH} textAnchor="end" fill={MUTED} fontSize={20}>합</text>
      </Fade>
      <Fade show={step >= 8}>
        <Badge cx={(TX[0] + TX[4]) / 2} cy={TY0 + 48 + 5 * TH + 46} label="MSE = 30 ÷ 5 = 6" color={ACCENT} fill={ACCENT_BG} size={24} />
      </Fade>
      <Fade show={step >= 10}>
        <Badge cx={sx(3)} cy={28} label="e가 10배 → e²은 100배" color={ORANGE} fill={ORANGE_BG} size={23} />
      </Fade>
    </Svg>
  );
}

/* ───────── 4A 손실 곡선 L = ½(b − 1)² ───────── */
export interface CurveMark { b: number; tangent?: boolean; label?: string; dir?: string; color?: string }
/* 접선 기울기를 일차함수처럼 읽는 직각삼각형: 가로 1칸, 세로 |기울기|칸 */
export interface SlopeTri { b: number; half: boolean; vert?: boolean; color?: string }
export function LossCurveB({ marks = [], path = [], pathLabel, badgeAt, pointLabels = {}, note, compare, compareSlope, triangles = [] }: { marks?: CurveMark[]; path?: number[]; pathLabel?: string; badgeAt?: number; pointLabels?: Record<number, string>; note?: string; compare?: boolean; compareSlope?: boolean; triangles?: SlopeTri[] }) {
  const labelAt = badgeAt ?? path.length - 1; // b = … 배지를 붙일 점 (기본은 마지막 점)
  const L = (b: number) => 0.5 * (b - 1) ** 2;
  const L2 = (b: number) => (b - 1) ** 2; // ½ 없는 손실 (비교용)
  const bmin = -3.2, bmax = 5.6, lmax = 11;
  const ox = 110, oy = 376, w = 820, h = 320;
  const sx = (b: number) => ox + ((b - bmin) / (bmax - bmin)) * w;
  const sy = (v: number) => oy - (v / lmax) * h;
  const curve = (f: (b: number) => number) => {
    const pts: string[] = [];
    for (let i = 0; i <= 160; i++) { const b = bmin + ((bmax - bmin) * i) / 160; pts.push(`${sx(b)},${sy(f(b))}`); }
    return pts.join(' ');
  };
  const tangent = (b: number, f: (b: number) => number, slope: number, col: string, lo = 1.3, hi = 1.3) => (
    <line x1={sx(b - lo)} y1={sy(f(b) - slope * lo)} x2={sx(b + hi)} y2={sy(f(b) + slope * hi)} stroke={col} strokeWidth={4} strokeLinecap="round" />
  );
  return (
    <Svg>
      <defs><clipPath id="lc-clip"><rect x={ox} y={oy - h - 6} width={w} height={h + 6} /></clipPath></defs>
      <line x1={ox} y1={oy} x2={ox + w} y2={oy} stroke={MUTED} strokeWidth={2} />
      <line x1={ox} y1={oy} x2={ox} y2={oy - h} stroke={MUTED} strokeWidth={2} />
      {[-3, -2, -1, 0, 1, 2, 3, 4, 5].map((b) => (
        <g key={b}>
          <line x1={sx(b)} y1={oy - 5} x2={sx(b)} y2={oy + 5} stroke={MUTED} strokeWidth={1.5} />
          <text x={sx(b)} y={oy + 30} textAnchor="middle" fill={b === 1 ? ACCENT : MUTED} fontSize={20} fontWeight={b === 1 ? 700 : 400}>{fmt(b)}</text>
        </g>
      ))}
      {[2, 4, 6, 8, 10].map((v) => (
        <g key={`y${v}`}>
          <line x1={ox} y1={sy(v)} x2={ox + w} y2={sy(v)} stroke={MUTED} strokeWidth={1} strokeOpacity={0.25} />
          <line x1={ox - 5} y1={sy(v)} x2={ox + 5} y2={sy(v)} stroke={MUTED} strokeWidth={1.5} />
          <text x={ox - 12} y={sy(v) + 7} textAnchor="end" fill={MUTED} fontSize={19}>{v}</text>
        </g>
      ))}
      <text x={ox - 12} y={oy + 7} textAnchor="end" fill={MUTED} fontSize={19}>0</text>
      <text x={ox + w + 8} y={oy + 8} fill={MUTED} fontSize={21}>b</text>
      <text x={ox - 8} y={oy - h + 4} textAnchor="end" fill={MUTED} fontSize={21}>L</text>
      <text x={sx(1)} y={oy + 56} textAnchor="middle" fill={ACCENT} fontSize={18}>바닥</text>
      <g clipPath="url(#lc-clip)">
        {compare && <polyline points={curve(L2)} fill="none" stroke={MUTED} strokeWidth={3} strokeOpacity={0.45} strokeDasharray="8 8" />}
        <polyline points={curve(L)} fill="none" stroke={ACCENT} strokeWidth={4} />
        <line x1={sx(1)} y1={oy} x2={sx(1)} y2={sy(0)} stroke={ACCENT} strokeWidth={1} strokeDasharray="4 4" />
        {/* 경로 */}
        {path.map((b, i) => (i === 0 ? null : (
          <line key={i} x1={sx(path[i - 1])} y1={sy(L(path[i - 1]))} x2={sx(b)} y2={sy(L(b))} stroke={ORANGE} strokeWidth={3} strokeDasharray="7 6" markerEnd="url(#fig-or)" />
        )))}
        {/* 접선 */}
        {marks.map((m, i) => m.tangent ? <g key={`t${i}`}>{tangent(m.b, L, m.b - 1, m.color ?? ORANGE)}</g> : null)}
        {/* ½이 없을 때 b = −2의 접선 (기울기 2(b − 1) = −6) */}
        {compareSlope && tangent(-2, L2, -6, MUTED, 0.3, 1.3)}
        {/* 기울기 읽기 삼각형: 가로 1칸 → 세로 몇 칸 */}
        {triangles.map((t, i) => {
          const fn = t.half ? L : L2; const m = t.half ? t.b - 1 : 2 * (t.b - 1); const col = t.color ?? (t.half ? ORANGE : MUTED); const y0 = fn(t.b);
          return (
            <g key={`tri${i}`} className="lec-fade">
              <line x1={sx(t.b)} y1={sy(y0)} x2={sx(t.b + 1)} y2={sy(y0)} stroke={col} strokeWidth={3} strokeDasharray="6 5" />
              <text x={t.half ? sx(t.b) + 14 : sx(t.b + 0.5)} y={sy(y0) + (t.half && m < 0 ? -12 : 28)} textAnchor={t.half ? 'start' : 'middle'} fill={col} fontSize={21} fontWeight={700}>가로 1</text>
              {/* 시작점 좌표: 기울기 음수면 왼쪽 아래, 양수면 오른쪽 아래(접선·곡선이 지나지 않는 쪽) */}
              <text x={sx(t.b) - 16} y={sy(y0) + (t.half ? (m > 0 ? -14 : 30) : 7)} textAnchor="end" fill={col} fontSize={20} fontWeight={700}>({fmt(t.b)}, {fmt(y0)})</text>
              {t.vert && <g className="lec-fade">
                <line x1={sx(t.b + 1)} y1={sy(y0)} x2={sx(t.b + 1)} y2={sy(y0 + m)} stroke={col} strokeWidth={3} strokeDasharray="6 5" />
                <text x={sx(t.b + 1) + 12} y={sy(y0 + m / 2) + 2} textAnchor="start" fill={col} fontSize={21} fontWeight={700}>세로 {fmt(Math.abs(m))} {m < 0 ? '↓' : '↑'}</text>
                <circle cx={sx(t.b + 1)} cy={sy(y0 + m)} r={7} fill={col} />
                {/* 끝점 좌표는 접선이 지나지 않는 쪽에: 기울기 음수면 왼쪽 아래, 양수면 왼쪽 위 */}
                {/* ½ 없는 회색 삼각형은 주황 삼각형과 자리가 겹쳐 끝점 좌표를 캡션에만 적는다 */}
                {t.half && <text x={sx(t.b + 1) - 12} y={sy(y0 + m) + (m < 0 ? 30 : -14)} textAnchor="end" fill={col} fontSize={20} fontWeight={700}>({fmt(t.b + 1)}, {fmt(y0 + m)})</text>}
              </g>}
            </g>
          );
        })}
      </g>
      {path.map((b, i) => (
        <g key={`p${i}`}>
          <circle cx={sx(b)} cy={sy(L(b))} r={i === path.length - 1 ? 11 : 7} fill={ORANGE} />
          {i === labelAt && !pointLabels[i] && <Badge cx={sx(b) + (b > 4.3 ? -20 : 20)} cy={sy(L(b)) - 30} anchor={b > 4.3 ? 'end' : 'start'} label={`b = ${fmt(b)}`} color={ORANGE} size={21} />}
          {pointLabels[i] && <Badge cx={sx(b) + (b > 4.3 ? -20 : 20)} cy={sy(L(b)) - 30 - (i % 2) * 36} anchor={b > 4.3 ? 'end' : 'start'} label={pointLabels[i]} color={ORANGE} size={21} />}
        </g>
      ))}
      {marks.map((m, i) => {
        const v = L(m.b);
        const col = m.color ?? ORANGE;
        return (
          <g key={i} className="lec-fade">
            <circle cx={sx(m.b)} cy={sy(v)} r={11} fill={col} />
            {/* 바닥(b = 1)의 배지는 점 위 가운데에 두어 오른쪽 좌표 라벨과 겹치지 않게 한다 */}
            {m.label && <Badge cx={sx(m.b) + (m.b === 1 ? 0 : 24)} cy={sy(v) + (m.b === 1 ? -40 : 36)} anchor={m.b === 1 ? 'middle' : 'start'} label={m.label} color={col} size={21} />}
            {/* 방향 글자는 접선과 겹치지 않게 접선이 낮은 쪽(기울기 음수면 오른쪽, 양수면 왼쪽)에 둔다 */}
            {m.dir && <text x={sx(m.b) + (m.b < 1 ? 26 : m.b > 1 ? -26 : -64)} y={sy(v) - (m.b === 1 ? 40 : 30)} textAnchor={m.b < 1 ? 'start' : 'end'} fill={col} fontSize={30} fontWeight={700}>{m.dir}</text>}
          </g>
        );
      })}
      {compare && <Badge cx={sx(3.6) + 16} cy={sy(L2(3.6))} anchor="start" label="½이 없으면 L = (b − 1)²" color={MUTED} size={20} bold={false} />}
      {compareSlope && <circle className="lec-fade" cx={sx(-2)} cy={sy(L2(-2))} r={10} fill={MUTED} />}
      <Badge cx={ox + 10} cy={oy - h + 12} anchor="start" label="L = ½(b − 1)²" color={ACCENT} fill={ACCENT_BG} size={22} />
      {pathLabel && <Badge cx={ox + w / 2} cy={oy - h + 12} label={pathLabel} color={ORANGE} fill={ORANGE_BG} size={23} />}
      {note && <Badge cx={ox + w / 2} cy={oy - h + 56} label={note} color={TEXT} size={22} bold={false} />}
    </Svg>
  );
}
