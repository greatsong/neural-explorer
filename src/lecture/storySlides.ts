import type { SlideDef } from './slides';
import { FutureBook, CareerList, ClosingMessage } from './storyComponents';

const source = '원본: 세종특강(260923)_새디자인 v2.pptx';
export const CLOSING_SLIDES: SlideDef[] = [
  { id: 'future-book', section: 'future', title: '먼저 온 미래', steps: 0, component: FutureBook, notes: [source + ' 65장의 원본 이미지를 보존. 도입의 이세돌 인터뷰와 연결한다.'] },
  { id: 'career-list', section: 'future', title: '직업의 미래, 우리는 무엇을 준비할까?', steps: 1, component: CareerList, notes: [source + ' 67장의 원본 이미지. 출처: 한국고용정보원, 2016.03.24. 현재의 직업 추천으로 단정하지 않는다. 학생이 관심 있는 분야에서 무엇을 만들고 싶은지 묻는다.'] },
  { id: 'closing-message', section: 'future', title: '', steps: 0, fullBleed: true, component: ClosingMessage, notes: ['처음의 아톰과 비트 이야기를 다시 연결하며 요청한 응원 메시지로 마무리한다.'] },
];
