// 웹 교과서 구조 — phases.ts와 별도로 "교과서용" 묶음과 페이지를 정의한다.
// 인앱 페이즈와 1:1로 대응하지만, 교과서는 4부(페이즈 1~12)까지만 다룬다.
import type { PhaseId } from '../phases';

export type TextbookSlug =
  | 'intro'
  | 'p1' | 'p2' | 'p3' | 'p4' | 'p5'
  | 'p6' | 'p7' | 'p8' | 'p9'
  | 'p10'
  | 'p11' | 'p12';

export interface TextbookPageMeta {
  slug: TextbookSlug;
  num: string;          // "1", "2", ... 표지는 "0"
  title: string;        // 본문 제목
  short: string;        // 사이드바용 짧은 제목
  subtitle: string;     // 부제 — 표지·헤더에 사용
  appPhase?: PhaseId;   // 대응되는 인앱 페이즈 (있으면 "실습 앱 열기" 버튼)
}

export interface TextbookPart {
  num: '1부' | '2부' | '3부' | '4부';
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
    num: '1부',
    title: '뉴런의 기초',
    caption: '인공 뉴런의 부품부터 자동 학습(경사 하강법)까지',
    pages: [
      { slug: 'p1', num: '1', title: '인공 뉴런 해부', short: '인공 뉴런 해부', subtitle: '가중치·편향·활성화 함수', appPhase: 'p1' },
      { slug: 'p2', num: '2', title: '순전파 — 입력에서 예측까지', short: '순전파', subtitle: '곱셈 → 합산 → 활성화의 한 방향 흐름', appPhase: 'p2' },
      { slug: 'p3', num: '3', title: '손실함수와 경사하강법', short: '손실함수와 경사하강법', subtitle: '제곱 오차 + 기울기 → 갱신 직관', appPhase: 'p3' },
      { slug: 'p4', num: '4', title: '학습률 — 보폭의 크기', short: '학습률', subtitle: '슬라이더 한 칸 크기 = 학습률 η', appPhase: 'p4' },
      { slug: 'p5', num: '5', title: '오차 역전파 — 자동 학습', short: '오차 역전파', subtitle: '오차 → 변화량 → 수정의 한 묶음', appPhase: 'p5' },
    ],
  },
  {
    num: '2부',
    title: '분류와 평가',
    caption: '두 갈래로 나누고, 그 결과가 얼마나 믿을 만한지 따져본다',
    pages: [
      { slug: 'p6', num: '6', title: '입시 합격 예측 — 분류 문제의 첫 만남', short: '입시 합격 예측', subtitle: '정시·학종 시나리오와 결정 경계', appPhase: 'p6' },
      { slug: 'p7', num: '7', title: '데이터를 더 모으면 — 재학습', short: '데이터 추가 후 재학습', subtitle: '10명 → 40명, 결정 경계가 다시 그려진다', appPhase: 'p7' },
      { slug: 'p8', num: '8', title: '정확도 — 가장 단순한 평가 지표', short: '정확도', subtitle: '맞춘 개수 ÷ 전체 개수', appPhase: 'p8' },
      { slug: 'p9', num: '9', title: '평가의 함정 — 정밀도와 재현율', short: '평가의 함정', subtitle: '정확도만으로는 속을 수 있다', appPhase: 'p9' },
    ],
  },
  {
    num: '3부',
    title: '직접 만들기',
    caption: '내가 그린 데이터로, 내가 만든 분류기를 학습시킨다',
    pages: [
      { slug: 'p10', num: '10', title: '도트 그림 학습 — 내 데이터로 만든 분류기', short: '도트 그림 학습', subtitle: '직접 그리고, 학습시키고, 갤러리에 공유', appPhase: 'p10' },
    ],
  },
  {
    num: '4부',
    title: '깊은 학습',
    caption: '뉴런 한 개로는 풀 수 없는 문제 — 신경망을 더 크고 깊게',
    pages: [
      { slug: 'p11', num: '11', title: '신경망 설계 — 복잡도와 신경망 크기', short: '신경망 설계', subtitle: '2종 → 3종 → 10종, 더 복잡한 분류로', appPhase: 'p11' },
      { slug: 'p12', num: '12', title: 'MNIST 도전 — 진짜 손글씨를 알아보다', short: 'MNIST 도전', subtitle: '원본 MNIST 6만 장 → 브라우저 실습용 300장 샘플, 28×28 픽셀의 세계', appPhase: 'p12' },
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
