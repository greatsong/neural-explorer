import { PHASES } from '../phases';
import type { PhaseId } from '../phases';

const PREVIEWS: Partial<Record<PhaseId, string[]>> = {
  b1: [
    '도트 그림 분류 — 입력 8×8=64 픽셀, 라벨 동그라미/세모',
    '회귀(A6) → 분류(B)로 질문이 바뀌는 지점',
  ],
  b2: [
    '기본 데이터셋 + 라벨 오류·애매한 그림·노이즈 정제',
    '전처리 전/후 학습 결과 비교 (시드 고정)',
  ],
  b3: [
    'train/eval split + 평가 데이터 위생 경고',
    '"평가 데이터를 보고 모델 구조를 고치면 부정행위"',
  ],
  b4: [
    '동그라미 vs 세모 — 출력 뉴런 2개',
    'epoch 한 줄 직관',
  ],
  b5: [
    '동그라미·세모·네모 — 출력 뉴런 3개 + softmax',
    'z 슬라이더 경쟁 막대 + 시프트 불변 보너스',
  ],
  c1: ['평가 데이터로 일반화 확인 — 정확도 + 클래스별 오답 박스'],
  c2: ['학습엔 잘 맞고 평가에선 틀리는 상황 — 과적합 직관'],
  c3: ['은닉층·뉴런 수로 모델 복잡도 + 역전파 박스'],
  c4: ['MNIST — 입력 28×28, 출력 10뉴런 + softmax'],
};

export function Stub({ id }: { id: PhaseId }) {
  const meta = PHASES.find((p) => p.id === id)!;
  const previews = PREVIEWS[id] ?? [];
  return (
    <article>
      <div className="text-xs font-mono text-muted">PHASE {meta.num}</div>
      <h1>{meta.title}</h1>
      <p className="text-muted mt-2">{meta.subtitle}</p>

      <div className="aside-note mt-6">
        <div className="font-medium">🚧 작업 중인 페이즈</div>
        <p className="mt-1 text-sm">
          이 페이즈는 다음 사이클에서 구현될 예정이에요. A 영역(A1~A6)은 모두 동작합니다.
        </p>
      </div>

      {previews.length > 0 && (
        <div className="card p-6 mt-6 text-sm space-y-2">
          <div className="font-semibold">예정 내용</div>
          <ul className="list-disc pl-5 space-y-1 text-muted">
            {previews.map((t, i) => <li key={i}>{t}</li>)}
          </ul>
        </div>
      )}
    </article>
  );
}
