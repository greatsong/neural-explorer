import { useEffect, useMemo, useState } from 'react';
import { useApp } from '../store';
import { Scatter3D, type Point3D } from '../components/Scatter3D';

const WORDS = ['고양이', '강아지', '호랑이', '사과', '바나나', '컴퓨터'];
const DIM = 3;

type Tab = 'onehot' | 'embed' | 'play';

export function Phase17() {
  const [tab, setTab] = useState<Tab>('onehot');
  const markCompleted = useApp((s) => s.markCompleted);

  useEffect(() => {
    if (tab === 'play') markCompleted('p17');
  }, [tab, markCompleted]);

  return (
    <article>
      <div className="text-xs font-mono text-muted">PHASE 17</div>
      <h1>원-핫 → 임베딩, 단어가 벡터가 되는 이유</h1>
      <p className="text-muted mt-2">
        단어를 신경망에 넣으려면 결국 <strong>벡터</strong>가 되어야 해요. 가장 단순한 방법은 원-핫(one-hot)이지만,
        몇 가지 결정적 한계 때문에 신경망은 <strong>학습되는 임베딩 벡터</strong>로 옮겨갑니다. 그 차이를 직접 만져 봅시다.
      </p>

      <div className="flex gap-1 mt-6 border-b border-border">
        <TabBtn active={tab === 'onehot'} onClick={() => setTab('onehot')}>① 원-핫의 한계</TabBtn>
        <TabBtn active={tab === 'embed'} onClick={() => setTab('embed')}>② 임베딩 행렬 W</TabBtn>
        <TabBtn active={tab === 'play'} onClick={() => setTab('play')}>③ 직접 만져보기</TabBtn>
      </div>

      {tab === 'onehot' && <OneHotTab />}
      {tab === 'embed' && <EmbedTab />}
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

// ──────── 탭 1 ────────
function OneHotTab() {
  return (
    <div className="mt-6 space-y-5">
      <div className="aside-tip">
        <div className="font-medium">🎯 핵심 아이디어</div>
        <p className="text-sm mt-1">
          원-핫은 어휘 크기 V만큼의 차원에 단 하나만 1, 나머지는 0인 벡터예요. 단어가 V개라면 차원도 V.
          이 방식의 두 가지 큰 문제: <strong>(1) 차원이 너무 큼</strong>, <strong>(2) 모든 단어 쌍의 cos 유사도가 0</strong>.
        </p>
      </div>

      <h2>예시 — 어휘 6개</h2>
      <div className="card p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-surface text-muted">
            <tr>
              <th className="text-left px-3 py-2">단어</th>
              {WORDS.map((_, i) => (
                <th key={i} className="text-center px-3 py-2 font-mono">e{i + 1}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {WORDS.map((w, i) => (
              <tr key={i} className="border-t border-border">
                <td className="px-3 py-2 font-medium">{w}</td>
                {WORDS.map((_, j) => (
                  <td key={j} className="text-center px-3 py-2 font-mono">
                    <span className={i === j ? 'text-accent font-semibold' : 'text-muted'}>{i === j ? 1 : 0}</span>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-sm text-muted">
        고양이와 강아지는 분명 비슷한 단어인데 — cos 유사도를 계산하면 <strong>0</strong>이 나와요.
        고양이와 컴퓨터의 유사도도 <strong>0</strong>. 모델 입장에서 어떤 단어가 어떤 단어와 가까운지 알 길이 없습니다.
      </p>

      <div className="card p-4 text-sm font-mono">
        cos(고양이, 강아지) = (1·0 + 0·1 + 0·0 + ...) / (1·1) = <strong className="text-accent">0</strong>
      </div>
    </div>
  );
}

// ──────── 탭 2 ────────
function EmbedTab() {
  // 의미적 거리감을 잘 보여주는 고정 임베딩
  const W = useMemo<number[][]>(() => [
    [0.8, 0.6, 0.1],   // 고양이
    [0.7, 0.6, 0.2],   // 강아지
    [0.7, 0.7, 0.3],   // 호랑이
    [0.1, 0.7, 0.5],   // 사과
    [0.2, 0.6, 0.5],   // 바나나
    [0.0, 0.1, 0.9],   // 컴퓨터
  ], []);

  return (
    <div className="mt-6 space-y-5">
      <div className="aside-tip">
        <div className="font-medium">🎯 임베딩의 발상</div>
        <p className="text-sm mt-1">
          단어마다 <strong>작은 차원의 실수 벡터</strong>를 하나씩 줘봐요. 이 벡터를 학습 중에 조금씩 조정해서,
          <strong> 비슷한 단어는 가까운 위치</strong>로 모이도록 만드는 거예요. 차원도 줄고, 의미도 위치에 담깁니다.
        </p>
      </div>

      <h2>임베딩 행렬 W ({WORDS.length} × {DIM})</h2>
      <div className="card p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-surface text-muted">
            <tr>
              <th className="text-left px-3 py-2">단어</th>
              {Array.from({ length: DIM }).map((_, i) => (
                <th key={i} className="text-center px-3 py-2 font-mono">d{i + 1}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {WORDS.map((w, i) => (
              <tr key={i} className="border-t border-border">
                <td className="px-3 py-2 font-medium">{w}</td>
                {W[i].map((v, j) => (
                  <td key={j} className="text-center px-3 py-2 font-mono">
                    <span style={{ color: hueFor(v) }}>{v.toFixed(2)}</span>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2>3D 임베딩 공간</h2>
      <div className="card p-3">
        <Scatter3D
          points={W.map((v, i) => ({
            x: v[0], y: v[1], z: v[2],
            label: WORDS[i],
            color: groupColor(i),
            size: 8,
          }))}
          axisLabels={['d1', 'd2', 'd3']}
        />
        <p className="text-xs text-muted mt-2">
          🟢 동물(고양이·강아지·호랑이), 🟠 과일(사과·바나나), 🔵 컴퓨터 — 의미가 비슷한 단어가 같은 구역에 모여 있어요.
        </p>
      </div>

      <h2>cos 유사도 표</h2>
      <SimMatrix W={W} />

      <p className="text-sm text-muted">
        고양이↔강아지, 사과↔바나나는 <strong>높은 유사도</strong>로, 컴퓨터는 <strong>혼자 떨어진 위치</strong>로 자리 잡았어요.
        다음 탭에서는 임베딩 값을 직접 만져 유사도가 어떻게 흔들리는지 봅시다.
      </p>
    </div>
  );
}

// ──────── 탭 3 ────────
function PlayTab() {
  const [vecs, setVecs] = useState<number[][]>(() => [
    [0.8, 0.6, 0.1],
    [0.7, 0.6, 0.2],
    [0.7, 0.7, 0.3],
    [0.1, 0.7, 0.5],
    [0.2, 0.6, 0.5],
    [0.0, 0.1, 0.9],
  ]);
  const [a, setA] = useState(0); // 고양이
  const [b, setB] = useState(1); // 강아지

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
      <p className="text-sm text-muted">
        선택한 두 단어의 임베딩을 <strong>슬라이더</strong>로 직접 옮겨보세요. cos 유사도가 어떻게 변하는지 즉시 보입니다.
        벡터가 같은 방향을 가리키면 1에 가까워지고, 반대 방향이면 -1까지 떨어져요.
      </p>

      <div className="grid sm:grid-cols-2 gap-3">
        <PickWord label="단어 A" idx={a} setIdx={setA} />
        <PickWord label="단어 B" idx={b} setIdx={setB} />
      </div>

      <div className="card p-4">
        <div className="text-sm">
          <strong>{WORDS[a]}</strong> ↔ <strong>{WORDS[b]}</strong> 의 cos 유사도:{' '}
          <span className="font-mono text-lg" style={{ color: simHue(sim) }}>{sim.toFixed(3)}</span>
        </div>
        <SimBar sim={sim} />
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <VecEditor label={WORDS[a]} vec={vecs[a]} onChange={(j, v) => setVec(a, j, v)} />
        <VecEditor label={WORDS[b]} vec={vecs[b]} onChange={(j, v) => setVec(b, j, v)} />
      </div>

      <h2>3D로 보기 — 두 점이 어떻게 움직이는지</h2>
      <div className="card p-3">
        <Scatter3D
          points={vecs.map((v, i): Point3D => ({
            x: v[0], y: v[1], z: v[2],
            label: WORDS[i],
            color: i === a || i === b ? '#a855f7' : groupColor(i),
            size: i === a || i === b ? 10 : 6,
            highlight: i === a || i === b,
          }))}
          arrows={[{ from: a, to: b, color: '#a855f7' }]}
          axisLabels={['d1', 'd2', 'd3']}
        />
      </div>

      <h2>전체 단어와 A 사이의 유사도</h2>
      <div className="card p-4 space-y-1.5">
        {WORDS.map((w, i) => {
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
        💡 임베딩 차원이 3이라 매우 거칠지만, 실제 GPT는 768 ~ 12,288 차원의 임베딩을 씁니다.
        그 큰 공간 안에서 의미가 비슷한 단어가 정말로 가까이 모여 있어요.
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
        {WORDS.map((w, i) => (
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

function SimMatrix({ W }: { W: number[][] }) {
  return (
    <div className="card p-0 overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-surface text-muted">
          <tr>
            <th className="px-3 py-2"></th>
            {WORDS.map((w, i) => (<th key={i} className="px-3 py-2">{w}</th>))}
          </tr>
        </thead>
        <tbody>
          {WORDS.map((w, i) => (
            <tr key={i} className="border-t border-border">
              <td className="px-3 py-2 font-medium">{w}</td>
              {WORDS.map((_, j) => {
                const s = cosine(W[i], W[j]);
                return (
                  <td key={j} className="text-center px-3 py-2 font-mono" style={{ background: simBg(s) }}>
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

function groupColor(i: number): string {
  // 0,1,2 동물 / 3,4 과일 / 5 컴퓨터
  if (i <= 2) return '#16a34a';
  if (i <= 4) return '#f59e0b';
  return '#3b82f6';
}

function simBg(s: number): string {
  const t = (s + 1) / 2;
  const g = Math.round(120 + t * 100);
  const r = Math.round(220 - t * 100);
  return `rgba(${r}, ${g}, 130, 0.18)`;
}
