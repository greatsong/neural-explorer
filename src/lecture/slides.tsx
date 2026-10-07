// 특강 슬라이드 정의 — 시안: 세션1(인공 뉴런) 세 장, 기울기 화면 네 장, 한 step 두 장.
// 숫자는 활동지 v2와 같다. 1-1 시범(x₁ 2, x₂ 3, w₁ 2, w₂ 1, b 0 → z 7), 4B 모델(x 3, y 7, w 0, b 0, η 0.05).
import { useEffect, useRef, useState, type ComponentType } from 'react';
import { NeuronFigure, ACCENT, ORANGE, type BackSpec } from './NeuronFigure';
import { Layout, M, Key, Hot, Slider, fmt, par, relu } from './common';
import { FORWARD_SLIDES, LOSS_SLIDES, GD_SLIDES } from './sectionSlides';
import { GRAD_DERIVE_SLIDES } from './gradSlides';

export interface SlideDef {
  id: string;
  section: SectionId;
  tag?: string;      // 활동지 문항 번호 (작게)
  title: string;
  sub?: string;
  steps: number;     // 클릭 단계 수 (0..steps)
  component: ComponentType<{ step: number }>;
  notes?: string[];
}
export type SectionId = 'neuron' | 'forward' | 'loss' | 'gd' | 'grad';
export const SECTIONS: { id: SectionId; label: string }[] = [
  { id: 'neuron', label: '인공 뉴런' },
  { id: 'forward', label: '순전파' },
  { id: 'loss', label: '오차와 손실' },
  { id: 'gd', label: '경사하강법' },
  { id: 'grad', label: '기울기 계산과 업데이트' },
];

/* ───────── 0. 표지 ───────── */
const Cover: ComponentType<{ step: number }> = () => (
  <div className="h-full flex flex-col items-center justify-center text-center">
    <div className="text-[26px] text-muted mb-[18px]">NEURAL EXPLORER · 특강</div>
    <div className="text-[76px] font-bold leading-tight tracking-tight">손으로 풀어보는<br />딥러닝의 원리</div>
    <div className="mt-[40px] flex items-center gap-[14px] text-[24px] text-muted">
      {SECTIONS.map((s, i) => <span key={s.id} className="flex items-center gap-[14px]"><span className="px-[14px] py-[4px] rounded-full border border-border">{s.label}</span>{i < SECTIONS.length - 1 && <span>→</span>}</span>)}
    </div>
    <div className="mt-[44px] text-[22px] text-muted">종이와 펜으로 계산함 · 화면은 그 계산이 그림의 어디에서 나오는지 보여 줌</div>
  </div>
);

/* ───────── 1-1. 인공 뉴런 하나 ───────── */
const A1Predict: ComponentType<{ step: number }> = ({ step }) => {
  const x1 = 2, x2 = 3, w1 = 2, w2 = 1, b = 0;
  const z = w1 * x1 + w2 * x2 + b, y = relu(z);
  const s = step;
  return (
    <Layout
      figure={
        <NeuronFigure
          symbolic={s === 0}
          inputs={[{ name: 'x₁', value: s >= 1 ? x1 : null }, { name: 'x₂', value: s >= 1 ? x2 : null }]}
          weights={[
            { name: 'w₁', value: s >= 2 ? w1 : null, hot: s === 2, product: s >= 2 ? `${w1} × ${x1} = ${w1 * x1}` : undefined },
            { name: 'w₂', value: s >= 2 ? w2 : null, hot: s === 2, product: s >= 2 ? `${w2} × ${x2} = ${w2 * x2}` : undefined },
          ]}
          bias={{ value: s >= 3 ? b : null, hot: s === 3 }}
          z={{ value: z, show: s >= 3, hot: s === 3 }}
          relu={{ hot: s === 4 }}
          yhat={{ value: y, show: s >= 4, hot: s >= 4 }}
          flow={s === 2 ? 'inputs' : s === 3 ? 'sum' : s === 4 ? 'out' : 'none'}
        />
      }
      lines={[
        s === 0 ? <>입력 <M>x</M>가 선을 타고 들어와 뉴런을 지나면 예측값 <M>ŷ</M>이 나옴.</> : null,
        s === 1 ? <>입력은 <Key>x₁ = 2, x₂ = 3</Key>.</> : null,
        s === 2 ? <>선마다 가중치가 있음. 입력에 가중치를 <Key>곱한다</Key>. <M>2 × 2 = 4, 1 × 3 = 3</M></> : null,
        s === 3 ? <>곱한 것을 <Key>모두 더하고</Key> 편향 <M>b</M>를 더함. <M>z = 4 + 3 + 0 = 7</M></> : null,
        s === 4 ? <><M>z</M>가 <Key>ReLU</Key>를 지나 예측값이 됨. 양수는 그대로. <M>ŷ = ReLU(7) = 7</M></> : null,
        s === 5 ? <M>z = w₁·x₁ + w₂·x₂ + b = 2·2 + 1·3 + 0 = 7,   ŷ = ReLU(z) = 7</M> : null,
      ]}
    />
  );
};

/* ───────── 1-1 관찰. 가중치가 음수이면 ───────── */
const A1Negative: ComponentType<{ step: number }> = ({ step }) => {
  const x1 = 2, x2 = 3;
  const [w1, setW1] = useState(2);
  const [w2, setW2] = useState(1);
  const [b, setB] = useState(0);
  useEffect(() => { if (step === 0) { setW1(2); setW2(1); setB(0); } if (step === 1) { setW1(2); setW2(-1); setB(0); } }, [step]);
  const z = w1 * x1 + w2 * x2 + b, y = relu(z);
  const worksheet = w1 === 2 && w2 === -1 && b === 0;
  const custom = step === 0 ? !(w1 === 2 && w2 === 1 && b === 0) : !worksheet;
  return (
    <Layout
      figure={
        <NeuronFigure
          inputs={[{ name: 'x₁', value: x1 }, { name: 'x₂', value: x2 }]}
          weights={[
            { name: 'w₁', value: w1, product: `${fmt(w1)} × ${x1} = ${fmt(w1 * x1)}` },
            { name: 'w₂', value: w2, hot: step >= 1, product: `${fmt(w2)} × ${x2} = ${fmt(w2 * x2)}` },
          ]}
          bias={{ value: b }}
          z={{ value: z, show: true, hot: step >= 1 }}
          yhat={{ value: y, show: true, hot: true }}
          flow={step >= 1 ? 'inputs' : 'none'}
        />
      }
      aside={
        <div onClick={(e) => e.stopPropagation()}>
          <div className="text-[18px] text-muted mb-[10px]">값을 바꿔 보기</div>
          <Slider label="w₁" value={w1} set={setW1} min={-3} max={3} step={0.5} />
          <Slider label="w₂" value={w2} set={setW2} min={-3} max={3} step={0.5} />
          <Slider label="b" value={b} set={setB} min={-7} max={7} step={1} />
          <button type="button" className="btn-ghost text-[17px] px-[12px] py-[6px]" onClick={() => { if (step === 0) { setW1(2); setW2(1); setB(0); } else { setW1(2); setW2(-1); setB(0); } }} disabled={!custom}>활동지 값으로</button>
        </div>
      }
      lines={[
        custom ? <><M>w₁ = {fmt(w1)}, w₂ = {fmt(w2)}, b = {fmt(b)}</M>이면 <M>z = {par(w1 * x1)} + {par(w2 * x2)} + {par(b)} = {fmt(z)}</M>, <M>ŷ = ReLU({fmt(z)}) = {fmt(y)}</M>.</> : null,
        !custom && step === 0 ? <>시범 줄. <M>w₂ = 1</M>일 때 <M>z = 7</M>.</> : null,
        !custom && step === 1 ? <><M>w₂</M>만 <Key>−1</Key>로 바꾸면 <M>(−1) × 3 = −3</M>이라 <M>z = 4 − 3 = 1</M>. z가 작아짐.</> : null,
        !custom && step === 2 ? <>가중치가 <Key>음수</Key>이면 그 입력은 <M>z</M>를 <Key>줄이는</Key> 쪽으로 작용함.</> : null,
      ]}
    />
  );
};

/* ───────── 1-2 · 1-3. 편향과 ReLU ───────── */
const A1BiasRelu: ComponentType<{ step: number }> = ({ step }) => {
  const x1 = 2, x2 = 3, w1 = -1, w2 = 1, b = -3;
  const z = w1 * x1 + w2 * x2 + b, y = relu(z);
  return (
    <Layout
      figure={
        <NeuronFigure
          inputs={[{ name: 'x₁', value: x1 }, { name: 'x₂', value: x2 }]}
          weights={[
            { name: 'w₁', value: w1, product: `(−1) × 2 = −2` },
            { name: 'w₂', value: w2, product: `1 × 3 = 3` },
          ]}
          bias={{ value: b, hot: step === 0 }}
          z={{ value: z, show: true, hot: step <= 1 }}
          relu={{ hot: step >= 1 }}
          yhat={{ value: y, show: step >= 1, hot: step >= 1 }}
          flow={step === 0 ? 'sum' : step === 1 ? 'out' : 'none'}
        />
      }
      lines={[
        step === 0 ? <>편향 <M>b</M>는 입력과 상관없이 더하는 값. <M>z = −2 + 3 + (−3) = −2</M></> : null,
        step === 1 ? <><M>z</M>가 음수임. ReLU는 <Key>음수를 0으로</Key> 내보냄. <M>ŷ = ReLU(−2) = 0</M></> : null,
        step === 2 ? <>ReLU(z) = max(0, z). 0과 z 중 큰 쪽. 양수는 그대로, 음수는 0.</> : null,
      ]}
    />
  );
};

/* ───────── 4-B 식 정리 — 배율 설명이 끝난 뒤에야 식이 등장한다 ───────── */
const GradFormula: ComponentType<{ step: number }> = ({ step }) => {
  const rows = [
    ['모델', 'ŷ = w·x + b', '점 (3, 7) 하나, 출발 w = 0, b = 0'],
    ['오차', 'e = ŷ − y', '예측 − 정답'],
    ['손실', 'L = ½e²', '½은 기울기를 간단하게 하려는 약속'],
    ['기울기', 'dw = e · x,   db = e', '방금 배율로 확인한 식'],
    ['업데이트', '새 w = w − η · dw,   새 b = b − η · db', 'η = 0.05, 기울기의 반대 방향으로 보폭만큼'],
  ];
  return (
    <Layout
      figure={
        <div className="h-full flex items-center justify-center">
          <div className="w-[1100px] grid grid-cols-[150px_1fr_1fr] gap-x-[28px] gap-y-[18px] items-center">
            {rows.map(([k, f, d], i) => (
              <div key={k} className={`contents lec-fade`}>
                <div className={`text-[24px] font-bold ${i <= step ? 'text-accent' : 'text-border'}`}>{k}</div>
                <div className={`text-[34px] font-semibold tabular-nums ${i <= step ? (i === step ? 'text-text' : 'text-text/70') : 'text-border'}`}>{f}</div>
                <div className={`text-[21px] ${i <= step ? 'text-muted' : 'text-border'}`}>{d}</div>
              </div>
            ))}
          </div>
        </div>
      }
      lines={[
        step <= 3 ? <>4-B에서 쓰는 식. 위에서부터 차례로 읽음.</> : <>이 다섯 줄이 딥러닝 학습의 전부임. 이제 종이로 한 step을 계산함.</>,
      ]}
    />
  );
};

/* ───────── 더 알아보기. 기호로 쓰면 ───────── */
const GradSymbols: ComponentType<{ step: number }> = ({ step }) => {
  const back: BackSpec = {
    stage: 4, dimForward: true,
    atY: '∂L/∂ŷ = e', atRelu: '× 1', atW: ['∂ŷ/∂w = x'], atB: '∂ŷ/∂b = 1',
    dw: ['∂L/∂w = e · x'], db: '∂L/∂b = e',
  };
  return (
    <Layout
      figure={
        <NeuronFigure
          inputs={[{ name: 'x' }]} weights={[{ name: 'w' }]} bias={{}} symbolic
          loss={{ show: true, e: 'e = ŷ − y', L: 'L = ½e²' }}
          back={back}
        />
      }
      aside={
        <div className="text-[21px] leading-relaxed">
          <div className={`lec-fade ${step >= 1 ? '' : 'opacity-0'} mb-[20px]`}>
            <div className="text-muted text-[17px] mb-[4px]">연쇄법칙</div>
            <div className="font-mono"><span style={{ color: ORANGE }}>∂L/∂w</span> = ∂L/∂ŷ × ∂ŷ/∂w</div>
          </div>
          <div className={`lec-fade ${step >= 2 ? '' : 'opacity-0'} mb-[20px]`}>
            <div className="text-muted text-[17px] mb-[4px]">손실을 ŷ에 대해 미분하면</div>
            <div className="font-mono">∂L/∂ŷ = <s className="text-muted">½</s> × <s className="text-muted">2</s>(ŷ − y) = <span style={{ color: ORANGE }}>e</span></div>
          </div>
          <div className={`lec-fade ${step >= 3 ? '' : 'opacity-0'}`}>
            <div className="text-muted text-[17px] mb-[4px]">ŷ = wx + b를 미분하면</div>
            <div className="font-mono">∂ŷ/∂w = <span style={{ color: ORANGE }}>x</span>,   ∂ŷ/∂b = <span style={{ color: ORANGE }}>1</span></div>
          </div>
        </div>
      }
      lines={[
        step === 0 ? <>오차 <M>e</M>가 <M>L</M>에서 출발해 거꾸로 흐름. 지나는 곳마다 변화율을 곱함.</> : null,
        step === 1 ? <>연결된 변화율은 <Key>곱한다</Key>. 이것이 연쇄법칙이고, 주황 화살표가 한 일임.</> : null,
        step === 2 ? <><M>w</M> 선에서 <M>x</M>를 곱해 <Hot>dw = e·x</Hot>.</> : null,
        step === 3 ? <><M>b</M> 선에서 1을 곱해 <Hot>db = e</Hot>. 다음 장(한 step)에서 숫자를 넣음.</> : null,
      ]}
    />
  );
};

/* ───────── A5. 한 step ───────── */
const OneStep: ComponentType<{ step: number }> = ({ step }) => {
  const x = 3, y = 7, eta = 0.05;
  const w0 = 0, b0 = 0;
  const yhat0 = relu(w0 * x + b0), e0 = yhat0 - y, L0 = 0.5 * e0 * e0;
  const dw = e0 * x, db = e0;
  const w1 = w0 - eta * dw, b1 = b0 - eta * db;
  const yhat1 = relu(w1 * x + b1), e1 = yhat1 - y, L1 = 0.5 * e1 * e1;
  const after = step >= 4;
  const w = after ? w1 : w0, b = after ? b1 : b0;
  const yhat = after ? yhat1 : yhat0, e = after ? e1 : e0, L = after ? L1 : L0;
  const back: BackSpec | undefined = step === 2 || step === 3 ? {
    stage: 4, dimForward: step === 2, atY: `× (${fmt(e0)})`, atRelu: '그대로', atW: ['× 3'], atB: '× 1',
    dw: [`dw = −21`], db: 'db = −7',
  } : undefined;
  return (
    <Layout
      figure={
        <NeuronFigure
          inputs={[{ name: 'x', value: x }]}
          weights={[{ name: 'w', value: w, prev: step === 3 ? w0 : null, hot: step === 3 || step === 0 }]}
          bias={{ value: b, prev: step === 3 ? b0 : null, hot: step === 3 || step === 0 }}
          z={{ value: w * x + b, show: step === 0 || step === 4, hot: step === 0 || step === 4 }}
          yhat={{ value: yhat, show: true, hot: step === 0 || step === 4 }}
          flow={step === 0 || step === 4 ? 'out' : 'none'}
          loss={{ show: step >= 1, y, e: `e = ${fmt(e)}`, L: `L = ${fmt(L)}` }}
          back={back}
        />
      }
      lines={[
        step === 0 ? <>① <Key>예측</Key>. <M>ŷ = 0·3 + 0 = 0</M>. 아직 아무것도 배우지 않은 뉴런.</> : null,
        step === 1 ? <>② <Key>오차</Key>. <M>e = 0 − 7 = −7</M>, 손실 <M>L = 24.5</M>.</> : null,
        step === 2 ? <>③ <Key>기울기</Key>. 주황 화살표를 따라 <Hot>dw = (−7) × 3 = −21, db = −7</Hot>.</> : null,
        step === 3 ? <>④ <Key>업데이트</Key>. <M>w = 0 − 0.05 × (−21) = 1.05</M>, <M>b = 0 − 0.05 × (−7) = 0.35</M>.</> : null,
        step === 4 ? <>다시 예측하면 <M>ŷ = 1.05·3 + 0.35 = 3.5</M>. 손실 <M>24.5 → </M><Hot>6.125</Hot>. 한 번 고쳤는데 4분의 1로 줄었음.</> : null,
      ]}
    />
  );
};

/* ───────── A5. 반복하면 ───────── */
const Repeat: ComponentType<{ step: number }> = ({ step }) => {
  const x = 3, y = 7, eta = 0.05;
  const [state, setState] = useState({ w: 1.05, b: 0.35, n: 1, hist: [24.5, 6.125] as number[] });
  const [running, setRunning] = useState(false);
  const timer = useRef<number | null>(null);
  const one = (s: typeof state) => {
    const z = s.w * x + s.b, yhat = relu(z), e = yhat - y, r = z > 0 ? 1 : 0;
    const w = s.w - eta * e * r * x, b = s.b - eta * e * r;
    const e2 = relu(w * x + b) - y;
    return { w, b, n: s.n + 1, hist: [...s.hist, 0.5 * e2 * e2] };
  };
  useEffect(() => { if (step === 0) { setState({ w: 1.05, b: 0.35, n: 1, hist: [24.5, 6.125] }); setRunning(false); } if (step === 1) setState((s) => s.n === 1 ? one(s) : s); }, [step]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!running) { if (timer.current) window.clearInterval(timer.current); return; }
    timer.current = window.setInterval(() => setState((s) => (s.n >= 60 ? s : one(s))), 140);
    return () => { if (timer.current) window.clearInterval(timer.current); };
  }, [running]); // eslint-disable-line react-hooks/exhaustive-deps
  const yhat = relu(state.w * x + state.b), e = yhat - y, L = 0.5 * e * e;
  const hist = state.hist;
  const W = 280, H = 110;
  const pts = hist.map((v, i) => `${(i / Math.max(hist.length - 1, 1)) * W},${H - (v / 24.5) * H}`).join(' ');
  return (
    <Layout
      figure={
        <NeuronFigure
          inputs={[{ name: 'x', value: x }]}
          weights={[{ name: 'w', value: state.w, hot: true }]}
          bias={{ value: state.b, hot: true }}
          yhat={{ value: yhat, show: true, hot: true }}
          loss={{ show: true, y, e: `e = ${fmt(e)}`, L: `L = ${fmt(L)}` }}
          flow="out"
        />
      }
      aside={
        <div onClick={(e) => e.stopPropagation()}>
          <div className="text-[18px] text-muted mb-[6px]">손실 L · step {state.n}</div>
          <svg viewBox={`-6 -6 ${W + 12} ${H + 12}`} className="w-full">
            <line x1={0} y1={H} x2={W} y2={H} stroke="rgb(var(--color-border))" />
            <polyline points={pts} fill="none" stroke={ACCENT} strokeWidth={3} strokeLinejoin="round" />
            {hist.map((v, i) => i === hist.length - 1 && <circle key={i} cx={(i / Math.max(hist.length - 1, 1)) * W} cy={H - (v / 24.5) * H} r={5} fill={ACCENT} />)}
          </svg>
          <div className="mt-[14px] flex gap-[10px]">
            <button type="button" className="btn-primary text-[18px] px-[14px] py-[6px]" onClick={() => setRunning((r) => !r)}>{running ? '멈춤' : '▶ 자동 학습'}</button>
            <button type="button" className="btn-ghost text-[18px] px-[14px] py-[6px]" onClick={() => setState((s) => one(s))}>한 step</button>
          </div>
        </div>
      }
      lines={[
        step === 0 ? <>한 step 뒤의 뉴런. <M>w = 1.05, b = 0.35</M>, 오차 <M>−3.5</M>.</> : null,
        step === 1 ? <>두 번째 step. <M>dw = (−3.5) × 3 = −10.5, db = −3.5</M> → <M>w = 1.575, b = 0.525</M>. 기울기가 작아졌음.</> : null,
        step === 2 ? <>같은 네 단계를 <Key>반복</Key>함. 컴퓨터는 이 step을 1초에 수백만 번 함.</> : null,
        step === 3 ? <>오차가 0에 가까워지며 <M>w ≈ 2.1, b ≈ 0.7</M>에서 멈춤. 점 하나를 지나는 직선은 많아서 정답 <M>w = 2, b = 1</M>과 다름.</> : null,
      ]}
    />
  );
};

export const SLIDES: SlideDef[] = [
  { id: 'cover', section: 'neuron', title: '', steps: 0, component: Cover },
  { id: 'a1-predict', section: 'neuron', tag: '1-1', title: '인공 뉴런 하나가 예측을 만든다', steps: 5, component: A1Predict,
    notes: ['화면이 인공 뉴런 하나입니다. 왼쪽 두 원이 입력, 선 위의 w가 가중치입니다. 뉴런 안에서 곱해 더하고 b를 더한 z가 ReLU를 지나 ŷ이 됩니다.', '활동지 1-1 시범 줄과 같은 숫자입니다.'] },
  { id: 'a1-negative', section: 'neuron', tag: '1-1', title: '가중치가 음수이면', steps: 2, component: A1Negative,
    notes: ['학생이 1-1 표를 채운 뒤 w₂를 −1로 옮겨 z = 1을 확인합니다. 슬라이더로 다른 값도 보여 줄 수 있습니다. "활동지 값으로"로 돌아옵니다.'] },
  { id: 'a1-bias-relu', section: 'neuron', tag: '1-2 · 1-3', title: '편향과 ReLU', steps: 2, component: A1BiasRelu,
    notes: ['1-3의 셋째 줄(w₁ −1, w₂ 1, b −3)입니다. z = −2가 ReLU를 지나 0이 됩니다.'] },
  ...FORWARD_SLIDES,
  ...LOSS_SLIDES,
  ...GD_SLIDES,
  ...GRAD_DERIVE_SLIDES,
  { id: 'grad-symbols', section: 'grad', tag: '4-B', title: '같은 것을 뉴런 그림으로 보면', steps: 3, component: GradSymbols,
    notes: ['건너뛸 수 있는 슬라이드입니다. 미분을 아는 학생을 위해 ∂ 기호와 연쇄법칙, ½·2가 지워지는 것만 보여 줍니다.'] },
  { id: 'grad-formula', section: 'grad', tag: '4-B', title: '4-B에서 쓰는 식', steps: 4, component: GradFormula,
    notes: ['식은 배율 설명이 끝난 뒤에 처음 보여 줌. 학생은 이 상자를 보며 4B-2부터 4B-5까지 종이로 계산함.'] },
  { id: 'a5-one-step', section: 'grad', tag: '4B-2 ~ 4B-5', title: '한 step', steps: 4, component: OneStep,
    notes: ['예측 → 오차 → 기울기 → 업데이트 → 다시 예측. 학생이 종이로 계산한 뒤 화면에서 확인합니다.', '손실 24.5 → 6.125.'] },
  { id: 'a5-repeat', section: 'grad', tag: '도전', title: '반복하면 학습', steps: 3, component: Repeat,
    notes: ['도전 문항의 두 번째 step(w 1.575, b 0.525)을 확인한 뒤 자동 학습을 켭니다. w ≈ 2.1, b ≈ 0.7에서 멈춥니다.'] },
];
