import { useEffect, useState } from 'react';
import { useApp } from '../store';
import { PHASES } from '../phases';
import { Scatter3D, type Point3D } from '../components/Scatter3D';
import {
  initModel,
  trainSkipGram,
  vec,
  nearest,
  add,
  sub,
  type W2VModel,
} from '../lib/w2v';
import { EN_CORPUS, KO_CORPUS } from '../data/w2vCorpus';
import { EN_PRETRAINED, KO_PRETRAINED, type PretrainedW2V } from '../data/w2vPretrained';

type Tab = 'train' | 'space' | 'arith';
type Lang = 'en' | 'ko';

// 사전 학습된 임베딩 → W2VModel 로 복원 (Map 재구축).
function fromPretrained(p: PretrainedW2V): W2VModel {
  const index = new Map<string, number>();
  p.vocab.forEach((w, i) => index.set(w, i));
  return { vocab: p.vocab, index, W: p.W, C: p.C, dim: p.dim };
}

// nearest 결과 필터링용 — 입력 단어(a,b,c)는 자동 제외되므로 'man'/'woman'을 stop에 넣어도 산수 입력에는 영향 없음.
// 'man'/'woman'(남자/여자)이 평균 방향에 자리잡아 임의 쿼리 결과의 1위로 자주 끼어드는 잡음을 제거.
const EN_STOP = new Set(['a', 'an', 'the', 'is', 'are', 'and', 'of', 'in', 'to', 'we', 'eat', 'rule', 'rules', 'together', 'capital', 'city', 'cities', 'country', 'countries', 'asia', 'man', 'woman', 'young', 'baby']);
const KO_STOP = new Set(['은', '는', '이', '가', '을', '를', '의', '과', '와', '에', '이다', '있다', '어린', '새끼', '우리', '함께', '먹는다', '다스린다', '수도', '도시', '나라', '아시아', '남자', '여자']);

const PRESETS: Record<Lang, { word: string; group: 'royal' | 'family' | 'animal' | 'fruit' | 'food' | 'gender' | 'country' | 'capital' }[]> = {
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
    { word: 'japan', group: 'country' }, { word: 'korea', group: 'country' },
    { word: 'france', group: 'country' }, { word: 'china', group: 'country' },
    { word: 'tokyo', group: 'capital' }, { word: 'seoul', group: 'capital' },
    { word: 'paris', group: 'capital' }, { word: 'beijing', group: 'capital' },
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
    { word: '일본', group: 'country' }, { word: '한국', group: 'country' },
    { word: '프랑스', group: 'country' }, { word: '중국', group: 'country' },
    { word: '도쿄', group: 'capital' }, { word: '서울', group: 'capital' },
    { word: '파리', group: 'capital' }, { word: '베이징', group: 'capital' },
  ],
};

const GROUP_COLORS: Record<string, string> = {
  royal: '#a855f7',
  family: '#ef4444',
  gender: '#0ea5e9',
  animal: '#16a34a',
  fruit: '#f59e0b',
  food: '#a16207',
  country: '#0d9488',
  capital: '#db2777',
};

// 사전 학습 모델에서 답이 top-3 안에 안정적으로 잡히는 페어(★)와 시드/스텝 실험이 필요한 도전 페어(◇).
// 학생이 사전 모델로 ★를 먼저 확인하고, ◇는 "다시 학습" + 시드 변경으로 직접 탐험.
const PROVEN: Record<Lang, { a: string; b: string; c: string; expect: string; stable?: boolean }[]> = {
  en: [
    { a: 'tokyo', b: 'japan', c: 'korea', expect: 'seoul', stable: true },
    { a: 'beijing', b: 'china', c: 'france', expect: 'paris', stable: true },
    { a: 'king', b: 'man', c: 'woman', expect: 'queen', stable: true },
    { a: 'boy', b: 'man', c: 'woman', expect: 'girl' },
    { a: 'paris', b: 'france', c: 'japan', expect: 'tokyo' },
    { a: 'prince', b: 'man', c: 'woman', expect: 'princess' },
    { a: 'father', b: 'man', c: 'woman', expect: 'mother' },
  ],
  ko: [
    { a: '왕', b: '남자', c: '여자', expect: '여왕', stable: true },
    { a: '도쿄', b: '일본', c: '한국', expect: '서울', stable: true },
    { a: '베이징', b: '중국', c: '프랑스', expect: '파리', stable: true },
    { a: '파리', b: '프랑스', c: '일본', expect: '도쿄', stable: true },
    { a: '아빠', b: '남자', c: '여자', expect: '엄마', stable: true },
    { a: '왕자', b: '남자', c: '여자', expect: '공주' },
    { a: '소년', b: '남자', c: '여자', expect: '소녀' },
  ],
};

// 사전 학습된 임베딩과 동일한 파라미터를 기본값으로 — 학생이 "다시 학습" 누르면 비슷한 결과 재현.
const DEFAULT_SEED: Record<Lang, number> = { en: 7, ko: 11 };
const DEFAULT_WINDOW: Record<Lang, number> = { en: 2, ko: 4 };
const PRETRAINED: Record<Lang, PretrainedW2V> = { en: EN_PRETRAINED, ko: KO_PRETRAINED };

export function Phase18() {
  const meta = PHASES.find((p) => p.id === 'p18')!;
  const [tab, setTab] = useState<Tab>('train');
  const [lang, setLang] = useState<Lang>('en');
  const [seed, setSeed] = useState<number>(DEFAULT_SEED.en);
  const [steps, setSteps] = useState(6000);
  // 사전 학습된 모델을 기본 로드 — 학생이 학습 안 해도 ②③ 탭이 바로 동작.
  const [model, setModel] = useState<W2VModel | null>(() => fromPretrained(EN_PRETRAINED));
  const [losses, setLosses] = useState<number[]>([]);
  const [usedPretrained, setUsedPretrained] = useState(true);
  const markCompleted = useApp((s) => s.markCompleted);

  const corpus = lang === 'en' ? EN_CORPUS : KO_CORPUS;

  useEffect(() => {
    setSeed(DEFAULT_SEED[lang]);
    setModel(fromPretrained(PRETRAINED[lang]));
    setUsedPretrained(true);
    setLosses([]);
  }, [lang]);

  useEffect(() => {
    if (tab === 'arith' && model) markCompleted('p18');
  }, [tab, model, markCompleted]);

  const train = () => {
    const m = initModel(corpus, 32, seed);
    const { lossHistory } = trainSkipGram(m, corpus, {
      steps,
      lr: 0.05,
      windowSize: DEFAULT_WINDOW[lang],
      negatives: 3,
      seed,
    });
    setModel(m);
    setUsedPretrained(false);
    setLosses(lossHistory);
  };

  return (
    <article>
      <div className="text-xs font-mono text-accent">{meta.num}</div>
      <h1>{meta.title} — 브라우저에서 직접 학습하는 Word2Vec 미니</h1>
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

      {tab === 'train' && <TrainTab corpus={corpus} model={model} losses={losses} usedPretrained={usedPretrained} />}
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
function TrainTab({ corpus, model, losses, usedPretrained }: { corpus: string[]; model: W2VModel | null; losses: number[]; usedPretrained: boolean }) {
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

      {usedPretrained && (
        <div className="aside-note">
          <div className="font-medium">📦 사전 학습된 임베딩이 로드되어 있어요</div>
          <p className="text-sm mt-1 text-muted">
            ② 임베딩 공간과 ③ 벡터 산수 탭은 지금 바로 결과를 볼 수 있습니다.
            <strong> "다시 학습"</strong> 버튼을 누르면 시드·스텝 값으로 학생이 직접 학습한 결과로 교체돼,
            토이 모델의 결과가 시드마다 어떻게 흔들리는지 비교해 볼 수 있어요.
          </p>
        </div>
      )}

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
  const presets = PRESETS[lang];
  if (!model) return <NeedTrain />;
  const dim = model.dim;
  // 학습된 가중치 그대로 — 32개 차원 중 처음 3개를 좌표축으로 쓴다. 따로 줄이는 처리는 안 한다.
  const points: Point3D[] = presets
    .map((p) => {
      const i = model.index.get(p.word);
      if (i === undefined) return null;
      const v = model.W[i];
      return {
        x: v[0], y: v[1], z: v[2],
        label: p.word,
        color: GROUP_COLORS[p.group],
        size: 7,
      } as Point3D;
    })
    .filter((p): p is Point3D => p !== null);

  return (
    <div className="mt-6 space-y-5">
      <div className="aside-tip">
        <div className="font-medium">🎯 학습된 임베딩 공간</div>
        <p className="text-sm mt-1">
          학습이 끝난 단어 벡터를 그대로 좌표로 찍었어요. 한 단어가 {dim}개의 숫자(=가중치)를 갖는데,
          여기서는 그 중 <strong>처음 3개(d1·d2·d3)</strong>를 x·y·z축에 그대로 가져다 썼습니다.
          같은 묶음 단어가 어느 정도 비슷한 자리에 모이는지 살펴보세요.
        </p>
      </div>

      <div className="card p-3">
        <Scatter3D points={points} axisLabels={['d1', 'd2', 'd3']} />
        <Legend />
        <p className="text-xs text-muted mt-2">
          참고: {dim}개 차원 중 3개만 본 거라 클러스터가 또렷하지 않을 수도 있어요. 모든 차원을 한꺼번에 본 결과는
          ③ 탭의 벡터 산수(왕 − 남자 + 여자 ≈ 여왕)에서 더 또렷하게 드러납니다.
        </p>
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
  return ({ royal: '왕족', family: '가족', gender: '성별', animal: '동물', fruit: '과일', food: '음식', country: '나라', capital: '수도' } as const)[g as 'royal'] ?? g;
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
          그래서 <strong>왕 - 남자 + 여자</strong>를 계산해 가장 가까운 단어를 찾으면 <strong>여왕</strong>이 나오고,
          같은 원리로 <strong>도쿄 - 일본 + 한국</strong>을 계산하면 <strong>서울</strong>이 나옵니다.
          페이지 진입 시에는 <strong>사전 학습된 임베딩</strong>이 자동으로 로드되어 결과를 바로 볼 수 있어요.
          ① 학습 탭에서 "다시 학습"을 누르면 학생이 직접 학습한 결과로 비교해 볼 수도 있습니다.
        </p>
      </div>

      <h2>페어 카드</h2>
      <p className="text-xs text-muted mb-2">
        <strong>★</strong> = 사전 학습 모델에서 정답이 <strong>top-3 안에</strong> 안정적으로 나오는 페어 ·
        <strong className="ml-2">◇</strong> = 시드/스텝에 따라 흔들리는 도전 페어 (직접 학습 실험에 적합)
      </p>
      <div className="flex flex-wrap gap-2">
        {proven.map((p, i) => (
          <button
            key={i}
            onClick={() => { setA(p.a); setB(p.b); setC(p.c); }}
            className={'btn-ghost text-sm ' + (p.stable ? 'ring-1 ring-emerald-500/40' : '')}
            title={p.stable ? '안정 페어 — 사전 학습 모델에서 top-3' : '도전 페어 — 시드/스텝을 바꿔가며 실험'}
          >
            <span className="mr-1">{p.stable ? '★' : '◇'}</span>
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

