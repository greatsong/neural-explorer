// PhaseA6 — 기온 예측 프로젝트 (Phase5 탭5)
// 후속 단계에서 서브에이전트가 채울 예정
import { PHASES } from '../phases';

export function PhaseA6() {
  const meta = PHASES.find((p) => p.id === 'a6')!;
  return (
    <article>
      <div className="text-xs font-mono text-muted">PHASE {meta.num}</div>
      <h1>{meta.title}</h1>
      <p className="text-muted mt-2">{meta.subtitle}</p>
      <div className="aside-note mt-6">
        <div className="font-medium">🚧 채워질 예정</div>
        <p className="mt-1 text-sm">인공 뉴런 1개로 서울 기온 회귀. 연도 offset/스케일링은 짧게 설명.</p>
      </div>
    </article>
  );
}
