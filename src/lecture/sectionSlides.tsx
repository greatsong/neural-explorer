// 순전파(2-1~2-3) · 오차와 손실(3-1~3-2) · 경사하강법(4A) 슬라이드. 숫자는 활동지 v2와 같다.
import type { ComponentType } from 'react';
import { Layout, M, Key, Hot } from './common';
import { ChainFigure, NetFigure, ReluCompare, ErrorLine, ScatterFit, LossCurveB } from './figures';
import type { SlideDef } from './slides';

/* ───────── 2-1 뉴런 → 뉴런 ───────── */
const FwChain: ComponentType<{ step: number }> = ({ step }) => (
  <Layout
    figure={<ChainFigure step={step} />}
    lines={[
      step === 0 ? <>뉴런을 이어 붙인 그림. 앞 뉴런의 출력 <M>h</M>가 뒤 뉴런의 입력이 됨. 입력에서 출력 쪽으로 흐르는 계산이 <Key>순전파</Key>.</> : null,
      step === 1 ? <>뉴런 1. <M>z₁ = w₁·x + b₁ = 2·3 + (−1) = 5</M></> : null,
      step === 2 ? <><M>h = ReLU(5) = 5</M>. 이 <M>h</M>가 뉴런 2의 입력 자리에 들어감.</> : null,
      step === 3 ? <>뉴런 2. <M>z₂ = w₂·h + b₂ = 1·5 + (−3) = 2</M></> : null,
      step === 4 ? <><M>ŷ = ReLU(2) = 2</M>. 뉴런이 몇 개든 <Key>곱셈 → 합산 → ReLU</Key>의 반복임.</> : null,
    ]}
  />
);

/* ───────── 2-2 3 × 2 × 1 신경망 ───────── */
const FwNet: ComponentType<{ step: number }> = ({ step }) => (
  <Layout
    figure={<NetFigure step={step} />}
    lines={[
      step === 0 ? <>1-4에서 파라미터 11개를 센 신경망. 선 위의 숫자가 가중치, 뉴런 옆의 <M>b</M>가 편향. 입력은 <M>1, 2, 1</M>.</> : null,
      step === 1 ? <><M>h₁ = ReLU(1·1 + 1·2 + 0·1 + 0) = ReLU(3) = 3</M></> : null,
      step === 2 ? <><M>h₂ = ReLU(0·1 + 1·2 + 1·1 + (−1)) = ReLU(2) = 2</M></> : null,
      step === 3 ? <>출력 뉴런의 입력은 <M>h₁, h₂</M>. <M>ŷ = ReLU(1·3 + 1·2 + (−2)) = ReLU(3) = 3</M></> : null,
    ]}
  />
);

/* ───────── 2-3 ReLU를 빼면 ───────── */
const FwRelu: ComponentType<{ step: number }> = ({ step }) => (
  <Layout
    figure={<ReluCompare step={step} />}
    lines={[
      step === 0 ? <>2-1의 직렬 뉴런(<M>w₁ = 2, b₁ = −1, w₂ = 1, b₂ = −3</M>)에 <M>x</M>를 0, 1, 2, 3으로 바꿔 넣음.</> : null,
      step === 1 ? <>ReLU 없음. <M>ŷ = (2x − 1) − 3 = 2x − 4</M>. 값은 <M>−4, −2, 0, 2</M>. 점을 이으면 <Key>직선</Key>.</> : null,
      step === 2 ? <>ReLU 있음. 음수가 0이 되어 값은 <M>0, 0, 0, 2</M>. 점을 이으면 <Hot>꺾인 선</Hot>.</> : null,
      step === 3 ? <>일차함수에 일차함수를 넣어도 일차함수. ReLU가 없으면 뉴런을 아무리 이어도 <Key>직선 하나</Key>임. 층 사이의 활성화 함수가 이 한계를 넘게 함.</> : null,
    ]}
  />
);

/* ───────── 플레이그라운드 시연 ───────── */
const PG = {
  a: 'https://playground.tensorflow.org/#activation=linear&batchSize=10&dataset=circle&regDataset=reg-plane&learningRate=0.03&regularizationRate=0&noise=0&networkShape=&seed=0.5&showTestData=false&discretize=false&percTrainData=50&x=true&y=true&xTimesY=false&xSquared=false&ySquared=false&cosX=false&sinX=false&cosY=false&sinY=false&collectStats=false&problem=classification&initZero=false&hideText=false',
  b: 'https://playground.tensorflow.org/#activation=linear&batchSize=10&dataset=circle&regDataset=reg-plane&learningRate=0.03&regularizationRate=0&noise=0&networkShape=4&seed=0.5&showTestData=false&discretize=false&percTrainData=50&x=true&y=true&xTimesY=false&xSquared=false&ySquared=false&cosX=false&sinX=false&cosY=false&sinY=false&collectStats=false&problem=classification&initZero=false&hideText=false',
  c: 'https://playground.tensorflow.org/#activation=relu&batchSize=10&dataset=circle&regDataset=reg-plane&learningRate=0.03&regularizationRate=0&noise=0&networkShape=4&seed=0.5&showTestData=false&discretize=false&percTrainData=50&x=true&y=true&xTimesY=false&xSquared=false&ySquared=false&cosX=false&sinX=false&cosY=false&sinY=false&collectStats=false&problem=classification&initZero=false&hideText=false',
};
const FwPlayground: ComponentType<{ step: number }> = ({ step }) => {
  const scenes = [
    { k: 'a', t: '장면 ①', d: '은닉층 없음', r: '경계가 직선 하나. 원을 나누지 못함.' },
    { k: 'b', t: '장면 ②', d: '은닉층 1층(뉴런 4개) + Linear', r: '활성화 함수가 없으면 여전히 직선. 2-3의 왼쪽과 같음.' },
    { k: 'c', t: '장면 ③', d: '은닉층 1층(뉴런 4개) + ReLU', r: '경계가 꺾이며 원을 둘러쌈. 파라미터 2×4 + 4×1 + 5 = 17개.' },
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
      lines={[
        <>가운데 파란 점과 바깥 주황 점을 나누는 문제. 교사 시연, 각 장면은 5초 안에 멈춤.</>,
      ]}
    />
  );
};

/* ───────── 3-1 한 점의 오차 ───────── */
const LossE: ComponentType<{ step: number }> = ({ step }) => (
  <Layout
    figure={<ErrorLine step={step} />}
    lines={[
      step === 0 ? <>기계는 자기가 얼마나 틀렸는지 숫자로 앎. 오차 <M>e = ŷ − y</M> (예측 − 정답). 정답 <M>y = 5</M>.</> : null,
      step === 1 ? <><M>ŷ = 3</M>이면 <M>e = 3 − 5 = −2</M>. e가 <Key>음수</Key>이면 예측이 정답보다 <Key>작다</Key>는 뜻임.</> : null,
      step === 2 ? <><M>ŷ = 7</M>이면 <M>e = 2</M>. 3과 7은 정답에서 같은 거리 2에 있음.</> : null,
      step === 3 ? <>두 e를 더하면 <M>(−2) + 2 = 0</M>. 틀린 것이 없다는 뜻이 아님. 양수와 음수가 서로 지워짐.</> : null,
      step === 4 ? <>그래서 <Key>제곱</Key>함. <M>e² = 4, 0.25, 0, 1, 4</M>. 두 e²을 더하면 8. 틀린 정도를 제대로 나타냄.</> : null,
    ]}
  />
);

/* ───────── 3-2 다섯 점의 손실 ───────── */
const LossMse: ComponentType<{ step: number }> = ({ step }) => (
  <Layout
    figure={<ScatterFit step={step} />}
    lines={[
      step === 0 ? <>정답은 모두 <M>y = 2x + 1</M> 위의 다섯 점 (1, 3), (2, 5), (3, 7), (4, 9), (5, 11).</> : null,
      step === 1 ? <>아직 덜 맞춰진 직선 <M>ŷ = x + 2</M>로 예측하면 <M>3, 4, 5, 6, 7</M>.</> : null,
      step === 2 ? <>점마다 오차. <M>e = 0, −1, −2, −3, −4</M>. 주황 막대가 오차의 크기.</> : null,
      step === 3 ? <>제곱해서 더함. <M>0 + 1 + 4 + 9 + 16 = 30</M>.</> : null,
      step === 4 ? <>평균을 냄. <Key>MSE</Key> = 30 ÷ 5 = <M>6</M>. 오차가 1 → 10이면 제곱은 1 → 100. 큰 실수에 훨씬 큰 벌점을 줌.</> : null,
    ]}
  />
);

/* ───────── 4-A 손실 곡선 소개 ───────── */
const GdIntro: ComponentType<{ step: number }> = ({ step }) => (
  <Layout
    figure={<LossCurveB compare={step === 2} marks={step >= 1 ? [{ b: -2, label: '기울기 −3 = 오차 e', tangent: true }] : []} />}
    lines={[
      step === 0 ? <>세션3의 다섯 점 그대로. 계산을 쉽게 하려고 <M>w = 2</M>로 두고 <M>b</M>만 움직임. 가로축이 <M>b</M>, 세로축이 손실 <M>L</M>.</> : null,
      step === 1 ? <>손실은 <M>L = ½(b − 1)²</M>. 다섯 점의 오차가 모두 <M>b − 1</M>로 같음. <M>b = −2</M>에서 오차 −3, 접선 기울기도 <Hot>−3</Hot>.</> : null,
      step === 2 ? <>½이 없으면(회색) 기울기가 모두 2배. ½을 곱하면 <Key>b의 기울기 = 오차 e</Key>가 되어 4-B의 식이 간단해짐. 바닥은 그대로 1.</> : null,
    ]}
  />
);

/* ───────── 4A-1 접선의 방향과 기울기 부호 ───────── */
const GdTangent: ComponentType<{ step: number }> = ({ step }) => {
  const marks = [
    ...(step >= 1 ? [{ b: -2, label: '기울기 −3', tangent: true, dir: '→' }] : []),
    ...(step >= 2 ? [{ b: 3, label: '기울기 2', tangent: true, dir: '←' }] : []),
    ...(step >= 3 ? [{ b: 1, label: '기울기 0', tangent: true, dir: '정지' }] : []),
  ];
  return (
    <Layout
      figure={<LossCurveB marks={marks} />}
      lines={[
        step === 0 ? <>컴퓨터는 곡선 전체를 보지 못함. 지금 자리의 <Key>접선 기울기</Key>만 앎. 접선이 오른쪽 아래로 향하면 음수, 오른쪽 위로 향하면 양수.</> : null,
        step === 1 ? <><M>b = −2</M>. 접선이 오른쪽 아래, 기울기 <Hot>음수</Hot>. 손실을 줄이려면 <Key>오른쪽</Key>으로.</> : null,
        step === 2 ? <><M>b = 3</M>. 접선이 오른쪽 위, 기울기 <Hot>양수</Hot>. 가야 할 곳은 <Key>왼쪽</Key>.</> : null,
        step === 3 ? <><M>b = 1</M>. 접선이 수평, 기울기 0. 바닥에 도착했으니 <Key>정지</Key>.</> : null,
        step === 4 ? <>규칙. 기울기의 <Key>반대 방향</Key>으로 가면 손실이 줄어듦. 이것이 <Key>경사하강법</Key>.</> : null,
      ]}
    />
  );
};

/* ───────── 4A-2 업데이트 식으로 세 step ───────── */
const GdUpdate: ComponentType<{ step: number }> = ({ step }) => {
  const seq = [-2, -0.5, 0.25, 0.625];
  const path = seq.slice(0, Math.max(1, Math.min(step, 3) + 1));
  return (
    <Layout
      figure={<LossCurveB path={path} pathLabel="η = 0.5" />}
      lines={[
        step === 0 ? <>업데이트 식. <M>새 b = 지금 b − η × 기울기</M>. <M>η</M>(에타)는 학습률, 한 번에 옮기는 보폭. 여기서는 0.5.</> : null,
        step === 1 ? <>step 1. <M>−2 − 0.5 × (−3) = −2 + 1.5 = −0.5</M>. 기울기가 음수라 빼기가 더하기가 되어 오른쪽으로 감.</> : null,
        step === 2 ? <>step 2. 기울기 −1.5. <M>−0.5 + 0.75 = 0.25</M>.</> : null,
        step === 3 ? <>step 3. 기울기 −0.75. <M>0.25 + 0.375 = 0.625</M>. 정답 1에 가까워지고, 한 step의 이동 거리는 갈수록 작아짐.</> : null,
      ]}
    />
  );
};

/* ───────── 4A-3 보폭 η를 바꾸면 ───────── */
const GdEta: ComponentType<{ step: number }> = ({ step }) => {
  const runs: { eta: number; name: string; n: number }[] = [
    { eta: 0.05, name: '느림', n: 10 }, { eta: 0.5, name: '수렴', n: 7 }, { eta: 2.0, name: '진동', n: 5 }, { eta: 2.5, name: '발산', n: 4 },
  ];
  const r = runs[Math.min(Math.max(step - 1, 0), 3)];
  const path: number[] = [-2];
  for (let i = 0; i < r.n; i++) { const b = path[path.length - 1]; const nb = b - r.eta * (b - 1); if (nb < -3 || nb > 5.5) break; path.push(nb); }
  return (
    <Layout
      figure={<LossCurveB path={step >= 1 ? path : [-2]} pathLabel={step >= 1 ? `η = ${r.eta} · ${r.name}` : undefined} />}
      lines={[
        step === 0 ? <>모두 <M>b = −2</M>에서 출발. 남은 거리 3. 보폭 <M>η</M>를 바꾸면 어떻게 되나.</> : null,
        step === 1 ? <><M>η = 0.05</M>. 첫 step 뒤 <M>−1.85</M>, 남은 거리 2.85. 안전하지만 <Key>느림</Key>.</> : null,
        step === 2 ? <><M>η = 0.5</M>. 첫 step 뒤 <M>−0.5</M>, 남은 거리 1.5. 바닥으로 잘 감. <Key>수렴</Key>.</> : null,
        step === 3 ? <><M>η = 2.0</M>. 첫 step 뒤 <M>4.0</M>, 남은 거리 3. 출발 때와 같은 거리라 영원히 양옆을 오감. <Key>진동</Key>.</> : null,
        step === 4 ? <><M>η = 2.5</M>. 첫 step 뒤 <M>5.5</M>, 남은 거리 4.5. 점점 멀어짐. <Key>발산</Key>. 학습률은 실험으로 정함.</> : null,
      ]}
    />
  );
};

export const FORWARD_SLIDES: SlideDef[] = [
  { id: 'fw-chain', section: 'forward', tag: '2-1', title: '뉴런을 이으면 순전파', formula: 'z₁ = w₁·x + b₁ → h = ReLU(z₁)', steps: 4, component: FwChain,
    notes: ['뉴런마다 세션1의 계산을 그대로 함. 앞 뉴런의 출력 h가 뒤 뉴런의 입력.'] },
  { id: 'fw-net', section: 'forward', tag: '2-2', title: '3 × 2 × 1 신경망의 순전파', formula: 'h = ReLU(w₁x₁ + w₂x₂ + w₃x₃ + b)', steps: 3, component: FwNet,
    notes: ['1-4에서 파라미터 11개를 센 신경망. 실선은 h₁, 점선은 h₂. 편향은 선 위가 아니라 뉴런 옆 b에서 읽음.'] },
  { id: 'fw-relu', section: 'forward', tag: '2-3', title: 'ReLU를 빼면 직선뿐', formula: 'h = ReLU(2x − 1),  ŷ = ReLU(h − 3)', steps: 3, component: FwRelu,
    notes: ['왼쪽은 직선, 오른쪽은 꺾인 선. 꺾인 선을 모으면 곡선 모양도 만들 수 있음. 바로 플레이그라운드에서 봄.'] },
  { id: 'fw-playground', section: 'forward', title: '플레이그라운드 세 장면', steps: 2, component: FwPlayground,
    notes: ['장면 ① 은닉층 없음 → 직선. 장면 ② Linear → 여전히 직선. 장면 ③ ReLU → 경계가 꺾이며 원을 둘러쌈.', '장면 ③ 파라미터: 선 2×4 + 4×1 = 12, 뉴런 4 + 1 = 5, 합 17.'] },
];

export const LOSS_SLIDES: SlideDef[] = [
  { id: 'loss-e', section: 'loss', tag: '3-1', title: '오차는 예측 빼기 정답', formula: 'e = ŷ − y', steps: 4, component: LossE,
    notes: ['e = 예측 − 정답으로 고정. (−0.5)² = 0.25를 칠판에 씀.', '"절댓값으로 하면 안 돼요?"가 나오면 4-A에서 답함.'] },
  { id: 'loss-mse', section: 'loss', tag: '3-2', title: '다섯 점의 손실, MSE', formula: 'MSE = (e₁² + … + e₅²) ÷ 5', steps: 4, component: LossMse,
    notes: ['앱 A2에서 기울기 w 1, 절편 b 2로 맞추면 MSE 6. Σe²에서 멈추지 말고 5로 나눔.'] },
];

export const GD_SLIDES: SlideDef[] = [
  { id: 'gd-intro', section: 'gd', tag: '4-A', title: '손실 곡선', sub: 'w = 2 고정, b만 움직임', steps: 2, component: GdIntro,
    notes: ['이 세션의 기울기는 직선 y = 2x + 1의 기울기가 아니라 손실 곡선의 기울기.', '½을 곱하지 않으면 기울기가 모두 2배. ½을 곱하면 b의 기울기가 오차 e와 같아져 4-B 식이 간단해짐.'] },
  { id: 'gd-tangent', section: 'gd', tag: '4A-1', title: '접선의 방향과 기울기 부호', steps: 4, component: GdTangent,
    notes: ['앱 A3 b 모드에서 b = −2, 3, 1로 옮겨 접선을 확인. 슬라이더는 방향키로 0.05씩.'] },
  { id: 'gd-update', section: 'gd', tag: '4A-2', title: '업데이트 식으로 세 step', formula: '새 b = 지금 b − η × 기울기', steps: 3, component: GdUpdate,
    notes: ['앱 A3 "한 step 진행"을 세 번 누르면 현재 b가 −0.5, 0.25, 0.625로 종이와 같이 움직임.', '절댓값 손실이면 바닥에서 뾰족해 이동 거리가 저절로 줄지 않음.'] },
  { id: 'gd-eta', section: 'gd', tag: '4A-3', title: '보폭 η를 바꾸면', formula: '새 b = −2 − η × (−3)', steps: 4, component: GdEta,
    notes: ['앱 A3 칩 네 개: 느림 → 수렴 → 진동 → 발산. 발산은 점선이 그래프 윗변을 따라 오감.'] },
];
