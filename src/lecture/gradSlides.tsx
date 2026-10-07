// 기울기 유도 — 수식 중심, 가볍게. w → ŷ → L 연결 그래프에서 변화율 둘을 구해 곱한다.
// 코덱스본 79~82번의 흐름. 설명 문장은 한 줄, 클릭마다 기호 하나.
import type { ComponentType, ReactNode } from 'react';
import { Layout, M, Key, Hot } from './common';
import { ACCENT, ACCENT_BG, MUTED, TEXT, BG, ORANGE, VB_W, VB_H } from './NeuronFigure';
import type { SlideDef } from './slides';

const Svg = ({ children }: { children: ReactNode }) => (
  <svg viewBox={`0 0 ${VB_W} ${VB_H}`} className="w-full h-full" preserveAspectRatio="xMidYMid meet" fontFamily="Pretendard, system-ui, sans-serif">
    <defs>
      <marker id="gr-arr" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto" markerUnits="userSpaceOnUse"><path d="M0,0 L10,5 L0,10 z" fill={ACCENT} /></marker>
      <marker id="gr-arr-o" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto" markerUnits="userSpaceOnUse"><path d="M0,0 L10,5 L0,10 z" fill={ORANGE} /></marker>
    </defs>
    {children}
  </svg>
);
function Fade({ show, children }: { show: boolean; children: ReactNode }) {
  return <g className="lec-fade" style={{ opacity: show ? 1 : 0 }}>{children}</g>;
}
/* 분수 ∂a/∂b */
function Frac({ cx, cy, top, bot, size = 30, color = ACCENT }: { cx: number; cy: number; top: string; bot: string; size?: number; color?: string }) {
  const w = Math.max(top.length, bot.length) * size * 0.78 + size * 0.5;
  return (
    <g>
      <text x={cx} y={cy - size * 0.35} textAnchor="middle" fill={color} fontSize={size} fontWeight={700}>{top}</text>
      <line x1={cx - w / 2} y1={cy} x2={cx + w / 2} y2={cy} stroke={color} strokeWidth={2.5} />
      <text x={cx} y={cy + size * 1.05} textAnchor="middle" fill={color} fontSize={size} fontWeight={700}>{bot}</text>
    </g>
  );
}
function Box({ x, y, w, h, label, size = 34, hot }: { x: number; y: number; w: number; h: number; label: string; size?: number; hot?: boolean }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={16} fill={ACCENT_BG} stroke={ACCENT} strokeWidth={hot ? 4 : 2.5} />
      <text x={x + w / 2} y={y + h / 2 + size * 0.36} textAnchor="middle" fill={ACCENT} fontSize={size} fontWeight={700}>{label}</text>
    </g>
  );
}
function Arrow({ x1, x2, y, hot }: { x1: number; x2: number; y: number; hot?: boolean }) {
  return <line x1={x1} y1={y} x2={x2} y2={y} stroke={ACCENT} strokeWidth={hot ? 5 : 3.5} strokeOpacity={hot ? 1 : 0.6} markerEnd="url(#gr-arr)" className={hot ? 'lec-flow' : ''} />;
}
function Big({ x, y, text, color = TEXT, size = 36, anchor = 'start', bold = true }: { x: number; y: number; text: string; color?: string; size?: number; anchor?: 'start' | 'middle' | 'end'; bold?: boolean }) {
  return <text x={x} y={y} textAnchor={anchor} fill={color} fontSize={size} fontWeight={bold ? 700 : 500}>{text}</text>;
}
/* ───────── w → ŷ → L 연결 그래프 ───────── */
// step 0 상자, 1 화살표 강조, 2 화살표 아래 변화율(기호), 3 연쇄법칙 식(기호)
// values: 변화율 자리에 값(x, e)을 함께 표시. children: 아래쪽 식 영역(y 280~440)을 바깥에서 그린다.
function ChainGraph({ step, values, children, compact }: { step: number; values?: boolean; children?: ReactNode; compact?: boolean }) {
  const BY = compact ? 28 : 60, BH = compact ? 76 : 90;
  const FY = compact ? 150 : 200; // 변화율 분수의 세로 위치
  const lift = !compact && !values && step < 3; // 식이 나오기 전에는 그래프를 가운데로
  return (
    <Svg>
      <g style={{ transform: lift ? 'translateY(110px)' : 'translateY(0)', transition: 'transform 0.45s ease' }}>
      <Box x={40} y={BY} w={170} h={BH} label="w, b" hot={step === 1} />
      <Arrow x1={226} x2={326} y={BY + BH / 2} hot={step === 1} />
      <Box x={340} y={BY} w={300} h={BH} label="ŷ = wx + b" hot={step === 1} />
      <Arrow x1={656} x2={756} y={BY + BH / 2} hot={step === 1} />
      <Box x={770} y={BY} w={210} h={BH} label="L = ½e²" hot={step === 1} />
      {!compact && <text x={276} y={BY - 14} textAnchor="middle" fill={MUTED} fontSize={20}>w, b가 바뀌면 ŷ이 바뀜</text>}
      {!compact && <text x={706} y={BY - 14} textAnchor="middle" fill={MUTED} fontSize={20}>ŷ이 바뀌면 L이 바뀜</text>}
      <Fade show={step >= 2}>
        <Frac cx={230} cy={FY} top="∂ŷ" bot="∂w" size={compact ? 26 : 30} />
        {values && <Big x={268} y={FY + 10} text="= x" color={ORANGE} size={30} />}
        <Frac cx={676} cy={FY} top="∂L" bot="∂ŷ" size={compact ? 26 : 30} />
        {values && <Big x={714} y={FY + 10} text="= e" color={ORANGE} size={30} />}
        {values && <Frac cx={380} cy={FY} top="∂ŷ" bot="∂b" size={26} />}
        {values && <Big x={418} y={FY + 10} text="= 1" color={ORANGE} size={30} />}
      </Fade>
      </g>
      {!values && (
        <Fade show={step >= 3}>
          <Frac cx={110} cy={360} top="∂L" bot="∂w" size={34} color={TEXT} />
          <Big x={175} y={372} text="=" size={34} />
          <Frac cx={270} cy={360} top="∂L" bot="∂ŷ" size={34} />
          <Big x={335} y={372} text="×" size={34} />
          <Frac cx={430} cy={360} top="∂ŷ" bot="∂w" size={34} />
          <rect x={560} y={330} width={420} height={62} rx={12} fill={BG} stroke={MUTED} strokeOpacity={0.4} />
          <text x={770} y={370} textAnchor="middle" fill={MUTED} fontSize={22}>∂ = 다른 값은 두고 이 값만 바꿀 때의 변화율</text>
        </Fade>
      )}
      {children}
    </Svg>
  );
}

/* 아래쪽 식 한 줄: ∂L/∂p = ∂L/∂ŷ × ∂ŷ/∂p → 값을 대입해 e × x (또는 e × 1 = e)
   sub: 0 기호만, 1 분수가 값으로 바뀜, 2 결과 */
function ChainRow({ y, p, sub, show }: { y: number; p: 'w' | 'b'; sub: number; show: boolean }) {
  const val = p === 'w' ? 'x' : '1';
  return (
    <Fade show={show}>
      <Frac cx={110} cy={y} top="∂L" bot={`∂${p}`} size={32} color={TEXT} />
      <Big x={172} y={y + 11} text="=" size={34} />
      {/* ∂L/∂ŷ → e */}
      <g className="lec-fade" style={{ opacity: sub >= 1 ? 0 : 1 }}><Frac cx={262} cy={y} top="∂L" bot="∂ŷ" size={32} /></g>
      <g className="lec-fade" style={{ opacity: sub >= 1 ? 1 : 0 }}><Big x={262} y={y + 11} text="e" color={ORANGE} size={40} anchor="middle" /></g>
      <Big x={326} y={y + 11} text="×" size={34} />
      {/* ∂ŷ/∂p → x 또는 1 */}
      <g className="lec-fade" style={{ opacity: sub >= 1 ? 0 : 1 }}><Frac cx={416} cy={y} top="∂ŷ" bot={`∂${p}`} size={32} /></g>
      <g className="lec-fade" style={{ opacity: sub >= 1 ? 1 : 0 }}><Big x={416} y={y + 11} text={val} color={ORANGE} size={40} anchor="middle" /></g>
      <Fade show={sub >= 2}>
        <Big x={500} y={y + 11} text={p === 'w' ? '= e × x' : '= e × 1 = e'} color={ORANGE} size={40} />
        <Big x={p === 'w' ? 760 : 820} y={y + 11} text={p === 'w' ? '→ dw = e·x' : '→ db = e'} color={TEXT} size={34} />
      </Fade>
    </Fade>
  );
}

const GChain: ComponentType<{ step: number }> = ({ step }) => (
  <Layout
    figure={<ChainGraph step={step} />}
    lines={[
      step === 0 ? <>기울기 = <M>w</M>(또는 <M>b</M>)를 조금 바꾸면 <M>L</M>이 얼마나 바뀌나. <M>w</M>는 <M>L</M>을 직접 바꾸지 않음.</> : null,
      step === 1 ? <><M>w</M>가 <M>ŷ</M>을 바꾸고, <M>ŷ</M>이 <M>L</M>을 바꿈. 두 단계.</> : null,
      step === 2 ? <>단계마다 변화율 하나. 기호 <Key>∂</Key>로 씀.</> : null,
      step === 3 ? <>연결된 변화율은 <Key>곱함</Key>. <Key>연쇄법칙</Key>. 이제 둘을 각각 구함.</> : null,
    ]}
  />
);

/* ───────── 손실을 미분하면 오차 ───────── */
const GLoss: ComponentType<{ step: number }> = ({ step }) => {
  const Y1 = 120, Y2 = 290;
  return (
    <Layout
      figure={
        <Svg>
          <Big x={140} y={Y1} text="L = ½ (ŷ − y)²" size={46} />
          <text x={600} y={Y1} fill={MUTED} fontSize={22}>정답 y는 고정 · ŷ에 대해 미분</text>
          <Fade show={step >= 1}>
            <Frac cx={185} cy={Y2 - 12} top="∂L" bot="∂ŷ" size={36} color={TEXT} />
            <Big x={262} y={Y2} text="=" size={44} />
            <Big x={320} y={Y2} text="½" size={46} anchor="middle" />
            <Big x={372} y={Y2} text="×" size={44} anchor="middle" />
            <Big x={425} y={Y2} text="2" size={46} anchor="middle" />
            <Big x={458} y={Y2} text="(ŷ − y)" size={46} />
          </Fade>
          <Fade show={step >= 2}>
            <line x1={300} y1={Y2 + 14} x2={340} y2={Y2 - 40} stroke={ORANGE} strokeWidth={4} strokeLinecap="round" />
            <line x1={407} y1={Y2 + 14} x2={443} y2={Y2 - 40} stroke={ORANGE} strokeWidth={4} strokeLinecap="round" />
            <text x={372} y={Y2 - 62} textAnchor="middle" fill={ORANGE} fontSize={24} fontWeight={700}>½ × 2 = 1</text>
          </Fade>
          <Fade show={step >= 3}>
            <Big x={640} y={Y2} text="= ŷ − y" size={46} />
            <Big x={840} y={Y2} text="= e" size={52} color={ORANGE} />
          </Fade>
        </Svg>
      }
      lines={[
        step === 0 ? <>손실 <M>L</M>을 예측값 <M>ŷ</M>에 대해 미분함.</> : null,
        step === 1 ? <>제곱을 미분하면 2가 앞으로 나오고 제곱은 한 단계 줄어듦.</> : null,
        step === 2 ? <>½과 2가 서로 지워짐.</> : null,
        step === 3 ? <>남는 것은 <M>ŷ − y</M>, 곧 오차 <Hot>e</Hot>. 손실의 변화율은 오차임.</> : null,
      ]}
    />
  );
};

/* ───────── 예측값을 미분하면 x ───────── */
const GPred: ComponentType<{ step: number }> = ({ step }) => {
  const Y1 = 110, Y2 = 250, Y3 = 380;
  return (
    <Layout
      figure={
        <Svg>
          <Big x={140} y={Y1} text="ŷ = wx + b" size={46} />
          <Fade show={step >= 1}>
            <Frac cx={185} cy={Y2 - 12} top="∂ŷ" bot="∂w" size={36} color={TEXT} />
            <Big x={262} y={Y2} text="= x + 0" size={46} />
            <Big x={500} y={Y2} text="= x" size={52} color={ORANGE} />
            <text x={640} y={Y2} fill={MUTED} fontSize={22}>b는 w와 상관없으니 0</text>
          </Fade>
          <Fade show={step >= 2}>
            <Frac cx={185} cy={Y3 - 12} top="∂ŷ" bot="∂b" size={36} color={TEXT} />
            <Big x={262} y={Y3} text="= 0 + 1" size={46} />
            <Big x={500} y={Y3} text="= 1" size={52} color={ORANGE} />
            <text x={640} y={Y3} fill={MUTED} fontSize={22}>wx는 b와 상관없으니 0</text>
          </Fade>
        </Svg>
      }
      lines={[
        step === 0 ? <>예측값 <M>ŷ</M>을 <M>w</M>에 대해, 그리고 <M>b</M>에 대해 미분함.</> : null,
        step === 1 ? <><M>w</M>에 대해 미분하면 계수 <Hot>x</Hot>가 남음.</> : null,
        step === 2 ? <><M>b</M>에 대해 미분하면 <Hot>1</Hot>.</> : null,
      ]}
    />
  );
};

/* ───────── 연결하면 dw = e·x, db = e ───────── */
// step 0 값이 들어간 그래프 + w 줄(기호), 1 w 줄 대입, 2 w 결과, 3 b 줄(기호), 4 b 대입, 5 b 결과
const GConnect: ComponentType<{ step: number }> = ({ step }) => (
  <Layout
    figure={
      <ChainGraph step={2} values compact>
        <ChainRow y={290} p="w" sub={step >= 2 ? 2 : step >= 1 ? 1 : 0} show />
        <ChainRow y={390} p="b" sub={step >= 5 ? 2 : step >= 4 ? 1 : 0} show={step >= 3} />
      </ChainGraph>
    }
    lines={[
      step === 0 ? <>구한 변화율 둘을 그래프에 적음. <M>∂ŷ/∂w = x</M>, <M>∂ŷ/∂b = 1</M>, <M>∂L/∂ŷ = e</M>.</> : null,
      step === 1 ? <><M>w</M> 줄. 분수 자리에 <Hot>e</Hot>와 <Hot>x</Hot>를 넣음.</> : null,
      step === 2 ? <>곱하면 <Hot>e × x</Hot>. 이것을 <Key>dw</Key>라고 부름.</> : null,
      step === 3 ? <><M>b</M> 줄도 같은 길.</> : null,
      step === 4 ? <>분수 자리에 <Hot>e</Hot>와 <Hot>1</Hot>을 넣음.</> : null,
      step === 5 ? <>1을 곱하니 그대로 <Hot>e</Hot>. 이것이 <Key>db</Key>. <M>dw = e·x, db = e</M>.</> : null,
    ]}
  />
);

export const GRAD_DERIVE_SLIDES: SlideDef[] = [
  { id: 'g-chain', section: 'grad', tag: '4-B', title: 'w → ŷ → L, 연결된 변화율을 곱한다', steps: 3, component: GChain,
    notes: ['가중치가 손실을 바로 바꾸는 것이 아니라 예측값을 거쳐 바꿈. 그래서 변화율 둘을 곱함.', '∂는 "다른 값은 고정하고 이 값만 바꿀 때의 변화율". 고등학교 과정이라고 단정하지 않음.'] },
  { id: 'g-loss', section: 'grad', tag: '4-B', title: '손실을 미분하면 오차', steps: 3, component: GLoss,
    notes: ['약 45초. 제곱을 미분하면 2가 앞으로 나오고, ½과 2가 지워져 ŷ − y = e만 남음.', '[교사용] 속 미분값 1이 반영된 결과. 제곱의 2만 내리면 끝난다고 일반화하지 않음.'] },
  { id: 'g-pred', section: 'grad', tag: '4-B', title: '예측값을 미분하면 x', steps: 2, component: GPred,
    notes: ['x와 b를 고정하고 w에 대해 미분하면 wx의 계수 x만 남음. b에 대해서는 1.'] },
  { id: 'g-connect', section: 'grad', tag: '4-B', title: '연결하면 dw = e·x, db = e', steps: 5, component: GConnect,
    notes: ['앞에서 구한 e와 x를 연쇄법칙에 넣음. b는 1을 곱하니 e 그대로.', '이 다음 장에서 4-B 식 상자가 처음 등장함.'] },
];
