import { useEffect, useMemo, useState } from 'react';
import { useApp } from '../store';
import { Scatter3D, type Point3D } from '../components/Scatter3D';
import {
  initModel,
  trainSkipGram,
  vec,
  nearest,
  add,
  sub,
  cosine,
  type W2VModel,
} from '../lib/w2v';
import { EN_CORPUS, KO_CORPUS } from '../data/w2vCorpus';

type Tab = 'train' | 'space' | 'arith';
type Lang = 'en' | 'ko';

const EN_STOP = new Set(['a', 'an', 'the', 'is', 'are', 'and', 'of', 'in', 'to', 'we', 'eat', 'rule', 'rules', 'together']);
const KO_STOP = new Set(['은', '는', '이', '가', '을', '를', '의', '과', '와', '이다', '어린', '새끼', '우리', '함께', '먹는다', '다스린다']);

const PRESETS: Record<Lang, { word: string; group: 'royal' | 'family' | 'animal' | 'fruit' | 'food' | 'gender' }[]> = {
  en: [
    { word: 'king', group: 'royal' }, { word: 'queen', group: 'royal' },
    { word: 'prince', group: 'royal' }, { word: 'princess', group: 'royal' },
    { word: 'father', group: 'family' }, { word: 'mother', group: 'family' },
    { word: 'boy', group: 'family' }, { word: 'girl', group: 'family' },
    { word: 'man', group: 'gender' }, { word: 'woman', group: 'gender' },
    { word: 'cat', group: 'animal' }, { word: 'dog', group: 'animal' },
    { word: 'kitten', group: 'animal' }, { word: 'puppy', group: 'animal' },
    { word: 'apple', group: 'fruit' }, { word: 'banana', group: 'fruit' },
    { word: 'bread', group: 'food' }, { word: 'rice', group: 'food' },
  ],
  ko: [
    { word: '왕', group: 'royal' }, { word: '여왕', group: 'royal' },
    { word: '왕자', group: 'royal' }, { word: '공주', group: 'royal' },
    { word: '아빠', group: 'family' }, { word: '엄마', group: 'family' },
    { word: '소년', group: 'family' }, { word: '소녀', group: 'family' },
    { word: '남자', group: 'gender' }, { word: '여자', group: 'gender' },
    { word: '고양이', group: 'animal' }, { word: '강아지', group: 'animal' },
    { word: '사과', group: 'fruit' }, { word: '바나나', group: 'fruit' },
    { word: '빵', group: 'food' }, { word: '밥', group: 'food' },
  ],
};

const GROUP_COLORS: Record<string, string> = {
  royal: '#a855f7',
  family: '#ef4444',
  gender: '#0ea5e9',
  animal: '#16a34a',
  fruit: '#f59e0b',
  food: '#a16207',
};

const PROVEN: Record<Lang, { a: string; b: string; c: string; expect: string }[]> = {
  en: [
    { a: 'king', b: 'man', c: 'woman', expect: 'queen' },
    { a: 'boy', b: 'man', c: 'woman', expect: 'girl' },
    { a: 'prince', b: 'man', c: 'woman', expect: 'princess' },
    { a: 'father', b: 'man', c: 'woman', expect: 'mother' },
  ],
  ko: [
    { a: '왕', b: '남자', c: '여자', expect: '여왕' },
    { a: '아빠', b: '남자', c: '여자', expect: '엄마' },
    { a: '왕자', b: '남자', c: '여자', expect: '공주' },
    { a: '소년', b: '남자', c: '여자', expect: '소녀' },
  ],
};

const DEFAULT_SEED: Record<Lang, number> = { en: 7, ko: 100 };

export function Phase18() {
  const [tab, setTab] = useState<Tab>('train');
  const [lang, setLang] = useState<Lang>('en');
  const [seed, setSeed] = useState<number>(DEFAULT_SEED.en);
  const [steps, setSteps] = useState(1500);
  const [model, setModel] = useState<W2VModel | null>(null);
  const [losses, setLosses] = useState<number[]>([]);
  const markCompleted = useApp((s) => s.markCompleted);

  const corpus = lang === 'en' ? EN_CORPUS : KO_CORPUS;

  useEffect(() => {
    setSeed(DEFAULT_SEED[lang]);
    setModel(null);
    setLosses([]);
  }, [lang]);

  useEffect(() => {
    if (tab === 'arith' && model) markCompleted('p18');
  }, [tab, model, markCompleted]);

  const train = () => {
    const m = initModel(corpus, 16, seed);
    const { lossHistory } = trainSkipGram(m, corpus, {
      steps,
      lr: 0.05,
      windowSize: 2,
      negatives: 5,
      seed,
    });
    setModel(m);
    setLosses(lossHistory);
  };

  return (
    <article>
      <div className="text-xs font-mono text-muted">PHASE 18</div>
      <h1>Word2Vec 미니 — 브라우저에서 직접 학습</h1>
      <p className="text-muted mt-2">
        앞 페이지에서는 임베딩 값을 우리가 손으로 옮겨봤어요. 지금부터는 그 값이
        <strong> 학습으로 자동으로 자리 잡는 과정</strong>을 직접 돌려봅니다.
        같이 자주 등장하는 단어끼리 가까이 모이게 만드는 <strong>skip-gram</strong> 알고리즘이에요.
      </p>

      <div className="flex gap-1 mt-6 border-b border-border">
        <TabBtn active={tab === 'train'} onClick={() => setTab('train')}>① 학습</TabBtn>
        <TabBtn active={tab === 'space'} onClick={() => setTab('space')}>② 임베딩 공간</TabBtn>
        <TabBtn active={tab === 'arith'} onClick={() => setTab('arith')}>③ 벡터 산수</TabBtn>
      </div>

      <div className="mt-6 flex flex-wrap gap-3 items-center">
        <div className="flex border border-border rounded overflow-hidden">
          {(['en', 'ko'] as const).map((l) => (
            <button
              key={l}
              onClick={() => setLang(l)}
              className={`px-3 py-1.5 text-sm transition ${
                lang === l ? 'bg-accent-bg text-accent font-medium' : 'hover:bg-surface'
              }`}
            >
              {l === 'en' ? '영어' : '한글'}
            </button>
          ))}
        </div>
        <label className="text-sm flex items-center gap-2">
          시드
          <input
            type="number"
            value={seed}
            onChange={(e) => setSeed(parseInt(e.target.value || '0'))}
            className="w-20 px-2 py-1 rounded border border-border bg-surface font-mono text-sm"
          />
        </label>
        <label className="text-sm flex items-center gap-2">
          스텝
          <input
            type="range"
            min={200}
            max={3000}
            step={100}
            value={steps}
            onChange={(e) => setSteps(parseInt(e.target.value))}
            className="w-32"
          />
          <code className="text-xs font-mono w-12">{steps}</code>
        </label>
        <button onClick={train} className="btn-primary text-sm">
          {model ? '다시 학습' : '학습 시작'}
        </button>
      </div>

      {tab === 'train' && <TrainTab corpus={corpus} model={model} losses={losses} />}
      {tab === 'space' && <SpaceTab model={model} lang={lang} />}
      {tab === 'arith' && <ArithTab model={model} lang={lang} />}
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
function TrainTab({ corpus, model, losses }: { corpus: string[]; model: W2VModel | null; losses: number[] }) {
  return (
    <div className="mt-6 space-y-5">
      <div className="aside-tip">
        <div className="font-medium">🎯 skip-gram의 직관</div>
        <p className="text-sm mt-1">
          "<strong>왕 은 남자 이다</strong>"라는 문장에서 '왕' 주변에는 '남자'가 자주 나옵니다.
          모델은 이 사실을 보면서 '왕'과 '남자'의 벡터를 가깝게,
          그 외 무작위로 뽑은 단어와는 멀게 끌어당깁니다. 이걸 수백 번 반복하면 의미가 위치에 새겨져요.
        </p>
      </div>

      <h2>코퍼스 ({corpus.length}문장)</h2>
      <div className="card p-3 max-h-60 overflow-y-auto text-sm font-mono space-y-0.5">
        {corpus.map((line, i) => (
          <div key={i} className="text-muted">{i + 1}. {line}</div>
        ))}
      </div>

      {model ? (
        <>
          <h2>학습 결과</h2>
          <div className="card p-4 text-sm space-y-1">
            <div>어휘 수: <strong>{model.vocab.length}</strong></div>
            <div>벡터 차원: <strong>{model.dim}</strong></div>
            <div>최종 손실 (마지막 25스텝 평균): <strong>{losses.length ? losses[losses.length - 1].toFixed(3) : '–'}</strong></div>
          </div>

          {losses.length > 0 && (
            <>
              <h2>손실 그래프</h2>
              <LossChart losses={losses} />
              <p className="text-xs text-muted">
                숫자가 내려갈수록 모델이 코퍼스의 통계를 잘 흉내내고 있다는 뜻이에요.
              </p>
            </>
          )}
        </>
      ) : (
        <div className="aside-note">위쪽의 <strong>학습 시작</strong> 버튼을 눌러 첫 모델을 학습시켜 주세요. 영어는 ~1500스텝, 한글도 비슷하면 충분합니다.</div>
      )}
    </div>
  );
}

function LossChart({ losses }: { losses: number[] }) {
  const W = 480, H = 140, P = 24;
  const maxL = Math.max(...losses, 1);
  const minL = Math.min(...losses, 0);
  const span = Math.max(0.001, maxL - minL);
  const pts = losses.map((l, i) => {
    const x = P + ((W - 2 * P) * i) / Math.max(1, losses.length - 1);
    const y = H - P - ((H - 2 * P) * (l - minL)) / span;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-xl card p-2">
      <line x1={P} y1={H - P} x2={W - P} y2={H - P} stroke="#94a3b8" strokeWidth={0.6} />
      <line x1={P} y1={P} x2={P} y2={H - P} stroke="#94a3b8" strokeWidth={0.6} />
      <polyline fill="none" stroke="#a855f7" strokeWidth={2} points={pts.join(' ')} />
      <text x={P + 4} y={P + 8} fontSize={10} fill="#64748b">loss</text>
    </svg>
  );
}

// ──────── 탭 2 ────────
function SpaceTab({ model, lang }: { model: W2VModel | null; lang: Lang }) {
  if (!model) return <NeedTrain />;
  const presets = PRESETS[lang];
  const proj = useMemo(() => projectTo3D(model, presets.map((p) => p.word)), [model, presets]);
  const points: Point3D[] = presets.map((p, i) => ({
    x: proj[i][0], y: proj[i][1], z: proj[i][2],
    label: p.word,
    color: GROUP_COLORS[p.group],
    size: 7,
  })).filter((_, i) => proj[i] !== null);

  return (
    <div className="mt-6 space-y-5">
      <div className="aside-tip">
        <div className="font-medium">🎯 학습된 임베딩 공간 (PCA → 3D)</div>
        <p className="text-sm mt-1">
          16차원 벡터를 PCA로 압축해 3D로 표시. 가까이 모인 점은 비슷한 문맥에서 등장한다는 뜻이에요.
          왕족 / 가족 / 동물 / 과일 클러스터가 보이는지 살펴보세요.
        </p>
      </div>

      <div className="card p-3">
        <Scatter3D points={points} axisLabels={['PC1', 'PC2', 'PC3']} />
        <Legend />
      </div>
    </div>
  );
}

function Legend() {
  return (
    <div className="flex flex-wrap gap-3 text-xs mt-2">
      {Object.entries(GROUP_COLORS).map(([g, c]) => (
        <div key={g} className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full inline-block" style={{ background: c }} />
          <span className="text-muted">{groupLabel(g)}</span>
        </div>
      ))}
    </div>
  );
}

function groupLabel(g: string): string {
  return ({ royal: '왕족', family: '가족', gender: '성별', animal: '동물', fruit: '과일', food: '음식' } as const)[g as 'royal'] ?? g;
}

// ──────── 탭 3 ────────
function ArithTab({ model, lang }: { model: W2VModel | null; lang: Lang }) {
  if (!model) return <NeedTrain />;
  const stop = lang === 'en' ? EN_STOP : KO_STOP;
  const proven = PROVEN[lang];

  const [a, setA] = useState(proven[0].a);
  const [b, setB] = useState(proven[0].b);
  const [c, setC] = useState(proven[0].c);

  const va = vec(model, a);
  const vb = vec(model, b);
  const vc = vec(model, c);
  const result = va && vb && vc ? add(sub(va, vb), vc) : null;
  const top = result ? nearest(model, result, new Set([a, b, c, ...stop]), 5) : [];

  return (
    <div className="mt-6 space-y-5">
      <div className="aside-tip">
        <div className="font-medium">🎯 벡터 산수</div>
        <p className="text-sm mt-1">
          학습된 임베딩 공간에서는 <strong>"의미의 차이"가 방향</strong>으로 새겨집니다.
          그래서 <strong>왕 - 남자 + 여자</strong>를 계산해 가장 가까운 단어를 찾으면 <strong>여왕</strong>이 나오는 식이에요.
        </p>
      </div>

      <h2>이 데모에서 잘 작동하는 페어</h2>
      <div className="flex flex-wrap gap-2">
        {proven.map((p, i) => (
          <button
            key={i}
            onClick={() => { setA(p.a); setB(p.b); setC(p.c); }}
            className="btn-ghost text-sm"
          >
            {p.a} - {p.b} + {p.c} ≈ <strong className="ml-1">{p.expect}</strong>?
          </button>
        ))}
      </div>

      <div className="card p-4 space-y-3">
        <div className="flex flex-wrap gap-2 items-center text-sm">
          <WordPick model={model} value={a} onChange={setA} />
          <span>−</span>
          <WordPick model={model} value={b} onChange={setB} />
          <span>+</span>
          <WordPick model={model} value={c} onChange={setC} />
          <span>≈ ?</span>
        </div>

        {result ? (
          <div>
            <div className="text-xs text-muted mb-1">가장 가까운 단어 (top-5, 불용어 제외)</div>
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
          <div className="text-sm text-muted">한 단어 이상이 어휘에 없어서 계산이 불가능해요.</div>
        )}
      </div>

      <div className="aside-warn">
        <div className="font-medium">⚠️ 작은 코퍼스의 한계</div>
        <p className="text-sm mt-1">
          이 데모의 코퍼스는 30~40문장에 불과해요. 시드를 바꾸거나 스텝을 줄이면 답이 흔들립니다.
          진짜 Word2Vec은 <strong>수십억 단어</strong>를 학습해서 안정적인 벡터를 얻어요.
          "데이터가 많을수록 의미의 위치가 또렷해진다"는 점이 핵심이에요.
        </p>
      </div>
    </div>
  );
}

function WordPick({ model, value, onChange }: { model: W2VModel; value: string; onChange: (w: string) => void }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="px-2 py-1 rounded border border-border bg-surface font-mono"
    >
      {model.vocab.map((w) => (<option key={w} value={w}>{w}</option>))}
    </select>
  );
}

function NeedTrain() {
  return <div className="aside-warn mt-6">먼저 ① 학습 탭에서 모델을 학습시켜 주세요.</div>;
}

// ──────── PCA 3D 투영 ────────
function projectTo3D(model: W2VModel, words: string[]): number[][] {
  const idxs = words.map((w) => model.index.get(w)).filter((x): x is number => x !== undefined);
  if (idxs.length === 0) return words.map(() => [0, 0, 0]);
  const X = idxs.map((i) => model.W[i]);
  const dim = X[0].length;
  // mean centering
  const mean = new Array(dim).fill(0);
  for (const row of X) for (let i = 0; i < dim; i++) mean[i] += row[i];
  for (let i = 0; i < dim; i++) mean[i] /= X.length;
  const Xc = X.map((row) => row.map((v, i) => v - mean[i]));

  // 3 power-iteration components
  const comps: number[][] = [];
  // 변형 가능한 데이터 복사
  const data = Xc.map((r) => r.slice());

  for (let c = 0; c < 3; c++) {
    // initial vector
    let v = new Array(dim).fill(0).map(() => Math.random() - 0.5);
    v = normalize(v);
    for (let it = 0; it < 30; it++) {
      // y = X^T X v
      // 1) Xv (length n)
      const Xv = data.map((row) => dot(row, v));
      // 2) X^T (Xv) (length dim)
      const next = new Array(dim).fill(0);
      for (let r = 0; r < data.length; r++) {
        for (let i = 0; i < dim; i++) next[i] += data[r][i] * Xv[r];
      }
      v = normalize(next);
    }
    comps.push(v);
    // deflate: X = X - X v v^T
    for (let r = 0; r < data.length; r++) {
      const proj = dot(data[r], v);
      for (let i = 0; i < dim; i++) data[r][i] -= proj * v[i];
    }
  }

  // 단어 → 3D 좌표
  return words.map((w) => {
    const i = model.index.get(w);
    if (i === undefined) return [0, 0, 0];
    const xc = model.W[i].map((vv, k) => vv - mean[k]);
    return [dot(xc, comps[0]), dot(xc, comps[1]), dot(xc, comps[2])];
  });
}

function dot(a: number[], b: number[]): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
}

function normalize(v: number[]): number[] {
  const n = Math.sqrt(v.reduce((s, x) => s + x * x, 0));
  if (n < 1e-9) return v;
  return v.map((x) => x / n);
}

// 사용하지 않는 헬퍼지만 future에 쓸 수 있어서 export 형태로 보관할 필요 없음
void cosine;
