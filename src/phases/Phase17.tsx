import { useState } from 'react';
import { useApp } from '../store';
import { PHASES } from '../phases';
import { Scatter3D, type Point3D } from '../components/Scatter3D';
import { KO_PRETRAINED } from '../data/w2vPretrained';

// E3에서 학습된 한국어 Word2Vec의 가중치를 가져와, 6개 의미 묶음에서 두 단어씩 뽑아 본다.
// (E3 PRESETS와 같은 단어 풀로 통일 — 학생이 두 페이지를 자연스럽게 연결해 읽도록.)
const PICK: { word: string; group: GroupKey }[] = [
  { word: '왕',     group: 'royal' },
  { word: '여왕',   group: 'royal' },
  { word: '아빠',   group: 'family' },
  { word: '엄마',   group: 'family' },
  { word: '고양이', group: 'animal' },
  { word: '강아지', group: 'animal' },
  { word: '사과',   group: 'fruit' },
  { word: '바나나', group: 'fruit' },
  { word: '한국',   group: 'country' },
  { word: '일본',   group: 'country' },
  { word: '서울',   group: 'capital' },
  { word: '도쿄',   group: 'capital' },
];

type GroupKey = 'royal' | 'family' | 'animal' | 'fruit' | 'country' | 'capital';
const GROUP_COLORS: Record<GroupKey, string> = {
  royal:   '#a855f7',
  family:  '#ef4444',
  animal:  '#16a34a',
  fruit:   '#f59e0b',
  country: '#0d9488',
  capital: '#db2777',
};
const GROUP_LABELS: Record<GroupKey, string> = {
  royal: '왕족', family: '가족', animal: '동물', fruit: '과일', country: '나라', capital: '수도',
};

// 사전 학습 가중치에서 우리가 고른 단어의 벡터만 꺼내 둔다.
const ROWS: { word: string; group: GroupKey; vec: number[] }[] = PICK
  .map((p) => {
    const i = KO_PRETRAINED.vocab.indexOf(p.word);
    return i >= 0 ? { word: p.word, group: p.group, vec: KO_PRETRAINED.W[i] } : null;
  })
  .filter((x): x is { word: string; group: GroupKey; vec: number[] } => x !== null);

const FULL_DIM = KO_PRETRAINED.dim;     // 32
const PREVIEW_DIM = 6;                  // 가중치 표에 앞 6개만 보여주고 "…" 표시

type Tab = 'real' | 'play';

export function Phase17() {
  const meta = PHASES.find((p) => p.id === 'p17')!;
  const [tab, setTab] = useState<Tab>('real');
  const markCompleted = useApp((s) => s.markCompleted);

  return (
    <article>
      <div className="text-xs font-mono text-accent">{meta.num}</div>
      <h1>{meta.title} — 학습된 가중치가 곧 좌표</h1>
      <p className="text-muted mt-2">
        단어를 신경망에 넣으려면 <strong>벡터(숫자 묶음)</strong>가 되어야 해요. 그 벡터는 사람이 정해 주는 게 아니라
        <strong> 학습으로 자리 잡습니다</strong>. 다음 페이지(E3)에서 직접 학습할 그 가중치를, 여기서는
        이미 학습된 상태로 들여다보고 만져 봅니다.
      </p>

      <div className="flex gap-1 mt-6 border-b border-border">
        <TabBtn active={tab === 'real'} onClick={() => setTab('real')}>① 학습된 가중치 들여다보기</TabBtn>
        <TabBtn active={tab === 'play'} onClick={() => { setTab('play'); markCompleted('p17'); }}>② 직접 만져 보기</TabBtn>
      </div>

      {tab === 'real' && <RealTab />}
      {tab === 'play' && <PlayTab />}
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

// ──────── 탭 1 ─ 실제 학습된 가중치 ────────
function RealTab() {
  return (
    <div className="mt-6 space-y-5">
      <div className="aside-tip">
        <div className="font-medium">🎯 이 숫자들은 진짜 학습된 가중치</div>
        <p className="text-sm mt-1">
          다음 페이지(E3)에서 작은 신경망에 한국어 문장 30~40개를 학습시켰어요. 학습이 끝나면 단어마다
          <strong> {FULL_DIM}개의 숫자</strong>가 자리 잡습니다. 그 숫자들이 바로 그 단어의 <strong>좌표(임베딩)</strong>.
          여기서는 12개 단어를 골라 그 가중치를 그대로 가져왔어요.
        </p>
      </div>

      <h2>가중치 표 — 단어 × 차원</h2>
      <div className="card p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-surface text-muted">
            <tr>
              <th className="text-left px-3 py-2">단어</th>
              <th className="text-left px-2 py-2 text-xs">묶음</th>
              {Array.from({ length: PREVIEW_DIM }).map((_, i) => (
                <th key={i} className="text-center px-2 py-2 font-mono text-xs">d{i + 1}</th>
              ))}
              <th className="text-center px-2 py-2 font-mono text-xs text-muted">…</th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((r) => (
              <tr key={r.word} className="border-t border-border">
                <td className="px-3 py-1.5 font-medium">{r.word}</td>
                <td className="px-2 py-1.5 text-xs" style={{ color: GROUP_COLORS[r.group] }}>{GROUP_LABELS[r.group]}</td>
                {r.vec.slice(0, PREVIEW_DIM).map((v, j) => (
                  <td key={j} className="text-center px-2 py-1.5 font-mono text-xs">
                    <span style={{ color: hueFor(v) }}>{v.toFixed(2)}</span>
                  </td>
                ))}
                <td className="text-center px-2 py-1.5 font-mono text-xs text-muted">d{PREVIEW_DIM + 1}~d{FULL_DIM}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted">
        차원이 {FULL_DIM}개라 표는 앞 {PREVIEW_DIM}개만 보여줘요. 나머지 {FULL_DIM - PREVIEW_DIM}개의 숫자도 똑같이 "학습으로 정해진" 값이에요.
      </p>

      <h2>의미가 비슷하면 좌표도 가까운가</h2>
      <p className="text-sm text-muted">
        두 벡터가 같은 방향을 가리킬수록 cos 유사도가 1에 가깝습니다. <strong>같은 묶음</strong> 단어끼리 색이 진하게 나오는지,
        <strong> 다른 묶음</strong> 단어끼리 옅게 나오는지 살펴보세요. (전체 {FULL_DIM}차원으로 계산)
      </p>
      <SimMatrix />

      <h2>좌표로 보기 — 학습 가중치 d1·d2·d3</h2>
      <div className="card p-3">
        <Scatter3D
          points={ROWS.map((r): Point3D => ({
            x: r.vec[0], y: r.vec[1], z: r.vec[2],
            label: r.word,
            color: GROUP_COLORS[r.group],
            size: 7,
          }))}
          axisLabels={['d1', 'd2', 'd3']}
        />
        <Legend />
        <p className="text-xs text-muted mt-2">
          {FULL_DIM}개 차원 중 처음 3개(d1·d2·d3)를 그대로 좌표로 썼어요. 의미 묶음이 어느 정도 모이긴 하지만 또렷하진 않을 거예요 —
          진짜 의미는 나머지 {FULL_DIM - 3}개 차원에도 흩어져 있거든요. 모든 차원을 한꺼번에 본 결과는 위의 cos 유사도 표가 더 정확합니다.
        </p>
      </div>
    </div>
  );
}

function SimMatrix() {
  return (
    <div className="card p-0 overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-surface text-muted">
          <tr>
            <th className="px-2 py-2"></th>
            {ROWS.map((r) => (<th key={r.word} className="px-2 py-2 text-xs">{r.word}</th>))}
          </tr>
        </thead>
        <tbody>
          {ROWS.map((r) => (
            <tr key={r.word} className="border-t border-border">
              <td className="px-2 py-1.5 font-medium text-xs">{r.word}</td>
              {ROWS.map((c) => {
                const s = cosine(r.vec, c.vec);
                return (
                  <td key={c.word} className="text-center px-2 py-1.5 font-mono text-xs" style={{ background: simBg(s) }}>
                    {s.toFixed(2)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Legend() {
  return (
    <div className="flex flex-wrap gap-3 text-xs mt-2">
      {(Object.keys(GROUP_COLORS) as GroupKey[]).map((g) => (
        <div key={g} className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full inline-block" style={{ background: GROUP_COLORS[g] }} />
          <span className="text-muted">{GROUP_LABELS[g]}</span>
        </div>
      ))}
    </div>
  );
}

// ──────── 탭 2 ─ 직접 만져 보기 (3D 장난감) ────────
// ①에서 본 가중치는 32차원이라 손으로 옮기기엔 너무 많아요. 여기서는 같은 단어 6개를 3차원 장난감 좌표로 두고
// 슬라이더로 직접 움직여 보며 cos 유사도가 어떻게 변하는지 만져 봅니다.
const PLAY_WORDS = ['왕', '여왕', '고양이', '강아지', '사과', '바나나'];
const PLAY_GROUPS: GroupKey[] = ['royal', 'royal', 'animal', 'animal', 'fruit', 'fruit'];

function PlayTab() {
  const [vecs, setVecs] = useState<number[][]>(() => [
    [ 0.9,  0.6,  0.1], // 왕
    [ 0.8,  0.7,  0.2], // 여왕
    [-0.3,  0.8,  0.4], // 고양이
    [-0.2,  0.7,  0.5], // 강아지
    [ 0.2, -0.5,  0.8], // 사과
    [ 0.3, -0.4,  0.7], // 바나나
  ]);
  const [a, setA] = useState(0); // 왕
  const [b, setB] = useState(1); // 여왕

  const setVec = (i: number, j: number, v: number) => {
    setVecs((cur) => {
      const next = cur.map((row) => row.slice());
      next[i][j] = v;
      return next;
    });
  };

  const sim = cosine(vecs[a], vecs[b]);

  return (
    <div className="mt-6 space-y-5">
      <div className="aside-note">
        <div className="font-medium">🧪 작은 3차원 장난감</div>
        <p className="text-sm mt-1 text-muted">
          ①에서 본 진짜 가중치는 차원이 {FULL_DIM}개라 직접 움직이긴 너무 많아요. 여기서는 같은 단어 6개를 <strong>3차원</strong>으로 줄인
          장난감 모델에서 좌표를 직접 옮겨 봅니다. 학습이 "비슷한 단어를 가까이 모으는 일"이라는 점만 확인하면 충분해요.
        </p>
      </div>

      <p className="text-sm text-muted">
        두 단어를 고르고 슬라이더로 좌표를 옮기면 <strong>cos 유사도</strong>가 즉시 바뀝니다.
        같은 방향이면 1에, 반대 방향이면 -1까지 떨어져요.
      </p>

      <div className="grid sm:grid-cols-2 gap-3">
        <PickWord label="단어 A" idx={a} setIdx={setA} />
        <PickWord label="단어 B" idx={b} setIdx={setB} />
      </div>

      <div className="card p-4">
        <div className="text-sm">
          <strong>{PLAY_WORDS[a]}</strong> ↔ <strong>{PLAY_WORDS[b]}</strong> 의 cos 유사도:{' '}
          <span className="font-mono text-lg" style={{ color: simHue(sim) }}>{sim.toFixed(3)}</span>
        </div>
        <SimBar sim={sim} />
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <VecEditor label={PLAY_WORDS[a]} vec={vecs[a]} onChange={(j, v) => setVec(a, j, v)} />
        <VecEditor label={PLAY_WORDS[b]} vec={vecs[b]} onChange={(j, v) => setVec(b, j, v)} />
      </div>

      <h2>3D로 보기 — 두 점이 어떻게 움직이는지</h2>
      <div className="card p-3">
        <Scatter3D
          points={vecs.map((v, i): Point3D => ({
            x: v[0], y: v[1], z: v[2],
            label: PLAY_WORDS[i],
            color: i === a || i === b ? '#a855f7' : GROUP_COLORS[PLAY_GROUPS[i]],
            size: i === a || i === b ? 10 : 6,
            highlight: i === a || i === b,
          }))}
          arrows={[{ from: a, to: b, color: '#a855f7' }]}
          axisLabels={['d1', 'd2', 'd3']}
        />
      </div>

      <h2>A와 다른 단어 사이의 유사도</h2>
      <div className="card p-4 space-y-1.5">
        {PLAY_WORDS.map((w, i) => {
          const s = cosine(vecs[a], vecs[i]);
          return (
            <div key={i} className="flex items-center gap-3 text-sm">
              <div className="w-16 shrink-0">{w}</div>
              <div className="flex-1 h-2 bg-surface rounded">
                <div
                  className="h-full rounded"
                  style={{
                    width: `${Math.max(0, (s + 1) / 2) * 100}%`,
                    background: simHue(s),
                  }}
                />
              </div>
              <code className="font-mono w-16 text-right">{s.toFixed(2)}</code>
            </div>
          );
        })}
      </div>

      <div className="aside-note">
        💡 실제 GPT는 768 ~ 12,288 차원의 임베딩을 씁니다. 차원이 클수록 의미를 더 세밀하게 담을 수 있어요.
        그래도 원리는 똑같아요 — 비슷한 단어는 가까운 좌표.
      </div>
    </div>
  );
}

// ──────── 부속 ────────
function PickWord({ label, idx, setIdx }: { label: string; idx: number; setIdx: (i: number) => void }) {
  return (
    <div>
      <div className="text-xs text-muted">{label}</div>
      <div className="flex flex-wrap gap-1 mt-1">
        {PLAY_WORDS.map((w, i) => (
          <button
            key={i}
            onClick={() => setIdx(i)}
            className={`px-2 py-1 rounded text-xs border transition ${
              i === idx ? 'border-accent bg-accent-bg text-accent' : 'border-border hover:bg-surface'
            }`}
          >
            {w}
          </button>
        ))}
      </div>
    </div>
  );
}

function VecEditor({ label, vec, onChange }: { label: string; vec: number[]; onChange: (j: number, v: number) => void }) {
  return (
    <div className="card p-4">
      <div className="font-medium mb-2">{label} 벡터</div>
      <div className="space-y-2">
        {vec.map((v, j) => (
          <div key={j} className="flex items-center gap-2 text-xs">
            <div className="w-8 font-mono text-muted">d{j + 1}</div>
            <input
              type="range"
              min={-1}
              max={1}
              step={0.05}
              value={v}
              onChange={(e) => onChange(j, parseFloat(e.target.value))}
              className="flex-1"
            />
            <code className="w-12 text-right font-mono" style={{ color: hueFor(v) }}>{v.toFixed(2)}</code>
          </div>
        ))}
      </div>
    </div>
  );
}

function SimBar({ sim }: { sim: number }) {
  const pct = ((sim + 1) / 2) * 100;
  return (
    <div className="mt-3 h-2 bg-surface rounded overflow-hidden">
      <div className="h-full rounded" style={{ width: `${pct}%`, background: simHue(sim) }} />
    </div>
  );
}

// ──────── 수학 ────────
function cosine(a: number[], b: number[]): number {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  if (denom < 1e-9) return 0;
  return dot / denom;
}

function hueFor(v: number): string {
  if (v >= 0.5) return '#16a34a';
  if (v >= 0) return '#65a30d';
  if (v >= -0.5) return '#d97706';
  return '#dc2626';
}

function simHue(s: number): string {
  if (s >= 0.7) return '#16a34a';
  if (s >= 0.3) return '#65a30d';
  if (s >= -0.3) return '#9ca3af';
  if (s >= -0.7) return '#d97706';
  return '#dc2626';
}

function simBg(s: number): string {
  const t = (s + 1) / 2;
  const g = Math.round(120 + t * 100);
  const r = Math.round(220 - t * 100);
  return `rgba(${r}, ${g}, 130, 0.18)`;
}

