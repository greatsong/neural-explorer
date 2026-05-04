// PhaseDive — 자기주도 심층 탐구 (E1)
// 본 단원 (A·B·C·D) 에서 자연스럽게 가지가 뻗는 13개 주제 카드. 학생이 한 가지 골라 1~2 주 탐구하고 발표.
// 각 카드는 4박자: ① 왜 흥미로운가 (hook) ② 탐구 가이드 질문 3~4개 ③ 추천 발표 결과물 ④ 검색 시작 키워드.
// 고1·2 가 스스로 굴릴 수 있는 수준에 맞춰 질문은 두루뭉술 X 구체적 X 검색 가능한 형태로.

import { useEffect, useState } from 'react';
import { useApp } from '../store';
import { PHASES } from '../phases';

type Category =
  | '알고리즘·수학'
  | '모델 구조·시각'
  | '데이터·평가'
  | '사회·역사·윤리'
  | '첨단 트렌드'
  | '인접 분야';

interface Topic {
  id: string;
  num: number;
  category: Category;
  title: string;
  connection: string; // 어느 차시와 이어지나
  hook: string; // 왜 흥미로운가 (한 단락)
  questions: string[]; // 탐구 가이드 질문
  output: string; // 추천 발표 결과물
  keywords: string[]; // 검색 시작 키워드
}

const CATEGORY_COLOR: Record<Category, { bg: string; fg: string; border: string }> = {
  '알고리즘·수학':   { bg: 'rgb(238, 234, 255)', fg: 'rgb(70, 50, 180)', border: 'rgb(140, 110, 240)' },
  '모델 구조·시각':  { bg: 'rgb(220, 240, 220)', fg: 'rgb(40, 110, 60)',  border: 'rgb(100, 180, 100)' },
  '데이터·평가':     { bg: 'rgb(255, 240, 220)', fg: 'rgb(150, 80, 20)',  border: 'rgb(220, 160, 60)' },
  '사회·역사·윤리':  { bg: 'rgb(255, 228, 230)', fg: 'rgb(160, 30, 50)',  border: 'rgb(220, 100, 120)' },
  '첨단 트렌드':     { bg: 'rgb(225, 240, 255)', fg: 'rgb(20, 90, 160)',  border: 'rgb(80, 150, 220)' },
  '인접 분야':       { bg: 'rgb(245, 235, 250)', fg: 'rgb(110, 60, 140)', border: 'rgb(170, 120, 200)' },
};

const TOPICS: Topic[] = [
  // ── 알고리즘·수학 ──
  {
    id: 'lr-schedule',
    num: 1,
    category: '알고리즘·수학',
    title: '학습률(η)을 똑똑하게 — 스케줄링과 옵티마이저',
    connection: 'A3 (학습률 4 시나리오) · D 영역',
    hook: '달리기 보폭을 일정하게 두면 잘 못 달리듯, AI 도 학습 보폭(η)을 똑똑하게 조절해야 빠르고 정확하게 배워요. SGD, Adam, AdamW… 매년 더 좋은 옵티마이저가 나오는데 진짜 그렇게 다른지 직접 확인해 봅시다.',
    questions: [
      '학습률을 처음에 크게, 나중에 작게 하는 \'cosine annealing\' 은 왜 효과적일까?',
      'SGD 와 Adam 은 같은 학습률이라도 학습 곡선이 어떻게 다를까? 가능하면 두 옵티마이저로 같은 모델을 돌려 비교해 보기.',
      '실제 ChatGPT 같은 거대 모델을 학습할 때 어떤 옵티마이저와 학습률 스케줄을 썼을까? (논문 한 편 골라 읽기)',
    ],
    output: '같은 데이터·모델에 SGD vs Adam 학습 곡선 비교 그래프 1장 + 5분 발표 슬라이드',
    keywords: ['Adam optimizer', 'learning rate scheduler', 'cosine annealing', 'warmup'],
  },
  {
    id: 'loss-family',
    num: 2,
    category: '알고리즘·수학',
    title: '손실 함수 가족 — MSE 말고 다른 건?',
    connection: 'A2 (MSE) · B4 (이진 분류) · C2 (다중 분류)',
    hook: '회귀에는 MSE, 분류에는 교차 엔트로피(Cross-Entropy)… 왜 문제마다 손실 함수가 달라야 할까? "얼마나 틀렸는지" 잴 때 거리 vs 확률은 다른 이야기.',
    questions: [
      '분류 문제에 MSE 를 쓰면 왜 학습이 잘 안 되나? (sigmoid + MSE 의 기울기 소실 문제)',
      '"교차 엔트로피" 는 어떤 직관에서 만들어졌나? 정보 이론의 \'엔트로피\' 개념과 어떻게 연결되나?',
      'L1 Loss(MAE) 는 언제 MSE 보다 좋은가? (이상치 robustness)',
    ],
    output: '"어느 상황에 어느 손실" 한 페이지 정리 + 같은 데이터에 두 손실 적용해 학습 곡선 비교',
    keywords: ['cross-entropy loss', 'MAE vs MSE', 'negative log likelihood', 'information entropy'],
  },
  {
    id: 'activation',
    num: 3,
    category: '알고리즘·수학',
    title: '활성화 함수의 진화 — ReLU 가 유행한 이유',
    connection: 'A1 (ReLU/sigmoid/linear)',
    hook: '처음엔 sigmoid, 그 다음엔 tanh, 2010년 이후로는 ReLU 가 표준이 됐어요. 왜 갑자기 단순한 ReLU 가 이겼고, 요즘은 GELU·SwiGLU 같은 변형이 다시 등장하는 걸까?',
    questions: [
      '"기울기 소실(vanishing gradient)" 이 무엇이고 ReLU 가 어떻게 해결했나?',
      '"죽은 ReLU(dead ReLU)" 문제는 진짜 문제일까? Leaky ReLU 가 답인가?',
      'GPT-4 같은 최신 LLM 은 어떤 활성화 함수를 쓸까? 왜 그것을 골랐을까?',
    ],
    output: '활성화 함수 5종 그래프 비교 + 같은 모델에 적용해 학습 차이 측정한 표',
    keywords: ['vanishing gradient', 'ReLU dead neuron', 'GELU activation', 'SwiGLU'],
  },

  // ── 모델 구조·시각 ──
  {
    id: 'cnn-intro',
    num: 4,
    category: '모델 구조·시각',
    title: 'CNN 입문 — 이미지에 왜 합성곱이 잘 맞나',
    connection: 'C2 (MNIST 도전)',
    hook: 'MNIST 에서 일반 모델은 98 % 정확도, CNN(합성곱 신경망)은 99.5 %. 0.5 % 차이가 작아 보여도 사람 수준을 넘는 결정적 차이예요. CNN 의 \'필터\' 가 무엇을 보는지 시각화하면 깜짝 놀랄 거예요.',
    questions: [
      '\'합성곱(convolution)\' 연산은 무엇이고 왜 이미지에 잘 맞나?',
      'CNN 첫 층 필터들을 시각화하면 어떤 모양이 나오나? (Edge? Texture?)',
      '사람의 시각 피질(V1, V2…) 과 CNN 의 층 구조는 어떻게 비슷할까?',
    ],
    output: 'CNN 필터 시각화 그림 + "왜 이미지에 잘 맞는지" 인포그래픽 1장',
    keywords: ['convolutional neural network', 'CNN filter visualization', 'edge detection', 'visual cortex CNN'],
  },
  {
    id: 'beyond-mnist',
    num: 5,
    category: '모델 구조·시각',
    title: 'MNIST 너머 — Fashion-MNIST, CIFAR-10 도전',
    connection: 'C2 (MNIST 도전)',
    hook: 'MNIST 에서 99 % 맞히는 모델이 옷 사진(Fashion-MNIST)에선 90 % 도 못 맞히는 경우가 있어요. 색깔이 들어간 자연 사진(CIFAR-10) 은 또 어떨까? 데이터의 \'어려움\' 이 뭔지 직접 만져 보기.',
    questions: [
      'MNIST 와 Fashion-MNIST 의 차이는? 픽셀 분포·복잡도 측면에서.',
      '같은 모델로 CIFAR-10 을 풀면 정확도가 왜 폭락하나?',
      '어려운 데이터셋에서 정확도를 끌어올리는 핵심 기법 3 가지는?',
    ],
    output: '세 데이터셋 정확도 비교 막대 그래프 + "왜 어려워졌나" 분석 1쪽',
    keywords: ['Fashion-MNIST', 'CIFAR-10 benchmark', 'image classification difficulty'],
  },
  {
    id: 'data-aug',
    num: 6,
    category: '모델 구조·시각',
    title: '데이터 증강 — 한 장을 100장처럼 쓰기',
    connection: 'B2 (전처리) · C2',
    hook: '딥러닝은 \'데이터가 많을수록 잘 한다\' 가 진리. 그런데 데이터가 부족하면 어떻게 할까? 한 장을 회전·뒤집기·확대해서 가짜 데이터를 만드는 게 데이터 증강. 정말 효과가 있을까?',
    questions: [
      '글씨에는 회전이 통하는데 강아지 사진에선 위아래 뒤집기가 위험한 이유는?',
      '데이터 증강을 너무 많이 하면 어떤 부작용이 있나?',
      'AutoAugment·RandAugment 처럼 AI 가 직접 증강 방법을 고르는 기법은 어떻게 작동하나?',
    ],
    output: '증강 전/후 정확도 비교 + 데이터셋별 효과적인 증강 추천 표',
    keywords: ['data augmentation', 'AutoAugment', 'RandAugment', 'image augmentation'],
  },

  // ── 데이터·평가 ──
  {
    id: 'overfit',
    num: 7,
    category: '데이터·평가',
    title: '과적합과 정규화 — 모델이 외워 버리면',
    connection: 'B3 (학습/평가 분할)',
    hook: '시험 답만 외운 친구가 실제 문제에서 망하듯, AI 도 학습 데이터를 너무 잘 외우면(과적합) 새 데이터에선 못 맞혀요. Dropout, Weight Decay 같은 정규화 기법이 어떻게 이 문제를 해결할까?',
    questions: [
      '모델 크기와 과적합의 관계는? 왜 작은 모델이 더 일반화가 잘 될까?',
      'Dropout 은 어떻게 무작위로 뉴런을 끄는데 모델이 더 똑똑해지나?',
      '\'Early stopping\' 이 단순한데도 효과적인 이유는?',
    ],
    output: '학습 정확도 vs 평가 정확도 분리 그래프 (전형적 과적합 모양 재현) + 정규화 기법 3가지 비교',
    keywords: ['overfitting', 'dropout regularization', 'weight decay', 'early stopping'],
  },
  {
    id: 'bias',
    num: 8,
    category: '데이터·평가',
    title: '데이터의 편향 — 모델은 우리가 준 것만 안다',
    connection: 'B1 (라벨) · B2 (전처리)',
    hook: '구글의 얼굴 인식이 흑인을 고릴라로 분류한 사건(2015), Amazon 채용 AI 가 여성을 차별한 사건(2018)… 모두 데이터 편향이 원인이에요. 모델은 학습한 데이터의 편견을 그대로 학습합니다. 이걸 어떻게 막을까?',
    questions: [
      '구글 / Amazon / COMPAS 사건 중 하나를 골라 무엇이 잘못됐는지 분석하기.',
      '데이터 수집 단계에서 편향을 줄일 수 있는 방법은?',
      '\'공정한 AI(Fair AI)\' 를 만드는 알고리즘적 접근이 가능할까? 그 한계는?',
    ],
    output: '사례 1개 골라 원인·해결책 분석 1쪽 + AI 윤리 가이드라인 한 페이지',
    keywords: ['algorithmic bias', 'Amazon hiring AI', 'COMPAS recidivism', 'fairness in machine learning'],
  },

  // ── 사회·역사·윤리 ──
  {
    id: 'ai-winter',
    num: 9,
    category: '사회·역사·윤리',
    title: 'AI 의 두 번의 겨울 — 무엇이 바뀌어 부활했나',
    connection: '커리큘럼 전체',
    hook: 'AI 는 1956 년에 탄생했어요. 그런데 1970 년대와 1990 년대에 두 번이나 \'겨울\' 을 맞아 연구비가 끊겼죠. 그러다 2012 년 갑자기 폭발했어요. 무엇이 결정적이었을까? 데이터? 컴퓨터? 알고리즘?',
    questions: [
      '1956 다트머스 회의에서 시작해 첫 번째 AI 겨울(1974) 까지 무엇이 잘못됐나?',
      '1986 년 역전파 재발견과 두 번째 겨울(1990s) 의 연관은?',
      '2012 년 AlexNet 의 ImageNet 우승이 왜 게임체인저였나? GPU·데이터·알고리즘 중 무엇이 결정타?',
    ],
    output: 'AI 70 년 타임라인 인포그래픽 1장 + 핵심 모먼트 5개 정리한 발표 슬라이드',
    keywords: ['AI winter', 'Dartmouth conference', 'AlexNet 2012', 'ImageNet'],
  },
  {
    id: 'gen-ai-ethics',
    num: 10,
    category: '사회·역사·윤리',
    title: '생성 AI 시대의 윤리 — 저작권·딥페이크·일자리',
    connection: '5부 (생성)',
    hook: 'ChatGPT 가 쓴 글의 저작권은 누구에게? Stable Diffusion 으로 만든 그림은 표절일까? 딥페이크로 만든 가짜 영상이 선거에 영향을 주면 어떻게 막을까? 우리 세대가 답해야 할 질문들.',
    questions: [
      '생성 AI 결과물의 저작권 — 미국·EU·한국 법은 어떻게 다른가?',
      '학생이 ChatGPT 로 과제를 하는 게 부정행위인가? 어떤 규칙이 합리적일까?',
      '딥페이크 탐지 기술은 어디까지 왔고 무엇이 부족한가?',
    ],
    output: '한 가지 사회 이슈를 골라 찬·반 입장 정리 + 본인 의견 한 페이지',
    keywords: ['AI generated content copyright', 'deepfake detection', 'AI in education ethics'],
  },

  // ── 첨단 트렌드 ──
  {
    id: 'transformer',
    num: 11,
    category: '첨단 트렌드',
    title: 'ChatGPT 의 정체 — 트랜스포머·LLM 한 장 정리',
    connection: '6부 (트랜스포머, GPT)',
    hook: 'ChatGPT 가 어떻게 \'말\' 을 할까? 사실은 \'다음 단어 예측\' 만 무한 반복하는 거예요. 이 단순한 원리가 왜 이렇게 자연스러운 글을 만들까? 그리고 왜 가끔 거짓말(hallucination)을 할까?',
    questions: [
      '\'다음 토큰 예측\' 이 어떻게 자연어 생성으로 이어지나?',
      '트랜스포머의 \'self-attention\' 이 무엇을 하길래 이전 RNN 보다 잘 작동할까?',
      'LLM 의 hallucination 은 왜 일어나고 어떻게 막을 수 있나?',
    ],
    output: '"ChatGPT 30 분 설명" 슬라이드 5장 (비전공 친구도 이해할 수준)',
    keywords: ['transformer self-attention', 'next token prediction', 'LLM hallucination', 'GPT architecture'],
  },
  {
    id: 'diffusion',
    num: 12,
    category: '첨단 트렌드',
    title: '그림 그리는 AI — 디퓨전 모델 직관',
    connection: '5부 (오토인코더)',
    hook: 'Stable Diffusion, DALL-E, Midjourney… AI 가 그림을 그리는 시대. 그런데 어떻게 그릴까? 신기하게도 \'노이즈에서 시작해서 점점 노이즈를 빼는\' 방식이에요. 왜 이게 통할까?',
    questions: [
      '\'Diffusion(확산)\' 이라는 단어가 왜 이 모델 이름이 됐나? 물리학과 어떤 연관?',
      '텍스트 프롬프트를 그림으로 변환하는 핵심 다리(CLIP) 는 무엇을 하나?',
      'ControlNet 같은 후속 기술은 어떻게 더 정교한 제어를 가능하게 했나?',
    ],
    output: '직접 프롬프트 → 결과 비교 (무료 디퓨전 도구 활용) + 작동 원리 한 장 그림',
    keywords: ['diffusion model', 'Stable Diffusion explained', 'CLIP text-image', 'ControlNet'],
  },

  // ── 인접 분야 ──
  {
    id: 'brain',
    num: 13,
    category: '인접 분야',
    title: '진짜 뇌 vs 인공 뉴런 — 어디까지 같고 어디서 갈리나',
    connection: 'A1 (인공 뉴런)',
    hook: '인공 뉴런(neuron)은 진짜 뇌세포에서 영감을 받았다고 하는데, 실제로 얼마나 비슷할까? 우리 뇌의 1000 억 개 뉴런과 GPT-4 의 수조 개 파라미터, 같은 원리로 작동할까?',
    questions: [
      '생물학적 뉴런의 \'발화(firing)\' 와 ReLU 활성화의 비슷한 점·다른 점은?',
      '우리 뇌는 어떻게 학습할까? \'역전파\' 같은 메커니즘이 실제로 있을까? (헤브의 법칙 vs 백프롭)',
      '인공 신경망이 사람만큼 일반화하지 못하는 핵심 이유는?',
    ],
    output: '진짜 뉴런 vs 인공 뉴런 비교표 + "이름만 같지 다른 것이다" 한 줄 결론 발표',
    keywords: ['biological vs artificial neuron', 'Hebbian learning', 'neuroscience deep learning'],
  },
];

// 카테고리별로 묶어 표시
const CATEGORIES: Category[] = ['알고리즘·수학', '모델 구조·시각', '데이터·평가', '사회·역사·윤리', '첨단 트렌드', '인접 분야'];

export function PhaseDive() {
  const meta = PHASES.find((p) => p.id === 'e1')!;
  const markCompleted = useApp((s) => s.markCompleted);
  const [openId, setOpenId] = useState<string | null>(null);

  // 카드 한 번이라도 펼쳐 본 학생은 완료 처리
  useEffect(() => {
    if (openId !== null) markCompleted('e1');
  }, [openId, markCompleted]);

  return (
    <article>
      <div className="text-xs font-mono text-muted">PHASE {meta.num}</div>
      <h1>{meta.title}</h1>
      <p className="text-muted mt-2">
        지금까지 배운 내용에서 자연스럽게 가지를 뻗을 수 있는 13 개 탐구 주제예요.
        <strong> 한 가지 골라 1~2 주 직접 자료를 찾고, 작은 실험·정리·발표</strong> 까지 해 보세요.
        각 카드는 ① 왜 흥미로운가 ② 탐구 방향 질문 ③ 발표 결과물 ④ 검색 시작 키워드 의 4박자로 구성돼 있어요.
      </p>

      <div className="aside-tip mt-3 text-sm">
        <strong>인공지능 기초 자기주도 심화 탐구 가이드</strong>
        <ul className="mt-1 list-disc pl-5 text-[13px] text-muted">
          <li><strong>1주차</strong>: 검색 키워드로 자료 3~5 개 모아 읽기 → 탐구 질문 답 정리.</li>
          <li><strong>2주차</strong>: 발표 결과물 만들기 (실험·비교 그래프·인포그래픽 등). 5분 내외 발표 준비.</li>
          <li><strong>발표 팁</strong>: 친구가 처음 듣는다 가정. 전문 용어 한 번 풀어 쓰고 가기.</li>
        </ul>
      </div>

      {CATEGORIES.map((cat) => (
        <section key={cat} className="mt-6">
          <div className="flex items-baseline gap-2 mb-2">
            <span
              className="px-2 py-0.5 rounded text-xs font-semibold"
              style={{ background: CATEGORY_COLOR[cat].bg, color: CATEGORY_COLOR[cat].fg }}
            >
              {cat}
            </span>
            <span className="text-xs text-muted">{TOPICS.filter((t) => t.category === cat).length} 주제</span>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            {TOPICS.filter((t) => t.category === cat).map((t) => {
              const open = openId === t.id;
              const c = CATEGORY_COLOR[t.category];
              return (
                <div
                  key={t.id}
                  className="rounded-lg border bg-bg overflow-hidden"
                  style={{ borderColor: open ? c.border : 'rgb(var(--color-border))' }}
                >
                  <button
                    onClick={() => setOpenId(open ? null : t.id)}
                    className="w-full text-left p-3 hover:bg-surface/50 transition"
                  >
                    <div className="flex items-start gap-2">
                      <div
                        className="shrink-0 w-7 h-7 rounded-full text-sm font-mono flex items-center justify-center"
                        style={{ background: c.bg, color: c.fg, border: `1px solid ${c.border}` }}
                      >
                        {t.num}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm leading-snug">{t.title}</div>
                        <div className="text-[11px] text-muted mt-1">연결 차시 — {t.connection}</div>
                      </div>
                      <div className="shrink-0 text-muted text-xs">{open ? '접기 ▴' : '자세히 ▾'}</div>
                    </div>
                  </button>

                  {open && (
                    <div className="border-t border-border bg-surface/30 p-3 space-y-3 text-[13px]">
                      <div>
                        <div className="text-xs font-semibold text-muted mb-1">왜 흥미로운가?</div>
                        <p className="leading-relaxed">{t.hook}</p>
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-muted mb-1">탐구 방향 질문</div>
                        <ol className="list-decimal pl-5 space-y-1 leading-relaxed">
                          {t.questions.map((q, i) => <li key={i}>{q}</li>)}
                        </ol>
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-muted mb-1">추천 결과물</div>
                        <p className="leading-relaxed">{t.output}</p>
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-muted mb-1">검색 시작 키워드</div>
                        <div className="flex flex-wrap gap-1.5">
                          {t.keywords.map((k) => (
                            <code key={k} className="px-1.5 py-0.5 bg-bg border border-border rounded text-[11px] font-mono">{k}</code>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      ))}

      <div className="aside-note mt-6 text-sm">
        <strong>여기 없는 주제도 OK!</strong> 위 13 가지가 출발점일 뿐이에요. 본인이 평소 궁금했던 AI 관련 주제가
        있으면 선생님과 상의해 직접 탐구 주제로 정해도 좋습니다. 단, ① 1~2 주 안에 답을 찾을 수 있는 크기 ②
        결과물(그래프·표·슬라이드 등)로 만들 수 있는 형태 — 이 두 조건만 기억하세요.
      </div>
    </article>
  );
}
