// PhaseMnistIntro — MNIST 데이터셋 소개 (새 C1)
// 다음 턴에 본격 콘텐츠 (왜 손글씨 숫자 분류가 의미 있는가, 데이터셋 구성, 28×28 그레이스케일,
//                         훈련/평가 분할, 70 년 역사 등) 가 들어갈 자리. 우선 라우팅이 살아나도록 가벼운 골격만.

import { useEffect } from 'react';
import { useApp } from '../store';
import { PHASES } from '../phases';

export function PhaseMnistIntro() {
  const meta = PHASES.find((p) => p.id === 'c1')!;
  const markCompleted = useApp((s) => s.markCompleted);
  // 임시: 페이지 진입만으로 완료 처리(다음 턴에 학습 활동 추가 시 변경)
  useEffect(() => { markCompleted('c1'); }, [markCompleted]);

  return (
    <article>
      <div className="text-xs font-mono text-muted">PHASE {meta.num}</div>
      <h1>{meta.title}</h1>
      <p className="text-muted mt-2">
        다음 단계(C2) 의 손글씨 숫자 분류에 들어가기 전에, MNIST 데이터셋이 어떤 자료이고 왜 머신러닝의 표준
        벤치마크가 되었는지 짧게 살펴봅니다.
      </p>

      <div className="aside-tip mt-4">
        이 페이지의 본격 설명 콘텐츠는 곧 채워집니다. 우선 다음 단계(C2 — MNIST 도전)로 진입할 수 있게 골격만
        잡아 둔 상태예요.
      </div>
    </article>
  );
}
