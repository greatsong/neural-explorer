// 가이드 페이지의 교사 지도서용 콘텐츠.
// 1~4부 → A/B/C 재구성 작업 중. 본 파일은 후속 단계에서 새 ID(a1~c2) 기준으로 재작성된다.
// 옛 콘텐츠는 src/data/_legacy/guideContent.ts 에 보존되어 있다.

import type { PhaseId } from '../phases';

export type Mode = '개별' | '짝' | '전체';

export interface ScriptLine {
  who: '교사' | '학생' | '장면';
  line: string;
}

export interface QnA {
  q: string;
  a: string;
}

export interface Trouble {
  issue: string;
  tip: string;
}

export interface Step {
  src: string;
  caption: string;
  action?: string;
}

export interface PhaseGuide {
  id: PhaseId;
  num: string;
  title: string;
  goal: string;
  cesi: 1 | 2 | 3 | 4;
  timeMin: number;
  mode: Mode;
  steps: Step[];
  todo: string[];
  point?: string;
  script?: ScriptLine[];
  qna?: QnA[];
  troubleshoot?: Trouble[];
  next?: string;
}

export interface GroupGuide {
  num: string;
  name: string;
  blurb: string;
  phases: PhaseGuide[];
}

export const GROUPS: GroupGuide[] = [
  {
    num: 'A',
    name: '알고리즘의 이해',
    blurb: '예측 → 오차 → 기울기 → 갱신 — 학습 한 step을 손에 잡히게. (작성 중)',
    phases: [],
  },
  {
    num: 'B',
    name: '데이터·학습·분류 출력',
    blurb: '도트 데이터 하나로 통일 — 입력·라벨·출력 뉴런·소프트맥스. (작성 중)',
    phases: [],
  },
  {
    num: 'C',
    name: '딥러닝',
    blurb: '심층 신경망이 문제를 어떻게 해결하는지 — 역전파와 MNIST. (작성 중)',
    phases: [],
  },
];
