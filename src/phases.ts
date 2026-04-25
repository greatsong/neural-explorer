export type PhaseId =
  | 'p1' | 'p2' | 'p3' | 'p4' | 'p5'
  | 'p6' | 'p7' | 'p8' | 'p9'
  | 'p10' | 'p11' | 'p12'
  | 'p13' | 'p14';

export interface PhaseMeta {
  id: PhaseId;
  num: string;
  title: string;
  subtitle: string;
  group: '1부 — 뉴런의 기초' | '2부 — 분류와 평가' | '3부 — 직접 만들기' | '4부 — 깊은 학습' | '5부 — 분류를 넘어 생성으로';
}

export const PHASES: PhaseMeta[] = [
  { id: 'p1',  num: '1',  title: '인공 뉴런 해부',          subtitle: '가중치·편향·활성화 함수', group: '1부 — 뉴런의 기초' },
  { id: 'p2',  num: '2',  title: '순전파 퀴즈',             subtitle: '직접 계산해보기',         group: '1부 — 뉴런의 기초' },
  { id: 'p3',  num: '3',  title: '오차 측정',               subtitle: '예측과 정답의 거리',      group: '1부 — 뉴런의 기초' },
  { id: 'p4',  num: '4',  title: '수동 학습',               subtitle: '슬라이더로 직접 맞추기',  group: '1부 — 뉴런의 기초' },
  { id: 'p5',  num: '5',  title: '기울기와 수정',           subtitle: '오차 → 기울기 → 수정 파헤치기', group: '1부 — 뉴런의 기초' },
  { id: 'p6',  num: '6',  title: '입시 합격 예측',          subtitle: '정시 / 학종 시나리오',    group: '2부 — 분류와 평가' },
  { id: 'p7',  num: '7',  title: '데이터 추가 후 재학습',   subtitle: '10명 → 40명',             group: '2부 — 분류와 평가' },
  { id: 'p8',  num: '8',  title: '정확도',                  subtitle: '기본 평가 지표',          group: '2부 — 분류와 평가' },
  { id: 'p9',  num: '9',  title: '평가의 함정',             subtitle: '정밀도와 재현율',         group: '2부 — 분류와 평가' },
  { id: 'p10', num: '10', title: '도트 그림 학습',          subtitle: '직접 그리고 공유하기',    group: '3부 — 직접 만들기' },
  { id: 'p11', num: '11', title: '신경망 설계',             subtitle: '복잡도와 신경망 크기',    group: '4부 — 깊은 학습' },
  { id: 'p12', num: '12', title: 'MNIST 도전',              subtitle: '진짜 손글씨 분류',        group: '4부 — 깊은 학습' },
  { id: 'p13', num: '13', title: '평균과 분포',              subtitle: '가장 단순한 생성 모델',   group: '5부 — 분류를 넘어 생성으로' },
  { id: 'p14', num: '14', title: '오토인코더',               subtitle: '잠재 공간으로 그림 만들기', group: '5부 — 분류를 넘어 생성으로' },
];

export const PHASE_GROUPS = Array.from(
  PHASES.reduce((m, p) => {
    if (!m.has(p.group)) m.set(p.group, []);
    m.get(p.group)!.push(p);
    return m;
  }, new Map<PhaseMeta['group'], PhaseMeta[]>())
);
