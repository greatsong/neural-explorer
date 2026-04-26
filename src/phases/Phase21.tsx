import { useEffect, useState } from 'react';
import { useApp } from '../store';

type Tab = 'multi' | 'block' | 'depth';

export function Phase21() {
  const [tab, setTab] = useState<Tab>('multi');
  const markCompleted = useApp((s) => s.markCompleted);

  useEffect(() => {
    if (tab === 'depth') markCompleted('p21');
  }, [tab, markCompleted]);

  return (
    <article>
      <div className="text-xs font-mono text-muted">PHASE 21</div>
      <h1>멀티헤드 트랜스포머 — 여러 시선과 한 블록의 흐름</h1>
      <p className="text-muted mt-2">
        한 어텐션은 한 가지 관계만 봐요. 그래서 트랜스포머는 <strong>여러 헤드</strong>를 두고
        각자 다른 관계를 동시에 보게 합니다. 그리고 어텐션·FFN·잔차·정규화를 합쳐 하나의 <strong>블록</strong>이 되고,
        이 블록을 여러 층 쌓으면 GPT가 됩니다.
      </p>

      <div className="flex gap-1 mt-6 border-b border-border">
        <TabBtn active={tab === 'multi'} onClick={() => setTab('multi')}>① 4개 헤드의 시선</TabBtn>
        <TabBtn active={tab === 'block'} onClick={() => setTab('block')}>② 트랜스포머 블록</TabBtn>
        <TabBtn active={tab === 'depth'} onClick={() => setTab('depth')}>③ 1층 vs 6층</TabBtn>
      </div>

      {tab === 'multi' && <MultiTab />}
      {tab === 'block' && <BlockTab />}
      {tab === 'depth' && <DepthTab />}
    </article>
  );
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick}
      className={`px-4 py-2 text-sm border-b-2 -mb-px transition ${
        active ? 'border-accent text-accent font-medium' : 'border-transparent text-muted hover:text-text'
      }`}
    >
      {children}
    </button>
  );
}

const SENT = ['철수가', '영희에게', '책을', '줬다'];

// 4개의 손수 만든 어텐션 행렬 — 각 헤드가 다른 관계를 본다는 데모
const HEADS: { title: string; desc: string; A: number[][] }[] = [
  {
    title: '주격 헤드',
    desc: '"줬다" → "철수가"가 누구인지 본다',
    A: [
      [0.7, 0.1, 0.1, 0.1],
      [0.2, 0.6, 0.1, 0.1],
      [0.1, 0.1, 0.7, 0.1],
      [0.6, 0.1, 0.1, 0.2],
    ],
  },
  {
    title: '대상 헤드',
    desc: '"줬다" → "영희에게"를 향한 화살',
    A: [
      [0.7, 0.1, 0.1, 0.1],
      [0.1, 0.6, 0.2, 0.1],
      [0.1, 0.1, 0.7, 0.1],
      [0.1, 0.6, 0.1, 0.2],
    ],
  },
  {
    title: '목적어 헤드',
    desc: '"줬다" → "책을"이 무엇인지 본다',
    A: [
      [0.7, 0.1, 0.1, 0.1],
      [0.1, 0.6, 0.2, 0.1],
      [0.2, 0.1, 0.6, 0.1],
      [0.1, 0.1, 0.7, 0.1],
    ],
  },
  {
    title: '전체 문장 헤드',
    desc: '모든 단어가 골고루 — 문맥 평균',
    A: [
      [0.4, 0.2, 0.2, 0.2],
      [0.2, 0.4, 0.2, 0.2],
      [0.2, 0.2, 0.4, 0.2],
      [0.25, 0.25, 0.25, 0.25],
    ],
  },
];

// ──────── 탭 1 ────────
function MultiTab() {
  return (
    <div className="mt-6 space-y-5">
      <div className="aside-tip">
        <div className="font-medium">🎯 한 헤드는 한 시선</div>
        <p className="text-sm mt-1">
          같은 문장이라도 헤드마다 보는 곳이 달라요. 어떤 헤드는 "누가"를 찾고, 다른 헤드는 "무엇을",
          또 다른 헤드는 "전체 분위기"를 봅니다. 모델은 이 시선들을 합쳐 풍부한 표현을 만들어요.
        </p>
      </div>

      <h2>예시: "철수가 영희에게 책을 줬다"</h2>
      <div className="grid sm:grid-cols-2 gap-3">
        {HEADS.map((h, i) => (
          <div key={i} className="card p-3">
            <div className="text-xs font-mono text-accent">HEAD {i + 1} · {h.title}</div>
            <div className="text-xs text-muted mb-2">{h.desc}</div>
            <AttentionMap A={h.A} />
          </div>
        ))}
      </div>
    </div>
  );
}

function AttentionMap({ A }: { A: number[][] }) {
  return (
    <div className="overflow-x-auto">
      <table className="text-xs">
        <thead>
          <tr>
            <th className="px-1.5 py-1"></th>
            {SENT.map((w, j) => (<th key={j} className="px-1.5 py-1 text-center text-muted font-normal">{w}</th>))}
          </tr>
        </thead>
        <tbody>
          {A.map((row, i) => (
            <tr key={i}>
              <td className="px-1.5 py-1 text-muted text-right">{SENT[i]}</td>
              {row.map((v, j) => (
                <td key={j} className="px-0.5 py-0.5">
                  <div
                    className="w-10 h-7 rounded text-[10px] flex items-center justify-center font-mono"
                    style={{ background: `rgba(168, 85, 247, ${v})`, color: v > 0.5 ? '#fff' : '#0f172a' }}
                  >
                    {v.toFixed(2)}
                  </div>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ──────── 탭 2 ────────
function BlockTab() {
  return (
    <div className="mt-6 space-y-5">
      <div className="aside-tip">
        <div className="font-medium">🎯 한 블록의 흐름</div>
        <p className="text-sm mt-1">
          (1) 멀티헤드 어텐션으로 단어들이 서로의 정보를 섞어요.
          (2) FFN으로 각 단어가 자기 안의 정보를 비선형으로 가공.
          (3) 잔차(residual)로 원본을 그대로 더해 학습이 안정.
          (4) 정규화로 값의 크기를 맞춰요. 이 네 단계를 한 블록이라고 부릅니다.
        </p>
      </div>

      <BlockDiagram />
    </div>
  );
}

function BlockDiagram() {
  // SVG로 데이터 흐름 그리기
  const W = 720, H = 460;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-3xl card p-3">
      {/* 입력 */}
      <Box x={W / 2 - 80} y={20} w={160} h={36} text="입력 임베딩 + 위치" fill="#bae6fd" stroke="#0ea5e9" />
      <Arrow x1={W / 2} y1={56} x2={W / 2} y2={90} />

      {/* 잔차 분기 */}
      <Box x={W / 2 - 80} y={90} w={160} h={36} text="LayerNorm" fill="#e0e7ff" stroke="#6366f1" />
      <Arrow x1={W / 2} y1={126} x2={W / 2} y2={150} />
      <Box x={W / 2 - 110} y={150} w={220} h={48} text="멀티헤드 어텐션" subtext="단어들이 서로 보기" fill="#fef3c7" stroke="#f59e0b" />
      <Arrow x1={W / 2} y1={198} x2={W / 2} y2={220} />

      {/* 잔차 더하기 */}
      <ResidualLine y1={70} y2={234} W={W} />
      <Box x={W / 2 - 30} y={220} w={60} h={28} text="+" fill="#fff" stroke="#94a3b8" />
      <Arrow x1={W / 2} y1={248} x2={W / 2} y2={272} />

      {/* 두 번째 sublayer */}
      <Box x={W / 2 - 80} y={272} w={160} h={32} text="LayerNorm" fill="#e0e7ff" stroke="#6366f1" />
      <Arrow x1={W / 2} y1={304} x2={W / 2} y2={324} />
      <Box x={W / 2 - 110} y={324} w={220} h={48} text="FFN (MLP)" subtext="단어 별로 비선형 가공" fill="#dcfce7" stroke="#16a34a" />
      <Arrow x1={W / 2} y1={372} x2={W / 2} y2={394} />

      <ResidualLine y1={258} y2={408} W={W} dashed />
      <Box x={W / 2 - 30} y={394} w={60} h={28} text="+" fill="#fff" stroke="#94a3b8" />
      <Arrow x1={W / 2} y1={422} x2={W / 2} y2={446} />

      <Box x={W / 2 - 80} y={420} w={160} h={28} text="블록 출력" fill="#fce7f3" stroke="#ec4899" />
    </svg>
  );
}

function Box({ x, y, w, h, text, subtext, fill, stroke }: {
  x: number; y: number; w: number; h: number;
  text: string; subtext?: string; fill: string; stroke: string;
}) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={6} fill={fill} stroke={stroke} strokeWidth={1.4} />
      <text x={x + w / 2} y={y + (subtext ? 18 : h / 2 + 4)} textAnchor="middle" fontSize={13} fontWeight={600}>{text}</text>
      {subtext && <text x={x + w / 2} y={y + h - 8} textAnchor="middle" fontSize={11} fill="#64748b">{subtext}</text>}
    </g>
  );
}

function Arrow({ x1, y1, x2, y2 }: { x1: number; y1: number; x2: number; y2: number }) {
  return (
    <g>
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#94a3b8" strokeWidth={1.4} />
      <polygon points={`${x2 - 4},${y2 - 6} ${x2 + 4},${y2 - 6} ${x2},${y2}`} fill="#94a3b8" />
    </g>
  );
}

function ResidualLine({ y1, y2, W, dashed }: { y1: number; y2: number; W: number; dashed?: boolean }) {
  const cx = W / 2;
  const off = 180;
  return (
    <g stroke="#a855f7" strokeWidth={1.6} fill="none" strokeDasharray={dashed ? '5 4' : undefined}>
      <line x1={cx} y1={y1} x2={cx + off} y2={y1} />
      <line x1={cx + off} y1={y1} x2={cx + off} y2={y2} />
      <line x1={cx + off} y1={y2} x2={cx + 30} y2={y2} />
      <text x={cx + off + 5} y={(y1 + y2) / 2} fontSize={10} fill="#a855f7" stroke="none">잔차</text>
    </g>
  );
}

// ──────── 탭 3 ────────
function DepthTab() {
  const [layers, setLayers] = useState(1);

  return (
    <div className="mt-6 space-y-5">
      <div className="aside-tip">
        <div className="font-medium">🎯 깊이 쌓을수록 무엇이 달라질까?</div>
        <p className="text-sm mt-1">
          한 블록은 한 번 단어 정보를 섞어요. 여섯 번 쌓으면, 그 결과를 또 섞고, 또 섞고… 합니다.
          그래서 깊은 층은 <strong>매우 추상적인 관계</strong>(주제, 어조, 의도)까지 잡아낼 수 있어요.
        </p>
      </div>

      <div className="card p-4">
        <label className="flex items-center gap-3 text-sm">
          층 수
          <input type="range" min={1} max={12} step={1} value={layers}
            onChange={(e) => setLayers(parseInt(e.target.value))} className="flex-1" />
          <code className="font-mono w-10 text-right">{layers}</code>
        </label>
        <p className="text-xs text-muted mt-2">
          GPT-2 small은 12층, GPT-3는 96층, 최신 모델은 더 깊어요.
        </p>
      </div>

      <DepthDiagram layers={layers} />

      <div className="grid sm:grid-cols-3 gap-3 text-sm">
        <DepthCard depth={1} title="얕은 층" desc="단어 사이 단순 관계 (수식 일치, 가까운 단어 묶기)" active={layers >= 1} />
        <DepthCard depth={3} title="중간 층" desc="문장 안의 의미 관계 (누가 무엇을 했는지)" active={layers >= 3} />
        <DepthCard depth={6} title="깊은 층" desc="문맥·의도·주제 같은 추상적 관계" active={layers >= 6} />
      </div>
    </div>
  );
}

function DepthDiagram({ layers }: { layers: number }) {
  const W = 560, H = 280;
  const blockH = (H - 60) / 12;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-2xl card p-2">
      {/* 단어 입력 */}
      <text x={W / 2} y={20} textAnchor="middle" fontSize={12} fill="#64748b">입력 토큰</text>
      {Array.from({ length: 12 }).map((_, i) => {
        const active = i < layers;
        const y = 30 + i * blockH;
        return (
          <g key={i} opacity={active ? 1 : 0.18}>
            <rect x={W / 2 - 80} y={y + 2} width={160} height={blockH - 4} rx={4}
              fill={hueAtDepth(i)} stroke="#94a3b8" />
            <text x={W / 2} y={y + blockH / 2 + 4} textAnchor="middle" fontSize={11} fontWeight={500}>블록 {i + 1}</text>
          </g>
        );
      })}
      <text x={W / 2} y={H - 8} textAnchor="middle" fontSize={12} fill="#64748b">출력 (다음 토큰 예측)</text>
    </svg>
  );
}

function hueAtDepth(d: number): string {
  // 얕음 → 깊음 점진 색
  const palette = ['#bae6fd', '#bbf7d0', '#fde68a', '#fdba74', '#fbcfe8', '#e9d5ff', '#fecaca', '#a5f3fc', '#bae6fd', '#bbf7d0', '#fde68a', '#fdba74'];
  return palette[d % palette.length];
}

function DepthCard({ depth, title, desc, active }: { depth: number; title: string; desc: string; active: boolean }) {
  return (
    <div className={`card p-3 transition ${active ? '' : 'opacity-40'}`}>
      <div className="text-xs font-mono text-accent">L≥{depth}</div>
      <div className="font-medium">{title}</div>
      <div className="text-xs text-muted mt-1">{desc}</div>
    </div>
  );
}
