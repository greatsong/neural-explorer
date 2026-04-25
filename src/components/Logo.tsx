// 미니 뉴럴넷 로고 — 3-4-2 레이어 도식
export function Logo({ size = 24 }: { size?: number }) {
  const accent = 'rgb(var(--color-accent))';
  const muted = 'rgb(var(--color-border))';
  const layers: { x: number; nodes: number[] }[] = [
    { x: 6, nodes: [8, 16, 24] },
    { x: 16, nodes: [6, 13, 19, 26] },
    { x: 26, nodes: [12, 20] },
  ];
  // edges
  const edges: [number, number, number, number][] = [];
  for (let l = 0; l < layers.length - 1; l++) {
    for (const a of layers[l].nodes) {
      for (const b of layers[l + 1].nodes) {
        edges.push([layers[l].x, a, layers[l + 1].x, b]);
      }
    }
  }
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-label="Neural Explorer">
      {edges.map(([x1, y1, x2, y2], i) => (
        <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={muted} strokeWidth={0.8} />
      ))}
      {layers.flatMap((layer) =>
        layer.nodes.map((y) => (
          <circle key={`${layer.x}-${y}`} cx={layer.x} cy={y} r={2.2} fill={accent} />
        ))
      )}
    </svg>
  );
}
