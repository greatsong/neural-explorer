export type PhaseId =
  | 'p1' | 'p2' | 'p3' | 'p4' | 'p5'
  | 'p6' | 'p7' | 'p8' | 'p9'
  | 'p10' | 'p11' | 'p12'
  | 'p13' | 'p14'
  | 'p15' | 'p16' | 'p17' | 'p18' | 'p19' | 'p20' | 'p21' | 'p22';

export interface PhaseMeta {
  id: PhaseId;
  num: string;
  title: string;
  subtitle: string;
  group:
    | '1부 — 뉴런의 기초'
    | '2부 — 분류와 평가'
    | '3부 — 직접 만들기'
    | '4부 — 깊은 학습'
    | '5부 — 분류를 넘어 생성으로'
    | '6부 — 언어를 다루는 신경망';
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
  { id: 'p15', num: '15', title: '텍스트가 숫자가 되기까지', subtitle: '인코딩 입문 — ASCII와 유니코드', group: '6부 — 언어를 다루는 신경망' },
  { id: 'p16', num: '16', title: '토큰',                     subtitle: '단어보다 작고 글자보다 큰 조각', group: '6부 — 언어를 다루는 신경망' },
  { id: 'p17', num: '17', title: '원-핫에서 임베딩으로',     subtitle: '단어가 벡터가 되는 이유', group: '6부 — 언어를 다루는 신경망' },
  { id: 'p18', num: '18', title: 'Word2Vec 미니',            subtitle: '브라우저에서 직접 학습',  group: '6부 — 언어를 다루는 신경망' },
  { id: 'p19', num: '19', title: '시퀀스',                   subtitle: '순서가 의미를 만드는 순간', group: '6부 — 언어를 다루는 신경망' },
  { id: 'p20', num: '20', title: '어텐션',                   subtitle: '어디에 집중할지 정해보기', group: '6부 — 언어를 다루는 신경망' },
  { id: 'p21', num: '21', title: '멀티헤드 트랜스포머',      subtitle: '여러 시선과 한 블록의 흐름', group: '6부 — 언어를 다루는 신경망' },
  { id: 'p22', num: '22', title: 'GPT의 다음 토큰',          subtitle: '샘플링이 곧 창의성',      group: '6부 — 언어를 다루는 신경망' },
];

export const PHASE_GROUPS = Array.from(
  PHASES.reduce((m, p) => {
    if (!m.has(p.group)) m.set(p.group, []);
    m.get(p.group)!.push(p);
    return m;
  }, new Map<PhaseMeta['group'], PhaseMeta[]>())
);

// 5부(생성)는 4부(p11+p12)를 모두 끝내고 포털을 통해 들어와야 보이는 히든 스테이지
export const BONUS_GROUP: PhaseMeta['group'] = '5부 — 분류를 넘어 생성으로';
export const BONUS_PHASE_IDS: PhaseId[] = ['p13', 'p14'];

export function isBonusGroup(group: PhaseMeta['group']) {
  return group === BONUS_GROUP;
}

export function isBonusPhase(id: PhaseId) {
  return BONUS_PHASE_IDS.includes(id);
}

export function isPart4Done(completed: Record<PhaseId, boolean>) {
  return Boolean(completed.p11 && completed.p12);
}

// 6부(언어)는 5부(p13+p14)를 모두 끝낸 사람만 두 번째 포털로 들어올 수 있는 히든 스테이지
export const BONUS2_GROUP: PhaseMeta['group'] = '6부 — 언어를 다루는 신경망';
export const BONUS2_PHASE_IDS: PhaseId[] = ['p15', 'p16', 'p17', 'p18', 'p19', 'p20', 'p21', 'p22'];

export function isBonus2Group(group: PhaseMeta['group']) {
  return group === BONUS2_GROUP;
}

export function isBonus2Phase(id: PhaseId) {
  return BONUS2_PHASE_IDS.includes(id);
}

export function isPart5Done(completed: Record<PhaseId, boolean>) {
  return Boolean(completed.p13 && completed.p14);
}
