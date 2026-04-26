import { useEffect, useMemo, useState } from 'react';
import { useApp } from '../store';

type Tab = 'why' | 'avg' | 'rnn';

export function Phase19() {
  const [tab, setTab] = useState<Tab>('why');
  const markCompleted = useApp((s) => s.markCompleted);

  useEffect(() => {
    if (tab === 'rnn') markCompleted('p19');
  }, [tab, markCompleted]);

  return (
    <article>
      <div className="text-xs font-mono text-muted">PHASE 19</div>
      <h1>시퀀스 — 순서가 의미를 만드는 순간</h1>
      <p className="text-muted mt-2">
        지금까지 단어 하나에 벡터 하나를 줬어요. 그런데 문장은 단어들의 <strong>순서</strong>가 의미를 만듭니다.
        모델이 순서를 어떻게 다루는지 — 가장 단순한 시도부터 시작해서 RNN의 핵심 직관까지 따라가요.
      </p>

      <div className="flex gap-1 mt-6 border-b border-border">
        <TabBtn active={tab === 'why'} onClick={() => setTab('why')}>① 순서가 왜 중요한가</TabBtn>
        <TabBtn active={tab === 'avg'} onClick={() => setTab('avg')}>② 평균 임베딩의 한계</TabBtn>
        <TabBtn active={tab === 'rnn'} onClick={() => setTab('rnn')}>③ RNN — 이전 상태 전달</TabBtn>
      </div>

      {tab === 'why' && <WhyTab />}
      {tab === 'avg' && <AvgTab />}
      {tab === 'rnn' && <RNNTab />}
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
function WhyTab() {
  const pairs = [
    ['I love you', 'You love I'],
    ['고양이가 쥐를 잡았다', '쥐가 고양이를 잡았다'],
    ['철수는 영희에게 책을 줬다', '영희는 철수에게 책을 줬다'],
    ['Dog bites man', 'Man bites dog'],
  ];
  return (
    <div className="mt-6 space-y-5">
      <div className="aside-tip">
        <div className="font-medium">🎯 같은 단어, 다른 순서, 다른 의미</div>
        <p className="text-sm mt-1">
          단어를 가방(bag)처럼 취급하면 두 문장은 같아 보여요.
          하지만 사람은 누가 무엇을 했는지 명확히 다르게 이해합니다.
          모델도 <strong>순서를 잃으면 의미를 잃어요</strong>.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        {pairs.map(([a, b], i) => (
          <div key={i} className="card p-4">
            <div className="text-sm flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500"/> {a}</div>
            <div className="text-sm flex items-center gap-2 mt-2"><span className="w-1.5 h-1.5 rounded-full bg-rose-500"/> {b}</div>
            <div className="text-xs text-muted mt-2">단어 집합 같음 → 의미는 정반대</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ──────── 탭 2 ────────
function AvgTab() {
  // 단어 임베딩 (의미 위치를 손으로 부여)
  const E: Record<string, [number, number]> = {
    I:    [0.9, 0.2],
    you:  [-0.9, 0.2],
    love: [0.0, 0.9],
  };
  const sentA = ['I', 'love', 'you'];
  const sentB = ['you', 'love', 'I'];
  const avgA = mean(sentA.map((w) => E[w]));
  const avgB = mean(sentB.map((w) => E[w]));

  return (
    <div className="mt-6 space-y-5">
      <div className="aside-tip">
        <div className="font-medium">🎯 평균을 내면 순서가 사라진다</div>
        <p className="text-sm mt-1">
          단순한 방법: 단어 벡터들을 <strong>평균</strong>내서 문장 벡터로 만들기.
          빠르고 간단하지만, 같은 단어들로 만든 두 문장의 평균은 정확히 같습니다.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <SentBox label="문장 A" words={sentA} E={E} avg={avgA} accent="#16a34a" />
        <SentBox label="문장 B" words={sentB} E={E} avg={avgB} accent="#dc2626" />
      </div>

      <div className="card p-4 text-sm">
        평균 벡터 A: <code className="font-mono">[{avgA[0].toFixed(2)}, {avgA[1].toFixed(2)}]</code><br/>
        평균 벡터 B: <code className="font-mono">[{avgB[0].toFixed(2)}, {avgB[1].toFixed(2)}]</code>
        <div className="text-accent mt-1 font-medium">→ 두 문장의 표현이 정확히 같아요. 의미 차이가 사라졌습니다.</div>
      </div>
    </div>
  );
}

function SentBox({ label, words, E, avg, accent }: {
  label: string;
  words: string[];
  E: Record<string, [number, number]>;
  avg: [number, number];
  accent: string;
}) {
  const W = 280, H = 200, P = 28;
  const toScreen = (v: [number, number]) => [
    P + ((v[0] + 1) / 2) * (W - 2 * P),
    H - P - ((v[1] + 1) / 2) * (H - 2 * P),
  ];
  return (
    <div className="card p-3">
      <div className="text-xs font-mono text-muted">{label}</div>
      <div className="text-sm mb-2">{words.join(' ')}</div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
        <line x1={P} y1={H - P} x2={W - P} y2={H - P} stroke="#94a3b8" strokeWidth={0.5} />
        <line x1={P} y1={P} x2={P} y2={H - P} stroke="#94a3b8" strokeWidth={0.5} />
        {words.map((w, i) => {
          const [sx, sy] = toScreen(E[w]);
          return (
            <g key={i}>
              <circle cx={sx} cy={sy} r={4} fill="#0ea5e9" />
              <text x={sx + 6} y={sy + 4} fontSize={11}>{w}</text>
            </g>
          );
        })}
        {(() => {
          const [sx, sy] = toScreen(avg);
          return (
            <g>
              <circle cx={sx} cy={sy} r={7} fill={accent} stroke="#fff" strokeWidth={2} />
              <text x={sx + 8} y={sy + 4} fontSize={11} fill={accent} fontWeight="bold">평균</text>
            </g>
          );
        })()}
      </svg>
    </div>
  );
}

function mean(arr: [number, number][]): [number, number] {
  const s: [number, number] = [0, 0];
  for (const v of arr) { s[0] += v[0]; s[1] += v[1]; }
  return [s[0] / arr.length, s[1] / arr.length];
}

// ──────── 탭 3 ────────
function RNNTab() {
  const sentence = useMemo(() => ['I', 'love', 'you'], []);
  const E: Record<string, number> = { I: 0.8, love: 0.5, you: -0.7, '.': 0.0 };
  const [carry, setCarry] = useState(0.7); // 이전 상태를 얼마나 유지할지
  const [t, setT] = useState(sentence.length); // 현재까지 흘려보낸 토큰 수

  // h_t = carry * h_{t-1} + (1 - carry) * x_t
  const states: number[] = [];
  let h = 0;
  for (let i = 0; i < sentence.length; i++) {
    const x = E[sentence[i]];
    h = carry * h + (1 - carry) * x;
    states.push(h);
  }

  return (
    <div className="mt-6 space-y-5">
      <div className="aside-tip">
        <div className="font-medium">🎯 RNN의 직관 (수식 X, 흐름만)</div>
        <p className="text-sm mt-1">
          토큰을 <strong>왼쪽부터 한 개씩</strong> 넣으면서, 매번 <strong>"기억" 상태 h</strong>를 다음 단계로 넘겨요.
          새 입력이 들어오면 기억과 입력을 섞어 새로운 기억을 만들어요. 순서가 바뀌면 기억의 모양도 달라집니다.
        </p>
      </div>

      <div className="card p-4 space-y-3">
        <div className="text-sm">
          <label className="flex items-center gap-2">
            기억 유지 비율 (carry)
            <input type="range" min={0} max={0.95} step={0.05} value={carry}
              onChange={(e) => setCarry(parseFloat(e.target.value))} className="flex-1" />
            <code className="font-mono w-12 text-right">{carry.toFixed(2)}</code>
          </label>
          <p className="text-xs text-muted mt-1">
            0에 가까우면 매번 새 입력만 본다 → 사실상 단어 가방. 1에 가까우면 첫 입력만 기억하고 새 입력은 무시.
          </p>
        </div>

        <div className="text-sm">
          <label className="flex items-center gap-2">
            토큰을 몇 개까지 흘려볼까?
            <input type="range" min={1} max={sentence.length} step={1} value={t}
              onChange={(e) => setT(parseInt(e.target.value))} className="flex-1" />
            <code className="font-mono w-12 text-right">{t}</code>
          </label>
        </div>
      </div>

      <RNNFlow sentence={sentence} states={states} steps={t} />

      <div className="grid sm:grid-cols-2 gap-3">
        <CompareSentence carry={carry} title="원본: I love you" words={['I', 'love', 'you']} E={E} />
        <CompareSentence carry={carry} title="역순: you love I" words={['you', 'love', 'I']} E={E} />
      </div>

      <div className="aside-note">
        💡 carry를 0.5~0.9 정도로 두면, "I love you"와 "you love I"의 마지막 상태가 분명히 달라지는 걸 볼 수 있어요.
        평균과 달리 RNN은 <strong>순서를 보존</strong>합니다. 다음 페이지에서 보게 될 어텐션은 이걸 더 강력하게 발전시켜요.
      </div>
    </div>
  );
}

function RNNFlow({ sentence, states, steps }: { sentence: string[]; states: number[]; steps: number }) {
  const N = sentence.length;
  const W = 540, H = 160;
  const cellW = (W - 40) / N;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-2xl card p-2">
      <text x={20} y={24} fontSize={11} fill="#64748b">x (입력)</text>
      <text x={20} y={84} fontSize={11} fill="#64748b">h (기억)</text>
      {sentence.map((w, i) => {
        const x = 20 + cellW * i + cellW / 2;
        const active = i < steps;
        return (
          <g key={i} opacity={active ? 1 : 0.25}>
            <rect x={x - 32} y={10} width={64} height={28} rx={4} fill="#bae6fd" stroke="#0ea5e9" />
            <text x={x} y={28} textAnchor="middle" fontSize={12} fontWeight="bold">{w}</text>
            <line x1={x} y1={42} x2={x} y2={62} stroke="#94a3b8" strokeWidth={1} markerEnd="url(#arrow)" />
            <rect x={x - 32} y={62} width={64} height={36} rx={4} fill="#fde68a" stroke="#f59e0b" />
            <text x={x} y={84} textAnchor="middle" fontSize={11}>h_{i + 1}</text>
            <text x={x} y={97} textAnchor="middle" fontSize={11} fontFamily="monospace">{states[i].toFixed(2)}</text>
            {i < N - 1 && (
              <g>
                <line x1={x + 32} y1={80} x2={x + cellW - 32} y2={80} stroke="#94a3b8" strokeWidth={1.4} markerEnd="url(#arrow)" />
              </g>
            )}
          </g>
        );
      })}
      <defs>
        <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M0,0 L10,5 L0,10 z" fill="#94a3b8" />
        </marker>
      </defs>
    </svg>
  );
}

function CompareSentence({ carry, title, words, E }: { carry: number; title: string; words: string[]; E: Record<string, number> }) {
  let h = 0;
  const states: number[] = [];
  for (const w of words) {
    h = carry * h + (1 - carry) * E[w];
    states.push(h);
  }
  return (
    <div className="card p-3 text-sm">
      <div className="font-medium">{title}</div>
      <div className="mt-2 space-y-1 text-xs">
        {words.map((w, i) => (
          <div key={i} className="flex items-center gap-2">
            <code className="font-mono w-10 text-muted">t={i + 1}</code>
            <code className="font-mono w-12">{w}</code>
            <div className="flex-1 h-2 bg-surface rounded relative">
              <div className="h-full rounded" style={{
                width: `${Math.abs(states[i]) * 50}%`,
                background: states[i] >= 0 ? '#16a34a' : '#dc2626',
                marginLeft: states[i] >= 0 ? '50%' : `${50 - Math.abs(states[i]) * 50}%`,
              }} />
              <div className="absolute top-0 bottom-0" style={{ left: '50%', borderLeft: '1px dashed #94a3b8' }} />
            </div>
            <code className="font-mono w-12 text-right">{states[i].toFixed(2)}</code>
          </div>
        ))}
      </div>
      <div className="text-xs text-muted mt-2">최종 기억: <code className="font-mono">{states[states.length - 1].toFixed(2)}</code></div>
    </div>
  );
}
