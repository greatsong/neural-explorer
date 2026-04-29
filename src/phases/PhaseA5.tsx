// PhaseA5 — 전체 흐름 완성 (Phase5 탭1 + 탭4)
// 후속 단계에서 서브에이전트가 채울 예정
import { PHASES } from '../phases';

export function PhaseA5() {
  const meta = PHASES.find((p) => p.id === 'a5')!;
  return (
    <article>
      <div className="text-xs font-mono text-muted">PHASE {meta.num}</div>
      <h1>{meta.title}</h1>
      <p className="text-muted mt-2">{meta.subtitle}</p>
      <div className="aside-note mt-6">
        <div className="font-medium">🚧 채워질 예정</div>
        <p className="mt-1 text-sm">예측 → 오차 → 기울기 → 갱신 한 묶음. 직관 리플레이 → 종합 식 카드 단계 전환.</p>
      </div>
    </article>
  );
}
