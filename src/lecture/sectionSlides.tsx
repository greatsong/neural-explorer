// 순전파(2-1~2-3) · 오차와 손실(3-1~3-2) · 경사하강법(4A) 슬라이드. 숫자는 활동지 v2와 같다.
import type { ComponentType } from 'react';
import { Layout, M, Key, Hot, MiniTable, FormulaBox } from './common';
import { ChainFigure, NetFigure, ReluCompare, ErrorLine, ScatterFit, LossCurveB } from './figures';
import { ORANGE as ORANGE_HEX } from './NeuronFigure';
import type { SlideDef } from './slides';
import { GRAPH_BRIDGE } from './bridgeSlides';
import { BiasTable } from './bridgeComponents';

/* ───────── 2-1 뉴런 → 뉴런 ───────── */
// z₁, h, z₂, ŷ를 차례로 "?"로 묻고(홀수 단계) 다음 단계에서 공개한다
const FwChain: ComponentType<{ step: number }> = ({ step }) => (
  <Layout
    figure={<ChainFigure step={Math.ceil(step / 2)} ask={step % 2 === 1} />}
    lines={[
      step === 0 ? <>뉴런을 이어 붙인 그림. 앞 뉴런의 출력 <M>h</M>가 뒤 뉴런의 입력이 됨. 입력에서 출력 쪽으로 흐르는 계산이 <Key>순전파</Key>.</> : null,
      step === 1 ? <>뉴런 1. <M>z₁ = w₁·x + b₁ = 2·3 + (−1)</M>은?</> : null,
      step === 2 ? <><M>z₁ = 6 + (−1) = 5</M>.</> : null,
      step === 3 ? <><M>h = ReLU(z₁) = ReLU(5)</M>는?</> : null,
      step === 4 ? <><M>h = 5</M>. 이 <M>h</M>가 뉴런 2의 입력 자리에 들어감.</> : null,
      step === 5 ? <>뉴런 2. <M>z₂ = w₂·h + b₂ = 1·5 + (−3)</M>은?</> : null,
      step === 6 ? <><M>z₂ = 5 + (−3) = 2</M>.</> : null,
      step === 7 ? <><M>ŷ = ReLU(z₂) = ReLU(2)</M>는?</> : null,
      step === 8 ? <><M>ŷ = 2</M>. 뉴런이 몇 개든 <Key>곱셈 → 합산 → ReLU</Key>의 반복임.</> : null,
    ]}
  />
);

/* ───────── 2-2 3 × 2 × 1 신경망 ───────── */
// h₁은 활동지 시범 줄. h₂와 ŷ는 활동지 빈칸 식(□)을 먼저 보이고 다음 단계에서 숫자를 채운다
const FwNet: ComponentType<{ step: number }> = ({ step }) => (
  <Layout
    figure={<NetFigure step={[0, 1, 2, 2, 3, 3][Math.min(step, 5)]} ask={step === 2 || step === 4} />}
    lines={[
      step === 0 ? <>1-4에서 파라미터 11개를 센 신경망. 선 위의 숫자가 가중치, 뉴런 옆의 <M>b</M>가 편향. 입력은 <M>1, 2, 1</M>.</> : null,
      step === 1 ? <>시범. <M>h₁ = ReLU(1·1 + 1·2 + 0·1 + 0) = ReLU(3) = 3</M></> : null,
      step === 2 ? <><M>h₂ = ReLU(□·x₁ + □·x₂ + □·x₃ + (□))</M>. 점선의 가중치와 편향을 넣으면?</> : null,
      step === 3 ? <><M>h₂ = ReLU(0·1 + 1·2 + 1·1 + (−1)) = ReLU(2) = 2</M></> : null,
      step === 4 ? <>출력 뉴런의 입력은 <M>h₁, h₂</M>. <M>ŷ = ReLU(□·h₁ + □·h₂ + (□))</M>는?</> : null,
      step === 5 ? <><M>ŷ = ReLU(1·3 + 1·2 + (−2)) = ReLU(3) = 3</M></> : null,
    ]}
  />
);

/* ───────── 2-3 ReLU를 빼면 ───────── */
// 활동지 2-3: 시범 칸(x = 0)을 보고 나머지를 계산 → 그래프 → "직선? 꺾인 선?" → 식 정리
const FwRelu: ComponentType<{ step: number }> = ({ step }) => (
  <Layout
    figure={<ReluCompare step={step} />}
    lines={[
      step === 0 ? <>2-1의 직렬 뉴런(<M>w₁ = 2, b₁ = −1, w₂ = 1, b₂ = −3</M>)에 <M>x</M>를 0, 1, 2, 3으로 바꿔 넣음.</> : null,
      step === 1 ? <>ReLU 없음. <M>ŷ = (2x − 1) − 3</M>. 시범은 <M>x = 0</M>일 때 <M>−4</M>. <M>x = 1, 2, 3</M>이면?</> : null,
      step === 2 ? <><M>−2, 0, 2</M>. 점을 이으면 이런 모양.</> : null,
      step === 3 ? <>ReLU 있음. 먼저 <M>h = ReLU(2x − 1)</M>, 다음 <M>ŷ = ReLU(h − 3)</M>. 시범은 <M>x = 0</M>일 때 <M>h = 0, ŷ = 0</M>. 나머지 <M>h</M>는?</> : null,
      step === 4 ? <><M>h = 1, 3, 5</M>. 이제 <M>ŷ = ReLU(h − 3)</M>은?</> : null,
      step === 5 ? <><M>ŷ = 0, 0, 2</M>. 음수가 0이 됨.</> : null,
      step === 6 ? <>두 그래프는 각각 직선일까, 꺾인 선일까?</> : null,
      step === 7 ? <>왼쪽은 <Key>직선</Key>, 오른쪽은 <Hot>꺾인 선</Hot>.</> : null,
      step === 8 ? <>ReLU 없음 줄의 식 <M>ŷ = (2x − 1) − 3</M>을 정리하면? 일차함수일까, 이차함수일까?</> : null,
      step === 9 ? <><M>ŷ = 2x − 4</M>. 일차함수에 일차함수를 넣어도 <Key>일차함수</Key>.</> : null,
      step === 9 ? <>ReLU가 없으면 뉴런을 아무리 이어도 직선 하나. 층 사이의 활성화 함수가 이 한계를 넘게 함.</> : null,
    ]}
  />
);

/* ───────── 플레이그라운드 시연 ───────── */
// 활성화 함수 실험실(activation-lab). 주소의 설정값(data·act·L·n)을 랩이 읽어 장면이 바로 열린다. 데이터셋은 동심원.
const LAB = 'https://activation-lab.vercel.app/';
const PG = {
  a: `${LAB}#data=circles&act=linear&L=1&n=1`,
  b: `${LAB}#data=circles&act=linear&L=1&n=4`,
  c: `${LAB}#data=circles&act=relu&L=1&n=4`,
};
const FwPlayground: ComponentType<{ step: number }> = ({ step }) => {
  const scenes = [
    { k: 'a', t: '장면 ①', d: '뉴런 1개 + Linear', r: '경계가 직선 하나. 동심원을 나누지 못함.' },
    { k: 'b', t: '장면 ②', d: '은닉층 1층(뉴런 4개) + Linear', r: '활성화 함수가 없으면 여전히 직선. 2-3의 왼쪽과 같음.' },
    { k: 'c', t: '장면 ③', d: '은닉층 1층(뉴런 4개) + ReLU', r: '경계가 꺾이며 원을 둘러쌈. 파라미터는 가중치 2×4 + 4×1 = 12개와 편향 5개를 더해 17개.' },
  ] as const;
  return (
    <Layout
      figure={
        <div className="h-full flex items-center justify-center gap-[28px]" onClick={(e) => e.stopPropagation()}>
          {scenes.map((s, i) => (
            <a key={s.k} href={PG[s.k]} target="_blank" rel="noreferrer"
              className={`lec-fade block w-[400px] rounded-2xl border-2 px-[28px] py-[30px] transition ${i <= step ? 'border-accent bg-accent-bg/50 opacity-100' : 'border-border opacity-40'}`}>
              <div className="text-[22px] text-accent font-bold mb-[6px]">{s.t}</div>
              <div className="text-[28px] font-bold leading-snug mb-[14px]">{s.d}</div>
              <div className="text-[21px] text-muted leading-snug">{s.r}</div>
              <div className="mt-[18px] text-[18px] text-accent">새 탭에서 열기 ↗</div>
            </a>
          ))}
        </div>
      }
      lines={[]}
    />
  );
};

/* ───────── 3-1 한 점의 오차 ───────── */
const LossE: ComponentType<{ step: number }> = ({ step }) => (
  <Layout
    figure={<ErrorLine step={step} />}
    lines={[
      step === 0 ? <>기계는 자기가 얼마나 틀렸는지 숫자로 앎. 오차 <M>e = ŷ − y</M> (예측 − 정답). 정답 <M>y = 5</M>.</> : null,
      step === 1 ? <>예측 <M>ŷ = 3</M>이면 오차 <M>e</M>는?</> : null,
      step === 2 ? <><M>e = 3 − 5 = −2</M>. e가 <Key>음수</Key>이면 예측이 정답보다 <Key>작다</Key>는 뜻임.</> : null,
      step === 3 ? <>예측 <M>ŷ = 7</M>이면 오차 <M>e</M>는?</> : null,
      step === 4 ? <><M>e = 7 − 5 = 2</M>. 3과 7은 정답에서 같은 거리 2에 있음.</> : null,
      step === 5 ? <>예측이 <M>4.5, 5, 6</M>이면 <M>e</M>와 <M>e²</M>은?</> : null,
      step === 6 ? <><M>e = −0.5, 0, 1</M>이고 <M>e² = 0.25, 0, 1</M>.</> : null,
      step === 6 ? <>다섯 점의 <M>e² = 4, 0.25, 0, 1, 4</M>. <Key>제곱</Key>하면 음수가 사라짐.</> : null,
      step === 7 ? <>같은 거리에 있는 <M>ŷ = 3</M>과 <M>ŷ = 7</M>의 두 e를 더하면? 두 e²을 더하면?</> : null,
      step === 8 ? <><M>(−2) + 2 = 0</M>, <M>4 + 4 = 8</M>. 둘 다 틀렸는데 e의 합은 0.</> : null,
      step === 8 ? <>틀린 정도를 제대로 나타내는 쪽은 <Key>e²의 합</Key>. 오차를 제곱하는 첫 번째 이유.</> : null,
    ]}
  />
);

/* ───────── 3-2 다섯 점의 손실 ───────── */
const LossMse: ComponentType<{ step: number }> = ({ step }) => (
  <Layout
    figure={<ScatterFit step={step} />}
    lines={[
      step === 0 ? <>정답은 모두 <M>y = 2x + 1</M> 위의 다섯 점 (1, 3), (2, 5), (3, 7), (4, 9), (5, 11).</> : null,
      step === 1 ? <>아직 학습이 덜 된 모델(직선) <M>ŷ = x + 2</M>로 예측. 시범은 <M>x = 1</M>이면 <M>1 + 2 = 3</M>. 나머지는?</> : null,
      step === 2 ? <><M>ŷ = 4, 5, 6, 7</M>.</> : null,
      step === 3 ? <>점마다 오차 <M>e = ŷ − y</M>. 시범은 <M>3 − 3 = 0</M>. 나머지는?</> : null,
      step === 4 ? <><M>e = −1, −2, −3, −4</M>. 주황 막대가 오차의 크기.</> : null,
      step === 5 ? <>오차를 제곱하면? 시범은 <M>0² = 0</M>. 모두 더하면?</> : null,
      step === 6 ? <><M>e² = 1, 4, 9, 16</M>. 합은 <M>0 + 1 + 4 + 9 + 16 = 30</M>.</> : null,
      step === 7 ? <>평균을 내면 <Key>MSE</Key>는?</> : null,
      step === 8 ? <><Key>MSE</Key> = 30 ÷ 5 = <M>6</M>.</> : null,
      step === 9 ? <>오차가 1 → 10으로 10배 커지면 <M>e²</M>은 몇 배?</> : null,
      step === 10 ? <><M>e²</M>은 1 → 100, <Key>100배</Key>. 큰 실수에 훨씬 큰 벌점을 줌. 오차를 제곱하는 두 번째 이유.</> : null,
    ]}
  />
);

/* ───────── 4-A 손실에 ½을 곱하는 이유 (4A-1 다음) ───────── */
const GdHalf: ComponentType<{ step: number }> = ({ step }) => {
  // 0 표(b = −2, e = −3) → 1 접선 위 두 점으로 기울기 읽기 질문 → 2 −3 = e 공개 → 3·4 b = 3에서도 확인(2 = e) → 5 b = 1(0 = e)
  // → 6·7 ½이 없으면(−6, 2배) → 8 결론. 우연이 아님은 세 점으로 보이고, 항상 그런 이유(식)는 4-B 유도에서.
  const s = Math.min(step, 8);
  const tableB = s >= 6 ? -2 : s === 5 ? 1 : s >= 3 ? 3 : -2;
  const marks = [
    { b: -2, tangent: s >= 1 },
    ...(s >= 3 ? [{ b: 3, tangent: true }] : []),
    ...(s >= 5 ? [{ b: 1, tangent: true, label: '기울기 0 = 오차 0' }] : []),
  ];
  const triangles = [
    ...(s >= 1 ? [{ b: -2, half: true, vert: s >= 2 }] : []),
    ...(s >= 3 ? [{ b: 3, half: true, vert: s >= 4 }] : []),
    ...(s >= 6 ? [{ b: -2, half: false, vert: s >= 7 }] : []),
  ];
  const note = s >= 8 ? '기울기 = 오차 e = b − 1' : s >= 7 ? '½이 없으면 기울기 −6 = 오차의 2배' : s >= 5 ? '세 점 모두 기울기 = 오차 e' : s >= 4 ? 'b = 3: 기울기 2 = 오차 e' : s >= 2 ? 'b = −2: 접선 기울기 −3 = 오차 e' : undefined;
  return (
    <Layout
      asideWidth={500}
      aside={<BiasTable b={tableB} rows={5} sum mse loss compact />}
      figure={<LossCurveB compare={s >= 6} compareSlope={s >= 6} marks={marks} triangles={triangles} note={note} />}
      lines={[
        s === 0 ? <>53장 표. <M>b = −2</M>일 때 다섯 점의 오차는 모두 <Hot>−3</Hot>, 손실 <M>L = 4.5</M>.</> : null,
        s === 1 ? <><M>b = −2</M>의 접선(주황 직선). 점 <M>(−2, 4.5)</M>에서 가로로 1칸 가면 접선은 세로로 몇 칸 움직이나?</> : null,
        s === 2 ? <>접선 위 두 점 <M>(−2, 4.5)</M>와 <M>(−1, 1.5)</M>. 세로로 <M>4.5 − 1.5 = 3</M> 내려감.</> : null,
        s === 2 ? <>기울기 = 세로 ÷ 가로 = <M>−3 ÷ 1 = −3</M>. 오차 <Hot>e</Hot>와 같은 값. (−1, 1.5)는 접선 위의 점(곡선은 L = 2).</> : null,
        s === 3 ? <>우연일까? <M>b = 3</M>에서도 확인. 표의 오차는 <Hot>2</Hot>. 접선 위 두 점 <M>(3, 2)</M>와 <M>(4, 4)</M>. 세로 몇 칸?</> : null,
        s === 4 ? <>세로로 <M>4 − 2 = 2</M> 올라감. 기울기 <M>2 ÷ 1 = 2</M>. 이번에도 오차 <Hot>e</Hot>와 같음.</> : null,
        s === 5 ? <><M>b = 1</M>은 오차 0, 접선이 수평이라 기울기 0. 세 점 모두 <Key>기울기 = 오차 e</Key>.</> : null,
        s === 6 ? <>½을 곱하지 않으면 <M>L = (b − 1)²</M>(회색). <M>b = −2</M>에서 <M>L = 9</M>.</> : null,
        s === 6 ? <>접선 위 두 점 <M>(−2, 9)</M>와 <M>(−1, 3)</M>. 가로 1칸에 세로 몇 칸?</> : null,
        s === 7 ? <>세로 <M>9 − 3 = 6</M>칸. 기울기 <M>−6</M>, 오차의 2배. 바닥은 그대로 <M>b = 1</M>.</> : null,
        s === 8 ? <>그래서 ½을 곱함. <Key>기울기 = 오차 e = b − 1</Key>.</> : null,
        s === 8 ? <>4A-2 표의 기울기 <M>−3, −1.5, −0.75</M>는 그때의 오차. 항상 그런 이유(식)는 4-B에서.</> : null,
      ]}
    />
  );
};

/* ───────── 4A-1 접선의 방향과 기울기 부호 ───────── */
const GdTangent: ComponentType<{ step: number }> = ({ step }) => {
  // 점마다 접선을 먼저 보여 주고 학생이 부호와 방향을 생각한 뒤, 다음 단계에서 기울기와 방향을 공개한다
  // 방향은 b가 커지는 쪽이 +, 작아지는 쪽이 −. 화살표 옆에 부호를 붙여 "기울기 부호의 반대로"를 + −로 읽게 한다
  const pts = [{ b: -2, label: '기울기 음수(−)', dir: '+ 방향 →' }, { b: 3, label: '기울기 양수(+)', dir: '← − 방향' }, { b: 1, label: '기울기 0', dir: '정지' }];
  const marks = pts.flatMap((p, i) => step >= 1 + 2 * i
    ? [{ b: p.b, tangent: true, ...(step >= 2 + 2 * i ? { label: p.label, dir: p.dir } : {}) }]
    : []);
  return (
    <Layout
      figure={<LossCurveB marks={marks} />}
      lines={[
        step === 0 ? <>컴퓨터는 곡선 전체를 보지 못함. 곡선 위 한 점에 닿는 직선(<Key>접선</Key>)의 기울기만 앎.</> : null,
        step === 0 ? <>접선이 오른쪽 아래로 향하면 기울기 음수(−), 오른쪽 위로 향하면 양수(+). b가 커지는 쪽이 + 방향.</> : null,
        step === 1 ? <><M>b = −2</M>. 기울기의 부호는? 손실을 줄이려면 어느 쪽으로?</> : null,
        step === 2 ? <><M>b = −2</M>. 접선이 오른쪽 아래, 기울기 <Hot>음수(−)</Hot>. 손실을 줄이려면 오른쪽, 곧 <Key>+ 방향</Key>으로.</> : null,
        step === 3 ? <><M>b = 3</M>. 기울기의 부호는? 가야 할 방향은?</> : null,
        step === 4 ? <><M>b = 3</M>. 접선이 오른쪽 위, 기울기 <Hot>양수(+)</Hot>. 가야 할 곳은 왼쪽, 곧 <Key>− 방향</Key>.</> : null,
        step === 5 ? <><M>b = 1</M>. 기울기는? 가야 할 방향은?</> : null,
        step === 6 ? <><M>b = 1</M>. 접선이 수평, 기울기 0. 바닥에 도착했으니 <Key>정지</Key>.</> : null,
        step === 7 ? <>규칙 발견. 기울기가 음수(b = −2)일 때와 양수(b = 3)일 때 가야 할 방향은?</> : null,
        step === 7 ? <>기울기와 같은 방향일까, 반대 방향일까?</> : null,
        step === 8 ? <>규칙. 기울기가 −면 + 방향, +면 − 방향. 기울기의 <Key>반대 부호 방향</Key>으로 가면 손실이 줄어듦.</> : null,
        step === 8 ? <>이것이 <Key>경사하강법</Key>.</> : null,
      ]}
    />
  );
};

/* ───────── 4A-2 업데이트 식으로 세 step ───────── */
// 식은 그림 위 식 상자에 고정. 시범 step 1은 대입 → 곱셈 → 뺄셈 → 결과의 네 클릭으로, step 2·3은 "새 b는?" → 대입식 → 결과.
// 빼기의 이유는 54장의 규칙(기울기의 반대 방향)과 연결하고, η는 그 방향으로 가는 보폭으로 소개한다.
const UPD_CALC: (string | null)[] = [
  null, null, null, null,
  '(−2) − 0.5 × (−3)', '(−2) − (−1.5)', '−2 + 1.5', '−2 + 1.5 = −0.5',
  null, '(−0.5) − 0.5 × (−1.5)', '−0.5 + 0.75 = 0.25',
  null, '0.25 − 0.5 × (−0.75)', '0.25 + 0.375 = 0.625',
  null, null, null, null,
];
const GdUpdate: ComponentType<{ step: number }> = ({ step }) => {
  const s = Math.min(step, 17);
  const seq = [-2, -0.5, 0.25, 0.625];
  const n = s >= 13 ? 3 : s >= 10 ? 2 : s >= 7 ? 1 : 0;   // 지금까지 간 step 수
  const active = s >= 11 ? 2 : s >= 8 ? 1 : s >= 3 ? 0 : -1;
  // 기울기 열은 활동지에 적힌 값이지만, 화면에서는 지금 b로 오차 e = b − 1을 먼저 계산해 그 값이 기울기임을 보인 뒤 식에 넣는다
  const rows: (string | null)[][] = [
    ['1', '−2', '−3', '−0.5'],
    ['2', '−0.5', s >= 8 ? '−1.5' : null, s >= 10 ? '0.25' : null],
    ['3', s >= 11 ? '0.25' : null, s >= 11 ? '−0.75' : null, s >= 13 ? '0.625' : null],
  ];
  const main = <>새 b = 지금 b <span className={s === 1 ? 'text-[46px]' : ''} style={s === 1 ? { color: ORANGE_HEX } : undefined}>−</span> <span style={s === 2 ? { color: ORANGE_HEX } : undefined}>η</span> × 기울기</>;
  return (
    <Layout
      asideWidth={400}
      aside={<MiniTable title="활동지 4A-2 표 (η = 0.5)" head={['step', '지금 b', '기울기\n= e = b − 1', '새 b']} rows={rows} active={active} />}
      figure={<div className="h-full flex flex-col gap-[12px]">
        <FormulaBox main={main} sub={UPD_CALC[s] ? <>= {UPD_CALC[s]}</> : undefined} />
        <div className="flex-1 min-h-0"><LossCurveB path={seq.slice(0, n + 1)} pathLabel="η = 0.5" note={s >= 15 ? '이동 거리 1.5 → 0.75 → 0.375' : undefined} /></div>
      </div>}
      lines={[
        s === 0 ? <><M>b</M>를 고치는 식. <Key>새 b = 지금 b − η × 기울기</Key>.</> : null,
        s === 1 ? <>54장의 규칙: 기울기의 <Key>반대 부호 방향</Key>(−면 +, +면 −)으로 가면 손실이 줄어듦.</> : null,
        s === 1 ? <>반대 방향으로 가려고 기울기를 <Hot>뺌</Hot>. 그래서 식에 빼기.</> : null,
        s === 2 ? <><Hot>η</Hot>(에타)는 <Key>학습률</Key>. 그 방향으로 가는 보폭을 정함. 이동 거리 = η × 기울기의 크기.</> : null,
        s === 2 ? <>η가 클수록 보폭이 큼. 여기서는 <M>η = 0.5</M>.</> : null,
        s === 3 ? <>시범 step 1. 지금 <M>b = −2</M>. 오차 <M>e = −2 − 1 = −3</M>, 그래서 기울기 <Hot>−3</Hot>.</> : null,
        s === 4 ? <>식에 넣으면 새 <M>b = (−2) − 0.5 × (−3)</M>.</> : null,
        s === 5 ? <>곱셈 먼저. <M>0.5 × (−3) = −1.5</M>.</> : null,
        s === 6 ? <><M>(−2) − (−1.5) = −2 + 1.5</M>. 음수를 빼면 더하기가 됨.</> : null,
        s === 7 ? <>새 <M>b = −0.5</M>. 이동 거리 <M>0.5 × 3 = 1.5</M>. 오른쪽(+ 방향)으로 1.5만큼 이동.</> : null,
        s === 8 ? <>step 2. 지금 <M>b = −0.5</M>. 오차 <M>e = −0.5 − 1 = −1.5</M>, 기울기 <Hot>−1.5</Hot>. 새 <M>b</M>는?</> : null,
        s === 9 ? <>새 <M>b = (−0.5) − 0.5 × (−1.5) = −0.5 + 0.75</M>.</> : null,
        s === 10 ? <><M>= 0.25</M>. 이동 거리 <M>0.5 × 1.5 = 0.75</M>, 오른쪽으로 0.75 이동.</> : null,
        s === 11 ? <>step 3. 지금 <M>b = 0.25</M>. 오차 <M>e = 0.25 − 1 = −0.75</M>, 기울기 <Hot>−0.75</Hot>. 새 <M>b</M>는?</> : null,
        s === 12 ? <>새 <M>b = 0.25 − 0.5 × (−0.75) = 0.25 + 0.375</M>.</> : null,
        s === 13 ? <><M>= 0.625</M>. 이동 거리 <M>0.5 × 0.75 = 0.375</M>, 오른쪽으로 0.375 이동.</> : null,
        s === 14 ? <><M>b</M>는 정답 1에 가까워지나, 멀어지나? 한 step의 이동 거리는?</> : null,
        s === 15 ? <>1에 <Key>가까워짐</Key>. 기울기가 <M>−3 → −1.5 → −0.75</M>로 작아져서</> : null,
        s === 15 ? <>이동 거리도 <M>1.5 → 0.75 → 0.375</M>로 <Key>작아짐</Key>.</> : null,
        s === 16 ? <>식에 빼기가 들어 있는 이유는? 기울기가 음수일 때 새 <M>b</M>는 어느 쪽으로 움직였나?</> : null,
        s === 17 ? <>54장 규칙대로 기울기의 <Key>반대 방향</Key>으로 가려고 뺌.</> : null,
        s === 17 ? <>기울기가 음수(−)이면 빼기가 더하기가 되어 오른쪽(+ 방향, 바닥 쪽)으로 감.</> : null,
      ]}
    />
  );
};

/* ───────── 4A-3 보폭 η를 바꾸면 ───────── */
// 활동지 4A-3 표 순서(0.05, 0.5 시범, 2.0, 2.5). η마다 "새 b와 남은 거리는?" → 대입식·이동 거리 vs 남은 거리 → "계속 가면?"(질문) → 다음 step 실제 숫자(공개) → 결과(느림·수렴·진동·발산)
const ETA_CALC: (string | null)[] = [
  null, null, '−2 − 0.05 × (−3) = −2 + 0.15 = −1.85', null, '10 step 뒤 b ≈ −0.8',
  '−2 − 0.5 × (−3) = −2 + 1.5 = −0.5',
  null, '−2 − 2 × (−3) = −2 + 6 = 4', '4 − 2 × 3 = ?', '4 − 2 × 3 = −2', '−2 → 4 → −2 → 4',
  null, '−2 − 2.5 × (−3) = −2 + 7.5 = 5.5', '5.5 − 2.5 × 4.5 = ?', '5.5 − 2.5 × 4.5 = −5.75', '−5.75 → 11.1 → …',
  null, null,
];
const GdEta: ComponentType<{ step: number }> = ({ step }) => {
  const s = Math.min(step, 17);
  const run = (eta: number, n: number) => { const p = [-2]; for (let i = 0; i < n; i++) { const b = p[p.length - 1]; p.push(b - eta * (b - 1)); } return p; };
  const path: number[] = s === 2 || s === 3 ? run(0.05, 1) : s === 4 ? run(0.05, 10) : s === 5 ? run(0.5, 7)
    : s === 7 || s === 8 ? run(2, 1) : s === 9 ? run(2, 2) : s === 10 ? run(2, 4)
    : s === 12 || s === 13 ? run(2.5, 1) : s === 14 ? run(2.5, 2) : s === 15 ? run(2.5, 4) : [-2];
  const k = s >= 16 ? -1 : s >= 11 ? 3 : s >= 6 ? 2 : s === 5 ? 1 : s >= 1 ? 0 : -1;
  const names = ['느림', '수렴', '진동', '발산'];
  const rows: (string | null)[][] = [
    ['0.05', s >= 2 ? '−1.85' : null, s >= 2 ? '2.85' : null, s >= 4 ? '느림' : null],
    ['0.5', '−0.5', '1.5', '수렴 (시범)'],
    ['2.0', s >= 7 ? '4' : null, s >= 7 ? '3' : null, s >= 10 ? '진동' : null],
    ['2.5', s >= 12 ? '5.5' : null, s >= 12 ? '4.5' : null, s >= 15 ? '발산' : null],
  ];
  const etas = [0.05, 0.5, 2, 2.5];
  const named = s === 4 || s === 5 || s === 10 || s === 15;
  const pointLabels: Record<number, string> = s === 9 ? { 1: 'b = 4', 2: '다시 −2' } : s === 10 ? { 1: 'b = 4' } : s === 4 ? { 10: '10 step 뒤 b ≈ −0.8' } : s === 5 ? { 7: '7 step 뒤 b ≈ 0.98' } : {};
  return (
    <Layout
      asideWidth={430}
      aside={<MiniTable title="활동지 4A-3 표 (출발 b = −2, e = −3 = 기울기)" head={['η', '새 b', '1까지\n남은 거리', '결과']} rows={rows} active={k} />}
      figure={<div className="h-full flex flex-col gap-[12px]">
        <FormulaBox main={<>새 b = −2 − η × (−3)</>} sub={ETA_CALC[s] ? <>{ETA_CALC[s]}</> : undefined} />
        <div className="flex-1 min-h-0"><LossCurveB path={path} badgeAt={path.length > 1 ? 1 : 0} pointLabels={pointLabels}
          pathLabel={k < 0 ? undefined : `η = ${etas[k]}${named ? ` · ${names[k]}` : ''}`}
          note={s === 15 ? '다음 b = 11.1, 그래프 밖' : s >= 17 ? '남은 거리: 출발 3 → η = 2.0 뒤 3, η = 2.5 뒤 4.5' : undefined} /></div>
      </div>}
      lines={[
        s === 0 ? <>모두 <M>b = −2</M>에서 출발. 바닥 1까지 남은 거리 3. 오차 <M>e = −2 − 1 = −3</M>이라 기울기 <M>−3</M>.</> : null,
        s === 0 ? <>새 <M>b = −2 − η × (−3)</M>. <Key>η만 바꿔 봄</Key>. 이동 거리 = η × 3.</> : null,
        s === 1 ? <><M>η = 0.05</M>이면 새 <M>b</M>는? 1까지 남은 거리는?</> : null,
        s === 2 ? <>새 <M>b = −2 + 0.15 = −1.85</M>. 이동 거리 <M>0.05 × 3 = 0.15</M>. 남은 거리(1과의 차이) <M>1 − (−1.85) = 2.85</M>.</> : null,
        s === 3 ? <>이 보폭으로 계속 가면? 느림, 수렴, 진동, 발산 중 무엇?</> : null,
        s === 4 ? <>10 step을 가도 <M>b ≈ −0.8</M>, 남은 거리 약 1.8. 안전하지만 <Key>느림</Key>.</> : null,
        s === 5 ? <>시범 <M>η = 0.5</M>. 새 <M>b = −0.5</M>. 이동 거리 <M>0.5 × 3 = 1.5</M>는 남은 거리 3보다 작음.</> : null,
        s === 5 ? <>계속 가면 <M>−0.5 → 0.25 → 0.625 → …</M>로 바닥에 다가감. <Key>수렴</Key>.</> : null,
        s === 6 ? <><M>η = 2.0</M>이면 새 <M>b</M>는? 남은 거리는?</> : null,
        s === 7 ? <>새 <M>b = −2 + 6 = 4</M>. 이동 거리 <M>2 × 3 = 6</M>이 남은 거리 3보다 커서 바닥을 지나침.</> : null,
        s === 7 ? <>남은 거리(1과의 차이) <M>4 − 1 = 3</M>. 반대쪽으로 넘어감.</> : null,
        s === 8 ? <>계속 가면? <M>b = 4</M>에서 오차 <M>e = 4 − 1 = 3</M>, 기울기 <Hot>3</Hot>. 새 <M>b</M>는?</> : null,
        s === 9 ? <>새 <M>b = 4 − 2 × 3 = −2</M>. 출발점으로 되돌아옴.</> : null,
        s === 10 ? <><M>−2 → 4 → −2 → 4</M>. 양옆을 오가며 바닥에 못 감. <Key>진동</Key>.</> : null,
        s === 11 ? <><M>η = 2.5</M>이면 새 <M>b</M>는? 남은 거리는?</> : null,
        s === 12 ? <>새 <M>b = −2 + 7.5 = 5.5</M>. 이동 거리 <M>2.5 × 3 = 7.5</M>가 남은 거리 3보다 훨씬 큼.</> : null,
        s === 12 ? <>남은 거리(1과의 차이) <M>5.5 − 1 = 4.5</M>. 출발 때 3보다 늘었음.</> : null,
        s === 13 ? <>계속 가면? <M>b = 5.5</M>에서 오차 <M>e = 5.5 − 1 = 4.5</M>, 기울기 <Hot>4.5</Hot>. 새 <M>b</M>는?</> : null,
        s === 14 ? <>새 <M>b = 5.5 − 2.5 × 4.5 = 5.5 − 11.25 = −5.75</M>.</> : null,
        s === 15 ? <>그다음은 <M>11.1</M>, 그래프 밖. 갈수록 멀어짐. <Key>발산</Key>.</> : null,
        s === 16 ? <><M>η = 2.0</M>에서 남은 거리는 출발 때와 같나? <M>η = 2.5</M>에서는 줄었나, 늘었나?</> : null,
        s === 17 ? <><M>η = 2.0</M>은 3 그대로라 <Key>같음</Key>. <M>η = 2.5</M>는 3 → 4.5로 <Key>늘었음</Key>. 학습률은 실험으로 정함.</> : null,
      ]}
    />
  );
};

export const FORWARD_SLIDES: SlideDef[] = [
  { id: 'fw-chain', section: 'forward', tag: '2-1', title: '뉴런을 이으면 순전파', formula: 'z₁ = w₁·x + b₁ → h = ReLU(z₁)', steps: 8, component: FwChain,
    notes: ['뉴런마다 세션1의 계산을 그대로 함. 앞 뉴런의 출력 h가 뒤 뉴런의 입력.'] },
  { id: 'fw-net', section: 'forward', tag: '2-2', title: '3 × 2 × 1 신경망의 순전파', formula: 'h = ReLU(w₁x₁ + w₂x₂ + w₃x₃ + b)', steps: 5, component: FwNet,
    notes: ['1-4에서 파라미터 11개를 센 신경망. 실선은 h₁, 점선은 h₂. 편향은 선 위가 아니라 뉴런 옆 b에서 읽음.'] },
  { id: 'fw-relu', section: 'forward', tag: '2-3', title: 'ReLU를 빼면 직선뿐', formula: 'h = ReLU(2x − 1),  ŷ = ReLU(h − 3)', steps: 9, component: FwRelu,
    notes: ['왼쪽은 직선, 오른쪽은 꺾인 선. 꺾인 선을 모으면 곡선 모양도 만들 수 있음. 바로 플레이그라운드에서 봄.'] },
  { id: 'fw-playground', section: 'forward', title: '활성화 함수 실험실 세 장면', steps: 2, component: FwPlayground,
    notes: ['Neural Explorer의 활성화 함수 실험실(activation-lab.vercel.app)을 엽니다. 데이터셋 동심원. 장면 ① 뉴런 1개 Linear → 직선. 장면 ② 4개 Linear → 여전히 직선. 장면 ③ 4개 ReLU → 경계가 꺾이며 원을 둘러쌈.', '주소의 설정값을 랩이 읽도록 랩 쪽 코드를 고쳐야 바로 열립니다(아직 배포 전이면 랩에서 동심원·Linear/ReLU·1층·1개/4개를 직접 고릅니다). 장면 ③ 파라미터: 선 12 + 편향 5 = 17.'] },
];

export const LOSS_SLIDES: SlideDef[] = [
  { id: 'loss-e', section: 'loss', tag: '3-1', title: '오차는 예측 빼기 정답', formula: 'e = ŷ − y', steps: 8, component: LossE,
    notes: ['e = 예측 − 정답으로 고정. (−0.5)² = 0.25를 칠판에 씀.', '"절댓값으로 하면 안 돼요?"가 나오면 4-A에서 답함.'] },
  { id: 'loss-mse', section: 'loss', tag: '3-2', title: '다섯 점의 손실, MSE', formula: 'MSE = (e₁² + … + e₅²) ÷ 5', steps: 10, component: LossMse,
    notes: ['앱 A2에서 기울기 w 1, 절편 b 2로 맞추면 MSE 6. Σe²에서 멈추지 말고 5로 나눔.'] },
];

export const GD_SLIDES: SlideDef[] = [
  GRAPH_BRIDGE,
  { id: 'gd-tangent', section: 'gd', tag: '4A-1', title: '접선의 방향과 기울기 부호', steps: 8, component: GdTangent,
    notes: ['앱 A3 b 모드에서 b = −2, 3, 1로 옮겨 접선을 확인. 슬라이더는 방향키로 0.05씩.'] },
  { id: 'gd-intro', section: 'gd', tag: '4-A', title: '손실에 ½을 곱하는 이유', formula: 'L = ½ × MSE', steps: 8, component: GdHalf,
    notes: ['옆 칸은 53장 표(b = −2, 3, 1 순으로 바뀜). 접선 기울기는 접선 위 두 점의 좌표를 읽어 세로 ÷ 가로로 구합니다. b = −2 하나로는 우연일 수 있으니 b = 3, 1에서도 확인해 세 점 모두 기울기 = 오차임을 보입니다.', '½을 곱하지 않으면 기울기가 모두 2배. ½을 곱하면 b의 기울기가 오차 e와 같아져 4-B의 식(db = e)이 간단해집니다. 식으로 구하는 것(미분)은 4-B의 dw·db 유도에서 한 번에 합니다.'] },
  { id: 'gd-update', section: 'gd', tag: '4A-2', title: '업데이트 식으로 세 step', formula: '새 b = 지금 b − η × 기울기', steps: 17, component: GdUpdate,
    notes: ['앱 A3 "한 step 진행"을 세 번 누르면 현재 b가 −0.5, 0.25, 0.625로 종이와 같이 움직임.', '절댓값 손실이면 바닥에서 뾰족해 이동 거리가 저절로 줄지 않음.'] },
  { id: 'gd-eta', section: 'gd', tag: '4A-3', title: '보폭 η를 바꾸면', formula: '새 b = −2 − η × (−3)', steps: 17, component: GdEta,
    notes: ['앱 A3 칩 네 개: 느림 → 수렴 → 진동 → 발산. 발산은 점선이 그래프 윗변을 따라 오감.'] },
];
