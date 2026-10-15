import type { SlideDef } from './slides';
import { GraphBridge, GradSetup, WeightPattern } from './bridgeComponents';

export const GRAPH_BRIDGE: SlideDef = { id:'graph-bridge',section:'gd',tag:'4-A',title:'b를 바꾸면 손실도 바뀐다',formula:'ŷ = 2x + b',steps:12,component:GraphBridge,
  notes:['옆 칸 표는 활동지 3-2와 같은 형식입니다. b마다 시범 줄(x = 1)만 보이고 "나머지는?"에서 멈춘 뒤 공개합니다. 좌표를 보며 점마다 계산하게 합니다.','세 b의 결과(e = 2, −3, 0)를 본 뒤에 e = b − 1과 L = ½(b − 1)²을 규칙으로 말합니다. ½을 곱하는 이유는 55장에서 접선 위 두 점을 읽어 숫자로 확인합니다. 4-A에서는 미분을 쓰지 않고, dw·db의 식 유도는 4-B에서 한 번에 합니다.'] };
export const GRAD_SETUP: SlideDef = {id:'grad-setup',section:'grad',tag:'4-B',title:'이제 w와 b를 함께 고친다',steps:3,component:GradSetup,
  notes:['4B-1 실험(입력 둘)과 입력 하나 실험 다음에 오는 전환 장. 여기서부터 점 (3, 7) 하나, 입력 하나 모델로 간다.','4-B는 선형 모델로 명시한다. ReLU(0)의 미분을 1로 간주해서 유도하지 않는다.']};
export const WEIGHT_PATTERN: SlideDef = {id:'weight-pattern',section:'grad',title:'같은 0.5, 예측값은 얼마나 바뀔까?',steps:7,component:WeightPattern,
  notes:['규칙을 먼저 말하지 않는다. x = 1, 2, 3의 결과를 하나씩 공개하고 학생이 공통점을 말하게 한다.','x = 4의 답은 한 클릭 더 기다린다. 왜 2라고 예상했는지 듣고 식을 공개한다.','손실 변화는 일반적으로 x배라고 단정할 수 없다. 뒤에서 손실의 국소 변화율 e를 구해 x와 곱한다.']};
