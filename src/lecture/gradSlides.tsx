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
          <text x={875} y={BY + BH + 26} textAnchor="middle" fill={MUTED} fontSize={20}>e = ŷ − y</text>
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
          <text x={770} y={369} textAnchor="middle" fill={MUTED} fontSize={19}>∂L/∂w = 다른 값은 두고 w만 바꿀 때 L의 변화율</text>
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
      step === 0 ? <>기울기(변화율)는 다른 값은 두고 <M>w</M>나 <M>b</M>만 아주 조금 바꿀 때 <M>L</M>이 변하는 비율임. <M>w</M>는 <M>L</M>을 직접 바꾸지 않음.</> : null,
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
        step === 0 ? <>손실 <M>L</M>을 예측값 <M>ŷ</M>에 대해 미분함. 미분은 변화율을 구하는 계산임.</> : null,
        step === 1 ? <>제곱을 미분하면 2가 앞으로 나오고 제곱은 한 단계 줄어듦.</> : null,
        step === 2 ? <>½과 2가 서로 지워짐.</> : null,
        step === 3 ? <>남는 것은 <M>ŷ − y</M>, 곧 오차 <Hot>e</Hot>. ŷ이 변할 때 손실의 변화율이 오차임.</> : null,
        step === 3 ? <>4A에서 접선 기울기가 오차 e와 같았던 것과 이어짐.</> : null,
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
        step === 1 ? <><M>w</M>에 대해 미분하면 w 앞에 곱해진 <Hot>x</Hot>가 남음. 입력이 클수록 w의 변화가 예측을 더 크게 바꿈.</> : null,
        step === 2 ? <><M>b</M>에 대해 미분하면 <Hot>1</Hot>. b는 입력과 무관하게 더해지기 때문임.</> : null,
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
      step === 5 ? <>4-A에서 b의 기울기가 오차 e와 같았던 이유가 이것임.</> : null,
    ]}
  />
);

/* ───────── 4-A 식 유도: L = ½e² → 미분 → e (삼각형 읽기 다음 장) ───────── */
// 사용자 결정(2026-10-15): (b − 1)² 대신 e²로 쓴다. 53장에서 e = b − 1이므로 b의 기울기 = e의 기울기.
const GdDeriveB: ComponentType<{ step: number }> = ({ step }) => {
  const Y1 = 96, Y2 = 236, Y3 = 392;
  return (
    <Layout
      figure={
        <Svg>
          <Big x={120} y={Y1} text="L = ½ e²" size={46} />
          <text x={420} y={Y1} fill={MUTED} fontSize={22}>e = b − 1 (53장) · 미분 = 접선의 기울기</text>
          <Fade show={step >= 1}>
            <Big x={120} y={Y2} text="미분하면" size={30} color={MUTED} bold={false} />
            <Big x={300} y={Y2} text="½" size={46} anchor="middle" />
            <Big x={352} y={Y2} text="×" size={44} anchor="middle" />
            <Big x={405} y={Y2} text="2" size={46} anchor="middle" />
            <Big x={438} y={Y2} text="e" size={46} />
          </Fade>
          <Fade show={step >= 2}>
            <line x1={280} y1={Y2 + 14} x2={320} y2={Y2 - 40} stroke={ORANGE} strokeWidth={4} strokeLinecap="round" />
            <line x1={387} y1={Y2 + 14} x2={423} y2={Y2 - 40} stroke={ORANGE} strokeWidth={4} strokeLinecap="round" />
            <text x={352} y={Y2 - 62} textAnchor="middle" fill={ORANGE} fontSize={24} fontWeight={700}>½ × 2 = 1</text>
            <Big x={540} y={Y2} text="= e" size={52} color={ORANGE} />
            <text x={680} y={Y2} fill={MUTED} fontSize={24}>기울기 = 오차</text>
          </Fade>
          <Fade show={step >= 3}>
            <text x={540} y={Y2 + 46} fill={ORANGE} fontSize={24} fontWeight={700}>b = −2 → e = −3 → 기울기 −3</text>
            <text x={540} y={Y2 + 78} fill={MUTED} fontSize={21}>앞 장에서 삼각형으로 읽은 접선 기울기와 같음</text>
          </Fade>
          <Fade show={step >= 4}>
            <Big x={120} y={Y3} text="½이 없으면 e²" size={36} color={MUTED} />
            <Big x={440} y={Y3} text="→ 미분 → 2e" size={36} color={MUTED} />
            <text x={720} y={Y3} fill={MUTED} fontSize={24} fontWeight={700}>e = −3 → −6, 오차의 2배</text>
          </Fade>
        </Svg>
      }
      lines={[
        step === 0 ? <>손실은 <M>L = ½e²</M>. 53장에서 <M>e = b − 1</M>이었음.</> : null,
        step === 0 ? <>접선의 기울기는 식으로도 구함. 곡선의 기울기를 구하는 계산이 <Key>미분</Key>.</> : null,
        step === 1 ? <>제곱을 미분하면 2가 앞으로 나오고 제곱은 한 단계 줄어듦. <M>½ × 2e</M>.</> : null,
        step === 2 ? <>½과 2가 서로 지워짐. 남는 것은 <Hot>e</Hot>. <Key>기울기 = 오차</Key>.</> : null,
        step === 3 ? <><M>b = −2</M>이면 <M>e = −3</M>, 기울기 <Hot>−3</Hot>. 앞 장에서 삼각형으로 읽은 값과 같음.</> : null,
        step === 4 ? <>½이 없으면 <M>e² → 2e</M>. <M>e = −3</M>에서 −6, 오차의 2배.</> : null,
        step === 5 ? <>그래서 ½을 곱함. <Key>기울기 = 오차 e</Key>.</> : null,
        step === 5 ? <>4A-2 표의 기울기 <M>−3, −1.5, −0.75</M>는 그때의 오차 <M>e = b − 1</M>.</> : null,
      ]}
    />
  );
};
export const GD_DERIVE_B: SlideDef = { id: 'gd-derive-b', section: 'gd', tag: '4-A', title: '식으로 확인한다: 손실을 미분하면 오차', formula: 'L = ½e²', steps: 5, component: GdDeriveB,
  notes: ['(2026-10-15 결정으로 덱에서 뺌. 4-A는 숫자로만 다루고 유도는 4-B에서.) L = ½e²을 미분하면 e. 53장에서 e = b − 1이므로 b의 기울기도 e입니다(b가 1 커지면 e도 1 커짐).', '63장(손실을 ŷ에 대해 미분)과 같은 모양이라 4-B 유도의 예고가 됩니다. "미분"은 "곡선의 기울기를 구하는 계산"으로만 소개합니다.'] };

export const GRAD_DERIVE_SLIDES_OLD: SlideDef[] = [
  { id: 'g-chain', section: 'grad', tag: '4-B', title: 'w → ŷ → L, 연결된 변화율을 곱한다', steps: 3, component: GChain,
    notes: ['가중치가 손실을 바로 바꾸는 것이 아니라 예측값을 거쳐 바꿈. 그래서 변화율 둘을 곱함.', '∂는 "다른 값은 고정하고 이 값만 바꿀 때의 변화율". 고등학교 과정이라고 단정하지 않음.'] },
  { id: 'g-loss', section: 'grad', tag: '4-B', title: '손실을 미분하면 오차', steps: 3, component: GLoss,
    notes: ['약 45초. 제곱을 미분하면 2가 앞으로 나오고, ½과 2가 지워져 ŷ − y = e만 남음.', '[교사용] 속 미분값 1이 반영된 결과. 제곱의 2만 내리면 끝난다고 일반화하지 않음.'] },
  { id: 'g-pred', section: 'grad', tag: '4-B', title: '예측값을 미분하면 x', steps: 2, component: GPred,
    notes: ['x와 b를 고정하고 w에 대해 미분하면 wx의 계수 x만 남음. b에 대해서는 1.'] },
  { id: 'g-connect', section: 'grad', tag: '4-B', title: '연결하면 dw = e·x, db = e', steps: 5, component: GConnect,
    notes: ['앞에서 구한 e와 x를 연쇄법칙에 넣음. b는 1을 곱하니 e 그대로.', '이 다음 장에서 4-B 식 상자가 처음 등장함.'] },
];


/* ───────── 2026-10-16 단순화: 뉴럴 익스플로러 C1 유도 카드 수준. 일곱 장 카드가 클릭마다 하나씩 나타난다 ───────── */
import katex from 'katex';
const TeX = ({ tex, size = 30 }: { tex: string; size?: number }) => (
  <div style={{ fontSize: size }} dangerouslySetInnerHTML={{ __html: katex.renderToString(tex, { throwOnError: false, displayMode: true }) }} />
);
const OR = (t: string, on: boolean) => (on ? String.raw`\textcolor{#ea580c}{${t}}` : t);
// 카드 5(step 4)에서는 앞서 유도한 e(카드 3)와 x(카드 4)를, 카드 6(step 5)에서는 e를 주황으로 비춘다
const cards = (step: number): { tex: string; text: string }[] => {
  const s4 = step === 4, s5 = step === 5;
  return [
    { tex: String.raw`L = \tfrac12 e^2 = \tfrac12(\hat y - y)^2`, text: '한 점의 손실. ½은 수식을 깔끔하게 만들기 위한 장치' },
    { tex: String.raw`\frac{\partial L}{\partial w} = \frac{\partial L}{\partial \hat y}\cdot\frac{\partial \hat y}{\partial w}`, text: 'w → ŷ → L. 두 비율을 곱함' },
    { tex: String.raw`\frac{\partial L}{\partial \hat y} = \tfrac12\cdot 2(\hat y - y) = ` + OR('e', s4 || s5), text: 'ŷ이 조금 변할 때 L은? ½과 2가 지워져 e' },
    { tex: String.raw`\frac{\partial \hat y}{\partial w} = \frac{\partial (wx+b)}{\partial w} = ` + OR('x', s4), text: 'w가 조금 변할 때 ŷ은? wx는 x배, b는 무관' },
    { tex: String.raw`\frac{\partial L}{\partial w} = ` + OR('e', s4) + String.raw` \cdot ` + OR('x', s4) + String.raw` \;\;\Rightarrow\;\; dw = ` + OR('e', s4) + String.raw` \cdot ` + OR('x', s4), text: '곱하면 끝' },
    { tex: String.raw`\frac{\partial L}{\partial b} = \frac{\partial L}{\partial \hat y}\cdot\frac{\partial \hat y}{\partial b} = ` + OR('e', s5) + String.raw` \cdot \frac{\partial (wx+b)}{\partial b} = ` + OR('e', s5) + String.raw` \cdot 1 = ` + OR('e', s5), text: 'b도 같은 길. b가 변하면 ŷ도 같은 양만큼 변하니 비율 1. 그래서 db = e' },
    { tex: String.raw`dw = e \cdot x, \qquad db = e`, text: '기울기 식 완성. 활동지 4-B 상자의 넷째 줄' },
    { tex: String.raw`\text{새 } w = w - \eta \cdot dw, \qquad \text{새 } b = b - \eta \cdot db`, text: '업데이트. 기울기의 반대 방향으로 η × 기울기만큼. η = 0.05' },
  ];
};
const GDeriveCards: ComponentType<{ step: number }> = ({ step }) => (
  <Layout
    lines={[
      step === 0 ? <>손실은 <M>L = ½e² = ½(ŷ − y)²</M>. ½은 수식을 깔끔하게 만들기 위한 장치.</> : null,
      step === 1 ? <><M>w</M>가 조금 변할 때 <M>L</M>은 얼마나 변할까?</> : null,
      step === 1 ? <>= (<M>ŷ</M>이 변할 때 <M>L</M>은 얼마나) × (<M>w</M>가 변할 때 <M>ŷ</M>은 얼마나)</> : null,
      step === 2 ? <><M>ŷ</M>이 조금 변할 때 <M>L</M>은 얼마나 변하나? ½과 2가 지워져 오차 <Hot>e</Hot>.</> : null,
      step === 3 ? <><M>w</M>가 조금 변할 때 <M>ŷ</M>은 얼마나 변하나? <M>wx</M>는 <Hot>x</Hot>배, <M>b</M>는 <M>w</M>와 무관.</> : null,
      step === 4 ? <>둘을 곱함. <Key>dw = e · x</Key>.</> : null,
      step === 5 ? <><M>b</M>는 <M>ŷ</M>을 같은 양만큼 바꾸니 비율 1. <Key>db = e</Key>.</> : null,
      step === 6 ? <>기울기 식 완성. <Key>dw = e · x, db = e</Key>.</> : null,
      step === 7 ? <>업데이트는 4-A와 같은 식. 활동지 4-B 상자의 식이 모두 나왔음. 이제 숫자만 넣으면 됨.</> : null,
    ]}
    figure={<div className="h-full grid grid-cols-2 grid-rows-4 grid-flow-col gap-x-[28px] gap-y-[14px]">
      {cards(step).map((c, i) => (
        <div key={i} className={`rounded-2xl border-2 px-[22px] py-[6px] flex items-center gap-[18px] overflow-hidden transition-opacity duration-300 ${i > step ? 'opacity-0' : i === step ? 'border-accent bg-accent-bg/40' : 'border-border opacity-80'}`}>
          <div className={`shrink-0 w-[34px] h-[34px] rounded-full flex items-center justify-center text-[18px] font-bold ${i === step ? 'bg-accent text-white' : 'bg-accent-bg text-accent'}`}>{i + 1}</div>
          <div className="min-w-0 flex-1">
            <TeX tex={c.tex} size={i === 6 ? 28 : i === 7 ? 24 : i === 5 ? 20 : 23} />
            <div className="text-[18px] text-muted leading-tight -mt-[6px]">{c.text}</div>
          </div>
        </div>
      ))}
    </div>}
  />
);
export const GRAD_DERIVE_SLIDES: SlideDef[] = [
  { id: 'g-derive-cards', section: 'grad', tag: '4-B', title: '기울기 식은 어떻게 나올까?', formula: 'dw = e·x,  db = e', steps: 7, component: GDeriveCards,
    notes: ['오늘은 흐름만 듣는다고 말하고 빠르게 지나간다. 목표는 활동지 4-B 상자의 식 dw = e·x, db = e가 "그런가 보다 / 아 그렇구나"가 되는 것.', '핵심 문장: w가 조금 변할 때 L이 얼마나 변하나 = (ŷ이 변할 때 L이 얼마나) × (w가 변할 때 ŷ이 얼마나). 앞 괄호가 e, 뒤 괄호가 x. b는 뒤 괄호가 1.'] },
];
