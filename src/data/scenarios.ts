// 시나리오 A (정시) / B (학종) — 학생 임의 데이터 (시드 고정)
// 점수는 1~10 단순화. 4변수 + 합격컷.

export interface Student {
  scores: number[];
  passed: boolean;
}

export interface Scenario {
  id: 'A' | 'B';
  name: string;
  emoji: string;
  description: string;
  variableNames: [string, string, string, string];
  variableHints: [string, string, string, string];
  trueWeights: [number, number, number, number]; // 학생에게 비공개
  trueCutoff: number;
  train: Student[];   // 10명
  extra: Student[];   // +30명
  test: Student[];    // 20명 (별도)
  studentNames: string[];
  links: { label: string; url: string }[];
}

import data from './admissions.json';

const NAMES = [
  '김민서','이지우','박서연','최도윤','정하준','강시우','조유진','윤서아','장이안','임채원',
  '한수아','오지호','신예진','권유찬','홍서영','문하늘','배준서','전다온','노수빈','송지호',
  '구해린','진민준','백서윤','류태민','남채아','심예준','우유나','곽지원','서태윤','함소율',
  '국주원','주하윤','단아인','계지유','감해성','은시현','도건우','두서후','기시아','태유나',
];

export const SCENARIO_A: Scenario = {
  id: 'A',
  name: '정시 (수능 위주)',
  emoji: '📊',
  description:
    '국어·수학·영어·탐구 점수의 가중치 비율이 비밀이에요. 합격자/불합격자 명단을 보고 비율을 추적해봐요.',
  variableNames: ['국어', '수학', '영어', '탐구'],
  variableHints: ['1~10점 환산', '1~10점 환산', '1~10점 환산', '1~10점 환산'],
  trueWeights: data.A.truth.trueW as [number, number, number, number],
  trueCutoff: data.A.truth.trueCutoff,
  train: data.A.train as Student[],
  extra: data.A.extra as Student[],
  test: data.A.test as Student[],
  studentNames: NAMES,
  links: [
    { label: '한국대학신문 입시 포털', url: 'https://news.unn.net/' },
    { label: '대학저널', url: 'https://www.dhnews.co.kr/' },
    { label: 'EBSi 대입 정보', url: 'https://www.ebsi.co.kr/' },
    { label: '진학사 입시정보', url: 'https://www.jinhak.com/' },
  ],
};

export const SCENARIO_B: Scenario = {
  id: 'B',
  name: '학종 (학생부 종합)',
  emoji: '📚',
  description:
    '학업·진로·공동체 역량과 면접 점수의 가중치가 비공개입니다. 합격자 패턴을 보고 평가 비율을 거꾸로 찾아봐요.',
  variableNames: ['학업역량', '진로역량', '공동체역량', '면접'],
  variableHints: ['1~10점', '1~10점', '1~10점', '1~10점'],
  trueWeights: data.B.truth.trueW as [number, number, number, number],
  trueCutoff: data.B.truth.trueCutoff,
  train: data.B.train as Student[],
  extra: data.B.extra as Student[],
  test: data.B.test as Student[],
  studentNames: NAMES,
  links: [
    { label: '대교협 학종 평가요소(2023)', url: 'https://www.kcue.or.kr/' },
    { label: 'EBSi 학종 안내', url: 'https://www.ebsi.co.kr/' },
    { label: '한국대학신문', url: 'https://news.unn.net/' },
  ],
};

export const SCENARIOS = { A: SCENARIO_A, B: SCENARIO_B };
