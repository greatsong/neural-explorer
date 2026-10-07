// 특강 슬라이드 공용 뉴런 그림.
// A1(예측)부터 A5(한 step 업데이트)까지 같은 그림을 쓴다. 입력 x와 출력 ŷ은 뉴런 밖의 값이고,
// 뉴런(원 하나)은 Σ(곱해서 더하기)와 ReLU(활성화)까지다. 편향 b는 뉴런 아래에서 들어온다.
// 순전파는 보라, 역전파는 주황, 음수 가중치는 빨강. 그 밖은 회색.
import type { ReactNode } from 'react';

export const ACCENT = 'rgb(var(--color-accent))';
export const ACCENT_BG = 'rgb(var(--color-accent-bg))';
export const MUTED = 'rgb(var(--color-muted))';
export const TEXT = 'rgb(var(--color-text))';
export const BG = 'rgb(var(--color-bg))';
export const SURFACE = 'rgb(var(--color-surface))';
export const ORANGE = '#ea580c';
export const ORANGE_BG = '#fff1e6';
export const RED = 'rgb(190, 18, 60)';

export interface InputSpec {
  name: string;          // x₁
  value?: number | null; // 값을 보여 주지 않으면 null
}
export interface WeightSpec {
  name: string;          // w₁
  value?: number | null;
  product?: string;      // 선 아래에 붙는 곱셈 결과 "2 × 2 = 4"
  hot?: boolean;         // 지금 설명 중인 선
  prev?: number | null;  // 업데이트 전 값 (있으면 "0 → 1.05")
}
export interface BackSpec {
  // 역전파 화살표를 몇 구간까지 그릴지. 0 없음, 1 L→ŷ, 2 ŷ→뉴런(ReLU 통과), 3 뉴런→w, 4 뉴런→b
  stage: number;
  atY?: string;    // L→ŷ 구간 배지 (예: "× e", "× (−7)")
  atRelu?: string; // ReLU 통과 배지 (예: "그대로")
  atW?: string[];  // 입력 선마다 배지 (예: "× x", "× 3")
  atB?: string;    // b 구간 배지 (예: "× 1")
  dw?: string[];   // 도착점 결과 (예: "dw = e·x")
  db?: string;
  dimForward?: boolean;
}
export interface LossSpec {
  show: boolean;
  y?: number | null;
  e?: string | null;   // "e = ŷ − y = −7"
  L?: string | null;   // "L = ½e² = 24.5"
  curve?: {            // L을 ŷ의 함수로 그린 작은 곡선과 접선
    yhat: number; y: number; slopeLabel?: string;
  } | null;
  edgeBadge?: string;  // ŷ→L 선 위 배지 ("× e")
}

export interface NeuronFigureProps {
  inputs: InputSpec[];
  weights: WeightSpec[];
  bias: { value?: number | null; badge?: string; hot?: boolean; prev?: number | null; show?: boolean };
  z?: { value?: number | null; show?: boolean; hot?: boolean };
  relu?: { show?: boolean; hot?: boolean };
  yhat?: { value?: number | null; show?: boolean; hot?: boolean };
  flow?: 'none' | 'inputs' | 'sum' | 'out'; // 순전파 흐름 강조 단계
  loss?: LossSpec;
  back?: BackSpec;
  symbolic?: boolean; // 값 대신 기호만 (유도 화면)
  children?: ReactNode; // 추가 주석 레이어
}

export const VB_W = 1000;
export const VB_H = 440;

const NX = 480, NY = 210, NR = 74;   // 뉴런 원
const IX = 96, IR = 34;              // 입력 원
const YX = 736, YR = 38;             // ŷ 원
const LX = 930, LR = 36;             // L 원
const BX = NX, BY = 378, BR = 26;    // b 원

export function inputY(count: number, i: number) {
  if (count === 1) return NY;
  return i === 0 ? 118 : 302;
}

function fmt(v: number | null | undefined) {
  if (v === null || v === undefined) return '';
  const r = Math.round(v * 100) / 100;
  return (r < 0 ? '−' : '') + Math.abs(r).toString();
}

let _canvas: CanvasRenderingContext2D | null = null;
function textWidth(s: string, size: number, bold = true) {
  if (!_canvas && typeof document !== 'undefined') _canvas = document.createElement('canvas').getContext('2d');
  if (_canvas) {
    _canvas.font = `${bold ? 700 : 500} ${size}px Pretendard, system-ui, sans-serif`;
    return _canvas.measureText(s).width;
  }
  return s.length * size * 0.62;
}

export function Badge({
  cx, cy, label, color = ACCENT, fill = BG, size = 22, bold = true, anchor = 'middle',
}: { cx: number; cy: number; label: string; color?: string; fill?: string; size?: number; bold?: boolean; anchor?: 'middle' | 'start' | 'end' }) {
  const w = textWidth(label, size, bold) + size * 1.0;
  const h = size * 1.5;
  const x = anchor === 'middle' ? cx - w / 2 : anchor === 'start' ? cx : cx - w;
  return (
    <g>
      <rect x={x} y={cy - h / 2} width={w} height={h} rx={h / 4} fill={fill} stroke={color} strokeWidth={1.4} strokeOpacity={0.7} />
      <text x={x + w / 2} y={cy + size * 0.36} textAnchor="middle" fill={color} fontSize={size} fontWeight={bold ? 700 : 500}>
        {label}
      </text>
    </g>
  );
}

function Fade({ show, children, dim }: { show: boolean | undefined; children: ReactNode; dim?: boolean }) {
  return (
    <g className="lec-fade" style={{ opacity: show ? (dim ? 0.28 : 1) : 0 }}>{children}</g>
  );
}

export function NeuronFigure(p: NeuronFigureProps) {
  const n = p.inputs.length;
  const back = p.back ?? { stage: 0 };
  const dimF = back.dimForward && back.stage > 0;
  const showB = p.bias.show !== false;
  const lossOn = !!p.loss?.show;

  // 입력 선의 끝점(뉴런 원 둘레)
  const edgeEnd = (y: number) => {
    const dx = NX - IX, dy = NY - y;
    const d = Math.hypot(dx, dy);
    return { x: NX - (dx / d) * (NR + 2), y: NY - (dy / d) * (NR + 2) };
  };
  const edgeStart = (y: number) => {
    const dx = NX - IX, dy = NY - y;
    const d = Math.hypot(dx, dy);
    return { x: IX + (dx / d) * (IR + 2), y: y + (dy / d) * (IR + 2) };
  };

  const wColor = (w: WeightSpec) => (w.value !== null && w.value !== undefined && w.value < 0 ? RED : ACCENT);

  return (
    <svg viewBox={`0 0 ${VB_W} ${VB_H}`} className="w-full h-full" preserveAspectRatio="xMidYMid meet" fontFamily="Pretendard, system-ui, sans-serif">
      <defs>
        <marker id="lec-fwd" markerWidth="8" markerHeight="8" refX="6.5" refY="4" orient="auto" markerUnits="userSpaceOnUse">
          <path d="M0,0 L8,4 L0,8 z" fill={ACCENT} />
        </marker>
        <marker id="lec-fwd-m" markerWidth="8" markerHeight="8" refX="6.5" refY="4" orient="auto" markerUnits="userSpaceOnUse">
          <path d="M0,0 L8,4 L0,8 z" fill={MUTED} />
        </marker>
        <marker id="lec-back" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto" markerUnits="userSpaceOnUse">
          <path d="M0,0 L10,5 L0,10 z" fill={ORANGE} />
        </marker>
      </defs>

      {/* ───────── 순전파 층 ───────── */}
      <g className="lec-fade" style={{ opacity: dimF ? 0.42 : 1 }}>
        {/* 입력 → 뉴런 */}
        {p.inputs.map((_inp, i) => {
          const y = inputY(n, i);
          const s = edgeStart(y), e = edgeEnd(y);
          const w = p.weights[i];
          const hot = w?.hot || p.flow === 'inputs';
          const col = w ? wColor(w) : MUTED;
          const mx = s.x + (e.x - s.x) * 0.36, my = s.y + (e.y - s.y) * 0.36;
          const px = s.x + (e.x - s.x) * 0.7, py = s.y + (e.y - s.y) * 0.7;
          const off = n === 1 ? -30 : 0;
          const wLabel = w
            ? (p.symbolic || w.value === null || w.value === undefined)
              ? w.name
              : (w.prev !== null && w.prev !== undefined)
                ? `${w.name} = ${fmt(w.prev)} → ${fmt(w.value)}`
                : `${w.name} = ${fmt(w.value)}`
            : '';
          return (
            <g key={i}>
              <line x1={s.x} y1={s.y} x2={e.x} y2={e.y} stroke={hot ? col : MUTED} strokeWidth={hot ? 5 : 3}
                strokeOpacity={hot ? 0.95 : 0.5} strokeLinecap="round" className={hot ? 'lec-flow' : ''}
                markerEnd={hot ? (col === RED ? undefined : 'url(#lec-fwd)') : 'url(#lec-fwd-m)'} />
              {w && <Badge cx={mx} cy={my + off} label={wLabel} color={hot ? col : MUTED} size={22} />}
              <Fade show={!!w?.product}>
                {w?.product && <Badge cx={px} cy={py + (n === 1 ? 40 : (i === 0 ? -58 : 58))} label={w.product} color={col} fill={col === RED ? '#fff1f2' : ACCENT_BG} size={23} />}
              </Fade>
            </g>
          );
        })}

        {/* b → 뉴런 */}
        <Fade show={showB}>
          <line x1={BX} y1={BY - BR - 2} x2={NX} y2={NY + NR + 2} stroke={p.bias.hot ? ACCENT : MUTED} strokeWidth={p.bias.hot ? 5 : 3} strokeOpacity={p.bias.hot ? 0.95 : 0.5} strokeLinecap="round" className={p.bias.hot ? 'lec-flow' : ''} markerEnd={p.bias.hot ? 'url(#lec-fwd)' : 'url(#lec-fwd-m)'} />
          <circle cx={BX} cy={BY} r={BR} fill={BG} stroke={p.bias.hot ? ACCENT : MUTED} strokeWidth={2.4} />
          <text x={BX} y={BY + 8} textAnchor="middle" fill={p.bias.hot ? ACCENT : TEXT} fontSize={24} fontWeight={700}>b</text>
          {p.bias.value !== null && p.bias.value !== undefined && !p.symbolic && (
            <Badge cx={BX + BR + 14} cy={BY} anchor="start"
              label={p.bias.prev !== null && p.bias.prev !== undefined ? `b = ${fmt(p.bias.prev)} → ${fmt(p.bias.value)}` : `b = ${fmt(p.bias.value)}`}
              color={p.bias.hot ? ACCENT : MUTED} size={22} />
          )}
          <Fade show={!!p.bias.badge}>
            {p.bias.badge && <Badge cx={BX - BR - 14} cy={BY} anchor="end" label={p.bias.badge} color={ACCENT} fill={ACCENT_BG} size={21} />}
          </Fade>
        </Fade>

        {/* 뉴런 원 */}
        <circle cx={NX} cy={NY} r={NR} fill={ACCENT_BG} stroke={ACCENT} strokeWidth={3} />
        <line x1={NX} y1={NY - NR + 3} x2={NX} y2={NY + NR - 3} stroke={ACCENT} strokeWidth={2} strokeOpacity={0.6} />
        <text x={NX - 34} y={NY + 14} textAnchor="middle" fill={ACCENT} fontSize={40} fontWeight={700} opacity={p.flow === 'sum' || p.z?.hot ? 1 : 0.85}>Σ</text>
        <text x={NX + 36} y={NY + 8} textAnchor="middle" fill={p.relu?.hot ? ACCENT : ACCENT} fontSize={21} fontWeight={700} opacity={p.relu?.show === false ? 0.25 : 1}>ReLU</text>
        <text x={NX + NR - 6} y={NY - NR - 8} textAnchor="start" fill={MUTED} fontSize={19}>인공 뉴런</text>

        {/* z 배지 — Σ와 ReLU 사이 값 */}
        <Fade show={p.z?.show}>
          <line x1={NX} y1={NY - NR - 2} x2={NX} y2={NY - NR - 24} stroke={p.z?.hot ? ACCENT : MUTED} strokeWidth={2} />
          <Badge cx={NX} cy={NY - NR - 44} label={p.symbolic || p.z?.value === null || p.z?.value === undefined ? 'z' : `z = ${fmt(p.z?.value)}`} color={p.z?.hot ? ACCENT : MUTED} size={23} />
        </Fade>

        {/* 뉴런 → ŷ */}
        <line x1={NX + NR + 2} y1={NY} x2={YX - YR - 4} y2={NY} stroke={p.flow === 'out' ? ACCENT : MUTED} strokeWidth={p.flow === 'out' ? 5 : 3} strokeOpacity={p.flow === 'out' ? 0.95 : 0.5} strokeLinecap="round" className={p.flow === 'out' ? 'lec-flow' : ''} markerEnd={p.flow === 'out' ? 'url(#lec-fwd)' : 'url(#lec-fwd-m)'} />

        {/* ŷ 원 */}
        <circle cx={YX} cy={NY} r={YR} fill={p.yhat?.hot ? ACCENT : BG} stroke={ACCENT} strokeWidth={2.6} />
        <text x={YX} y={NY + 9} textAnchor="middle" fill={p.yhat?.hot ? '#fff' : ACCENT} fontSize={26} fontWeight={700}>ŷ</text>
        <Fade show={p.yhat?.show && !p.symbolic && p.yhat?.value !== null && p.yhat?.value !== undefined}>
          <Badge cx={YX} cy={NY - YR - 32} label={`ŷ = ${fmt(p.yhat?.value)}`} color={ACCENT} size={23} />
        </Fade>
        <text x={YX} y={NY + YR + 30} textAnchor="middle" fill={MUTED} fontSize={19}>예측값</text>

        {/* 입력 원 */}
        {p.inputs.map((inp, i) => {
          const y = inputY(n, i);
          const label = p.symbolic || inp.value === null || inp.value === undefined ? inp.name : `${inp.name} = ${fmt(inp.value)}`;
          return (
            <g key={i}>
              <circle cx={IX} cy={y} r={IR} fill={BG} stroke={MUTED} strokeWidth={2.4} />
              <text x={IX} y={y + 8} textAnchor="middle" fill={TEXT} fontSize={label.length > 3 ? 23 : 27} fontWeight={700}>{label}</text>
            </g>
          );
        })}
        <text x={IX} y={inputY(n, n - 1) + IR + 30} textAnchor="middle" fill={MUTED} fontSize={19}>입력</text>
      </g>

      {/* ───────── 손실 층 (ŷ → L) ───────── */}
      <Fade show={lossOn}>
        <line x1={YX + YR + 4} y1={NY} x2={LX - LR - 4} y2={NY} stroke={MUTED} strokeWidth={3} strokeOpacity={0.5} strokeLinecap="round" markerEnd="url(#lec-fwd-m)" />
        <circle cx={LX} cy={NY} r={LR} fill={SURFACE} stroke={MUTED} strokeWidth={2.4} />
        <text x={LX} y={NY + 9} textAnchor="middle" fill={TEXT} fontSize={26} fontWeight={700}>L</text>
        <text x={LX} y={NY + LR + 30} textAnchor="middle" fill={MUTED} fontSize={19}>손실</text>
        <Fade show={p.loss?.y !== null && p.loss?.y !== undefined}>
          <Badge cx={(YX + LX) / 2} cy={NY - 78} label={`y = ${fmt(p.loss?.y)}`} color={MUTED} size={22} bold={false} />
          <text x={(YX + LX) / 2} y={NY - 104} textAnchor="middle" fill={MUTED} fontSize={17}>정답</text>
        </Fade>
        <Fade show={!!p.loss?.e}>
          <Badge cx={(YX + LX) / 2 + 6} cy={NY - 30} label={p.loss?.e ?? ''} color={ORANGE} size={22} />
        </Fade>
        <Fade show={!!p.loss?.L}>
          <Badge cx={LX} cy={NY - LR - 36} label={p.loss?.L ?? ''} color={TEXT} size={22} />
        </Fade>
        <Fade show={!!p.loss?.edgeBadge}>
          <Badge cx={(YX + LX) / 2} cy={NY + 4} label={p.loss?.edgeBadge ?? ''} color={ORANGE} fill={ORANGE_BG} size={22} />
        </Fade>
        <Fade show={!!p.loss?.curve}>
          {p.loss?.curve && <LossCurve {...p.loss.curve} />}
        </Fade>
      </Fade>

      {/* ───────── 역전파 층 ───────── */}
      {back.stage > 0 && <BackArrows n={n} back={back} lossOn={lossOn} edgeEnd={edgeEnd} edgeStart={edgeStart} />}

      {p.children}
    </svg>
  );
}

/* 손실 곡선 — L을 ŷ의 함수로. 지금 ŷ 자리의 점과 접선. */
function LossCurve({ yhat, y, slopeLabel }: { yhat: number; y: number; slopeLabel?: string }) {
  // 작은 좌표계: x축 ŷ ∈ [y-9, y+9], y축 L ∈ [0, 40]
  const ox = 800, oy = 412, w = 180, h = 96;
  const xmin = y - 9, xmax = y + 9, lmax = 42;
  const sx = (v: number) => ox + ((v - xmin) / (xmax - xmin)) * w;
  const sy = (L: number) => oy - (L / lmax) * h;
  const pts: string[] = [];
  for (let i = 0; i <= 60; i++) {
    const v = xmin + ((xmax - xmin) * i) / 60;
    const L = 0.5 * (v - y) ** 2;
    if (L <= lmax) pts.push(`${sx(v)},${sy(L)}`);
  }
  const e = yhat - y;
  const L0 = 0.5 * e * e;
  const tx1 = yhat - 3, tx2 = yhat + 3;
  return (
    <g>
      <rect x={ox - 16} y={oy - h - 24} width={w + 36} height={h + 50} rx={10} fill={BG} stroke={MUTED} strokeOpacity={0.35} />
      <line x1={ox} y1={oy} x2={ox + w} y2={oy} stroke={MUTED} strokeWidth={1.5} />
      <line x1={sx(y)} y1={oy} x2={sx(y)} y2={oy - h} stroke={MUTED} strokeWidth={1} strokeDasharray="4 4" />
      <polyline points={pts.join(' ')} fill="none" stroke={MUTED} strokeWidth={2.5} />
      <line x1={sx(tx1)} y1={sy(L0 + e * (tx1 - yhat))} x2={sx(tx2)} y2={sy(L0 + e * (tx2 - yhat))} stroke={ORANGE} strokeWidth={3} strokeLinecap="round" />
      <circle cx={sx(yhat)} cy={sy(L0)} r={6} fill={ORANGE} />
      <text x={ox + w + 4} y={oy + 20} textAnchor="end" fill={MUTED} fontSize={15}>ŷ</text>
      <text x={ox - 6} y={oy - h + 4} textAnchor="end" fill={MUTED} fontSize={15}>L</text>
      <text x={sx(y)} y={oy + 20} textAnchor="middle" fill={MUTED} fontSize={15}>y</text>
      {slopeLabel && <Badge cx={ox + w / 2} cy={oy - h - 6} label={slopeLabel} color={ORANGE} fill={ORANGE_BG} size={19} />}
    </g>
  );
}

function BackArrows({
  n, back, lossOn, edgeEnd, edgeStart,
}: {
  n: number; back: BackSpec; lossOn: boolean;
  edgeEnd: (y: number) => { x: number; y: number };
  edgeStart: (y: number) => { x: number; y: number };
}) {
  const yOff = 26; // 순전파 선 아래로 띄운 높이
  const st = back.stage;
  const seg = (k: number, children: ReactNode) => (
    <g key={k} className="lec-back" style={{ opacity: st >= k ? 1 : 0 }}>{children}</g>
  );
  return (
    <g>
      {/* 1: L → ŷ */}
      {lossOn && seg(1, (
        <>
          <line x1={LX - LR - 2} y1={NY + yOff} x2={YX + YR + 10} y2={NY + yOff} stroke={ORANGE} strokeWidth={3.5} strokeDasharray="8 6" markerEnd="url(#lec-back)" className="lec-dash" />
          {back.atY && <Badge cx={(YX + LX) / 2} cy={NY + yOff + 34} label={back.atY} color={ORANGE} fill={ORANGE_BG} size={22} />}
        </>
      ))}
      {!lossOn && seg(1, (
        <>
          {back.atY && <Badge cx={YX} cy={NY + YR + 56} label={back.atY} color={ORANGE} fill={ORANGE_BG} size={22} />}
        </>
      ))}
      {/* 2: ŷ → 뉴런 (ReLU 통과) */}
      {seg(2, (
        <>
          <line x1={YX - YR - 2} y1={NY + yOff} x2={NX + NR + 10} y2={NY + yOff} stroke={ORANGE} strokeWidth={3.5} strokeDasharray="8 6" markerEnd="url(#lec-back)" className="lec-dash" />
          {back.atRelu && <Badge cx={(NX + NR + YX - YR) / 2} cy={NY - 36} label={back.atRelu} color={ORANGE} fill={ORANGE_BG} size={20} />}
        </>
      ))}
      {/* 3: 뉴런 → 입력 선 (w) */}
      {seg(3, (
        <>
          {Array.from({ length: n }).map((_, i) => {
            const y = inputY(n, i);
            const s = edgeStart(y), e = edgeEnd(y);
            // 입력 선과 나란히, 아래쪽으로 띄워 그린다
            const dx = e.x - s.x, dy = e.y - s.y, d = Math.hypot(dx, dy);
            const nx = -dy / d, ny = dx / d; // 법선 (아래쪽)
            const sign = n === 1 ? 1 : (i === 0 ? 1 : -1);
            const ox = nx * yOff * sign, oy = ny * yOff * sign;
            const ax1 = e.x - dx * 0.02 + ox, ay1 = e.y - dy * 0.02 + oy;
            const ax2 = s.x + dx * 0.12 + ox, ay2 = s.y + dy * 0.12 + oy;
            const bx = (ax1 + ax2) / 2 + ox * 1.0, by = (ay1 + ay2) / 2 + oy * 1.0;
            const label = back.atW?.[i];
            const res = back.dw?.[i];
            return (
              <g key={i}>
                <line x1={ax1} y1={ay1} x2={ax2} y2={ay2} stroke={ORANGE} strokeWidth={3.5} strokeDasharray="8 6" markerEnd="url(#lec-back)" className="lec-dash" />
                {label && <Badge cx={bx} cy={by} label={label} color={ORANGE} fill={ORANGE_BG} size={21} />}
                {res && <Badge cx={ax2 + 24} cy={ay2 + oy * 2.3 + (n === 1 ? 14 : 0)} label={res} color={ORANGE} size={22} anchor="start" />}
              </g>
            );
          })}
        </>
      ))}
      {/* 4: 뉴런 → b */}
      {seg(4, (
        <>
          <line x1={NX + 22} y1={NY + NR + 10} x2={BX + 22} y2={BY - BR - 6} stroke={ORANGE} strokeWidth={3.5} strokeDasharray="8 6" markerEnd="url(#lec-back)" className="lec-dash" />
          {back.atB && <Badge cx={BX + 52} cy={(NY + NR + BY - BR) / 2} anchor="start" label={back.atB} color={ORANGE} fill={ORANGE_BG} size={21} />}
          {back.db && <Badge cx={BX + BR + 14} cy={BY + 40} anchor="start" label={back.db} color={ORANGE} size={22} />}
        </>
      ))}
    </g>
  );
}
