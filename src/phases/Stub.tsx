import { PHASES } from '../phases';
import type { PhaseId } from '../phases';

export function Stub({ id }: { id: PhaseId }) {
  const meta = PHASES.find((p) => p.id === id)!;
  return (
    <article>
      <div className="text-xs font-mono text-muted">PHASE {meta.num}</div>
      <h1>{meta.title}</h1>
      <p className="text-muted mt-2">{meta.subtitle}</p>

      <div className="aside-note mt-6">
        <div className="font-medium">🚧 작업 중인 페이즈</div>
        <p className="mt-1 text-sm">
          이 페이즈는 다음 사이클에서 구현될 예정이에요. 페이즈 1~5는 모두 동작합니다.
        </p>
      </div>

      <div className="card p-6 mt-6 text-sm space-y-2">
        <div className="font-semibold">예정 내용</div>
        <PreviewContent id={id} />
      </div>
    </article>
  );
}

function PreviewContent({ id }: { id: PhaseId }) {
  const previews: Record<PhaseId, string[]> = {
    p1: [], p2: [], p3: [], p4: [], p5: [], p5b: [], p5c: [],
    p6: [
      '시나리오 선택: 정시(수능 점수) / 학종(역량 점수)',
      '학생 카드 10명 + 가중치 슬라이더 4개 + 합격 컷 슬라이더',
      '8/10 이상 맞히면 통과',
    ],
    p7: [
      '데이터를 40명으로 확장 → 같은 슬라이더로 다시 조정',
      '학습/시험 정확도 비교 표 자동 생성',
      'SNS 스타일 합불 통지서로 가상 인물 예측',
    ],
    p8: ['혼동 행렬과 정확도 개념'],
    p9: [
      '코로나·암 시나리오로 정확도의 함정 체험',
      '정밀도(precision)와 재현율(recall) 임계값 슬라이더',
    ],
    p10: [
      '8×8 도트 캔버스에 직접 그리기',
      '오픈소스 갤러리(neural-explorer-gallery)로 공유',
      'CC-BY 4.0 라이선스, 닉네임 선택',
    ],
    p11: [
      '단계 A (2종) → 단계 B (3종) → 단계 C (10종)',
      '은닉 뉴런 슬라이더로 신경망 크기 직접 조정',
      '파라미터 수 실시간 계산식',
    ],
    p12: [
      'MNIST 100~300장으로 최종 학습',
      '학생이 직접 손으로 그린 숫자 테스트',
      'ChatGPT/뇌 시냅스 규모와 비교',
    ],
    p13: [],
    p14: [],
    p15: [],
    p16: [
      'GPT 토크나이저 스타일로 문장 잘라보기',
      'BPE: 자주 함께 등장하는 글자 쌍 합치기',
      '한글이 영어보다 더 잘게 쪼개지는 이유',
    ],
    p17: [
      '원-핫 표현의 한계 (큰 차원, 0 유사도)',
      '학습되는 임베딩 행렬 직접 만지기',
      'cos 유사도로 단어 거리 측정',
    ],
    p18: [
      '작은 영/한 코퍼스로 skip-gram 학습',
      'PCA로 2D 투영, 벡터 산수 인터랙션',
    ],
    p19: [
      '"I love you" vs "you love I"',
      '평균 임베딩의 한계와 RNN 직관',
    ],
    p20: [
      'softmax(QKᵀ/√d)V를 슬라이더로 단순화',
      '단어 간 어텐션 행렬 직접 만지기',
    ],
    p21: [
      '4개 헤드의 attention map 비교',
      '어텐션 + FFN + 잔차 + 정규화 흐름',
      '1층 vs 6층 비교',
    ],
    p22: [
      '어휘 분포 top-k 시각화',
      'temperature / top-k / top-p 슬라이더',
      '자기회귀 생성 한 토큰씩 진행',
    ],
  };
  return (
    <ul className="list-disc pl-5 space-y-1 text-muted">
      {previews[id].map((t, i) => <li key={i}>{t}</li>)}
    </ul>
  );
}
