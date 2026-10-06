// 특강 슬라이드 정의 — 시안: 세션1(인공 뉴런) 세 장, 기울기 화면 네 장, 한 step 두 장.
// 숫자는 활동지 v2와 같다. 1-1 시범(x₁ 2, x₂ 3, w₁ 2, w₂ 1, b 0 → z 7), 4B 모델(x 3, y 7, w 0, b 0, η 0.05).
import { useEffect, useRef, useState, type ComponentType, type ReactNode } from 'react';
import { NeuronFigure, ACCENT, ORANGE, type BackSpec } from './NeuronFigure';

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

/* ───────── 공용 레이아웃 ───────── */
function Layout({ figure, lines, aside }: { figure: ReactNode; lines?: (ReactNode | null)[]; aside?: ReactNode }) {
  const shown = (lines ?? []).filter((l) => l !== null && l !== undefined);
  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 min-h-0 flex items-stretch gap-[24px]">
        <div className="flex-1 min-w-0">{figure}</div>
        {aside && <div className="w-[300px] shrink-0 flex flex-col justify-center">{aside}</div>}
      </div>
      <div className="h-[112px] shrink-0 flex flex-col justify-center gap-[6px]">
        {shown.map((l, i) => (
          <div key={i} className={`lec-fade text-[34px] leading-snug ${i === shown.length - 1 ? 'text-text font-semibold' : 'text-muted'}`}>{l}</div>
        ))}
      </div>
    </div>
  );
}
const M = ({ children }: { children: ReactNode }) => <span className="tabular-nums font-semibold text-text">{children}</span>;
const Key = ({ children }: { children: ReactNode }) => <span className="text-accent font-bold">{children}</span>;
const Hot = ({ children }: { children: ReactNode }) => <span style={{ color: ORANGE }} className="font-bold">{children}</span>;

function Slider({ label, value, set, min, max, step }: { label: string; value: number; set: (v: number) => void; min: number; max: number; step: number }) {
  return (
    <label className="block mb-[14px]" onClick={(e) => e.stopPropagation()}>
      <div className="flex justify-between text-[19px] mb-[2px]"><span className="text-muted">{label}</span><span className="font-mono text-accent font-semibold">{fmt(value)}</span></div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => set(parseFloat(e.target.value))} className="w-full accent-[rgb(var(--color-accent))]" />
    </label>
  );
}
function fmt(v: number) { const r = Math.round(v * 1000) / 1000; return (r < 0 ? '−' : '') + Math.abs(r).toString(); }
const relu = (z: number) => Math.max(0, z);

/* ───────── 0. 표지 ───────── */
const Cover: ComponentType<{ step: number }> = () => (
  <div className="h-full flex flex-col items-center justify-center text-center">
    <div className="text-[26px] text-muted mb-[18px]">NEURAL EXPLORER · 특강</div>
    <div className="text-[76px] font-bold leading-tight tracking-tight">손으로 풀어보는<br />딥러닝의 원리</div>
    <div className="mt-[40px] flex items-center gap-[14px] text-[24px] text-muted">
      {SECTIONS.map((s, i) => <span key={s.id} className="flex items-center gap-[14px]"><span className="px-[14px] py-[4px] rounded-full border border-border">{s.label}</span>{i < SECTIONS.length - 1 && <span>→</span>}</span>)}
    </div>
    <div className="mt-[44px] text-[22px] text-muted">종이와 펜으로 계산합니다 · 화면은 그 계산이 그림의 어디에서 나오는지 보여 줍니다</div>
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
        s === 0 ? <>입력 <M>x</M>가 선을 타고 들어와 뉴런을 지나면 예측값 <M>ŷ</M>이 나옵니다.</> : null,
        s === 1 ? <>입력은 <Key>x₁ = 2, x₂ = 3</Key>입니다.</> : null,
        s === 2 ? <>선마다 가중치가 있습니다. 입력에 가중치를 <Key>곱합니다</Key>. <M>2 × 2 = 4, 1 × 3 = 3</M></> : null,
        s === 3 ? <>곱한 것을 <Key>모두 더하고</Key> 편향 <M>b</M>를 더합니다. <M>z = 4 + 3 + 0 = 7</M></> : null,
        s === 4 ? <><M>z</M>가 <Key>ReLU</Key>를 지나 예측값이 됩니다. 양수는 그대로. <M>ŷ = ReLU(7) = 7</M></> : null,
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
        custom ? <><M>w₁ = {fmt(w1)}, w₂ = {fmt(w2)}, b = {fmt(b)}</M>이면 <M>z = {fmt(w1 * x1)} + {fmt(w2 * x2)} + {fmt(b)} = {fmt(z)}</M>, <M>ŷ = ReLU({fmt(z)}) = {fmt(y)}</M>.</> : null,
        !custom && step === 0 ? <>시범 줄입니다. <M>w₂ = 1</M>일 때 <M>z = 7</M>.</> : null,
        !custom && step === 1 ? <><M>w₂</M>만 <Key>−1</Key>로 바꾸면 <M>(−1) × 3 = −3</M>이라 <M>z = 4 − 3 = 1</M>. z가 작아졌습니다.</> : null,
        !custom && step === 2 ? <>가중치가 <Key>음수</Key>이면 그 입력은 <M>z</M>를 <Key>줄이는</Key> 쪽으로 작용합니다.</> : null,
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
        step === 0 ? <>편향 <M>b</M>는 입력과 상관없이 더하는 값입니다. <M>z = −2 + 3 + (−3) = −2</M></> : null,
        step === 1 ? <><M>z</M>가 음수입니다. ReLU는 <Key>음수를 0으로</Key> 내보냅니다. <M>ŷ = ReLU(−2) = 0</M></> : null,
        step === 2 ? <>ReLU(z) = max(0, z). 0과 z 중 큰 쪽입니다. 양수는 그대로, 음수는 0.</> : null,
      ]}
    />
  );
};

/* ───────── 기울기 1. 가중치를 올리면 z는 입력 배로 (활동지 4B-1) ───────── */
const GradScale: ComponentType<{ step: number }> = ({ step }) => {
  const x1 = 2, x2 = 3;
  const w1 = step === 1 ? 1.5 : 1, w2 = step === 2 ? 1.5 : 1, b = step === 3 ? 0.5 : 0;
  const z = w1 * x1 + w2 * x2 + b;
  return (
    <Layout
      figure={
        <NeuronFigure
          inputs={[{ name: 'x₁', value: x1 }, { name: 'x₂', value: x2 }]}
          weights={[
            { name: 'w₁', value: w1, prev: step === 1 ? 1 : null, hot: step === 1, product: step === 1 ? '0.5 × 2 = 1' : step >= 4 ? '배율 × 2' : undefined },
            { name: 'w₂', value: w2, prev: step === 2 ? 1 : null, hot: step === 2, product: step === 2 ? '0.5 × 3 = 1.5' : step >= 4 ? '배율 × 3' : undefined },
          ]}
          bias={{ value: b, prev: step === 3 ? 0 : null, hot: step === 3, badge: step === 3 ? '0.5 × 1 = 0.5' : step >= 4 ? '배율 × 1' : undefined }}
          z={{ value: z, show: true, hot: step >= 1 && step <= 3 }}
          relu={{ show: false }}
          yhat={{ show: false }}
          flow={step === 1 || step === 2 ? 'inputs' : step === 3 ? 'sum' : 'none'}
        />
      }
      lines={[
        step === 0 ? <>출발 상태. <M>w₁ = w₂ = 1, b = 0</M>이면 <M>z = 2 + 3 + 0 = 5</M>.</> : null,
        step === 1 ? <><M>w₁</M>만 0.5 올리면 <M>z</M>는 <Key>1</Key> 늘어납니다. 올린 양 0.5 × 입력 2.</> : null,
        step === 2 ? <><M>w₂</M>만 0.5 올리면 <M>z</M>는 <Key>1.5</Key> 늘어납니다. 올린 양 0.5 × 입력 3.</> : null,
        step === 3 ? <><M>b</M>를 0.5 올리면 <M>z</M>는 <Key>0.5</Key> 늘어납니다. 올린 양 × 1.</> : null,
        step === 4 ? <><M>z</M>가 늘어난 양 = 올린 양 × <Key>입력</Key>. 입력이 w의 <Key>배율</Key>이고, b의 배율은 1입니다.</> : null,
      ]}
    />
  );
};

/* ───────── 기울기 2. ŷ을 움직이면 L은 오차 배로 ───────── */
const GradLoss: ComponentType<{ step: number }> = ({ step }) => {
  const x = 3, y = 7, w = 0, b = 0;
  const yhat = relu(w * x + b), e = yhat - y, L = 0.5 * e * e;
  return (
    <Layout
      figure={
        <NeuronFigure
          inputs={[{ name: 'x', value: x }]}
          weights={[{ name: 'w', value: w }]}
          bias={{ value: b }}
          z={{ value: w * x + b, show: false }}
          yhat={{ value: yhat, show: true }}
          loss={{
            show: true, y,
            e: step >= 1 ? `e = ŷ − y = ${fmt(e)}` : null,
            L: step >= 1 ? `L = ${fmt(L)}` : null,
            curve: step >= 2 ? { yhat, y, slopeLabel: step >= 3 ? `접선 기울기 = e = ${fmt(e)}` : undefined } : null,
            edgeBadge: step >= 3 ? '배율 × e' : undefined,
          }}
        />
      }
      lines={[
        step === 0 ? <>이제 입력 하나짜리 모델입니다. <M>x = 3</M>, 정답 <M>y = 7</M>, 출발 <M>w = 0, b = 0</M>이라 <M>ŷ = 0</M>.</> : null,
        step === 1 ? <>오차 <M>e = ŷ − y = −7</M>, 손실 <M>L = ½e² = 24.5</M>.</> : null,
        step === 2 ? <>손실 <M>L</M>을 <M>ŷ</M>의 함수로 그리면 곡선입니다. 지금 자리의 <Key>접선 기울기</Key>는 4A에서 본 대로 <Hot>e = −7</Hot>.</> : null,
        step === 3 ? <><M>ŷ</M>이 조금 움직이면 <M>L</M>은 그 <Key>e배</Key>로 움직입니다. ½을 곱한 이유가 여기 있습니다. ½이 없으면 2e.</> : null,
        step === 4 ? <><M>e</M>가 음수이니 <M>ŷ</M>을 <Key>올리면</Key> 손실이 <Key>줄어듭니다</Key>.</> : null,
      ]}
    />
  );
};

/* ───────── 기울기 3. 배율을 곱하면 기울기 ───────── */
const GradChain: ComponentType<{ step: number }> = ({ step }) => {
  const x = 3, y = 7, w = 0, b = 0;
  const yhat = relu(w * x + b), e = yhat - y;
  const num = step >= 5;
  const back: BackSpec = {
    stage: Math.min(step, 4), dimForward: true,
    atY: num ? `× (−7)` : '× e',
    atRelu: step >= 2 ? '그대로 (z > 0)' : undefined,
    atW: step >= 3 ? [num ? '× 3' : '× x'] : undefined,
    atB: step >= 4 ? '× 1' : undefined,
    dw: step >= 3 ? [num ? `dw = (−7) × 3 = −21` : 'dw = e · x'] : undefined,
    db: step >= 4 ? (num ? 'db = −7' : 'db = e') : undefined,
  };
  return (
    <Layout
      figure={
        <NeuronFigure
          inputs={[{ name: 'x', value: num ? x : null }]}
          weights={[{ name: 'w', value: num ? w : null }]}
          bias={{ value: num ? b : null }}
          yhat={{ value: yhat, show: num }}
          loss={{ show: true, y: num ? y : null, e: num ? `e = ${fmt(e)}` : null, L: null }}
          back={step >= 1 ? back : undefined}
          symbolic={!num}
        />
      }
      lines={[
        step === 0 ? <>기울기는 "<M>w</M>를 조금 바꾸면 <M>L</M>이 얼마나 바뀌나"입니다. <M>w</M>는 <M>ŷ</M>을 바꾸고, <M>ŷ</M>이 <M>L</M>을 바꿉니다.</> : null,
        step === 1 ? <><M>L</M>에서 거꾸로 출발합니다. <M>ŷ → L</M>의 배율은 <Hot>e</Hot>.</> : null,
        step === 2 ? <>ReLU를 거꾸로 지납니다. <M>z</M>가 양수였으니 <Hot>그대로</Hot> 통과.</> : null,
        step === 3 ? <><M>w → ŷ</M>의 배율은 입력 <Hot>x</Hot>. 곱하면 <Hot>dw = e · x</Hot>.</> : null,
        step === 4 ? <><M>b → ŷ</M>의 배율은 <Hot>1</Hot>. 곱하면 <Hot>db = e</Hot>.</> : null,
        step === 5 ? <>숫자를 넣습니다. <M>e = −7, x = 3</M>이라 <Hot>dw = −21, db = −7</Hot>. 이것이 4B-3입니다.</> : null,
        step === 6 ? <>둘 다 <Key>음수</Key>입니다. 4A의 규칙대로 <M>w</M>와 <M>b</M>를 <Key>키워야</Key> 손실이 줄어듭니다.</> : null,
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
        step === 0 ? <>배율을 수학에서는 <Key>∂</Key>로 씁니다. "다른 값은 두고 이 값만 바꿀 때의 변화율"입니다.</> : null,
        step === 1 ? <>연결된 변화율은 <Key>곱합니다</Key>. 이것이 연쇄법칙이고, 주황 화살표가 한 일입니다.</> : null,
        step === 2 ? <>제곱을 미분하면 2가 앞으로 나오고, ½과 2가 지워져 <Hot>e</Hot>만 남습니다.</> : null,
        step === 3 ? <><M>wx + b</M>에서 <M>w</M>의 계수 <Hot>x</Hot>, <M>b</M>의 계수 <Hot>1</Hot>이 남습니다. 그래서 <M>dw = e·x, db = e</M>.</> : null,
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
        step === 0 ? <>① <Key>예측</Key>. <M>ŷ = 0·3 + 0 = 0</M>. 아직 아무것도 배우지 않은 뉴런입니다.</> : null,
        step === 1 ? <>② <Key>오차</Key>. <M>e = 0 − 7 = −7</M>, 손실 <M>L = 24.5</M>.</> : null,
        step === 2 ? <>③ <Key>기울기</Key>. 주황 화살표를 따라 <Hot>dw = (−7) × 3 = −21, db = −7</Hot>.</> : null,
        step === 3 ? <>④ <Key>업데이트</Key>. <M>w = 0 − 0.05 × (−21) = 1.05</M>, <M>b = 0 − 0.05 × (−7) = 0.35</M>.</> : null,
        step === 4 ? <>다시 예측하면 <M>ŷ = 1.05·3 + 0.35 = 3.5</M>. 손실 <M>24.5 → </M><Hot>6.125</Hot>. 한 번 고쳤는데 4분의 1로 줄었습니다.</> : null,
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
        step === 0 ? <>한 step 뒤의 뉴런입니다. <M>w = 1.05, b = 0.35</M>, 오차 <M>−3.5</M>.</> : null,
        step === 1 ? <>두 번째 step. <M>dw = (−3.5) × 3 = −10.5, db = −3.5</M> → <M>w = 1.575, b = 0.525</M>. 기울기가 작아졌습니다.</> : null,
        step === 2 ? <>같은 네 단계를 <Key>반복</Key>합니다. 컴퓨터는 이 step을 1초에 수백만 번 합니다. ▶를 누릅니다.</> : null,
        step === 3 ? <>오차가 0에 가까워지며 <M>w ≈ 2.1, b ≈ 0.7</M>에서 멈춥니다. 점 하나를 지나는 직선은 많아서 정답 <M>w = 2, b = 1</M>과 다릅니다.</> : null,
      ]}
    />
  );
};

export const SLIDES: SlideDef[] = [
  { id: 'cover', section: 'neuron', title: '', steps: 0, component: Cover },
  { id: 'a1-predict', section: 'neuron', tag: '1-1', title: '인공 뉴런 하나가 예측을 만듭니다', steps: 5, component: A1Predict,
    notes: ['화면이 인공 뉴런 하나입니다. 왼쪽 두 원이 입력, 선 위의 w가 가중치입니다. 뉴런 안에서 곱해 더하고 b를 더한 z가 ReLU를 지나 ŷ이 됩니다.', '활동지 1-1 시범 줄과 같은 숫자입니다.'] },
  { id: 'a1-negative', section: 'neuron', tag: '1-1', title: '가중치가 음수이면', steps: 2, component: A1Negative,
    notes: ['학생이 1-1 표를 채운 뒤 w₂를 −1로 옮겨 z = 1을 확인합니다. 슬라이더로 다른 값도 보여 줄 수 있습니다. "활동지 값으로"로 돌아옵니다.'] },
  { id: 'a1-bias-relu', section: 'neuron', tag: '1-2 · 1-3', title: '편향과 ReLU', steps: 2, component: A1BiasRelu,
    notes: ['1-3의 셋째 줄(w₁ −1, w₂ 1, b −3)입니다. z = −2가 ReLU를 지나 0이 됩니다.'] },
  { id: 'grad-scale', section: 'grad', tag: '4B-1', title: '가중치를 올리면 z는 입력 배로 움직입니다', steps: 4, component: GradScale,
    notes: ['활동지 4B-1 표와 같은 실험입니다. 두 가중치를 똑같이 0.5 올렸는데 입력이 3인 쪽이 더 크게 움직입니다.', '결론 한 줄: 늘어난 양 = 올린 양 × 입력. 입력이 배율입니다.'] },
  { id: 'grad-loss', section: 'grad', tag: '4-B', title: 'ŷ을 움직이면 L은 오차 배로 움직입니다', steps: 4, component: GradLoss,
    notes: ['4B 모델로 바꿉니다. 손실 곡선의 접선 기울기가 e라는 것은 4A에서 확인했습니다(½을 곱한 이유).', '부호 읽기: e가 음수이니 ŷ을 올리면 L이 줄어듭니다.'] },
  { id: 'grad-chain', section: 'grad', tag: '4B-3', title: '배율을 곱하면 기울기입니다', steps: 6, component: GradChain,
    notes: ['주황 화살표가 L에서 출발해 ŷ, 뉴런을 거꾸로 지나 w 선과 b 선에 도착합니다. 지나는 곳마다 배율을 곱합니다.', '기호로 끝낸 뒤 숫자를 넣습니다. −7 × 3 = −21, −7. 활동지 4B-3과 같은 값입니다.'] },
  { id: 'grad-symbols', section: 'grad', tag: '더 알아보기', title: '기호로 쓰면', steps: 3, component: GradSymbols,
    notes: ['건너뛸 수 있는 슬라이드입니다. 미분을 아는 학생을 위해 ∂ 기호와 연쇄법칙, ½·2가 지워지는 것만 보여 줍니다.'] },
  { id: 'a5-one-step', section: 'grad', tag: '4B-2 ~ 4B-5', title: '한 step', steps: 4, component: OneStep,
    notes: ['예측 → 오차 → 기울기 → 업데이트 → 다시 예측. 학생이 종이로 계산한 뒤 화면에서 확인합니다.', '손실 24.5 → 6.125.'] },
  { id: 'a5-repeat', section: 'grad', tag: '도전', title: '반복하면 학습입니다', steps: 3, component: Repeat,
    notes: ['도전 문항의 두 번째 step(w 1.575, b 0.525)을 확인한 뒤 자동 학습을 켭니다. w ≈ 2.1, b ≈ 0.7에서 멈춥니다.'] },
];
