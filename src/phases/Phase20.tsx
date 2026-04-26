import { useEffect, useMemo, useState } from 'react';
import { useApp } from '../store';

type Tab = 'idea' | 'play' | 'output';

export function Phase20() {
  const [tab, setTab] = useState<Tab>('idea');
  const markCompleted = useApp((s) => s.markCompleted);

  useEffect(() => {
    if (tab === 'output') markCompleted('p20');
  }, [tab, markCompleted]);

  return (
    <article>
      <div className="text-xs font-mono text-muted">PHASE 20</div>
      <h1>어텐션 — 어디에 집중할지 정해보기</h1>
      <p className="text-muted mt-2">
        문장 안에서 어떤 단어가 어떤 단어를 가리키는지 — 사람은 문맥으로 자연스럽게 알지만, 모델은 직접 계산해야 해요.
        <strong>어텐션</strong>은 단어들끼리 서로 점수를 매겨, 합칠 때 누구를 더 비중 있게 볼지 정합니다.
        Transformer · GPT의 심장에 해당하는 연산이에요.
      </p>

      <div className="flex gap-1 mt-6 border-b border-border">
        <TabBtn active={tab === 'idea'} onClick={() => setTab('idea')}>① 핵심 아이디어</TabBtn>
        <TabBtn active={tab === 'play'} onClick={() => setTab('play')}>② 어텐션 행렬 만지기</TabBtn>
        <TabBtn active={tab === 'output'} onClick={() => setTab('output')}>③ 가중 합 결과</TabBtn>
      </div>

      {tab === 'idea' && <IdeaTab />}
      {tab === 'play' && <PlayTab />}
      {tab === 'output' && <OutputTab />}
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

const SENT = ['고양이는', '쥐를', '봤다'];
// 의미가 담긴 4차원 단어 임베딩 (수동)
const VEC: Record<string, number[]> = {
  '고양이는': [0.9, 0.7, 0.2, 0.1],
  '쥐를':     [0.2, 0.6, 0.8, 0.1],
  '봤다':     [0.1, 0.2, 0.3, 0.9],
};

// ──────── 탭 1 ────────
function IdeaTab() {
  return (
    <div className="mt-6 space-y-5">
      <div className="aside-tip">
        <div className="font-medium">🎯 한 문장으로</div>
        <p className="text-sm mt-1">
          각 단어가 다른 모든 단어를 한 번씩 쳐다보고 "너는 나에게 얼마나 중요해?"라는 점수를 매겨요.
          그 점수를 0~1로 정규화(softmax)한 게 <strong>어텐션 가중치</strong>이고,
          단어 벡터를 그 가중치로 합치면 새로운 표현이 만들어집니다.
        </p>
      </div>

      <h2>예시 문장</h2>
      <div className="card p-4 text-base">
        "<strong>고양이는 쥐를 봤다</strong>" — 여기서 <strong>"봤다"</strong>는 누구를 봤을까요?
      </div>

      <h2>실제 식 (살짝 단순화)</h2>
      <div className="card p-4 font-mono text-sm space-y-2">
        <div>점수 S = Q · Kᵀ / √d</div>
        <div>가중치 A = softmax(S)</div>
        <div>출력 O = A · V</div>
        <div className="text-xs text-muted mt-2 font-sans">
          Q(질문) · K(키)로 누구에게 집중할지 정하고, V(값)에서 그 비율로 가져옵니다.
          이 페이지에서는 Q=K=V로 단순화해 슬라이더로 직접 점수를 만져 봅니다.
        </div>
      </div>
    </div>
  );
}

// ──────── 탭 2 ────────
function PlayTab() {
  // 초기 점수 — "봤다"가 "고양이는"을 더 본다는 가정
  const [scores, setScores] = useState<number[][]>(() => [
    [4, 1, 1],
    [1, 4, 1],
    [3, 2, 4],
  ]);
  const A = scores.map((row) => softmax(row));

  return (
    <div className="mt-6 space-y-5">
      <div className="aside-tip">
        <div className="font-medium">🎯 점수를 직접 만져봐요</div>
        <p className="text-sm mt-1">
          행은 "쳐다보는 단어(쿼리)", 열은 "쳐다보이는 단어(키)". 각 칸은 슬라이더 — 점수가 높을수록 그 단어에 더 집중합니다.
          softmax를 거치면 한 행의 합이 1이 되어요.
        </p>
      </div>

      <h2>점수 S (값을 만져보세요)</h2>
      <Matrix
        data={scores}
        editable
        onChange={(i, j, v) => {
          setScores((cur) => {
            const next = cur.map((r) => r.slice());
            next[i][j] = v;
            return next;
          });
        }}
      />

      <h2>어텐션 가중치 A = softmax(S)</h2>
      <Matrix data={A.map((r) => r.map((v) => round2(v)))} cellHue={(v) => attHue(v)} showSum />
      <p className="text-xs text-muted">행 단위로 softmax를 적용해, 각 행의 합이 1이 되도록 정규화한 결과예요.</p>

      <Recipe />
    </div>
  );
}

function Recipe() {
  return (
    <div className="card p-4 text-sm">
      <div className="font-medium mb-2">실험 아이디어</div>
      <ul className="list-disc pl-5 space-y-1 text-muted">
        <li>"봤다" 행에서 "고양이는" vs "쥐를"의 점수를 바꿔가며 누구를 본 건지 옮겨보세요.</li>
        <li>한 행의 점수를 모두 같게 두면 → 그 단어는 모든 단어를 똑같이 봅니다(균등 어텐션).</li>
        <li>한 칸만 매우 크게 만들면 → 거의 그 단어 하나만 보는 hard attention.</li>
      </ul>
    </div>
  );
}

// ──────── 탭 3 ────────
function OutputTab() {
  // 같은 점수 사용
  const scores = useMemo(() => [
    [4, 1, 1],
    [1, 4, 1],
    [3, 2, 4],
  ], []);
  const A = scores.map((r) => softmax(r));
  const V = SENT.map((w) => VEC[w]);
  // O[i] = sum_j A[i][j] * V[j]
  const O = A.map((row) => {
    const out = new Array(V[0].length).fill(0);
    for (let j = 0; j < row.length; j++) {
      for (let k = 0; k < out.length; k++) out[k] += row[j] * V[j][k];
    }
    return out;
  });

  return (
    <div className="mt-6 space-y-5">
      <div className="aside-tip">
        <div className="font-medium">🎯 가중 합으로 새로운 표현</div>
        <p className="text-sm mt-1">
          각 행의 어텐션 가중치를 단어 벡터에 곱해 더하면, 그 단어가 <strong>"누구를 보고 있는지"</strong>가 반영된 새 벡터가 만들어집니다.
        </p>
      </div>

      <h2>입력 V (단어 벡터)</h2>
      <VectorTable rows={V.map((v, i) => ({ name: SENT[i], v }))} />

      <h2>출력 O = A · V</h2>
      <VectorTable rows={O.map((v, i) => ({ name: SENT[i], v }))} accent />

      <h2>한눈에 보기</h2>
      <FlowDiagram A={A} V={V} O={O} />

      <div className="aside-note">
        💡 출력 벡터의 모양이 입력과 살짝 다르죠? "봤다"의 출력은 입력과 달리 "고양이는"의 색이 묻어 있어요.
        이게 어텐션이 단어 표현을 문맥에 맞게 바꿔내는 방식입니다.
      </div>
    </div>
  );
}

function FlowDiagram({ A, V, O }: { A: number[][]; V: number[][]; O: number[][] }) {
  const N = SENT.length;
  const W = 560, H = 200;
  const xL = 80, xR = W - 80;
  const yPos = (i: number) => 30 + ((H - 60) / Math.max(1, N - 1)) * i;

  // 색
  const colorOf = (v: number[]) => `rgb(${Math.round(255 * Math.min(1, Math.max(0, v[0])))}, ${Math.round(255 * Math.min(1, Math.max(0, v[1])))}, ${Math.round(255 * Math.min(1, Math.max(0, v[2])))})`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-2xl card p-2">
      {/* 연결선 */}
      {A.map((row, i) =>
        row.map((a, j) => (
          <line key={`${i}-${j}`}
            x1={xL + 50} y1={yPos(j)}
            x2={xR - 50} y2={yPos(i)}
            stroke="#a855f7"
            strokeWidth={Math.max(0.4, a * 4)}
            opacity={Math.min(1, 0.2 + a * 0.8)}
          />
        ))
      )}
      {/* 입력 노드 */}
      {V.map((v, j) => (
        <g key={`v${j}`} transform={`translate(${xL}, ${yPos(j)})`}>
          <circle r={18} fill={colorOf(v)} stroke="#fff" strokeWidth={2} />
          <text x={-30} y={4} textAnchor="end" fontSize={12}>{SENT[j]}</text>
        </g>
      ))}
      {/* 출력 노드 */}
      {O.map((v, i) => (
        <g key={`o${i}`} transform={`translate(${xR}, ${yPos(i)})`}>
          <circle r={18} fill={colorOf(v)} stroke="#fff" strokeWidth={2} />
          <text x={30} y={4} fontSize={12}>{SENT[i]}'</text>
        </g>
      ))}
      <text x={xL} y={H - 4} fontSize={11} textAnchor="middle" fill="#64748b">입력 V</text>
      <text x={xR} y={H - 4} fontSize={11} textAnchor="middle" fill="#64748b">출력 O</text>
    </svg>
  );
}

function VectorTable({ rows, accent }: { rows: { name: string; v: number[] }[]; accent?: boolean }) {
  return (
    <div className="card p-0 overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-surface text-muted">
          <tr>
            <th className="text-left px-3 py-2">단어</th>
            {rows[0].v.map((_, i) => (<th key={i} className="text-center px-3 py-2 font-mono">d{i + 1}</th>))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-t border-border">
              <td className="px-3 py-2 font-medium">{r.name}{accent ? "'" : ''}</td>
              {r.v.map((v, j) => (
                <td key={j} className="text-center px-3 py-2 font-mono" style={{ color: hueFor(v) }}>
                  {v.toFixed(2)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Matrix({ data, editable, onChange, cellHue, showSum }: {
  data: number[][];
  editable?: boolean;
  onChange?: (i: number, j: number, v: number) => void;
  cellHue?: (v: number) => string;
  showSum?: boolean;
}) {
  return (
    <div className="card p-0 overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-surface text-muted">
          <tr>
            <th className="px-3 py-2 text-left">쿼리 ↓ / 키 →</th>
            {SENT.map((w, j) => (<th key={j} className="px-3 py-2">{w}</th>))}
            {showSum && <th className="px-3 py-2">합</th>}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={i} className="border-t border-border">
              <td className="px-3 py-2 font-medium">{SENT[i]}</td>
              {row.map((v, j) => (
                <td key={j} className="text-center px-1 py-1" style={{ background: cellHue ? cellHue(v) : undefined }}>
                  {editable ? (
                    <input
                      type="range"
                      min={-2}
                      max={6}
                      step={0.1}
                      value={v}
                      onChange={(e) => onChange?.(i, j, parseFloat(e.target.value))}
                      className="w-20"
                      title={v.toFixed(2)}
                    />
                  ) : (
                    <code className="font-mono">{v.toFixed(2)}</code>
                  )}
                </td>
              ))}
              {showSum && (
                <td className="text-center px-3 py-2 font-mono text-muted">
                  {row.reduce((s, x) => s + x, 0).toFixed(2)}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ──────── 헬퍼 ────────
function softmax(arr: number[]): number[] {
  const m = Math.max(...arr);
  const e = arr.map((x) => Math.exp(x - m));
  const s = e.reduce((a, b) => a + b, 0);
  return e.map((x) => x / s);
}
function round2(v: number) { return Math.round(v * 100) / 100; }
function attHue(v: number): string {
  const t = Math.min(1, Math.max(0, v));
  return `rgba(168, 85, 247, ${t})`;
}
function hueFor(v: number): string {
  if (v >= 0.5) return '#16a34a';
  if (v >= 0) return '#65a30d';
  if (v >= -0.5) return '#d97706';
  return '#dc2626';
}
