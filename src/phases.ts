// visible 커리큘럼 — A(회귀) / B(분류) / C(MNIST) / D(평가) / E(언어 신경망)
// E1~E4 의 ID는 기존 6부 컴포넌트(Phase15/17/18/22)를 재사용하기 위해 그대로 'p15/p17/p18/p22' 를 쓴다.
// 히든 스테이지 — 5부(p13, p14) / 6부 잔여(p16, p19, p20, p21) 는 그대로 유지한다.
export type PhaseId =
  | 'a1' | 'a2' | 'a3' | 'a4' | 'a5' | 'a6'
  | 'b1' | 'b2' | 'b3' | 'b4'
  | 'c1' | 'c2'
  | 'd1' | 'd2'
  | 'p15' | 'p17' | 'p18' | 'p22'   // E1~E4 로 노출 (ID는 기존 컴포넌트 호환을 위해 유지)
  | 'e1'                              // 자기주도 심층 탐구 (사이드바 숨김, 인트로 카드)
  | 'p13' | 'p14'                     // 5부 — 생성 (히든)
  | 'p16' | 'p19' | 'p20' | 'p21';   // 6부 잔여 — 시퀀스·어텐션·트랜스포머 (히든)

export interface PhaseMeta {
  id: PhaseId;
  num: string;
  title: string;
  subtitle: string;
  group:
    | 'A. 단일 인공 뉴런의 학습'
    | 'B. 분류 문제 해결하기'
    | 'C. 딥러닝으로 손글씨 분류하기'
    | 'D. 모델을 어떻게 평가할까'
    | 'E. 언어를 다루는 신경망'
    | '자기주도 심층 탐구'
    | '5부 — 분류를 넘어 생성으로'
    | '6부 — 언어를 다루는 신경망';
}

export const PHASES: PhaseMeta[] = [
  // A. 단일 인공 뉴런의 학습 — 예측 → 오차 → 기울기 → 갱신 → 한 바퀴 → 실생활
  { id: 'a1', num: 'A1', title: '인공 뉴런의 예측',  subtitle: '부품 → 곱·합·활성화 → 예측값',          group: 'A. 단일 인공 뉴런의 학습' },
  { id: 'a2', num: 'A2', title: '오차와 MSE',        subtitle: '예측 − 정답, 그리고 평균 제곱',         group: 'A. 단일 인공 뉴런의 학습' },
  { id: 'a3', num: 'A3', title: '경사하강법',         subtitle: '손실이 줄어드는 방향 + 보폭 η',         group: 'A. 단일 인공 뉴런의 학습' },
  { id: 'a4', num: 'A4', title: '기울기 계산하기',    subtitle: 'e·x 모양 + 표본 평균',                  group: 'A. 단일 인공 뉴런의 학습' },
  { id: 'a5', num: 'A5', title: '전체 흐름 완성',     subtitle: '예측 → 오차 → 기울기 → 갱신 한 묶음',   group: 'A. 단일 인공 뉴런의 학습' },
  { id: 'a6', num: 'A6', title: '기온 예측 프로젝트', subtitle: '인공 뉴런 1개로 서울 기온 회귀',         group: 'A. 단일 인공 뉴런의 학습' },

  // B. 데이터 수집·학습·분류 출력 — 도트 데이터 하나로 통일
  { id: 'b1', num: 'B1', title: '문제 정의와 라벨',         subtitle: '세모 vs 네모, 입력·특징·정답',         group: 'B. 분류 문제 해결하기' },
  { id: 'b2', num: 'B2', title: '데이터셋과 전처리',        subtitle: '기본 데이터 + 정제할 샘플 찾기',       group: 'B. 분류 문제 해결하기' },
  { id: 'b3', num: 'B3', title: '학습 / 평가 데이터 나누기', subtitle: '왜 나눠야 하는가',                     group: 'B. 분류 문제 해결하기' },
  { id: 'b4', num: 'B4', title: '이진 분류 모델 학습',      subtitle: '세모 vs 네모, 시그모이드 출력 1개',     group: 'B. 분류 문제 해결하기' },

  // C. 딥러닝으로 손글씨 분류하기 — MNIST 데이터셋·문제 의미 소개(C1) → 실제 모델로 도전(C2)
  { id: 'c1', num: 'C1', title: 'MNIST 데이터셋 소개', subtitle: '왜 손글씨 숫자 분류가 의미 있는가',     group: 'C. 딥러닝으로 손글씨 분류하기' },
  { id: 'c2', num: 'C2', title: '미니 MNIST 도전',     subtitle: '실제 데이터 일부(300장)로 작은 모델을 직접 학습',     group: 'C. 딥러닝으로 손글씨 분류하기' },

  // D. 모델을 어떻게 평가할까 — 회귀/분류 평가 지표와 임계값
  { id: 'd1', num: 'D1', title: '회귀 평가',  subtitle: '잔차로 모델 실력 재기 — MAE·RMSE·R²',                       group: 'D. 모델을 어떻게 평가할까' },
  { id: 'd2', num: 'D2', title: '분류 평가',  subtitle: '시나리오마다 좋은 모델은 다르다 — 정확도·정밀도·재현율·F1·임계값', group: 'D. 모델을 어떻게 평가할까' },

  // E. 언어를 다루는 신경망 — 글자→숫자→좌표→다음 단어. 기존 Phase15/17/18/22 컴포넌트를 재사용.
  { id: 'p15', num: 'E1', title: '글자가 숫자가 되기까지', subtitle: '텍스트는 컴퓨터 안에서 정수의 묶음',                       group: 'E. 언어를 다루는 신경망' },
  { id: 'p17', num: 'E2', title: '단어를 좌표로',           subtitle: '학습된 가중치가 곧 좌표 — 의미가 가까우면 좌표도 가깝다',  group: 'E. 언어를 다루는 신경망' },
  { id: 'p18', num: 'E3', title: '의미가 가까운 단어 찾기',  subtitle: '브라우저에서 직접 학습하는 Word2Vec 미니',                 group: 'E. 언어를 다루는 신경망' },
  { id: 'p22', num: 'E4', title: '다음 단어 맞히기',         subtitle: 'LLM의 핵심 — 어휘 전체에 점수를 매기는 다중분류',          group: 'E. 언어를 다루는 신경망' },

  // 자기주도 심층 탐구 — 13 개 주제 카드. 학생이 골라 1~2주 탐구 후 발표.
  { id: 'e1', num: '★',  title: '주제 골라 탐구하기', subtitle: '13개 카드에서 한 가지 골라 깊이 파고들기', group: '자기주도 심층 탐구' },

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

// visible 커리큘럼(C 영역의 MNIST 도전, D 영역의 분류 평가, E 영역의 다음 단어 맞히기)을 모두 끝내면 5부 포털 게이트가 열린다
export function isVisibleCurriculumDone(completed: Record<PhaseId, boolean>) {
  return Boolean(completed.c2 && completed.d2 && completed.p22);
}

// 6부(시퀀스·어텐션·트랜스포머 — E 에서 노출 안 한 잔여)는 5부(p13+p14)를 모두 끝낸 사람만 두 번째 포털로 들어올 수 있는 히든 스테이지
export const BONUS2_GROUP: PhaseMeta['group'] = '6부 — 언어를 다루는 신경망';
export const BONUS2_PHASE_IDS: PhaseId[] = ['p16', 'p19', 'p20', 'p21'];

export function isBonus2Group(group: PhaseMeta['group']) {
  return group === BONUS2_GROUP;
}

// 사이드바에서만 숨기고 메인 페이지(Intro)에는 카드로 노출하는 그룹.
// 라우팅(#/e1 등)은 그대로 살아 있어 메인 카드에서 진입 가능.
const SIDEBAR_HIDDEN_GROUPS: PhaseMeta['group'][] = [
  '자기주도 심층 탐구',
];
export function isSidebarHiddenGroup(group: PhaseMeta['group']) {
  return SIDEBAR_HIDDEN_GROUPS.includes(group);
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
  'd1', 'd2',
  'p15', 'p17', 'p18', 'p22',  // E1~E4
  'e1',                         // 자기주도 탐구
];
