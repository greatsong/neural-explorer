// PhaseA4 — 기울기 계산하기 (Phase5 탭2 + 탭3)
// 후속 단계에서 서브에이전트가 채울 예정
import { PHASES } from '../phases';

export function PhaseA4() {
  const meta = PHASES.find((p) => p.id === 'a4')!;
  return (
    <article>
      <div className="text-xs font-mono text-muted">PHASE {meta.num}</div>
      <h1>{meta.title}</h1>
      <p className="text-muted mt-2">{meta.subtitle}</p>
      <div className="aside-note mt-6">
        <div className="font-medium">🚧 채워질 예정</div>
        <p className="mt-1 text-sm">dw = 평균(e·x), db = 평균(e). 표와 짧은 유도로 보여줍니다.</p>
      </div>
    </article>
  );
}
