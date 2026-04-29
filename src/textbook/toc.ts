// 웹 교과서 구조 — phases.ts와 별도로 "교과서용" 묶음과 페이지를 정의한다.
// 인앱 페이즈와 1:1로 대응하지만, 교과서는 visible 커리큘럼(A·B·C)까지만 다룬다.
import type { PhaseId } from '../phases';

export type TextbookSlug =
  | 'intro'
  | 'a1' | 'a2' | 'a3' | 'a4' | 'a5' | 'a6'
  | 'b1' | 'b2' | 'b3' | 'b4' | 'b5'
  | 'c1' | 'c2';

export interface TextbookPageMeta {
  slug: TextbookSlug;
  num: string;          // "A1", "B2" … 표지는 "0"
  title: string;        // 본문 제목
  short: string;        // 사이드바용 짧은 제목
  subtitle: string;     // 부제 — 표지·헤더에 사용
  appPhase?: PhaseId;   // 대응되는 인앱 페이즈 (있으면 "실습 앱 열기" 버튼)
}

export interface TextbookPart {
  num: 'A' | 'B' | 'C';
  title: string;
  caption: string;      // 부 도입 한 줄 설명
  pages: TextbookPageMeta[];
}

export const TEXTBOOK_INTRO: TextbookPageMeta = {
  slug: 'intro',
  num: '0',
  title: '신경망 웹 교과서 — 시작하기 전에',
  short: '표지 · 시작하기 전에',
  subtitle: '코드 없이 슬라이더와 그림판으로 신경망의 원리를 배운다',
};

export const TEXTBOOK_PARTS: TextbookPart[] = [
  {
    num: 'A',
    title: '알고리즘의 이해',
    caption: '예측 → 오차 → 기울기 → 갱신 — 학습 한 step을 손에 잡히게',
    pages: [
      { slug: 'a1', num: 'A1', title: '인공 뉴런의 예측',     short: '인공 뉴런의 예측', subtitle: '부품 → 곱·합·활성화 → 예측값',          appPhase: 'a1' },
      { slug: 'a2', num: 'A2', title: '오차와 MSE',           short: '오차와 MSE',       subtitle: '예측 − 정답, 그리고 평균 제곱',         appPhase: 'a2' },
      { slug: 'a3', num: 'A3', title: '경사하강법',            short: '경사하강법',       subtitle: '손실이 줄어드는 방향 + 보폭 η',         appPhase: 'a3' },
      { slug: 'a4', num: 'A4', title: '기울기 계산하기',       short: '기울기 계산',      subtitle: 'e·x 모양 + 표본 평균',                  appPhase: 'a4' },
      { slug: 'a5', num: 'A5', title: '전체 흐름 완성',        short: '전체 흐름',        subtitle: '예측 → 오차 → 기울기 → 갱신 한 묶음',   appPhase: 'a5' },
      { slug: 'a6', num: 'A6', title: '기온 예측 프로젝트',    short: '기온 예측',        subtitle: '인공 뉴런 1개로 서울 기온 회귀',         appPhase: 'a6' },
    ],
  },
  {
    num: 'B',
    title: '데이터·학습·분류 출력',
    caption: '도트 데이터 하나로 통일 — 입력·라벨·출력 뉴런·소프트맥스',
    pages: [
      { slug: 'b1', num: 'B1', title: '문제 정의와 라벨',         short: '문제와 라벨',     subtitle: '동그라미 vs 세모, 입력·특징·정답',     appPhase: 'b1' },
      { slug: 'b2', num: 'B2', title: '데이터셋과 전처리',        short: '데이터셋과 전처리', subtitle: '기본 데이터 + 정제할 샘플 찾기',     appPhase: 'b2' },
      { slug: 'b3', num: 'B3', title: '학습 / 평가 데이터 나누기', short: '데이터 나누기',   subtitle: '왜 나눠야 하는가',                     appPhase: 'b3' },
      { slug: 'b4', num: 'B4', title: '이진 분류 모델 학습',      short: '이진 분류',       subtitle: '동그라미 vs 세모, 출력 뉴런 2개',     appPhase: 'b4' },
      { slug: 'b5', num: 'B5', title: '다중 분류와 소프트맥스',   short: '다중 분류',       subtitle: '동그라미·세모·네모, 출력 뉴런 3개',   appPhase: 'b5' },
    ],
  },
  {
    num: 'C',
    title: '딥러닝',
    caption: '심층 신경망이 문제를 어떻게 해결하는지 이해하기 — 역전파와 MNIST',
    pages: [
      { slug: 'c1', num: 'C1', title: '역전파 알고리즘의 이해', short: '역전파',     subtitle: '깊은 망의 가중치는 거꾸로 흘러 갱신된다', appPhase: 'c1' },
      { slug: 'c2', num: 'C2', title: 'MNIST 도전',             short: 'MNIST 도전', subtitle: '진짜 손글씨 데이터에 깊은 망 적용',       appPhase: 'c2' },
    ],
  },
];

export const TEXTBOOK_PAGES: TextbookPageMeta[] = [
  TEXTBOOK_INTRO,
  ...TEXTBOOK_PARTS.flatMap((p) => p.pages),
];

export const TEXTBOOK_SLUGS = new Set<TextbookSlug>(TEXTBOOK_PAGES.map((p) => p.slug));

export function findPage(slug: TextbookSlug): TextbookPageMeta | undefined {
  return TEXTBOOK_PAGES.find((p) => p.slug === slug);
}

export function neighbors(slug: TextbookSlug): { prev?: TextbookPageMeta; next?: TextbookPageMeta } {
  const idx = TEXTBOOK_PAGES.findIndex((p) => p.slug === slug);
  return {
    prev: idx > 0 ? TEXTBOOK_PAGES[idx - 1] : undefined,
    next: idx >= 0 && idx < TEXTBOOK_PAGES.length - 1 ? TEXTBOOK_PAGES[idx + 1] : undefined,
  };
}

export function findPart(slug: TextbookSlug): TextbookPart | undefined {
  return TEXTBOOK_PARTS.find((part) => part.pages.some((p) => p.slug === slug));
}
