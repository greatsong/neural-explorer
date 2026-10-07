// 학습 목표, 섹션 간지, 1-2 편향, 1-3 ReLU, 1-4 파라미터 세기, 1-5 딥러닝 그림 읽기
import type { ComponentType, ReactNode } from 'react';
import { Layout, M, Key } from './common';
import { NeuronFigure, Badge, ACCENT, ACCENT_BG, MUTED, TEXT, BG, SURFACE, ORANGE, ORANGE_BG, VB_W, VB_H } from './NeuronFigure';
import type { SlideDef, SectionId } from './slides';

const Svg = ({ children }: { children: ReactNode }) => (
  <svg viewBox={`0 0 ${VB_W} ${VB_H}`} className="w-full h-full" preserveAspectRatio="xMidYMid meet" fontFamily="Pretendard, system-ui, sans-serif">{children}</svg>
);
function Fade({ show, children }: { show: boolean; children: ReactNode }) {
  return <g className="lec-fade" style={{ opacity: show ? 1 : 0 }}>{children}</g>;
}

/* ───────── 학습 목표 ───────── */
const GOALS = [
  ['①', '딥러닝 그림을 보고 은닉층이 몇 층인지, 인공 뉴런과 파라미터가 몇 개인지 셀 수 있음. "3B 모델"의 뜻을 파라미터 수로 설명할 수 있음.'],
  ['②', '인공 뉴런과 작은 신경망의 계산(순전파)을 손으로 하고, 활성화 함수가 필요한 이유를 설명할 수 있음.'],
  ['③', '오차와 손실을 계산하고, 오차를 제곱하는 이유를 설명할 수 있음.'],
  ['④', '기울기를 구해 파라미터를 한 step 고치고, 손실이 줄어드는 것을 확인할 수 있음.'],
];
const Goals: ComponentType<{ step: number }> = ({ step }) => (
  <Layout
    figure={
      <div className="h-full flex items-center">
        <div className="grid grid-cols-2 gap-[22px] w-full">
          {GOALS.map(([n, t], i) => (
            <div key={n} className={`lec-fade rounded-2xl border-2 px-[28px] py-[26px] ${i <= step ? 'border-accent bg-accent-bg/40 opacity-100' : 'border-border opacity-25'}`}>
              <div className="text-[30px] font-bold text-accent mb-[8px]">{n}</div>
              <div className="text-[25px] leading-snug">{t}</div>
            </div>
          ))}
        </div>
      </div>
    }
    lines={[<>종이와 펜으로 계산함. 표마다 있는 회색 시범 칸과 같은 방법으로 나머지 칸을 채움.</>]}
  />
);

/* ───────── 섹션 간지 ───────── */
function divider(id: string, section: SectionId, no: string, q: string): SlideDef {
  const C: ComponentType<{ step: number }> = () => (
    <div className="h-full flex flex-col items-center justify-center text-center">
      <div className="text-[28px] text-accent font-bold mb-[20px]">{no}</div>
      <div className="text-[64px] font-bold leading-tight tracking-tight whitespace-pre-line">{q}</div>
    </div>
  );
  return { id, section, title: '', steps: 0, component: C };
}
export const DIVIDERS = {
  neuron: divider('div-1', 'neuron', '#1', '동그라미와 선은\n어떤 의미일까?'),
  forward: divider('div-2', 'forward', '#2', '입력 → 뉴럴넷 → 출력,\n계산은 어떻게 흐를까?'),
  loss: divider('div-3', 'loss', '#3', '파라미터가 적절한 값으로\n학습되었는지 판단하려면?'),
  gd: divider('div-4', 'gd', '#4', '오차를 줄이는 알고리즘,\n경사하강법'),
  grad: divider('div-5', 'grad', '#5', '기울기는 어떻게 계산되고,\n오차는 어떻게 줄여 나갈까?'),
};

/* ───────── 1-2 편향이 더해지면 ───────── */
const Bias: ComponentType<{ step: number }> = ({ step }) => {
  const x1 = 2, x2 = 3, w1 = 1, w2 = 1;
  const b = step === 0 ? 0 : step === 1 ? 3 : -7;
  const z = w1 * x1 + w2 * x2 + b;
  return (
    <Layout
      figure={
        <NeuronFigure
          inputs={[{ name: 'x₁', value: x1 }, { name: 'x₂', value: x2 }]}
          weights={[{ name: 'w₁', value: w1, product: '1 × 2 = 2' }, { name: 'w₂', value: w2, product: '1 × 3 = 3' }]}
          bias={{ value: b, hot: step >= 1, prev: step === 1 ? 0 : step === 2 ? 3 : null }}
          z={{ value: z, show: true, hot: step >= 1 }}
          relu={{ show: false }}
          yhat={{ show: false }}
          flow={step >= 1 && step <= 2 ? 'sum' : 'none'}
        />
      }
      lines={[
        step === 0 ? <>가중치 부분은 <M>1·2 + 1·3 = 5</M>로 늘 같음. <M>b = 0</M>이면 <M>z = 5</M>.</> : null,
        step === 1 ? <><M>b = +3</M>이면 <M>z = 5 + 3 = 8</M>. 입력과 상관없이 기본 점수를 올림.</> : null,
        step === 2 ? <><M>b = −7</M>이면 <M>z = 5 + (−7) = −2</M>. 기본 점수를 내림. z가 음수가 됨.</> : null,
        step === 3 ? <>편향 <M>b</M>는 입력과 상관없이 더하는 값. 뉴런 자체의 기본 점수임.</> : null,
      ]}
    />
  );
};

/* ───────── 1-3 ReLU ───────── */
function ReluGraph({ show }: { show: boolean }) {
  const pts = [-4, -1, 0, 2.5, 7];
  const ox = 70, oy = 230, w = 180, h = 170;
  const sx = (z: number) => ox + ((z + 5) / 13) * w;
  const sy = (v: number) => oy - (v / 8) * h;
  return (
    <svg viewBox="0 0 300 300" className="w-full">
      <text x={150} y={28} textAnchor="middle" fill={TEXT} fontSize={20} fontWeight={700}>ReLU(z) = max(0, z)</text>
      <line x1={ox - 10} y1={oy} x2={ox + w + 10} y2={oy} stroke={MUTED} strokeWidth={1.5} />
      <line x1={sx(0)} y1={oy + 8} x2={sx(0)} y2={oy - h - 8} stroke={MUTED} strokeWidth={1.5} />
      <text x={ox + w + 14} y={oy + 6} fill={MUTED} fontSize={15}>z</text>
      <polyline points={`${sx(-5)},${sy(0)} ${sx(0)},${sy(0)} ${sx(8)},${sy(8)}`} fill="none" stroke={ACCENT} strokeWidth={4} strokeLinejoin="round" />
      <g className="lec-fade" style={{ opacity: show ? 1 : 0 }}>
        {pts.map((z) => {
          const v = Math.max(0, z);
          return (
            <g key={z}>
              <circle cx={sx(z)} cy={sy(v)} r={6} fill={v === 0 ? ORANGE : ACCENT} />
              {z !== 0 && <text x={sx(z)} y={oy + 24} textAnchor="middle" fill={MUTED} fontSize={14}>{z}</text>}
              {z !== -1 && <text x={z === 0 ? sx(-0.5) : sx(z) + (z >= 2 ? -8 : 0)} y={sy(v) - 12} textAnchor="middle" fill={v === 0 ? ORANGE : ACCENT} fontSize={15} fontWeight={700}>{v}</text>}
            </g>
          );
        })}
      </g>
      <text x={150} y={280} textAnchor="middle" fill={MUTED} fontSize={15}>음수는 0으로, 양수는 그대로</text>
    </svg>
  );
}
const Relu: ComponentType<{ step: number }> = ({ step }) => {
  const x1 = 2, x2 = 3, w1 = 1, w2 = 1, b = -7;
  const z = w1 * x1 + w2 * x2 + b, y = Math.max(0, z);
  return (
    <Layout
      figure={
        <NeuronFigure
          inputs={[{ name: 'x₁', value: x1 }, { name: 'x₂', value: x2 }]}
          weights={[{ name: 'w₁', value: w1 }, { name: 'w₂', value: w2 }]}
          bias={{ value: b }}
          z={{ value: z, show: true, hot: step === 0 }}
          relu={{ hot: step >= 1 }}
          yhat={{ value: y, show: step >= 1, hot: step >= 1 }}
          flow={step === 1 ? 'out' : 'none'}
        />
      }
      aside={<div className={`lec-fade ${step >= 2 ? '' : 'opacity-0'}`}><ReluGraph show={step >= 3} /></div>}
      asideWidth={440}
      lines={[
        step === 0 ? <>1-2에서 <M>b = −7</M>일 때 <M>z = −2</M>, 음수였음. 이 <M>z</M>를 ReLU에 통과시킴.</> : null,
        step === 1 ? <>ReLU는 <Key>음수를 0으로</Key> 내보냄. <M>ŷ = ReLU(−2) = 0</M>.</> : null,
        step === 2 ? <>ReLU(z) = max(0, z). 0과 z 중 큰 쪽. 그래프는 0에서 한 번 꺾임.</> : null,
        step === 3 ? <>1-3 표. <M>z = −4, −1, 0, 2.5, 7</M> → <M>0, 0, 0, 2.5, 7</M>. 양수는 그대로.</> : null,
      ]}
    />
  );
};

/* ───────── 1-4 파라미터 세기 ① 3 × 2 × 1 ───────── */
function Node({ cx, cy, r, label, hot, muted }: { cx: number; cy: number; r: number; label?: string; hot?: boolean; muted?: boolean }) {
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill={muted ? BG : ACCENT_BG} stroke={hot ? ORANGE : muted ? MUTED : ACCENT} strokeWidth={hot ? 4 : 2.4} />
      {label && <text x={cx} y={cy + 8} textAnchor="middle" fill={muted ? TEXT : ACCENT} fontSize={22} fontWeight={700}>{label}</text>}
    </g>
  );
}
const Params1: ComponentType<{ step: number }> = ({ step }) => {
  const IX = 160, IY = [120, 220, 320];
  const HX = 480, HY = [170, 270];
  const OX = 780, OY = 220;
  return (
    <Layout
      figure={
        <Svg>
          {HY.map((hy, j) => IY.map((iy, i) => (
            <line key={`${j}${i}`} x1={IX + 34} y1={iy} x2={HX - 44} y2={hy} stroke={step === 1 ? ORANGE : MUTED} strokeWidth={step === 1 ? 4 : 2.5} strokeOpacity={step === 1 ? 0.9 : 0.5} />
          )))}
          {HY.map((hy, j) => <line key={j} x1={HX + 44} y1={hy} x2={OX - 44} y2={OY} stroke={step === 2 ? ORANGE : MUTED} strokeWidth={step === 2 ? 4 : 2.5} strokeOpacity={step === 2 ? 0.9 : 0.5} />)}
          {IY.map((iy, i) => <Node key={i} cx={IX} cy={iy} r={34} label={`x${['₁', '₂', '₃'][i]}`} muted />)}
          {HY.map((hy, j) => <Node key={j} cx={HX} cy={hy} r={44} hot={step === 3} />)}
          <Node cx={OX} cy={OY} r={44} hot={step === 3} />
          <text x={IX} y={390} textAnchor="middle" fill={MUTED} fontSize={19}>입력 3</text>
          <text x={HX} y={390} textAnchor="middle" fill={MUTED} fontSize={19}>은닉 2</text>
          <text x={OX} y={390} textAnchor="middle" fill={MUTED} fontSize={19}>출력 1</text>
          <Fade show={step >= 1}><Badge cx={(IX + HX) / 2} cy={60} label="선 3 × 2 = 6" color={ORANGE} fill={ORANGE_BG} size={24} /></Fade>
          <Fade show={step >= 2}><Badge cx={(HX + OX) / 2} cy={60} label="선 2 × 1 = 2" color={ORANGE} fill={ORANGE_BG} size={24} /></Fade>
          <Fade show={step >= 3}><Badge cx={(HX + OX) / 2} cy={410} label="입력을 뺀 뉴런 3 → 편향 3" color={ORANGE} fill={ORANGE_BG} size={24} /></Fade>
          <Fade show={step >= 4}>
            <rect x={840} y={150} width={150} height={140} rx={14} fill={SURFACE} stroke={ACCENT} strokeWidth={2} />
            <text x={915} y={190} textAnchor="middle" fill={MUTED} fontSize={19}>가중치 8</text>
            <text x={915} y={220} textAnchor="middle" fill={MUTED} fontSize={19}>+ 편향 3</text>
            <text x={915} y={266} textAnchor="middle" fill={ACCENT} fontSize={30} fontWeight={700}>= 11개</text>
          </Fade>
        </Svg>
      }
      lines={[
        step === 0 ? <>파라미터 = 학습으로 값이 정해지는 숫자, 곧 가중치와 편향 전부. 선 하나가 가중치 하나, 입력을 뺀 뉴런 하나마다 편향 하나.</> : null,
        step === 1 ? <>입력 → 은닉 선. 앞층 3 × 뒤층 2 = <M>6</M>개. 겹쳐 지나가는 선도 따로 셈.</> : null,
        step === 2 ? <>은닉 → 출력 선. 2 × 1 = <M>2</M>개. 선은 모두 8개.</> : null,
        step === 3 ? <>뉴런은 은닉 2 + 출력 1 = <M>3</M>개. 입력 동그라미는 값이 들어오는 자리라 편향이 없음.</> : null,
        step === 4 ? <>파라미터 = 8 + 3 = <Key>11개</Key>. 이 11개의 숫자가 학습으로 정해짐.</> : null,
      ]}
    />
  );
};

/* ───────── 1-4 파라미터 세기 ② 784 → 16 → 10 ───────── */
function colYs(ellipsis: boolean) {
  const top = 70, gap = 44;
  return Array.from({ length: 6 }, (_, i) => top + i * gap + (ellipsis && i >= 3 ? 40 : 0));
}
function Column({ x, r, label, show, ellipsis }: { x: number; r: number; label: string; show?: boolean; ellipsis?: boolean }) {
  const ys = colYs(!!ellipsis);
  return (
    <g>
      {ys.map((y, i) => <circle key={i} cx={x} cy={y} r={r} fill={show ? ACCENT_BG : BG} stroke={show ? ACCENT : MUTED} strokeWidth={2} />)}
      {ellipsis && <text x={x} y={70 + 3 * 44 + 6} textAnchor="middle" fill={MUTED} fontSize={26}>⋮</text>}
      <text x={x} y={ys[5] + 44} textAnchor="middle" fill={TEXT} fontSize={22} fontWeight={700}>{label}</text>
    </g>
  );
}
// 두 열의 그려진 동그라미를 모두 잇는 선 다발 (실제 선은 훨씬 많다는 것을 ⋮로 표시)
function Bundle({ x1, x2, r1, r2, hot }: { x1: number; x2: number; r1: number; r2: number; hot: boolean }) {
  const ys = colYs(true);
  return (
    <g>
      {ys.map((a, i) => ys.map((b, j) => (
        <line key={`${i}${j}`} x1={x1 + r1} y1={a} x2={x2 - r2} y2={b} stroke={hot ? ORANGE : MUTED} strokeWidth={hot ? 1.6 : 1.1} strokeOpacity={hot ? 0.6 : 0.28} />
      )))}
    </g>
  );
}
const Params2: ComponentType<{ step: number }> = ({ step }) => {
  const X = [200, 500, 800];
  return (
    <Layout
      figure={
        <Svg>
          <Bundle x1={X[0]} x2={X[1]} r1={16} r2={18} hot={step === 1} />
          <Bundle x1={X[1]} x2={X[2]} r1={18} r2={18} hot={step === 2} />
          <Column x={X[0]} r={16} label="입력 784" ellipsis />
          <Column x={X[1]} r={18} label="은닉 16" ellipsis show={step === 3} />
          <Column x={X[2]} r={18} label="출력 10" ellipsis show={step === 3} />
          <Fade show={step >= 1}><Badge cx={(X[0] + X[1]) / 2} cy={36} label="선 784 × 16 = 12,544" color={ORANGE} fill={ORANGE_BG} size={23} /></Fade>
          <Fade show={step >= 2}><Badge cx={(X[1] + X[2]) / 2} cy={36} label="선 16 × 10 = 160" color={ORANGE} fill={ORANGE_BG} size={23} /></Fade>
          <Fade show={step >= 3}><Badge cx={(X[1] + X[2]) / 2} cy={410} label="뉴런 16 + 10 = 26 → 편향 26" color={ORANGE} fill={ORANGE_BG} size={23} /></Fade>
          <Fade show={step >= 4}>
            <rect x={870} y={120} width={120} height={160} rx={14} fill={SURFACE} stroke={ACCENT} strokeWidth={2} />
            <text x={930} y={156} textAnchor="middle" fill={MUTED} fontSize={17}>12,544</text>
            <text x={930} y={182} textAnchor="middle" fill={MUTED} fontSize={17}>+ 160</text>
            <text x={930} y={208} textAnchor="middle" fill={MUTED} fontSize={17}>+ 26</text>
            <text x={930} y={254} textAnchor="middle" fill={ACCENT} fontSize={24} fontWeight={700}>12,730개</text>
          </Fade>
        </Svg>
      }
      lines={[
        step === 0 ? <>손글씨 숫자(28 × 28 = 784 픽셀)를 읽는 신경망. 선을 다 그릴 수 없음.</> : null,
        step === 1 ? <>앞층의 모든 뉴런이 뒤층의 모든 뉴런과 이어지니 선의 개수 = 앞층 × 뒤층. <M>784 × 16 = 12,544</M>.</> : null,
        step === 2 ? <><M>16 × 10 = 160</M>. 선은 모두 12,704개.</> : null,
        step === 3 ? <>편향은 입력을 뺀 뉴런 수. <M>16 + 10 = 26</M>.</> : null,
        step === 4 ? <>파라미터 <Key>12,730개</Key>. 1-4 ①의 11개보다 천 배가 넘음. 앱 C2의 화면과 같은 수.</> : null,
      ]}
    />
  );
};

/* ───────── 1-5 딥러닝 그림 읽기 (3 → 4 → 4 → 3 → 2) ───────── */
const DeepFigure: ComponentType<{ step: number }> = ({ step }) => {
  const sizes = [3, 4, 4, 3, 2];
  const X = [100, 275, 450, 625, 800];
  const ys = (n: number) => Array.from({ length: n }, (_, i) => 215 + (i - (n - 1) / 2) * 76);
  const edges = sizes.slice(0, -1).map((a, i) => a * sizes[i + 1]); // 12, 16, 12, 6
  return (
    <Layout
      figure={
        <Svg>
          {sizes.slice(0, -1).map((a, l) => ys(a).map((y1, i) => ys(sizes[l + 1]).map((y2, j) => (
            <line key={`${l}${i}${j}`} x1={X[l] + 26} y1={y1} x2={X[l + 1] - 26} y2={y2} stroke={step === 3 ? ORANGE : MUTED} strokeWidth={1.6} strokeOpacity={step === 3 ? 0.55 : 0.3} />
          ))))}
          {sizes.map((n, l) => ys(n).map((y, i) => (
            <circle key={`${l}${i}`} cx={X[l]} cy={y} r={26} fill={l === 0 ? BG : ACCENT_BG} stroke={l === 0 ? MUTED : (step === 2 ? ORANGE : ACCENT)} strokeWidth={step === 2 && l > 0 ? 3.5 : 2.2} />
          )))}
          <text x={X[0]} y={395} textAnchor="middle" fill={MUTED} fontSize={20}>입력 3</text>
          <Fade show={step >= 1}>
            <rect x={X[1] - 60} y={40} width={X[3] - X[1] + 120} height={30} rx={8} fill={ACCENT_BG} />
            <text x={(X[1] + X[3]) / 2} y={62} textAnchor="middle" fill={ACCENT} fontSize={20} fontWeight={700}>은닉층 3층</text>
            <text x={X[4]} y={395} textAnchor="middle" fill={step >= 2 ? ORANGE : MUTED} fontSize={step >= 2 ? 22 : 20} fontWeight={step >= 2 ? 700 : 400}>{step >= 2 ? '출력 2개' : '출력'}</text>
          </Fade>
          <Fade show={step >= 2}>
            {[4, 4, 3].map((n, i) => <text key={i} x={X[i + 1]} y={395} textAnchor="middle" fill={ORANGE} fontSize={22} fontWeight={700}>{n}개</text>)}
            <Badge cx={992} cy={60} anchor="end" label="뉴런 13" color={ORANGE} fill={ORANGE_BG} size={22} />
          </Fade>
          <Fade show={step >= 3}>
            {edges.map((e, i) => <Badge key={i} cx={(X[i] + X[i + 1]) / 2} cy={428} label={`${sizes[i]} × ${sizes[i + 1]} = ${e}`} color={ORANGE} fill={ORANGE_BG} size={19} />)}
            <Badge cx={992} cy={100} anchor="end" label="선 46" color={ORANGE} fill={ORANGE_BG} size={22} />
          </Fade>
          <Fade show={step >= 4}>
            <Badge cx={992} cy={142} anchor="end" label="파라미터 59" color={ACCENT} fill={ACCENT_BG} size={22} />
          </Fade>
        </Svg>
      }
      lines={[
        step === 0 ? <>딥러닝을 소개할 때 자주 보는 그림. 맨 왼쪽 열이 입력, 맨 오른쪽 열이 출력.</> : null,
        step === 1 ? <>그 사이가 <Key>은닉층</Key>(히든 레이어). 여기서는 3층. 밖에서 값이 보이지 않아 붙은 이름.</> : null,
        step === 2 ? <>층마다 뉴런 <M>4, 4, 3, 2</M>개. 입력을 뺀 뉴런은 모두 <M>13</M>개.</> : null,
        step === 3 ? <>선은 옆 열끼리만 잇고 곱해서 더함. <M>3×4 + 4×4 + 4×3 + 3×2 = 46</M>.</> : null,
        step === 4 ? <>파라미터 = 선 46 + 뉴런 13 = <Key>59개</Key>. 은닉층을 여러 층 쌓은 신경망이 깊은 신경망, 이를 학습시키는 방법이 <Key>딥러닝</Key>.</> : null,
      ]}
    />
  );
};

export const GOAL_SLIDE: SlideDef = { id: 'goals', section: 'neuron', tag: '학습 목표', title: '오늘 할 수 있게 되는 것 넷', steps: 3, component: Goals,
  notes: ['활동지 첫 쪽의 학습 목표 네 개. "3B 모델"의 B는 billion, 10억. 무엇이 10억 개인지 세션1 끝에서 센다.'] };

export const NEURON_EXTRA: SlideDef[] = [
  { id: 'a1-bias', section: 'neuron', tag: '1-2', title: '편향이 더해지면', steps: 3, component: Bias,
    notes: ['w₁ = w₂ = 1로 두면 가중치 부분은 늘 5. b를 0, 3, −7로 바꾸면 z가 5, 8, −2.', '앱 A1의 b 슬라이더는 −3까지라 −7은 종이로만 계산한다.'] },
  { id: 'a1-relu', section: 'neuron', tag: '1-3', title: '활성화 함수 ReLU', steps: 3, component: Relu,
    notes: ['1-2의 b = −7에서 z = −2가 ReLU를 지나 0. ReLU(0)은 0과 0 중 큰 쪽이라 0.'] },
  { id: 'a1-params1', section: 'neuron', tag: '1-4', title: '파라미터 세기 ① 3 × 2 × 1', steps: 4, component: Params1,
    notes: ['선 하나가 가중치 하나, 입력을 뺀 동그라미 하나가 편향 하나. 교차하는 선을 하나로 보는 학생이 있으니 선마다 번호를 붙이며 세게 한다.'] },
  { id: 'a1-params2', section: 'neuron', tag: '1-4', title: '파라미터 세기 ② 784 → 16 → 10', steps: 4, component: Params2,
    notes: ['선을 다 그릴 수 없으니 앞층 × 뒤층으로 센다. 784 × 10으로 바로 곱하는 실수에 주의. 앱 C2(#/c2?hidden=16)의 12,730과 같다.'] },
  { id: 'a1-deep', section: 'neuron', tag: '1-5', title: '딥러닝 그림 읽기', steps: 4, component: DeepFigure,
    notes: ['은닉층 3층, 뉴런 13개, 선 46개, 파라미터 59개. 층 수를 묻는 관례는 자료마다 달라서 "은닉층이 몇 층인가"로 묻는다.', '앱 C2(#/c2?hidden=16,16,16)로 세 층이 되면 파라미터 13,274.'] },
];
