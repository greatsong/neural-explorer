import type { ComponentType } from 'react';
import { Layout, M, Key, fmt } from './common';
import { ACCENT, MUTED, ORANGE } from './NeuronFigure';

const PTS: [number, number][] = [[1, 3], [2, 5], [3, 7], [4, 9], [5, 11]];
const bText = (b: number | null) => (b === null ? '+ b' : b < 0 ? `− ${fmt(-b)}` : `+ ${fmt(b)}`);

/* 활동지 3-2 형식의 표. b를 정하면 점마다 ŷ·e·e²을 계산한다. rows = 공개한 줄 수(시범은 1줄) */
export function BiasTable({ b, rows, sum, mse, loss, compact }: { b: number | null; rows: number; sum?: boolean; mse?: boolean; loss?: boolean; compact?: boolean }) {
  const e = b === null ? 0 : b - 1;
  const bl = bText(b);
  const th = 'text-muted font-medium text-left px-[8px] py-[4px] border-b border-border whitespace-nowrap';
  const td = 'px-[8px] py-[5px] border-b border-border/60 whitespace-nowrap';
  return (
    <div>
      <div className="text-[18px] text-muted mb-[8px]">다섯 점 · 예측 ŷ = 2x {bl}</div>
      <table className={`w-full ${compact ? 'text-[19px]' : 'text-[21px]'} tabular-nums border-collapse`}>
        <thead><tr><th className={th}>x</th><th className={th}>정답 y</th><th className={th}>ŷ = 2x {bl}</th><th className={th}>e = ŷ − y</th><th className={th}>e²</th></tr></thead>
        <tbody>
          {PTS.map(([x, y], i) => {
            const on = b !== null && i < rows; const yh = 2 * x + (b ?? 0);
            return (
              <tr key={x} className={on && rows === 1 ? 'bg-accent-bg font-bold' : 'text-text'}>
                <td className={td}>{x}</td><td className={td}>{y}</td>
                <td className={`${td} text-accent font-semibold`}>{on ? (i === 0 ? `2·1 ${bl} = ${fmt(yh)}` : fmt(yh)) : ''}</td>
                <td className={`${td} font-semibold`} style={{ color: ORANGE }}>{on ? (i === 0 ? `${fmt(yh)} − 3 = ${fmt(e)}` : fmt(e)) : ''}</td>
                <td className={`${td} font-semibold`}>{on ? fmt(e * e) : ''}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="mt-[10px] text-[22px] tabular-nums space-y-[4px]">
        {sum && <div className="lec-fade">Σe² = {Array(5).fill(fmt(e * e)).join(' + ')} = <M>{fmt(5 * e * e)}</M></div>}
        {mse && <div className="lec-fade">MSE = {fmt(5 * e * e)} ÷ 5 = <M>{fmt(e * e)}</M></div>}
        {loss && <div className="lec-fade">L = ½ × {fmt(e * e)} = <Key>{fmt(e * e / 2)}</Key></div>}
      </div>
    </div>
  );
}

// 53장. 같은 b가 왼쪽에서는 직선을 옮기고 오른쪽에서는 점의 가로 좌표가 된다.
// 좌표를 표로 보이고, b마다 시범 줄(x = 1) → "나머지는?" → 공개 → Σe²·MSE·L 순서로 점마다 계산한다.
// 규칙(e = b − 1, L = ½(b − 1)²)은 세 b의 결과를 본 뒤 마지막에 말한다.
export const GraphBridge: ComponentType<{ step: number }> = ({ step }) => {
  const s = Math.min(step, 12);
  const B = [null, 3, 3, 3, 3, -2, -2, -2, -2, 1, 1, 1, 1][s];
  const b = B ?? 0;
  const e = b - 1;
  const rows = [0, 1, 5, 5, 5, 1, 5, 5, 5, 0, 5, 5, 5][s];
  const showE = B !== null && rows === 5;
  const plotted = [s >= 4 ? 3 : null, s >= 8 ? -2 : null, s >= 10 ? 1 : null].filter((v): v is number => v !== null);
  const loss = (v: number) => 0.5 * (v - 1) ** 2;
  const px = (x: number) => 70 + x * 70;
  const py = (y: number) => 340 - (y + 3) * 19;
  const lx = (v: number) => 70 + (v + 3) * 58;
  const ly = (v: number) => 340 - v * 32;
  return <Layout asideWidth={500} aside={<BiasTable b={B} rows={rows} sum={[4, 8, 10].includes(s) || s >= 11} mse={[4, 8, 10].includes(s) || s >= 11} loss={[4, 8, 10].includes(s) || s >= 11} />} lines={[
    s === 0 ? <>세션3의 다섯 점 <M>(1, 3), (2, 5), (3, 7), (4, 9), (5, 11)</M>. 정답은 <M>y = 2x + 1</M>.</> : null,
    s === 0 ? <>계산을 쉽게 하려고 <M>w = 2</M>로 고정하고 <Key>b만</Key> 움직임. 예측은 <M>ŷ = 2x + b</M>.</> : null,
    s === 1 ? <><M>b = 3</M>이면 예측 직선은 <M>ŷ = 2x + 3</M>. 시범 x = 1: <M>ŷ = 5, e = 5 − 3 = 2, e² = 4</M>.</> : null,
    s === 1 ? <>나머지 네 점은?</> : null,
    s === 2 ? <><M>ŷ = 7, 9, 11, 13</M>. 오차 <M>e</M>는 모두 <Key>2</Key>, <M>e²</M>은 모두 4.</> : null,
    s === 3 ? <>다섯 점의 손실은? <M>Σe²</M>과 <M>MSE</M>를 계산.</> : null,
    s === 4 ? <><M>Σe² = 20</M>, <M>MSE = 20 ÷ 5 = 4</M>. 손실 <M>L = ½ × MSE = 2</M>로 둠(½의 이유는 뒤에서).</> : null,
    s === 4 ? <>오른쪽 그래프에 점 <M>(3, 2)</M>. 가로축은 <Key>b</Key>, 세로축은 <Key>손실 L</Key>.</> : null,
    s === 5 ? <><M>b = −2</M>이면 <M>ŷ = 2x − 2</M>. 시범 x = 1: <M>ŷ = 0, e = 0 − 3 = −3, e² = 9</M>.</> : null,
    s === 5 ? <>나머지 네 점은?</> : null,
    s === 6 ? <><M>ŷ = 2, 4, 6, 8</M>. 오차 <M>e</M>는 모두 <Key>−3</Key>, <M>e²</M>은 모두 9.</> : null,
    s === 7 ? <>손실 <M>L</M>은?</> : null,
    s === 8 ? <><M>Σe² = 45</M>, <M>MSE = 45 ÷ 5 = 9</M>, <M>L = ½ × 9 = 4.5</M>. 점 <M>(−2, 4.5)</M>.</> : null,
    s === 9 ? <><M>b = 1</M>이면 <M>ŷ = 2x + 1</M>. 오차는?</> : null,
    s === 10 ? <>직선이 다섯 점을 모두 지남. <M>e = 0</M>, <M>L = 0</M>. 점 <M>(1, 0)</M>.</> : null,
    s === 11 ? <>세 결과. <M>b = 3 → e = 2</M>, <M>b = −2 → e = −3</M>, <M>b = 1 → e = 0</M>.</> : null,
    s === 11 ? <>오차 <Key>e = b − 1</Key>. b가 1보다 얼마나 큰지가 오차. 1보다 작으면 음수.</> : null,
    s === 12 ? <>다섯 점의 e가 모두 같으니 <M>MSE = e²</M>, <Key>L = ½e² = ½(b − 1)²</Key>.</> : null,
    s === 12 ? <>점들을 이으면 손실 곡선. 바닥은 <M>b = 1</M>.</> : null,
  ]} figure={<div className="h-full flex flex-col justify-center">
    <div className="grid grid-cols-2 gap-[24px]">
      <div className="rounded-2xl border border-border p-[16px]">
        <div className="text-[25px] font-bold">예측 직선 <span className="text-accent">{B === null ? 'ŷ = 2x + b' : `ŷ = 2x ${bText(b)}`}</span></div>
        <svg viewBox="0 0 520 400" className="w-full" aria-label="입력 x와 예측값의 그래프">
          <line x1={70} y1={340} x2={450} y2={340} stroke={MUTED} strokeWidth={2}/>
          <line x1={70} y1={340} x2={70} y2={30} stroke={MUTED} strokeWidth={2}/>
          <text x={455} y={368} fill={MUTED} fontSize={20}>입력 x</text>
          <text x={20} y={23} fill={MUTED} fontSize={20}>정답 y · 예측값 ŷ</text>
          {PTS.map(([x, y]) => <g key={x}>
            <text x={px(x)} y={366} textAnchor="middle" fill={MUTED} fontSize={20}>{x}</text>
            {B !== null && x <= rows && <line x1={px(x)} x2={px(x)} y1={py(y)} y2={py(2 * x + b)} stroke={ORANGE} strokeWidth={4}/>}
            {B !== null && x <= rows && e !== 0 && <text x={px(x) + (e < 0 ? -10 : 10)} y={py(y + e / 2) + 7} textAnchor={e < 0 ? 'end' : 'start'} fill={ORANGE} fontSize={20} fontWeight={700}>{fmt(e)}</text>}
            <circle cx={px(x)} cy={py(y)} r={7} fill={ORANGE}/>
            <text x={px(x) + 12} y={py(y) + 28} fill={ORANGE} fontSize={18} fontWeight={700}>({x}, {y})</text>
          </g>)}
          {B !== null && <line x1={px(0)} y1={py(b)} x2={px(5)} y2={py(10 + b)} stroke={ACCENT} strokeWidth={4}/>}
          <text x={100} y={62} fill={ORANGE} fontSize={20}>● 정답 다섯 점: y = 2x + 1</text>
          {showE && <text x={100} y={94} fill={ORANGE} fontSize={21} fontWeight={700}>다섯 점 모두 e = {fmt(e)}</text>}
        </svg>
      </div>
      <div className="rounded-2xl border border-border p-[16px]">
        <div className="text-[25px] font-bold">b마다 <span className="text-accent">손실 L 하나</span></div>
        <svg viewBox="0 0 520 400" className="w-full" aria-label="편향 b와 손실 L의 그래프">
          <line x1={70} y1={340} x2={485} y2={340} stroke={MUTED} strokeWidth={2}/>
          <line x1={70} y1={340} x2={70} y2={30} stroke={MUTED} strokeWidth={2}/>
          <text x={455} y={382} fill={MUTED} fontSize={20}>편향 b</text>
          <text x={20} y={23} fill={MUTED} fontSize={20}>손실 L</text>
          {[-2, 0, 1, 3].map(v => <text key={v} x={lx(v)} y={366} textAnchor="middle" fill={v === 1 ? ACCENT : MUTED} fontSize={20} fontWeight={v === 1 ? 700 : 400}>{fmt(v)}</text>)}
          {[0, 2, 4, 6, 8].map(v => <text key={v} x={55} y={ly(v) + 7} textAnchor="end" fill={MUTED} fontSize={18}>{v}</text>)}
          {s >= 12 && <polyline points={Array.from({ length: 81 }, (_, i) => { const v = -3 + i * 7 / 80; return `${lx(v)},${ly(loss(v))}`; }).join(' ')} fill="none" stroke={ACCENT} strokeWidth={4}/>}
          {s >= 12 && <text x={480} y={56} textAnchor="end" fill={ACCENT} fontSize={21} fontWeight={700}>L = ½(b − 1)²</text>}
          {plotted.map(v => <g key={v}>
            <circle cx={lx(v)} cy={ly(loss(v))} r={9} fill={ORANGE}/>
            <text x={lx(v) + (v < 0 ? 14 : v > 1 ? -14 : 0)} y={ly(loss(v)) - (v === 1 ? 20 : 14)} textAnchor={v < 0 ? 'start' : v > 1 ? 'end' : 'middle'} fill={ORANGE} fontSize={23} fontWeight={700}>({fmt(v)}, {fmt(loss(v))})</text>
          </g>)}
        </svg>
      </div>
    </div>
  </div>}/>;
};

export const GradSetup: ComponentType<{ step: number }> = ({ step }) => (
  <Layout lines={[
    step === 0 ? <>지금까지는 <Key>b만</Key> 고쳤음. 이제 <Key>w와 b를 함께</Key> 고침.</> : null,
    step === 1 ? <>계산을 따라가기 쉽게 점은 <M>(3, 7)</M> 하나만 사용. 출발은 <M>w = 0, b = 0</M>.</> : null,
    step === 2 ? <>4-B는 ReLU 없는 <Key>선형 모델</Key> <M>ŷ = wx + b</M>로 계산함.</> : null,
    step === 2 ? <>이 문제에서는 <M>z</M>가 0 이상이라 ReLU를 붙여도 값이 같음.</> : null,
    step === 3 ? <>앞 실험에서 <Key>예측값의 변화 = 입력 x × 가중치의 변화</Key>.</> : null,
    step === 3 ? <>이제 손실 <M>L</M>은 얼마나 변하는지, 곧 기울기를 구함.</> : null,
  ]} figure={<div className="h-full flex flex-col justify-center gap-[26px]">
    <div className="grid grid-cols-2 gap-[32px]">
      <div className="rounded-2xl border border-border p-[32px]">
        <div className="text-[28px] text-muted mb-[22px]">4-A에서 한 일</div>
        <div className="text-[34px] leading-[1.8]">정답 다섯 점<br/>w = 2 고정<br/><b>b 하나를 업데이트</b></div>
      </div>
      <div className="rounded-2xl border-2 border-accent bg-accent-bg/40 p-[32px]">
        <div className="text-[28px] text-accent font-bold mb-[22px]">4-B에서 할 일</div>
        <div className="text-[34px] leading-[1.8]">
          <div>{step >= 1 ? '정답 한 점 (3, 7)' : '정답 한 점'}</div>
          <div>{step >= 1 ? 'w = 0, b = 0에서 출발' : 'w도 함께 움직임'}</div>
          <b>w와 b를 모두 업데이트</b>
        </div>
      </div>
    </div>
    {step >= 2 && <div className="rounded-xl bg-surface px-[28px] py-[20px] text-[27px]">
      모델 <M>ŷ = wx + b</M> · 손실 <M>L = ½(ŷ − y)²</M>
    </div>}
  </div>}/>
);

// 첫 세 사례를 관찰하고 네 번째를 예상한 뒤에만 일반식을 공개한다.
export const WeightPattern: ComponentType<{ step: number }> = ({ step }) => {
  const cell = 'px-[26px] py-[18px] text-center';
  return <Layout lines={[
    step === 0 ? <>모든 실험에서 <M>b = 0</M>, <M>w는 1 → 1.5</M>. 입력 1개 모델 <M>ŷ = wx</M>에서 x만 다르게 함.</> : null,
    step === 1 ? <>입력 <M>x = 1</M>일 때 예측값의 변화는 <M>0.5</M>. 4B-1에는 없던 새 입력임.</> : 
    step >= 2 && step <= 3 ? <>입력 <M>x = {step}</M>일 때 예측값의 변화는 <M>{step * 0.5}</M>. 앞의 4B-1 결과와 비교함.</> : null,
    step === 4 ? <>세 결과에 어떤 규칙이 보이나? <Key>x = 4라면 예측값은 얼마나 늘어날까?</Key></> : null,
    step === 5 ? <>예측값은 <M>4 → 6</M>, 변화는 <M>2</M>. <Key>입력 × 0.5</Key>라는 예상이 맞았나?</> : null,
    step === 6 ? <><Key>예측값의 변화 = 입력 x × 가중치의 변화</Key>.</> : null,
    step === 7 ? <>입력이 3이면 w를 0.5 올릴 때 예측값이 1.5 늘어남. <Key>그렇다면 손실은 얼마나 변할까?</Key></> : null,
  ]} figure={<div className="h-full flex flex-col justify-center gap-[24px]">
    <table className="w-full border-collapse text-[32px] tabular-nums">
      <thead className="text-muted text-[25px]"><tr>{['입력 x','가중치 w','처음 예측값','바꾼 뒤 예측값','예측값의 변화'].map(t=><th key={t} className={`${cell} border-b-2 border-border`}>{t}</th>)}</tr></thead>
      <tbody>{[1,2,3,4].map((x)=>{
        const revealed= x===4 ? step>=5 : step>=x;
        return <tr key={x} className={`border-b border-border ${step===x || (x===4 && step===5) ? 'bg-accent-bg/50' : ''}`}>
          <td className={`${cell} font-bold`}>{x}</td><td className={cell}>1 → 1.5</td>
          <td className={cell}>{x}</td><td className={cell}>{revealed ? x*1.5 : '?'}</td>
          <td className={`${cell} text-accent font-bold`}>{revealed ? x*0.5 : '?'}</td>
        </tr>;
      })}</tbody>
    </table>
    <div className="h-[86px] flex items-center justify-center text-[34px]">
      {step>=4 && step<6 ? <span className="text-muted">네 번째 줄은 먼저 예상하고, 다음 클릭에서 확인.</span> : null}
    </div>
  </div>}/>;
};

export const EndBridge: ComponentType<{ step: number }> = ({ step }) => (
  <Layout lines={[
    step === 0 ? <>우리는 숫자 <M>7</M>을 맞히도록 학습시켰음. <Key>글을 쓰는 AI는 무엇을 맞히도록 배울까?</Key></> : null,
    step === 1 ? <>앞의 말을 보고 <Key>다음에 올 말</Key>을 예측함. 글을 작은 단위인 토큰으로 나누어 처리함.</> : null,
  ]} figure={<div className="h-full flex items-center justify-center gap-[56px]">
    <div className="rounded-2xl border border-border p-[40px] w-[570px]">
      <div className="text-[26px] text-muted mb-[28px]">우리가 계산한 모델</div>
      <div className="text-[43px] font-bold">입력 3 → 예측값</div>
      <div className="text-[32px] text-accent mt-[28px]">정답은 숫자 7</div>
    </div>
    <div className="rounded-2xl border-2 border-accent bg-accent-bg/40 p-[40px] w-[670px]">
      <div className="text-[26px] text-muted mb-[28px]">다음 말을 예측하는 모델</div>
      <div className="text-[43px] font-bold">어느 날 토끼가 → ?</div>
      <div className="text-[32px] text-accent mt-[28px]">{step >= 1 ? '정답은 원래 문장에 이어지는 말' : '무엇을 정답으로 삼을까?'}</div>
    </div>
  </div>}/>
);

