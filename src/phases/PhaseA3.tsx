// PhaseA3 — 경사하강법 (Phase3 뒷부분 + Phase4 흡수)
// 후속 단계에서 서브에이전트가 채울 예정
import { PHASES } from '../phases';

export function PhaseA3() {
  const meta = PHASES.find((p) => p.id === 'a3')!;
  return (
    <article>
      <div className="text-xs font-mono text-muted">PHASE {meta.num}</div>
      <h1>{meta.title}</h1>
      <p className="text-muted mt-2">{meta.subtitle}</p>
      <div className="aside-note mt-6">
        <div className="font-medium">🚧 채워질 예정</div>
        <p className="mt-1 text-sm">손실이 줄어드는 방향 + 보폭 η. 발산/진동/수렴/느림 비교 시각화 포함.</p>
      </div>
    </article>
  );
}
