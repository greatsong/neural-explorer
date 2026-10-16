// 특강 슬라이드 정의 — 시안: 세션1(인공 뉴런) 세 장, 기울기 화면 네 장, 한 step 두 장.
// 숫자는 활동지 v2와 같다. 1-1 시범(x₁ 2, x₂ 3, w₁ 2, w₂ 1, b 0 → z 7), 4B 모델(x 3, y 7, w 0, b 0, η 0.05).
import { useEffect, useRef, useState, type ComponentType } from 'react';
import { NeuronFigure, ACCENT, type BackSpec } from './NeuronFigure';
import { Layout, M, Key, Hot, Slider, MiniTable, FormulaBox, fmt, fmt2, par, relu } from './common';
import { FORWARD_SLIDES, LOSS_SLIDES, GD_SLIDES } from './sectionSlides';
import { GRAD_DERIVE_SLIDES } from './gradSlides';
import { END_SLIDES } from './endSlides';
import { GOAL_SLIDE, DIVIDERS, NEURON_EXTRA } from './introSlides';
import { GRAD_SETUP } from './bridgeSlides';
import { CLOSING_SLIDES } from './storySlides';
import { OPENING_SLIDES } from './sourceSlides';

export interface SlideDef {
  id: string;
  section: SectionId;
  tag?: string;      // 활동지 문항 번호 (작게)
  title: string;
  titleAt?: (step: number) => string; // 클릭 단계에 따라 제목을 바꿀 때 (예: 한 step의 역전파 → 경사 하강법)
  sub?: string;
  formula?: string;  // 제목 줄 오른쪽에 띄우는 그 장의 식
  steps: number;     // 클릭 단계 수 (0..steps)
  component: ComponentType<{ step: number }>;
  notes?: string[];
  sourcePage?: number; // 원본 도입 페이지는 이미지와 내장 영상을 온전히 표시
}
export type SectionId = 'opening' | 'neuron' | 'forward' | 'loss' | 'gd' | 'grad' | 'end' | 'future';
export const SECTIONS: { id: SectionId; label: string }[] = [
  { id: 'opening', label: 'AI와 미래' },
  { id: 'neuron', label: '인공 뉴런' },
  { id: 'forward', label: '순전파' },
  { id: 'loss', label: '오차와 손실' },
  { id: 'gd', label: '경사하강법' },
  { id: 'grad', label: '기울기와 업데이트' },
  { id: 'end', label: '언어 모델' },
  { id: 'future', label: '여러분의 미래' },
];

/* ───────── 0. 표지 ───────── */
const Cover: ComponentType<{ step: number }> = () => (
  <div className="h-full flex flex-col items-center justify-center text-center">
    <div className="text-[26px] text-muted mb-[18px]">AI 시대의 지피지기 · NEURAL EXPLORER</div>
    <div className="text-[76px] font-bold leading-tight tracking-tight">손으로 풀어보는<br />딥러닝의 원리</div>
  </div>
);

/* ───────── 1-1. 인공 뉴런 하나 ───────── */
const A1Predict: ComponentType<{ step: number }> = ({ step }) => {
  const x1 = 2, x2 = 3, w1 = 2, w2 = 1, b = 0;
  const z = w1 * x1 + w2 * x2 + b, y = relu(z);
  const s = step;
  // w와 b는 처음 나올 때 식(w₁ × x₁, + b)을 먼저 보여 주고, 다음 단계에서 그 식을 숫자로 바꾼다
  const wHot = s === 2 || s === 3, bHot = s === 4 || s === 5;
  return (
    <Layout
      figure={
        <NeuronFigure
          detail
          swap
          symbolic={s === 0}
          sumSymbol={{ wx: s === 2, b: s === 4 }}
          inputs={[{ name: 'x₁', value: s >= 1 ? x1 : null }, { name: 'x₂', value: s >= 1 ? x2 : null }]}
          weights={[
            { name: 'w₁', value: s >= 2 ? w1 : null, hot: wHot, product: s === 2 ? 'w₁ × x₁' : s >= 3 ? `${w1} × ${x1} = ${w1 * x1}` : undefined },
            { name: 'w₂', value: s >= 2 ? w2 : null, hot: wHot, product: s === 2 ? 'w₂ × x₂' : s >= 3 ? `${w2} × ${x2} = ${w2 * x2}` : undefined },
          ]}
          bias={{ value: s >= 4 ? b : null, hot: bHot }}
          z={{ value: z, show: s >= 5, hot: s === 5 }}
          relu={{ hot: s === 6 }}
          yhat={{ value: y, show: s >= 6, hot: s >= 6 }}
          flow={wHot ? 'inputs' : bHot ? 'sum' : s === 6 ? 'out' : 'none'}
        />
      }
      lines={[
        s === 0 ? <>입력 <M>x</M>가 선을 타고 들어와 뉴런을 지나면 예측값 <M>ŷ</M>이 나옴.</> : null,
        s === 1 ? <>입력은 <Key>x₁ = 2, x₂ = 3</Key>.</> : null,
        wHot ? <>선마다 가중치가 있음. 입력에 가중치를 <Key>곱한다</Key>. <M>{s === 2 ? 'w₁ × x₁, w₂ × x₂' : '2 × 2 = 4, 1 × 3 = 3'}</M></> : null,
        bHot ? <>곱한 것을 <Key>모두 더하고</Key>(기호 Σ) 편향 <M>b</M>를 더함. <M>{s === 4 ? 'z = 4 + 3 + b' : 'z = 4 + 3 + 0 = 7'}</M></> : null,
        s === 6 ? <><M>z</M>가 <Key>ReLU</Key>를 지나 예측값이 됨. 양수는 그대로. <M>ŷ = ReLU(7) = 7</M></> : null,
        s === 7 ? <M>z = w₁·x₁ + w₂·x₂ + b = 2·2 + 1·3 + 0 = 7,   ŷ = ReLU(z) = 7</M> : null,
      ]}
    />
  );
};

/* ───────── 1-1 관찰. 가중치가 음수이면 ───────── */
/* 활동지 표를 옆 칸에 그대로 보여 주는 미니 표. 현재 줄은 보라색으로 */

const A1Negative: ComponentType<{ step: number }> = ({ step }) => {
  const x1 = 2, x2 = 3;
  const ROWS: [number, number][] = [[2, 1], [1, 1], [2, -1], [-1, 3]];   // 활동지 1-1 표의 네 줄
  // 둘째~넷째 줄은 w를 먼저 보이고 "z는?"에서 멈춘 뒤(질문 단계) 다음 단계에서 z를 공개한다. 7·8단계는 활동지 관찰 문항
  const s = Math.min(step, 8);
  const row = [0, 1, 1, 2, 2, 3, 3, 2, 2][s];
  const [w1, setW1] = useState(2);
  const [w2, setW2] = useState(1);
  const [b, setB] = useState(0);
  useEffect(() => { setW1(ROWS[row][0]); setW2(ROWS[row][1]); setB(0); }, [row]); // eslint-disable-line react-hooks/exhaustive-deps
  const z = w1 * x1 + w2 * x2 + b, y = relu(z);
  const custom = !(w1 === ROWS[row][0] && w2 === ROWS[row][1] && b === 0);
  const ask = !custom && (s === 1 || s === 3 || s === 5);
  const shown = [true, s >= 2, s >= 4, s >= 6];
  const zOf = ([a, c]: [number, number]) => a * x1 + c * x2;
  return (
    <Layout
      figure={
        <NeuronFigure
          detail
          swap
          sumExpr={ask}
          inputs={[{ name: 'x₁', value: x1 }, { name: 'x₂', value: x2 }]}
          weights={[
            { name: 'w₁', value: w1, hot: s >= 1 && w1 !== 2, product: ask ? `${fmt(w1)} × ${x1}` : `${fmt(w1)} × ${x1} = ${fmt(w1 * x1)}` },
            { name: 'w₂', value: w2, hot: s >= 1 && w2 !== 1, product: ask ? `${fmt(w2)} × ${x2}` : `${fmt(w2)} × ${x2} = ${fmt(w2 * x2)}` },
          ]}
          bias={{ value: b }}
          z={{ value: z, show: !ask, hot: s >= 1, ask }}
          yhat={{ value: y, show: !ask, hot: !ask }}
          flow={s >= 1 ? 'inputs' : 'none'}
        />
      }
      aside={
        <div onClick={(e) => e.stopPropagation()}>
          <MiniTable title="활동지 1-1 표" head={['w₁', 'w₂', 'z']} active={custom ? -1 : row}
            rows={ROWS.map((r, i) => [fmt(r[0]), fmt(r[1]), shown[i] ? fmt(zOf(r)) : null])} />
          <div className="text-[18px] text-muted mt-[18px] mb-[8px]">값을 바꿔 보기</div>
          <Slider label="w₁" value={w1} set={setW1} min={-3} max={3} step={0.5} />
          <Slider label="w₂" value={w2} set={setW2} min={-3} max={3} step={0.5} />
          <Slider label="b" value={b} set={setB} min={-7} max={7} step={1} />
          <button type="button" className="btn-ghost text-[17px] px-[12px] py-[6px]" onClick={() => { setW1(ROWS[row][0]); setW2(ROWS[row][1]); setB(0); }} disabled={!custom}>활동지 값으로</button>
        </div>
      }
      lines={[
        custom ? <><M>w₁ = {fmt(w1)}, w₂ = {fmt(w2)}, b = {fmt(b)}</M>이면 <M>z = {par(w1 * x1)} + {par(w2 * x2)} + {par(b)} = {fmt(z)}</M>, <M>ŷ = ReLU({fmt(z)}) = {fmt(y)}</M>.</> : null,
        !custom && s === 0 ? <>시범 줄. <M>w₁ = 2, w₂ = 1</M>이면 <M>z = 4 + 3 = 7</M>.</> : null,
        !custom && s === 1 ? <>둘째 줄. <M>w₁ = 1, w₂ = 1</M>이면 <M>z</M>는?</> : null,
        !custom && s === 2 ? <><M>z = 2 + 3 = 5</M>. <M>w₁</M>이 작아져 <M>x₁</M>의 영향이 줄어듦.</> : null,
        !custom && s === 3 ? <>셋째 줄. <M>w₁ = 2, w₂ = −1</M>이면 <M>z</M>는?</> : null,
        !custom && s === 4 ? <><M>(−1) × 3 = −3</M>이라 <M>z = 4 + (−3) = 1</M>.</> : null,
        !custom && s === 5 ? <>넷째 줄. <M>w₁ = −1, w₂ = 3</M>이면 <M>z</M>는?</> : null,
        !custom && s === 6 ? <><M>z = (−2) + 9 = 7</M>.</> : null,
        !custom && s === 7 ? <>관찰. <M>w₂</M>가 1에서 <Key>−1</Key>이 되자 <M>z</M>는 시범 줄보다 커졌나, 작아졌나?</> : null,
        !custom && s === 8 ? <><M>z</M>가 7에서 1로 작아짐.</> : null,
        !custom && s === 8 ? <>입력이 양수일 때, 가중치가 <Key>음수</Key>이면 그 항은 <M>z</M>를 <Key>줄이는</Key> 쪽으로 작용함.</> : null,
      ]}
    />
  );
};

/* ───────── 4B-1 왜 e에 x가 곱해지나 (활동지 실험을 그대로) ───────── */
export const B1Experiment: ComponentType<{ step: number }> = ({ step }) => {
  const x1 = 2, x2 = 3, b = 0;
  // 활동지 두 줄을 각각 "z와 늘어난 양은?"(질문) → 공개로 나누고, 끝에 활동지 비교 문항을 묻는다
  const s = Math.min(step, 6);
  const w1 = s === 1 || s === 2 ? 1.5 : 1, w2 = s === 3 || s === 4 ? 1.5 : 1;
  const ask = s === 1 || s === 3;
  const z = w1 * x1 + w2 * x2 + b;
  const rows: (string | null)[][] = [
    ['처음 상태', '1·2 + 1·3 + 0', '5', '—'],
    ['w₁만 1 → 1.5', s >= 1 ? '1.5·2 + 1·3 + 0' : null, s >= 2 ? '6' : null, s >= 2 ? '1 = 0.5 × 2' : null],
    ['w₂만 1 → 1.5', s >= 3 ? '1·2 + 1.5·3 + 0' : null, s >= 4 ? '6.5' : null, s >= 4 ? '1.5 = 0.5 × 3' : null],
  ];
  const active = s === 1 || s === 2 ? 1 : s === 3 || s === 4 ? 2 : -1;
  return (
    <Layout
      figure={
        <NeuronFigure
          detail
          swap
          sumExpr={ask}
          inputs={[{ name: 'x₁', value: x1 }, { name: 'x₂', value: x2 }]}
          weights={[
            { name: 'w₁', value: w1, prev: s === 1 || s === 2 ? 1 : null, hot: s === 1 || s === 2, product: ask ? `${fmt(w1)} × ${x1}` : `${fmt(w1)} × ${x1} = ${fmt(w1 * x1)}` },
            { name: 'w₂', value: w2, prev: s === 3 || s === 4 ? 1 : null, hot: s === 3 || s === 4, product: ask ? `${fmt(w2)} × ${x2}` : `${fmt(w2)} × ${x2} = ${fmt(w2 * x2)}` },
          ]}
          bias={{ value: b }}
          z={{ value: z, show: !ask, hot: active > 0, ask }}
          relu={{ show: false }}
          yhat={{ show: false }}
          flow={active > 0 ? 'inputs' : 'none'}
        />
      }
      asideWidth={500}
      aside={<MiniTable title="활동지 4B-1 표" head={['바꾼 것', 'z = w₁·x₁ + w₂·x₂ + b', 'z', '처음보다\n늘어난 양']} rows={rows} active={active} />}
      lines={[
        s === 0 ? <>4-B로 가기 전에 1-2의 뉴런으로 작은 실험.</> : null,
        s === 0 ? <>출발은 1-2 시범 줄과 같음. <M>x₁ = 2, x₂ = 3, w₁ = w₂ = 1, b = 0</M>이라 <M>z = 5</M>.</> : null,
        s === 1 ? <><M>w₁</M>만 <Key>0.5</Key> 올려 1 → 1.5. <M>z</M>와 늘어난 양은?</> : null,
        s === 2 ? <><M>z = 3 + 3 = 6</M>, 늘어난 양 <Hot>1 = 0.5 × 2</Hot>.</> : null,
        s === 3 ? <><M>w₂</M>만 <Key>0.5</Key> 올려 1 → 1.5. <M>z</M>와 늘어난 양은?</> : null,
        s === 4 ? <><M>z = 2 + 4.5 = 6.5</M>, 늘어난 양 <Hot>1.5 = 0.5 × 3</Hot>.</> : null,
        s === 5 ? <>똑같이 0.5를 올렸는데 <M>z</M>가 더 크게 변한 쪽은 입력이 2인 쪽? 3인 쪽?</> : null,
        s === 6 ? <>늘어난 양 <M>1 = 0.5 × 2</M>, <M>1.5 = 0.5 × 3</M>.</> : null,
        s === 6 ? <>입력이 큰 쪽(<Hot>3</Hot>)이 <M>z</M>를 더 움직임. 늘어난 양 = 0.5 × 입력값.</> : null,
      ]}
    />
  );
};

/* ───────── 4-B 식 정리 — 유도가 끝난 뒤에야 식이 등장한다 ───────── */
const GradFormula: ComponentType<{ step: number }> = ({ step }) => {
  const rows = [
    ['모델', 'ŷ = w·x + b', '점 (3, 7) 하나, 출발 w = 0, b = 0'],
    ['오차', 'e = ŷ − y', '예측 − 정답'],
    ['손실', 'L = ½e²', '½은 기울기를 오차와 같게 만들기 위한 장치'],
    ['기울기', 'dw = e · x,   db = e', '앞에서 유도한 식'],
    ['업데이트', '새 w = w − η·dw,  새 b = b − η·db', 'η = 0.05, 기울기의 반대 방향으로 η × 기울기의 크기만큼'],
  ];
  return (
    <Layout
      figure={
        <div className="h-full flex items-center justify-center">
          <div className="w-[1300px] grid grid-cols-[140px_720px_1fr] gap-x-[28px] gap-y-[20px] items-center">
            {rows.map(([k, f, d], i) => (
              <div key={k} className={`contents lec-fade`}>
                <div className={`text-[24px] font-bold ${i <= step ? 'text-accent' : 'text-border'}`}>{k}</div>
                <div className={`text-[32px] font-semibold tabular-nums whitespace-nowrap ${i <= step ? (i === step ? 'text-text' : 'text-text/70') : 'text-border'}`}>{f}</div>
                <div className={`text-[21px] ${i <= step ? 'text-muted' : 'text-border'}`}>{d}</div>
              </div>
            ))}
          </div>
        </div>
      }
      lines={[
        step === 0 ? <>모델. ReLU를 생략한 <M>ŷ = wx + b</M>. 점 <M>(3, 7)</M> 하나, 출발은 <M>w = 0, b = 0</M>.</> : null,
        step === 1 ? <>오차는 3-1에서 배운 대로 예측 − 정답.</> : null,
        step === 2 ? <>손실 <M>L = ½e²</M>. 4-A에서 본 대로 ½은 기울기를 오차와 같게 만들기 위한 장치.</> : null,
        step === 3 ? <>기울기 <M>dw = e·x, db = e</M>. dw는 w의 기울기, db는 b의 기울기.</> : null,
        step === 3 ? <>4-A에서 본 b의 기울기 e와 같음.</> : null,
        step === 4 ? <>업데이트는 4-A와 같은 식. 지금 b 자리에 w와 b, 기울기 자리에 dw와 db를 넣음.</> : null,
        step === 4 ? <>기울기의 반대 방향으로 η × 기울기의 크기만큼. 이제 점 <M>(3, 7)</M>로 한 step.</> : null,
      ]}
    />
  );
};

/* ───────── 더 알아보기. 기호로 쓰면 ───────── */
export const GradSymbols: ComponentType<{ step: number }> = ({ step }) => {
  // 오차가 L에서 출발해 거꾸로 흐르는 길을 한 구간씩 보인다 (1: L→ŷ, 2: 뉴런 통과, 3: w, 4: b)
  const back: BackSpec = {
    stage: Math.min(step, 3) + 1, dimForward: true,
    atY: '∂L/∂ŷ = e', atRelu: '그대로', atW: ['∂ŷ/∂w = x'], atB: '∂ŷ/∂b = 1',
    dw: ['∂L/∂w = e · x'], db: '∂L/∂b = e',
  };
  return (
    <Layout
      figure={
        <NeuronFigure
          inputs={[{ name: 'x' }]} weights={[{ name: 'w' }]} bias={{}} symbolic activation="linear"
          loss={{ show: true, e: 'e = ŷ − y', L: 'L = ½e²' }}
          back={back}
        />
      }
      lines={[
        step === 0 ? <><M>ŷ</M>에 대한 <M>L</M>의 기울기 <M>e</M>를 구해 앞쪽으로 거꾸로 전달함.</> : null,
        step === 1 ? <>선형 모델이라 뉴런은 그대로 통과. 지나는 곳마다 변화율을 곱함.</> : null,
        step === 2 ? <><M>w</M> 선에서 <M>x</M>를 곱해 <Hot>dw = e·x</Hot>.</> : null,
        step === 3 ? <><M>b</M> 선에서 1을 곱해 <Hot>db = e</Hot>. 연결된 변화율을 곱하는 것이 <Key>연쇄법칙</Key>.</> : null,
      ]}
    />
  );
};

/* ───────── A5. 한 step ───────── */
const OneStep: ComponentType<{ step: number }> = ({ step }) => {
  const x = 3, y = 7, eta = 0.05;
  const w0 = 0, b0 = 0;
  const yhat0 = w0 * x + b0, e0 = yhat0 - y, L0 = 0.5 * e0 * e0;
  const dw = e0 * x, db = e0;
  const w1 = w0 - eta * dw, b1 = b0 - eta * db;
  const yhat1 = w1 * x + b1, e1 = yhat1 - y, L1 = 0.5 * e1 * e1;
  // 질문 → 공개. ③ 기울기와 ④ 업데이트는 식 상자를 띄운 채 값을 넣은 식(질문) → 결과(공개)로 간다 (2026-10-15 사용자 지시)
  // 2026-10-16: 오차·손실을 식 → 생각 → 숫자로 나눠 단계 2~7로 확장(e, e², L). 그 뒤는 옛 번호 o = s − 4
  // 확인(4B-5)도 ŷ → e → L 순으로 나눔: s 17~21 (v = 0..4). 그 뒤 정리는 s 22·23
  const s = Math.min(step, 24);
  const o = s < 3 ? s : s <= 7 ? 3 : s <= 10 ? 4 : s <= 16 ? s - 6 : s === 17 ? 11 : s <= 22 ? 12 : s - 10;
  const v = s >= 17 && s <= 22 ? s - 17 : -1; // 확인: z? → z → ŷ → e → L? → L
  const bstage = s === 8 ? 1 : s === 9 ? 3 : 4; // 기울기 단계: L→ŷ, 그다음 b, 그다음 w
  const after = o >= 11;                 // 4B-5 확인부터는 업데이트한 w, b
  const w = o >= 10 ? w1 : w0, b = o >= 10 ? b1 : b0;
  const yhat = after ? yhat1 : yhat0;
  const zShownV = v >= 1;
  const yShown = v >= 0 ? v >= 2 : (o >= 1 && o <= 10) || o >= 12;
  const errShown = v >= 0 ? v >= 3 : (o >= 3 && o <= 10) || o >= 12;
  const lossShown = v >= 0 ? v >= 5 : (s >= 7 && o <= 10) || o >= 12;
  const back: BackSpec | undefined = o >= 4 && o <= 10 ? {
    // 2026-10-16 사용자 지시: 구간 배율(× (−7), 그대로, × 3, × 1) 대신 식 자체를 화살표에 적는다
    stage: o === 4 ? bstage : 4, dimForward: o <= 8, atY: '∂L/∂ŷ = e = −7', atW: ['∂L/∂w = e · x = (−7) × 3'], atB: '∂L/∂b = e = −7',
    dw: o >= 6 ? ['dw = −21'] : undefined, db: o >= 6 ? 'db = −7' : undefined,
  } : undefined;
  const fwdHot = o === 1 || (v >= 0 && v <= 2);
  const paramHot = o === 0 || o === 9 || o === 10 || o === 11;
  // 식 상자: ③ 기울기(4~8), ④ 업데이트(9~10)
  const box = v >= 0
    ? { main: <>z = w · x + b,  ŷ = z,  e = ŷ − y,  L = ½e²</>, sub: v === 0 ? <>z = 1.05 × 3 + 0.35 = ?</> : v === 1 ? <>z = 1.05 × 3 + 0.35 = <Hot>3.5</Hot></> : v === 2 ? <>ŷ = z = <Hot>3.5</Hot></> : v === 3 ? <>e = 3.5 − 7 = <Hot>−3.5</Hot></> : v === 4 ? <>L = ½ × (−3.5)² = ½ × 12.25 = ?</> : <>L = <Hot>6.125</Hot>.  24.5 → 6.125, 한 step에 <Hot>¼</Hot>로</> }
    : s >= 2 && s <= 7
    ? { main: <>e = ŷ − y,  L = ½e²</>, sub: s === 2 ? <>e = 0 − 7 = ?</> : s === 3 ? <>e = 0 − 7 = <Hot>−7</Hot></> : s === 4 ? <>e² = (−7)² = ?</> : s === 5 ? <>e² = (−7)² = <Hot>49</Hot></> : s === 6 ? <>L = ½ × 49 = ?</> : <>L = ½ × 49 = <Hot>24.5</Hot></> }
    : o >= 4 && o <= 8
    ? { main: <>dw = e · x,  db = e</>, sub: o === 5 ? <>dw = (−7) × 3,  db = (−7)</> : o >= 6 ? <>dw = (−7) × 3 = <Hot>−21</Hot>,  db = <Hot>−7</Hot></> : undefined }
    : o >= 9 && o <= 10
    ? { main: <>새 w = w − η · dw,  새 b = b − η · db</>, sub: o === 9 ? <>새 w = 0 − 0.05 × (−21),  새 b = 0 − 0.05 × (−7)</> : <>새 w = 0 + 1.05 = <Hot>1.05</Hot>,  새 b = 0 + 0.35 = <Hot>0.35</Hot></> }
    : null;
  return (
    <Layout
      figure={
        <div className="h-full flex flex-col gap-[10px]">
          {box && <FormulaBox main={box.main} sub={box.sub} />}
          <div className="flex-1 min-h-0">
            <NeuronFigure
              inputs={[{ name: 'x', value: x }]}
              activation="linear"
              weights={[{ name: 'w', value: w, prev: o === 10 ? w0 : null, hot: paramHot }]}
              bias={{ value: b, prev: o === 10 ? b0 : null, hot: paramHot }}
              z={{ value: w * x + b, show: v >= 0 ? zShownV : fwdHot, hot: fwdHot }}
              yhat={{ value: yhat, show: yShown, hot: fwdHot }}
              flow={fwdHot ? 'out' : 'none'}
              loss={{ show: o >= 2, y, e: errShown ? `e = ${fmt(after ? e1 : e0)}` : null, L: lossShown ? `L = ${fmt(after ? L1 : L0)}` : null }}
              back={back}
            />
          </div>
        </div>
      }
      lines={[
        s === 0 ? <>4B-2 <Key>예측</Key>. 출발은 <M>w = 0, b = 0</M>. 예측값 <M>ŷ</M>는?</> : null,
        s === 1 ? <><M>ŷ = 0·3 + 0 = 0</M>. 아직 아무것도 배우지 않은 뉴런.</> : null,
        s === 2 ? <>4B-2 <Key>오차</Key>. 식은 <M>e = ŷ − y</M>. 예측 <M>ŷ = 0</M>, 정답 <M>y = 7</M>. <M>e</M>는?</> : null,
        s === 3 ? <><M>e = 0 − 7 = −7</M>. 예측이 정답보다 7 작음.</> : null,
        s === 4 ? <>오차의 제곱 <M>e² = (−7)²</M>은?</> : null,
        s === 5 ? <><M>e² = 49</M>. 제곱하면 음수가 사라짐.</> : null,
        s === 6 ? <>손실 <M>L = ½e² = ½ × 49</M>은?</> : null,
        s === 7 ? <><M>L = 24.5</M>. 이 손실을 줄이는 것이 목표.</> : null,
        s === 8 ? <>4B-3 <Key>기울기</Key>. 오차가 거꾸로 흐름. 먼저 <M>L → ŷ</M>: <M>∂L/∂ŷ = e = −7</M>.</> : null,
        s === 9 ? <><M>b</M>로 흘러감. <M>b</M>가 변하면 <M>ŷ</M>도 같은 양만큼. <M>∂L/∂b = e × 1 = −7</M>.</> : null,
        s === 10 ? <><M>w</M>로 흘러감. <M>w</M>가 변하면 <M>ŷ</M>은 <M>x</M>배. <M>∂L/∂w = e × x = (−7) × 3</M>.</> : null,
        o === 5 ? <><M>dw = ∂L/∂w = (−7) × 3</M>, <M>db = ∂L/∂b = −7</M>. 직접 계산하면?</> : null,
        o === 6 ? <><Hot>dw = (−7) × 3 = −21</Hot>, <Hot>db = −7</Hot>.</> : null,
        o === 7 ? <><M>dw</M>, <M>db</M>의 부호는? 손실을 줄이려면 <M>w</M>와 <M>b</M>를 키워야 할까, 줄여야 할까?</> : null,
        o === 8 ? <><M>dw</M>, <M>db</M>가 모두 음수. 기울기의 <Key>반대 부호 방향</Key>으로 감.</> : null,
        o === 8 ? <>기울기가 음수(−)이니 <M>w</M>와 <M>b</M>를 <Key>키워야</Key>(+) 함.</> : null,
        o === 9 ? <>4B-4 <Key>업데이트</Key>. 식 <M>새 w = w − η·dw</M>, <M>새 b = b − η·db</M>에 <M>η = 0.05</M>를 넣음.</> : null,
        o === 9 ? <>곱셈 먼저. 새 <M>w</M>, <M>b</M>는?</> : null,
        o === 10 ? <>곱셈 먼저. <M>0.05 × (−21) = −1.05</M>, <M>0.05 × (−7) = −0.35</M>.</> : null,
        o === 10 ? <>새 <M>w = 0 − (−1.05) = 0 + 1.05 = 1.05</M>, 새 <M>b = 0 + 0.35 = 0.35</M>. 음수를 빼면 더하기가 됨.</> : null,
        v === 0 ? <>4B-5 <Key>확인</Key>. 새 <M>w = 1.05, b = 0.35</M>로 다시 계산. <M>z = 1.05 × 3 + 0.35</M>은?</> : null,
        v === 1 ? <><M>z = 3.5</M>.</> : null,
        v === 2 ? <>ReLU가 없으니 그대로. <M>ŷ = 3.5</M>. 아까는 0이었음. 정답 7에 가까워짐.</> : null,
        v === 3 ? <>오차 <M>e = 3.5 − 7 = −3.5</M>. 아까 −7의 절반.</> : null,
        v === 4 ? <>손실 <M>L = ½ × (−3.5)² = ½ × 12.25</M>는?</> : null,
        v === 5 ? <><M>L = 6.125</M>. 손실이 <M>24.5</M>에서 <Hot>6.125</Hot>로, 한 step에 4분의 1.</> : null,
        o === 13 ? <>정리. 고치는 방향은 기울기와 같은 방향일까, 반대 방향일까? 고치는 양은?</> : null,
        o === 14 ? <>기울기의 <Key>반대 방향</Key>으로, <Key>η × 기울기의 크기</Key>만큼. 예측 → 오차·손실 → 기울기 → 업데이트의 반복이 학습.</> : null,
        o === 14 ? <>점이 여러 개일 때는 점마다 기울기를 구해 평균함.</> : null,
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
    const yhat = s.w * x + s.b, e = yhat - y;
    const w = s.w - eta * e * x, b = s.b - eta * e;
    const e2 = w * x + b - y;
    return { w, b, n: s.n + 1, hist: [...s.hist, 0.5 * e2 * e2] };
  };
  // 1단계는 질문(두 번째 step의 dw, db, w, b는?), 2단계에서 한 step을 실행해 공개. 6단계에서 자동 학습
  useEffect(() => { if (step <= 1) { setState({ w: 1.05, b: 0.35, n: 1, hist: [24.5, 6.125] }); setRunning(false); } if (step >= 2) setState((s) => s.n === 1 ? one(s) : s); if (step < 6) setRunning(false); if (step === 6) setRunning(true); }, [step]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!running) { if (timer.current) window.clearInterval(timer.current); return; }
    timer.current = window.setInterval(() => setState((s) => (s.n >= 60 ? s : one(s))), 140);
    return () => { if (timer.current) window.clearInterval(timer.current); };
  }, [running]); // eslint-disable-line react-hooks/exhaustive-deps
  const yhat = state.w * x + state.b, e = yhat - y, L = 0.5 * e * e;
  const hist = state.hist;
  const W = 280, H = 110;
  const pts = hist.map((v, i) => `${(i / Math.max(hist.length - 1, 1)) * W},${H - (v / 24.5) * H}`).join(' ');
  return (
    <Layout
      figure={
        <NeuronFigure
          inputs={[{ name: 'x', value: x }]}
          weights={[{ name: 'w', value: state.w, hot: true }]}
          activation="linear"
          bias={{ value: state.b, hot: true }}
          yhat={{ value: yhat, show: true, hot: true }}
          loss={{ show: true, y, e: `e = ${fmt2(e)}`, L: L < 0.005 ? 'L ≈ 0' : `L = ${state.n === 1 ? fmt(L) : fmt2(L)}` }}
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
        step === 1 ? <>두 번째 step. <M>e = −3.5</M>로 <M>dw</M>, <M>db</M>와 새 <M>w</M>, <M>b</M>는?</> : null,
        step === 2 ? <><M>dw = (−3.5) × 3 = −10.5, db = −3.5</M>.</> : null,
        step === 2 ? <>새 <M>w = 1.05 − 0.05 × (−10.5) = 1.05 + 0.525 = 1.575</M>, 새 <M>b = 0.35 + 0.175 = 0.525</M>.</> : null,
        step === 3 ? <>4B-3의 <M>dw = −21, db = −7</M>과 비교하면 기울기의 크기는 커졌나, 작아졌나?</> : null,
        step === 4 ? <>기울기의 크기가 <M>21 → 10.5</M>, <M>7 → 3.5</M>로 <Key>작아짐</Key>. 바닥에 가까워질수록 기울기의 크기가 작아져 조금씩 움직임.</> : null,
        step === 5 ? <>같은 네 단계를 <Key>반복</Key>함. 컴퓨터는 이 step을 1초에 수백만 번 함.</> : null,
        step === 6 ? <>오차가 0에 가까워지며 <M>w ≈ 2.1, b ≈ 0.7</M>에 거의 멈춤. 점 하나를 지나는 직선은 많아서 정답 <M>w = 2, b = 1</M>과 다름.</> : null,
      ]}
    />
  );
};

export const SLIDES: SlideDef[] = [
  ...OPENING_SLIDES,
  { id: 'cover', section: 'neuron', title: '', steps: 0, component: Cover },
  GOAL_SLIDE,
  DIVIDERS.neuron,
  { id: 'a1-predict', section: 'neuron', tag: '1-1', title: '인공 뉴런 하나가 예측을 만든다', formula: 'z = w₁·x₁ + w₂·x₂ + b', steps: 7, component: A1Predict,
    notes: ['화면이 인공 뉴런 하나입니다. 왼쪽 두 원이 입력, 선 위의 w가 가중치입니다. 뉴런 안에서 곱해 더하고 b를 더한 z가 ReLU를 지나 ŷ이 됩니다.', '활동지 1-1 시범 줄과 같은 숫자입니다.'] },
  { id: 'a1-negative', section: 'neuron', tag: '1-1', title: '가중치를 바꾸면', formula: 'z = w₁·x₁ + w₂·x₂ + b', steps: 8, component: A1Negative,
    notes: ['활동지 1-1 표의 둘째~넷째 줄은 w를 먼저 보이고 "z는?"에서 멈춥니다. 학생이 계산한 뒤 다음 단계에서 공개합니다. 7·8단계는 활동지 관찰 문항입니다.', '가중치는 그 입력이 결과에 미치는 영향의 크기입니다. 슬라이더로 다른 값도 보여 줄 수 있고 "활동지 값으로"로 돌아옵니다.'] },
  ...NEURON_EXTRA,
  // 딥시크 V4 기사(원본 37·38장)를 도입부에 그대로 두고, 1-5 딥러닝 그림 읽기 뒤에 한 번 더 보여 준다(파라미터 수 → 284B → 끝-1의 3B로 이어짐)
  ...OPENING_SLIDES.filter((s) => s.id === 'source-37' || s.id === 'source-38').map((s) => ({ ...s, id: s.id + '-again', section: 'neuron' as const })),
  DIVIDERS.forward,
  ...FORWARD_SLIDES,
  DIVIDERS.loss,
  ...LOSS_SLIDES,
  DIVIDERS.gd,
  ...GD_SLIDES,
  // 2026-10-16 사용자 결정: 4B-1 실험 두 장(B1Experiment, WEIGHT_PATTERN)은 덱에서 뺌. 유도(62~65장)를 먼저 하고 활동지 4B-1은 건너뛴다.
  GRAD_SETUP,
  ...GRAD_DERIVE_SLIDES,
  // 2026-10-16 사용자 결정: '같은 것을 뉴런 그림으로 보면'(grad-symbols, GradSymbols)은 덱에서 뺌
  { id: 'grad-formula', section: 'grad', tag: '4-B', title: '4-B에서 쓰는 식', steps: 4, component: GradFormula,
    notes: ['식은 유도가 끝난 뒤에 처음 보여 줌. 학생은 이 상자를 보며 4B-2부터 4B-5까지 종이로 계산함.'] },
  { id: 'a5-one-step', section: 'grad', tag: '4B-2 ~ 4B-5', title: '한 step', titleAt: (k) => k <= 7 ? '한 step · 예측과 오차' : k <= 12 ? '한 step · 오차 역전파' : k <= 16 ? '한 step · 경사 하강법' : k <= 22 ? '한 step · 확인' : '한 step · 정리', formula: 'dw = e·x,  db = e,  새 w = w − η·dw,  새 b = b − η·db', steps: 24, component: OneStep,
    notes: ['예측 → 오차 → 기울기 → 업데이트 → 확인. "ŷ는?", "e는?" 같은 질문 단계에서 멈추고 학생이 활동지 4B-2~4B-5를 계산한 뒤 넘깁니다.', '손실 24.5 → 6.125.'] },
  { id: 'a5-repeat', section: 'grad', tag: '도전', title: '반복하면 학습', formula: 'dw = e·x,  db = e,  새 w = w − η·dw,  새 b = b − η·db', steps: 6, component: Repeat,
    notes: ['도전 문항의 두 번째 step(w 1.575, b 0.525)을 확인한 뒤 자동 학습을 켭니다. w ≈ 2.1, b ≈ 0.7에서 멈춥니다.'] },
  ...END_SLIDES,
  ...CLOSING_SLIDES,
];
