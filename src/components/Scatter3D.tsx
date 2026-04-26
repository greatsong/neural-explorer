import { useEffect, useMemo, useRef, useState } from 'react';

export interface Point3D {
  x: number;
  y: number;
  z: number;
  label?: string;
  color?: string;
  size?: number;
  highlight?: boolean;
}

interface Props {
  points: Point3D[];
  /** 선택적 — 두 점을 잇는 선 (예: 벡터 산수, 어텐션 화살표) */
  arrows?: { from: number; to: number; color?: string; label?: string }[];
  /** axis labels */
  axisLabels?: [string, string, string];
  width?: number;
  height?: number;
  /** 자동 회전 여부 (드래그하면 멈춤) */
  autoRotate?: boolean;
}

// 외부 라이브러리 없이 SVG만으로 그리는 3D 산포도. plotly와 비슷한 느낌의
// 회전 가능한 박스 + 격자 + 깊이 정렬된 점.
export function Scatter3D({
  points,
  arrows = [],
  axisLabels = ['x', 'y', 'z'],
  width = 480,
  height = 400,
  autoRotate = true,
}: Props) {
  const [yaw, setYaw] = useState(0.6);
  const [pitch, setPitch] = useState(0.35);
  const [dragging, setDragging] = useState(false);
  const [stoppedAuto, setStoppedAuto] = useState(false);
  const lastRef = useRef<{ x: number; y: number } | null>(null);

  // 자동 회전 — 사용자가 드래그하기 전까지만
  useEffect(() => {
    if (!autoRotate || stoppedAuto) return;
    let raf = 0;
    let last = performance.now();
    const tick = (t: number) => {
      const dt = (t - last) / 1000;
      last = t;
      setYaw((y) => y + dt * 0.25);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [autoRotate, stoppedAuto]);

  // 좌표 정규화 — 모든 점을 [-1, 1]로 맞추기
  const { centered, scaleData } = useMemo(() => {
    const xs = points.map((p) => p.x);
    const ys = points.map((p) => p.y);
    const zs = points.map((p) => p.z);
    const mid = (a: number[]) => (Math.min(...a) + Math.max(...a)) / 2;
    const span = (a: number[]) => Math.max(0.001, Math.max(...a) - Math.min(...a));
    const cx = mid(xs), cy = mid(ys), cz = mid(zs);
    const s = 2 / Math.max(span(xs), span(ys), span(zs));
    return {
      centered: points.map((p) => ({ ...p, x: (p.x - cx) * s, y: (p.y - cy) * s, z: (p.z - cz) * s })),
      scaleData: s,
    };
  }, [points]);

  void scaleData;

  const cx = width / 2;
  const cy = height / 2;
  const scale = Math.min(width, height) / 3.2;

  const project = (x: number, y: number, z: number) => {
    const sy = Math.sin(yaw), cyaw = Math.cos(yaw);
    const sp = Math.sin(pitch), cp = Math.cos(pitch);
    const x1 = x * cyaw - z * sy;
    const z1 = x * sy + z * cyaw;
    const y2 = y * cp - z1 * sp;
    const z2 = y * sp + z1 * cp;
    return { sx: cx + x1 * scale, sy: cy - y2 * scale, depth: z2 };
  };

  const projected = centered.map((p, i) => ({ ...p, idx: i, ...project(p.x, p.y, p.z) }));
  const ordered = [...projected].sort((a, b) => a.depth - b.depth);

  // 박스 모서리 (단위 큐브 [-1,1]^3)
  const corners: [number, number, number][] = [
    [-1,-1,-1],[1,-1,-1],[1,1,-1],[-1,1,-1],
    [-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1],
  ];
  const projCorners = corners.map(([x, y, z]) => project(x, y, z));
  const edges: [number, number][] = [
    [0,1],[1,2],[2,3],[3,0],
    [4,5],[5,6],[6,7],[7,4],
    [0,4],[1,5],[2,6],[3,7],
  ];

  // 바닥 격자 (y = -1 평면)
  const gridLines: { x1: number; y1: number; x2: number; y2: number }[] = [];
  const N = 4;
  for (let i = 0; i <= N; i++) {
    const t = -1 + (2 * i) / N;
    const a = project(t, -1, -1);
    const b = project(t, -1, 1);
    gridLines.push({ x1: a.sx, y1: a.sy, x2: b.sx, y2: b.sy });
    const c = project(-1, -1, t);
    const d = project(1, -1, t);
    gridLines.push({ x1: c.sx, y1: c.sy, x2: d.sx, y2: d.sy });
  }

  // 축 끝
  const ax = project(1.15, -1, -1);
  const ay = project(-1, 1.15, -1);
  const az = project(-1, -1, 1.15);
  const origin = project(-1, -1, -1);

  const onPointerDown = (e: React.PointerEvent) => {
    setDragging(true);
    setStoppedAuto(true);
    lastRef.current = { x: e.clientX, y: e.clientY };
    (e.target as Element).setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging || !lastRef.current) return;
    const dx = e.clientX - lastRef.current.x;
    const dy = e.clientY - lastRef.current.y;
    lastRef.current = { x: e.clientX, y: e.clientY };
    setYaw((v) => v + dx * 0.01);
    setPitch((v) => Math.max(-1.4, Math.min(1.4, v + dy * 0.01)));
  };
  const onPointerUp = () => {
    setDragging(false);
    lastRef.current = null;
  };

  return (
    <div className="select-none">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        width="100%"
        height={height}
        style={{ touchAction: 'none', cursor: dragging ? 'grabbing' : 'grab', background: 'rgba(15, 23, 42, 0.02)', borderRadius: 8 }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
      >
        {/* 바닥 격자 */}
        {gridLines.map((g, i) => (
          <line key={i} x1={g.x1} y1={g.y1} x2={g.x2} y2={g.y2} stroke="#94a3b8" strokeWidth={0.5} opacity={0.35} />
        ))}
        {/* 박스 모서리 */}
        {edges.map(([a, b], i) => (
          <line
            key={i}
            x1={projCorners[a].sx}
            y1={projCorners[a].sy}
            x2={projCorners[b].sx}
            y2={projCorners[b].sy}
            stroke="#94a3b8"
            strokeWidth={0.7}
            opacity={0.45}
          />
        ))}
        {/* 축 */}
        <line x1={origin.sx} y1={origin.sy} x2={ax.sx} y2={ax.sy} stroke="#ef4444" strokeWidth={1.5} />
        <line x1={origin.sx} y1={origin.sy} x2={ay.sx} y2={ay.sy} stroke="#22c55e" strokeWidth={1.5} />
        <line x1={origin.sx} y1={origin.sy} x2={az.sx} y2={az.sy} stroke="#3b82f6" strokeWidth={1.5} />
        <text x={ax.sx + 4} y={ax.sy} fontSize={11} fill="#ef4444">{axisLabels[0]}</text>
        <text x={ay.sx + 4} y={ay.sy} fontSize={11} fill="#22c55e">{axisLabels[1]}</text>
        <text x={az.sx + 4} y={az.sy} fontSize={11} fill="#3b82f6">{axisLabels[2]}</text>

        {/* 화살표 */}
        {arrows.map((arrow, i) => {
          const a = projected[arrow.from];
          const b = projected[arrow.to];
          if (!a || !b) return null;
          return (
            <line
              key={i}
              x1={a.sx}
              y1={a.sy}
              x2={b.sx}
              y2={b.sy}
              stroke={arrow.color ?? '#a855f7'}
              strokeWidth={1.5}
              opacity={0.7}
              strokeDasharray="4 3"
            />
          );
        })}

        {/* 점 — 깊이 순으로 그리기 */}
        {ordered.map((p) => {
          const r = (p.size ?? 6) * (1 + p.depth * 0.15);
          const fill = p.color ?? (p.highlight ? '#a855f7' : '#0ea5e9');
          return (
            <g key={p.idx}>
              <circle cx={p.sx} cy={p.sy} r={r + 2} fill={fill} opacity={0.18} />
              <circle cx={p.sx} cy={p.sy} r={r} fill={fill} stroke="#fff" strokeWidth={1.2} />
              {p.label && (
                <text x={p.sx + r + 3} y={p.sy + 3} fontSize={11} fill="rgb(var(--color-text))" style={{ paintOrder: 'stroke' }} stroke="rgb(var(--color-bg))" strokeWidth={2.5}>
                  {p.label}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      <div className="text-[11px] text-muted mt-1 text-center">
        드래그해서 회전 · 자동 회전은 처음 드래그할 때 멈춥니다
      </div>
    </div>
  );
}
