// PhaseA2 — 오차와 MSE (Phase3 앞부분)
// 후속 단계에서 서브에이전트가 채울 예정
import { PHASES } from '../phases';

export function PhaseA2() {
  const meta = PHASES.find((p) => p.id === 'a2')!;
  return (
    <article>
      <div className="text-xs font-mono text-muted">PHASE {meta.num}</div>
      <h1>{meta.title}</h1>
      <p className="text-muted mt-2">{meta.subtitle}</p>
      <div className="aside-note mt-6">
        <div className="font-medium">🚧 채워질 예정</div>
        <p className="mt-1 text-sm">예측값 ŷ과 정답 y의 차이, 오차 제곱, 평균 제곱 오차(MSE)를 다룹니다.</p>
      </div>
    </article>
  );
}
