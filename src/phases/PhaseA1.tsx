// PhaseA1 — 인공 뉴런의 예측 (Phase1 + Phase2 통합)
// 후속 단계에서 서브에이전트가 채울 예정
import { PHASES } from '../phases';

export function PhaseA1() {
  const meta = PHASES.find((p) => p.id === 'a1')!;
  return (
    <article>
      <div className="text-xs font-mono text-muted">PHASE {meta.num}</div>
      <h1>{meta.title}</h1>
      <p className="text-muted mt-2">{meta.subtitle}</p>
      <div className="aside-note mt-6">
        <div className="font-medium">🚧 채워질 예정</div>
        <p className="mt-1 text-sm">기존 Phase1(뉴런 해부)과 Phase2(순전파 퀴즈)를 통합한 새 페이즈가 들어옵니다.</p>
      </div>
    </article>
  );
}
