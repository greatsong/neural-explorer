import { useMemo, useState } from 'react';
import { useApp } from '../store';
import { PHASES } from '../phases';
import { Scatter3D, type Point3D } from '../components/Scatter3D';
import { KO_PRETRAINED } from '../data/w2vPretrained';
import { vec, nearest, add, sub, cosine, type W2VModel } from '../lib/w2v';

// E3가 학습한 한국어 임베딩을 그대로 W2VModel 형태로 복원해서 쓴다.
const MODEL: W2VModel = (() => {
  const index = new Map<string, number>();
  KO_PRETRAINED.vocab.forEach((w, i) => index.set(w, i));
  return {
    vocab: KO_PRETRAINED.vocab,
    index,
    W: KO_PRETRAINED.W,
    C: KO_PRETRAINED.C,
    dim: KO_PRETRAINED.dim,
  };
})();

// E3 PRESETS와 통일된 어휘 묶음 (왕족 · 가족 · 동물 · 과일 · 나라 · 수도)
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
const PICK: { word: string; group: GroupKey }[] = [
  { word: '왕',     group: 'royal' },   { word: '여왕',   group: 'royal' },
  { word: '왕자',   group: 'royal' },   { word: '공주',   group: 'royal' },
  { word: '아빠',   group: 'family' },  { word: '엄마',   group: 'family' },
  { word: '고양이', group: 'animal' },  { word: '강아지', group: 'animal' },
  { word: '사과',   group: 'fruit' },   { word: '바나나', group: 'fruit' },
  { word: '한국',   group: 'country' }, { word: '일본',   group: 'country' },
  { word: '서울',   group: 'capital' }, { word: '도쿄',   group: 'capital' },
];
const ROWS = PICK.map((p) => {
  const i = MODEL.index.get(p.word)!;
  return { ...p, vec: MODEL.W[i] };
});

const PROVEN = [
  { a: '왕',   b: '남자', c: '여자', expect: '여왕' },
  { a: '아빠', b: '남자', c: '여자', expect: '엄마' },
  { a: '도쿄', b: '일본', c: '한국', expect: '서울' },
  { a: '파리', b: '프랑스', c: '일본', expect: '도쿄' },
  { a: '베이징', b: '중국', c: '프랑스', expect: '파리' },
];
const STOP = new Set(['은', '는', '이', '가', '을', '를', '의', '과', '와', '에', '이다', '있다', '어린', '새끼', '우리', '함께', '먹는다', '다스린다', '수도', '도시', '나라', '아시아', '남자', '여자']);

type Tab = 'weights' | 'arith' | 'space';

export function Phase17() {
  const meta = PHASES.find((p) => p.id === 'p17')!;
  const [tab, setTab] = useState<Tab>('weights');
  const markCompleted = useApp((s) => s.markCompleted);

  return (
    <article>
      <div className="text-xs font-mono text-accent">{meta.num}</div>
      <h1>{meta.title}</h1>
      <p className="text-muted mt-2">
        E1에서 단어 한 개는 정수 ID 하나가 됐어요. 그런데 ID 357번과 358번 사이엔 어떤 의미적 관계도 없죠.
        그래서 신경망은 한 발 더 갑니다 — 단어마다 <strong>벡터(좌표)</strong>를 하나씩 매겨 두고,
        의미가 비슷한 단어가 좌표상 가까이 모이도록 만들어 둬요. 이 챕터에서는 <strong>이미 학습된</strong>
        그 좌표를 들여다보고 의미가 정말 위치로 새겨졌는지 확인합니다. (학습 과정은 다음 페이지 E3.)
      </p>

      <div className="flex gap-1 mt-6 border-b border-border">
        <TabBtn active={tab === 'weights'} onClick={() => setTab('weights')}>① 좌표를 가진 단어</TabBtn>
        <TabBtn active={tab === 'arith'}   onClick={() => { setTab('arith'); markCompleted('p17'); }}>② 의미 산수</TabBtn>
        <TabBtn active={tab === 'space'}   onClick={() => setTab('space')}>③ 좌표 공간</TabBtn>
      </div>

      {tab === 'weights' && <WeightsTab />}
      {tab === 'arith'   && <ArithTab />}
      {tab === 'space'   && <SpaceTab />}
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

// ──────── 탭 1 — 좌표를 가진 단어 ────────
function WeightsTab() {
  return (
    <div className="mt-6 space-y-5">
      <div className="aside-tip">
        <div className="font-medium">🎯 단어 한 개 = 숫자 32개의 묶음</div>
        <p className="text-sm mt-1">
          다음 페이지(E3)에서 학습한 결과를 미리 가져왔어요. 단어마다 <strong>{MODEL.dim}개의 숫자(가중치)</strong>가
          자리 잡아 있습니다. 이 숫자 묶음이 곧 그 단어의 <strong>좌표</strong>예요.
          앞 6개만 표에 보여 줄게요 — 나머지 26개도 같은 방식으로 학습으로 정해진 값입니다.
        </p>
      </div>

      <h2>가중치 표</h2>
      <div className="card p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-surface text-muted">
            <tr>
              <th className="text-left px-3 py-2">단어</th>
              <th className="text-left px-2 py-2 text-xs">묶음</th>
              {Array.from({ length: 6 }).map((_, i) => (
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
                {r.vec.slice(0, 6).map((v, j) => (
                  <td key={j} className="text-center px-2 py-1.5 font-mono text-xs">
                    <span style={{ color: hueFor(v) }}>{v.toFixed(2)}</span>
                  </td>
                ))}
                <td className="text-center px-2 py-1.5 font-mono text-xs text-muted">d7~d{MODEL.dim}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2>의미가 비슷하면 좌표도 가까운가 — cos 유사도</h2>
      <p className="text-sm text-muted">
        두 벡터가 같은 방향을 가리킬수록 cos 유사도가 1에 가까워요. <strong>같은 묶음</strong> 단어끼리는 진하게,
        다른 묶음끼리는 옅게 나오는지 살펴보세요. (전체 {MODEL.dim}차원으로 계산)
      </p>
      <SimMatrix />
      <p className="text-xs text-muted">
        같은 묶음끼리 진한 초록이 보이면, 학습이 "비슷한 단어를 가까이 모으는 일"을 해냈다는 증거예요.
      </p>
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

// ──────── 탭 2 — 의미 산수 ────────
function ArithTab() {
  const [a, setA] = useState('왕');
  const [b, setB] = useState('남자');
  const [c, setC] = useState('여자');

  const va = vec(MODEL, a);
  const vb = vec(MODEL, b);
  const vc = vec(MODEL, c);
  const result = va && vb && vc ? add(sub(va, vb), vc) : null;
  const top = result ? nearest(MODEL, result, new Set([a, b, c, ...STOP]), 5) : [];

  return (
    <div className="mt-6 space-y-5">
      <div className="aside-tip">
        <div className="font-medium">🎯 의미의 차이가 방향으로 새겨진다</div>
        <p className="text-sm mt-1">
          학습된 좌표 공간에서는 "왕 → 여왕"으로 가는 방향이 "남자 → 여자"로 가는 방향과 거의 같아요.
          그래서 <strong>왕 − 남자 + 여자</strong>를 계산해 가장 가까운 단어를 찾으면 <strong>여왕</strong>이 나옵니다.
          나라와 수도, 부모와 자식 같은 관계도 비슷하게 방향에 담겨 있어요.
        </p>
      </div>

      <h2>준비된 식들 — 눌러서 즉시 계산</h2>
      <div className="flex flex-wrap gap-2">
        {PROVEN.map((p, i) => (
          <button
            key={i}
            onClick={() => { setA(p.a); setB(p.b); setC(p.c); }}
            className={'btn-ghost text-sm ' + (a === p.a && b === p.b && c === p.c ? 'border-accent text-accent' : '')}
          >
            {p.a} − {p.b} + {p.c} ≈ <strong className="ml-1">{p.expect}</strong>?
          </button>
        ))}
      </div>

      <div className="card p-4 space-y-3">
        <div className="flex flex-wrap gap-2 items-center text-sm">
          <WordPick value={a} onChange={setA} />
          <span>−</span>
          <WordPick value={b} onChange={setB} />
          <span>+</span>
          <WordPick value={c} onChange={setC} />
          <span>≈ ?</span>
        </div>

        {result ? (
          <div>
            <div className="text-xs text-muted mb-1">가장 가까운 단어 top-5 (입력 단어·조사 같은 잡음 제외)</div>
            <div className="space-y-1.5">
              {top.map((r, i) => (
                <div key={i} className="flex items-center gap-3 text-sm">
                  <code className={`font-mono w-20 ${i === 0 ? 'text-accent font-semibold' : ''}`}>{r.word}</code>
                  <div className="flex-1 h-2 bg-surface rounded">
                    <div className="h-full rounded bg-accent" style={{ width: `${Math.max(0, r.sim) * 100}%` }} />
                  </div>
                  <code className="font-mono w-14 text-right">{r.sim.toFixed(2)}</code>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-sm text-muted">선택한 단어 하나가 어휘에 없어서 계산이 불가능해요.</div>
        )}
      </div>

      <div className="aside-warn text-sm">
        <div className="font-medium">⚠️ 토이 모델이라 항상 1위는 아닐 수도</div>
        <p className="mt-1">
          이 데모의 임베딩은 한국어 짧은 코퍼스(약 50문장)로 학습돼 진짜 GPT보다 훨씬 거칠어요.
          정답이 top-2~3 안에 잡히면 충분히 잘 된 결과로 봐 주세요. 진짜 모델에서는 같은 식이 훨씬 또렷하게 1위로 나옵니다.
        </p>
      </div>
    </div>
  );
}

function WordPick({ value, onChange }: { value: string; onChange: (w: string) => void }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}
      className="px-2 py-1 rounded border border-border bg-surface font-mono">
      {MODEL.vocab.map((w) => (<option key={w} value={w}>{w}</option>))}
    </select>
  );
}

// ──────── 탭 3 — 좌표 공간 ────────
function SpaceTab() {
  const points = useMemo<Point3D[]>(() => ROWS.map((r) => ({
    x: r.vec[0], y: r.vec[1], z: r.vec[2],
    label: r.word,
    color: GROUP_COLORS[r.group],
    size: 7,
  })), []);

  return (
    <div className="mt-6 space-y-5">
      <div className="aside-tip">
        <div className="font-medium">🎯 좌표 공간에서 한눈에</div>
        <p className="text-sm mt-1">
          학습된 {MODEL.dim}차원 가중치 중 <strong>처음 3개(d1·d2·d3)</strong>를 x·y·z축에 그대로 가져왔어요.
          같은 묶음 단어가 어느 정도 비슷한 자리에 모이는지 살펴보세요.
        </p>
      </div>

      <div className="card p-3">
        <Scatter3D points={points} axisLabels={['d1', 'd2', 'd3']} />
        <Legend />
        <p className="text-xs text-muted mt-2">
          참고: {MODEL.dim}개 차원 중 3개만 본 거라 클러스터가 흐릿할 수 있어요.
          모든 차원을 한꺼번에 본 결과는 ① 탭의 cos 유사도 표가 더 정확합니다.
        </p>
      </div>
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

// ──────── 시각화 헬퍼 ────────
function hueFor(v: number): string {
  if (v >= 0.5) return '#16a34a';
  if (v >= 0) return '#65a30d';
  if (v >= -0.5) return '#d97706';
  return '#dc2626';
}

function simBg(s: number): string {
  const t = (s + 1) / 2;
  const g = Math.round(120 + t * 100);
  const r = Math.round(220 - t * 100);
  return `rgba(${r}, ${g}, 130, 0.18)`;
}
