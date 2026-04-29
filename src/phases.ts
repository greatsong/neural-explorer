// visible 커리큘럼 — A(알고리즘) / B(데이터·학습·분류) / C(딥러닝)
// 히든 스테이지 — 5부(p13, p14) / 6부(p15~p22) 는 그대로 유지한다.
export type PhaseId =
  | 'a1' | 'a2' | 'a3' | 'a4' | 'a5' | 'a6'
  | 'b1' | 'b2' | 'b3' | 'b4'
  | 'c1' | 'c2'
  | 'p13' | 'p14'
  | 'p15' | 'p16' | 'p17' | 'p18' | 'p19' | 'p20' | 'p21' | 'p22';

export interface PhaseMeta {
  id: PhaseId;
  num: string;
  title: string;
  subtitle: string;
  group:
    | 'A. 알고리즘의 이해'
    | 'B. 데이터·학습·분류 출력'
    | 'C. 딥러닝'
    | '5부 — 분류를 넘어 생성으로'
    | '6부 — 언어를 다루는 신경망';
}

export const PHASES: PhaseMeta[] = [
  // A. 알고리즘의 이해 — 예측 → 오차 → 기울기 → 갱신 → 한 바퀴 → 실생활
  { id: 'a1', num: 'A1', title: '인공 뉴런의 예측',  subtitle: '부품 → 곱·합·활성화 → 예측값',          group: 'A. 알고리즘의 이해' },
  { id: 'a2', num: 'A2', title: '오차와 MSE',        subtitle: '예측 − 정답, 그리고 평균 제곱',         group: 'A. 알고리즘의 이해' },
  { id: 'a3', num: 'A3', title: '경사하강법',         subtitle: '손실이 줄어드는 방향 + 보폭 η',         group: 'A. 알고리즘의 이해' },
  { id: 'a4', num: 'A4', title: '기울기 계산하기',    subtitle: 'e·x 모양 + 표본 평균',                  group: 'A. 알고리즘의 이해' },
  { id: 'a5', num: 'A5', title: '전체 흐름 완성',     subtitle: '예측 → 오차 → 기울기 → 갱신 한 묶음',   group: 'A. 알고리즘의 이해' },
  { id: 'a6', num: 'A6', title: '기온 예측 프로젝트', subtitle: '인공 뉴런 1개로 서울 기온 회귀',         group: 'A. 알고리즘의 이해' },

  // B. 데이터 수집·학습·분류 출력 — 도트 데이터 하나로 통일
  { id: 'b1', num: 'B1', title: '문제 정의와 라벨',         subtitle: '동그라미 vs 세모, 입력·특징·정답',     group: 'B. 데이터·학습·분류 출력' },
  { id: 'b2', num: 'B2', title: '데이터셋과 전처리',        subtitle: '기본 데이터 + 정제할 샘플 찾기',       group: 'B. 데이터·학습·분류 출력' },
  { id: 'b3', num: 'B3', title: '학습 / 평가 데이터 나누기', subtitle: '왜 나눠야 하는가',                     group: 'B. 데이터·학습·분류 출력' },
  { id: 'b4', num: 'B4', title: '이진 분류 모델 학습',      subtitle: '동그라미 vs 세모, 시그모이드 출력 1개', group: 'B. 데이터·학습·분류 출력' },

  // C. 딥러닝 — 심층 신경망이 문제를 어떻게 해결하는지 이해하기
  { id: 'c1', num: 'C1', title: '역전파 알고리즘의 이해', subtitle: '깊은 망의 가중치는 거꾸로 흘러 갱신된다', group: 'C. 딥러닝' },
  { id: 'c2', num: 'C2', title: 'MNIST 도전',             subtitle: '진짜 손글씨 데이터에 깊은 망 적용',       group: 'C. 딥러닝' },

  // 히든 스테이지 — 5부 (포털 진입 필요)
  { id: 'p13', num: '13', title: '평균과 분포', subtitle: '가장 단순한 생성 모델',     group: '5부 — 분류를 넘어 생성으로' },
  { id: 'p14', num: '14', title: '오토인코더',  subtitle: '잠재 공간으로 그림 만들기', group: '5부 — 분류를 넘어 생성으로' },

  // 히든 스테이지 — 6부 (포털 진입 필요)
  { id: 'p15', num: '15', title: '텍스트가 숫자가 되기까지', subtitle: '인코딩 입문 — ASCII와 유니코드',         group: '6부 — 언어를 다루는 신경망' },
  { id: 'p16', num: '16', title: '토큰',                     subtitle: '단어보다 작고 글자보다 큰 조각',         group: '6부 — 언어를 다루는 신경망' },
  { id: 'p17', num: '17', title: '원-핫에서 임베딩으로',     subtitle: '단어가 벡터가 되는 이유',                group: '6부 — 언어를 다루는 신경망' },
  { id: 'p18', num: '18', title: 'Word2Vec 미니',            subtitle: '브라우저에서 직접 학습',                 group: '6부 — 언어를 다루는 신경망' },
  { id: 'p19', num: '19', title: '시퀀스',                   subtitle: '순서가 의미를 만드는 순간',              group: '6부 — 언어를 다루는 신경망' },
  { id: 'p20', num: '20', title: '어텐션',                   subtitle: '어디에 집중할지 정해보기',               group: '6부 — 언어를 다루는 신경망' },
  { id: 'p21', num: '21', title: '멀티헤드 트랜스포머',      subtitle: '여러 시선과 한 블록의 흐름',             group: '6부 — 언어를 다루는 신경망' },
  { id: 'p22', num: '22', title: 'GPT의 다음 토큰',          subtitle: '샘플링이 곧 창의성',                     group: '6부 — 언어를 다루는 신경망' },
];

export const PHASE_GROUPS = Array.from(
  PHASES.reduce((m, p) => {
    if (!m.has(p.group)) m.set(p.group, []);
    m.get(p.group)!.push(p);
    return m;
  }, new Map<PhaseMeta['group'], PhaseMeta[]>())
);

// 5부(생성)는 visible 커리큘럼(C3+C4)을 모두 끝내고 포털을 통해 들어와야 보이는 히든 스테이지
export const BONUS_GROUP: PhaseMeta['group'] = '5부 — 분류를 넘어 생성으로';
export const BONUS_PHASE_IDS: PhaseId[] = ['p13', 'p14'];

export function isBonusGroup(group: PhaseMeta['group']) {
  return group === BONUS_GROUP;
}

export function isBonusPhase(id: PhaseId) {
  return BONUS_PHASE_IDS.includes(id);
}

// visible 커리큘럼(C 영역 마지막 두 페이즈) 완료 시 5부 포털 게이트가 열린다
export function isVisibleCurriculumDone(completed: Record<PhaseId, boolean>) {
  return Boolean(completed.c1 && completed.c2);
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

// visible 커리큘럼 ID 셋 — 라우팅·게이트에서 자주 쓴다
export const VISIBLE_PHASE_IDS: PhaseId[] = [
  'a1', 'a2', 'a3', 'a4', 'a5', 'a6',
  'b1', 'b2', 'b3', 'b4',
  'c1', 'c2',
];
