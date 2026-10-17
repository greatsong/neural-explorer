import type { SlideDef } from './slides';
import { OriginalPage } from './storyComponents';

// 원본 1~39장: 자기소개 인사말과 경력을 수정하고, 알파게놈 26장과 로봇 강아지 30~34장은 제외한다.
const pages = [
  {
    "page": 1,
    "video": null,
    "notes": "당곡고등학교  교사 송석리 (greatsong21@gmail.com) AI 시대의  지피 지기"
  },
  {
    "page": 2,
    "video": null,
    "notes": "안녕하세요 여러분 !  만나서 반갑습니다 !   :) [ 경력 ] 2005 – 2015  선린인터넷고 교사 2016 – 2020  한성과학고 교사 2021 – 2025  서울고 교사 2020 – 2026.8. 서울대 사범대학 강사 2020 –   현재  서울대 평생교육원   강사 2026 –   현재   당곡고  교사 2019 ‘ 모두의 데이터분석  with  파이썬 ’( 길벗 ) 2019 ‘ 인공지능과 미래사회 ’  교과서 집필진 ( 서울교육청 ) 2020 ‘ 인공지능 수학 ’  교육과정 연구원 (2015  개정 교육과정 ) 2022 ‘ 데이터 과학 ’  교육과정 연구원 (2022  개정 교육과정 ) 2024 ‘ 최소한의 데이터  리터러시 ’( 길벗 ) 2025  선생님을 위한 업무 자동화 ( 골든래빗 ) 2025  Vpython 으로 시작하는 융합 시뮬레이션 수업 ( 길벗 )"
  },
  {
    "page": 3,
    "video": null,
    "notes": ""
  },
  {
    "page": 4,
    "video": null,
    "notes": ""
  },
  {
    "page": 5,
    "video": null,
    "notes": "#0.   10 년 후의 세상을 예측할 수 있을까 ?"
  },
  {
    "page": 6,
    "video": null,
    "notes": "*  출처  : JTBC  차이나는  클라스 ( 사진 ,  닐  거센필드 )"
  },
  {
    "page": 7,
    "video": null,
    "notes": "*  출처  : JTBC  차이나는  클라스 ( 사진 ,  닐  거센필드 )"
  },
  {
    "page": 8,
    "video": null,
    "notes": ""
  },
  {
    "page": 9,
    "video": null,
    "notes": ""
  },
  {
    "page": 10,
    "video": null,
    "notes": "#1.  우리가 알지만 ,  모르는 인공지능의 역사"
  },
  {
    "page": 11,
    "video": null,
    "notes": ""
  },
  {
    "page": 12,
    "video": "../lee-sedol.mp4",
    "notes": ""
  },
  {
    "page": 13,
    "video": null,
    "notes": "지피 지기 백전불태 ( 知彼 知己 百戰不殆)"
  },
  {
    "page": 14,
    "video": null,
    "notes": "데미스   하사비스는  어린 시절부터 체스와 컴퓨터에 뛰어난 재능을 보였다. 10대 초반부터 인공지능에 관심을 가졌고, 17세에는 세계적으로 성공한 경영 시뮬레이션 게임 《 Theme   Park 》 개발에 참여했다.  이후 케임브리지대학교에서 컴퓨터과학을 공부한 그는 《Black &  White》의  리드 AI 프로그래머가 되었다. 이 게임에서는 생명체가 플레이어의 행동을 관찰하고 반응하도록 만드는 것이 중요한 요소였다.  하사비스는  게임을 단순한 오락이 아니라,  AI가  배우고 행동하는 방법을 시험할 수 있는 실험장으로 보았다. 20대에는 자신의 게임 회사를 세우고 《Republic: The  Revolution》을  개발했다.  목표는 무려 100만 명의 가상 시민이 저마다 다른 성향과 행동을 보이는 하나의 국가를 컴퓨터 안에 만드는 것이었다. 하지만  하사비스의  관심은 점점 더 근본적인 질문으로 향했다. “인간의 지능은 어떻게 작동할까?” 그는 게임 개발을 떠나  UCL에서  인지신경과학을 연구했다. 사람이 과거를 기억하고 미래를 상상할 때 뇌가 어떻게 작동하는지를 연구했고, 이 연구는 과학계에서도 큰 주목을 받았다. 그리고 2010년,  하사비스는  게임, 컴퓨터과학, 뇌과학에서 얻은 경험을 모아 동료들과  딥마인드 ( DeepMind ) 를  설립했다. 하사비스는   딥마인드를  세울 당시에 다음과 같은 계획을 세웠다고 한다 . 데미스 하사비스 “1단계: 지능을 푼다. 2단계: 그것으로 다른 모든 문제를 푼다.”"
  },
  {
    "page": 15,
    "video": null,
    "notes": "#2.  인공지능과 미래 , 데미스   하사비스   KAIST  강연"
  },
  {
    "page": 16,
    "video": "../hassabis.mp4",
    "notes": ""
  },
  {
    "page": 17,
    "video": null,
    "notes": "[  AI, 크고 많고 복잡한 문제를 해결하는 메타 솔루션  ]"
  },
  {
    "page": 18,
    "video": null,
    "notes": "[  Deep, Mind  ]"
  },
  {
    "page": 19,
    "video": null,
    "notes": "[  Deep, Mind  ]"
  },
  {
    "page": 20,
    "video": null,
    "notes": "#3.   2024,  인공지능의 보조를 받는 과학"
  },
  {
    "page": 21,
    "video": null,
    "notes": "[  딥마인드의 현재(AI 기반 과학 연구)  ]"
  },
  {
    "page": 22,
    "video": null,
    "notes": "[  딥마인드의 현재(AI 기반 과학 연구)  ]"
  },
  {
    "page": 23,
    "video": null,
    "notes": "[  딥마인드의 현재(AI 기반 과학 연구)  ]"
  },
  {
    "page": 24,
    "video": null,
    "notes": "[  딥마인드의 현재(AI 기반 과학 연구)  ]"
  },
  {
    "page": 25,
    "video": null,
    "notes": "[  딥마인드의 현재(AI 기반 과학 연구)  ] *  출처  :  이지현 기자, 2022.8.3., 한국경제, 2억개 모든 생물 단백질 구조… 이세돌  꺾은 ' 알파고'가  밝혔다"
  },
  {
    "page": 27,
    "video": null,
    "notes": "[  딥마인드의 현재(AI 기반 과학 연구)  ] 알파게놈의 확인 결과와 가능성 확인된 결과 변이 효과 예측 평가 26개 중 25개에서 기존 최고 모델과 같거나 더 나은 성능으로 확인됨 뇌전증과 관련된 DNM1 유전자 변이에 대한 예측이 실험으로 확인됨 영국 바이오뱅크 54,000명의 자료에서 단백질을 만들지 않는 DNA 영역의 유전적 연관을 22% 더 찾아냄 가능성 희귀질환 원인 변이 찾기 흔한 질병 관련 DNA 글자 좁히기 신약 개발 치료 표적 찾기 한계   예측값이며 병원 진단용으로 검증·승인되지 않음 * 출처 : Avsec 외, Nature, 2026.1. / Google DeepMind, 2026.9.8. / 이미지 : Google DeepMind"
  },
  {
    "page": 28,
    "video": null,
    "notes": "[  딥마인드의 꿈(2016, 데미스 하사비스 카이스트 강연)  ]"
  },
  {
    "page": 29,
    "video": null,
    "notes": ""
  },
  {
    "page": 35,
    "video": null,
    "notes": "지피 지기 백전불태 ( 知彼 知己 百戰不殆)"
  },
  {
    "page": 36,
    "video": null,
    "notes": "지천지지  승내가전 ( 知天知地  勝乃可全)"
  },
  {
    "page": 37,
    "video": null,
    "notes": "AI타임스 2026-10-17 'MS, 정식 출시 앞서 2.8조 매개변수 모델 공개'(MAI-베이스-2). 2026-10-17 딥시크 기사에서 교체."
  },
  {
    "page": 38,
    "video": null,
    "notes": "같은 기사 본문. 매개변수 2조 8000억 개 = 2,800B. 끝-1의 3B와 비교."
  },
  {
    "page": 39,
    "video": null,
    "notes": ""
  }
];

export const OPENING_SLIDES: SlideDef[] = pages.map(({ page, video, notes }) => ({
  id: `source-${page}`, section: 'opening', sourcePage: page, title: '', steps: page === 14 ? 2 : 0,
  component: ({ step }) => <OriginalPage page={page} video={video ?? undefined} step={step}/>,
  notes: [`원본: 세종특강(260923)_새디자인 v2.pptx ${page}장`, ...(notes ? [notes] : [])],
}));
