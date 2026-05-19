import { useEffect, useMemo, useState } from 'react';
import { useApp } from '../store';
import { PHASES } from '../phases';
import { STORY_CORPUS } from '../data/storyCorpus';
import {
  buildNGram,
  logitsFor,
  softmax,
  applyTopK,
  sampleFromDist,
  mulberry32,
  START, END,
} from '../lib/ngram';

const MODEL = buildNGram(STORY_CORPUS);

type Tab = 'dist' | 'sample' | 'gen';

export function Phase22() {
  const meta = PHASES.find((p) => p.id === 'p22')!;
  const [tab, setTab] = useState<Tab>('dist');
  const markCompleted = useApp((s) => s.markCompleted);

  useEffect(() => {
    if (tab === 'gen') markCompleted('p22');
  }, [tab, markCompleted]);

  return (
    <article>
      <div className="text-xs font-mono text-accent">{meta.num}</div>
      <h1>{meta.title}</h1>
      <p className="text-muted mt-2">
        C2에서 손글씨 0~9를 가른 다중 분류 신경망 기억나죠. 출력 뉴런 10개 중 가장 큰 값이 답.
        언어 모델은 같은 구조에 단 한 가지만 다릅니다 — <strong>출력 뉴런이 어휘 크기만큼</strong>이라는 것.
        그리고 한 번 답을 고르면 그걸 다시 입력에 붙여 또 다음 토큰을 골라요. 이게 GPT가 글을 만드는 방식입니다.
      </p>

      <div className="flex gap-1 mt-6 border-b border-border">
        <TabBtn active={tab === 'dist'}   onClick={() => setTab('dist')}>① 어휘에 점수 매기기</TabBtn>
        <TabBtn active={tab === 'sample'} onClick={() => setTab('sample')}>② 샘플링</TabBtn>
        <TabBtn active={tab === 'gen'}    onClick={() => setTab('gen')}>③ 이야기 만들기</TabBtn>
      </div>

      {tab === 'dist'   && <DistTab />}
      {tab === 'sample' && <SampleTab />}
      {tab === 'gen'    && <GenTab />}
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

// ──────── 탭 1 — 분포 보기 ────────
const PROMPT_OPTIONS: { ctx: string[]; label: string }[] = [
  { ctx: ['옛날', '옛적에'], label: '"옛날 옛적에" 다음에' },
  { ctx: ['어느', '날'],     label: '"어느 날" 다음에' },
  { ctx: ['토끼', '가'],     label: '"토끼 가" 다음에' },
  { ctx: ['여우', '가'],     label: '"여우 가" 다음에' },
  { ctx: ['바람', '이'],     label: '"바람 이" 다음에' },
  { ctx: ['해', '가'],       label: '"해 가" 다음에' },
  { ctx: ['그래서'],         label: '"그래서" 다음에' },
  { ctx: ['깊은', '숲'],     label: '"깊은 숲" 다음에' },
];

function DistTab() {
  const [pick, setPick] = useState(0);
  const ctx = PROMPT_OPTIONS[pick].ctx;
  const { logits, probs, order } = useMemo(() => {
    const i1 = ctx.length >= 1 ? (MODEL.index.get(ctx[ctx.length - 1]) ?? null) : null;
    const i2 = ctx.length >= 2 ? (MODEL.index.get(ctx[ctx.length - 2]) ?? null) : null;
    const logits = logitsFor(MODEL, i2, i1);
    const probs = softmax(logits, 1.0);
    const order = probs.map((_, i) => i).sort((a, b) => probs[b] - probs[a]);
    return { logits, probs, order };
  }, [ctx]);

  return (
    <div className="mt-6 space-y-5">
      <div className="aside-tip">
        <div className="font-medium">🎯 마지막 층의 출력 = 어휘에 대한 점수</div>
        <p className="text-sm mt-1">
          C2에서 10개 출력 점수에 softmax를 씌워 확률 분포로 만들었던 거 기억나죠.
          언어 모델도 똑같아요 — 다만 출력이 어휘 크기만큼이라 분포의 차원이 훨씬 큽니다.
          (이 데모의 어휘는 {MODEL.vocab.length - 1}개. 진짜 GPT는 약 10만 개.)
        </p>
      </div>

      <h2>프롬프트를 골라 보세요</h2>
      <div className="flex flex-wrap gap-2">
        {PROMPT_OPTIONS.map((p, i) => (
          <button key={i} onClick={() => setPick(i)}
            className={`btn-ghost text-sm ${i === pick ? 'border-accent text-accent' : ''}`}>
            {p.label}
          </button>
        ))}
      </div>

      <h2>다음 토큰 top-10 (T = 1.0)</h2>
      <div className="card p-4 space-y-1.5">
        {order.slice(0, 10).map((i, rank) => {
          const tok = MODEL.vocab[i];
          if (tok === START) return null;
          return (
            <div key={i} className="flex items-center gap-3 text-sm">
              <code className="w-6 text-right text-muted">{rank + 1}</code>
              <code className={`font-mono w-24 ${rank === 0 ? 'text-accent font-semibold' : ''}`}>{tok}</code>
              <div className="flex-1 h-3 bg-surface rounded overflow-hidden">
                <div className="h-full rounded bg-accent" style={{ width: `${probs[i] * 100}%` }} />
              </div>
              <code className="font-mono w-14 text-right">{(probs[i] * 100).toFixed(1)}%</code>
              <code className="font-mono w-12 text-right text-muted text-xs">z={logits[i].toFixed(1)}</code>
            </div>
          );
        })}
      </div>
      <p className="text-xs text-muted">
        같은 토큰("가")이 와도 그 앞 단어가 무엇이냐에 따라 다음 분포가 달라요 — 이게 문맥의 힘이에요.
        "토끼 가" 다음과 "여우 가" 다음이 같은지 비교해 보세요.
      </p>
    </div>
  );
}

// ──────── 탭 2 — 샘플링 ────────
function SampleTab() {
  const [temp, setTemp] = useState(1.0);
  const [topK, setTopK] = useState(0);
  const ctx = ['어느', '날'];
  const dist = useMemo(() => {
    const i1 = MODEL.index.get(ctx[1])!;
    const i2 = MODEL.index.get(ctx[0])!;
    const logits = logitsFor(MODEL, i2, i1);
    const raw = softmax(logits, Math.max(0.05, temp));
    return applyTopK(raw, topK);
  }, [temp, topK]);
  const order = dist.map((_, i) => i).sort((a, b) => dist[b] - dist[a]);

  return (
    <div className="mt-6 space-y-5">
      <div className="aside-tip">
        <div className="font-medium">🎯 어떻게 뽑느냐에 따라 다양성이 달라진다</div>
        <p className="text-sm mt-1">
          <strong>temperature</strong>로 분포를 뾰족↔평평하게 조절하고, <strong>top-k</strong>로 상위 k개만 후보로 남깁니다.
          진지한 답이 필요하면 낮게(0.3~0.7), 다양한 표현이 필요하면 높게(1.2~1.8).
        </p>
      </div>

      <div className="card p-4 grid sm:grid-cols-2 gap-4">
        <Slider label="temperature" min={0} max={2} step={0.05} value={temp} onChange={setTemp} hint={tempHint(temp)} />
        <Slider label="top-k (0 = 제한 없음)" min={0} max={15} step={1} value={topK} onChange={setTopK}
          hint={topK === 0 ? '제한 없음' : `상위 ${topK}개만 후보`} />
      </div>

      <h2>"어느 날" 다음 — 조절된 분포</h2>
      <div className="card p-4 space-y-1.5">
        {order.slice(0, 12).map((i, rank) => {
          if (MODEL.vocab[i] === START) return null;
          return (
            <div key={i} className="flex items-center gap-3 text-sm">
              <code className="w-6 text-right text-muted">{rank + 1}</code>
              <code className={`font-mono w-24 ${rank === 0 ? 'text-accent font-semibold' : ''}`}>{MODEL.vocab[i]}</code>
              <div className="flex-1 h-3 bg-surface rounded overflow-hidden">
                <div className="h-full rounded" style={{ width: `${dist[i] * 100}%`, background: dist[i] > 0 ? '#a855f7' : 'transparent' }} />
              </div>
              <code className="font-mono w-14 text-right">{(dist[i] * 100).toFixed(1)}%</code>
            </div>
          );
        })}
      </div>

      <div className="grid sm:grid-cols-3 gap-3 text-sm">
        <Recipe title="T = 0.3 — 보수적" desc="확률 1위가 거의 항상 뽑힘. 사실 확인·요약에 어울림." />
        <Recipe title="T = 1.0 — 균형" desc="기본값. 자연스럽고 다양한 답." />
        <Recipe title="T = 1.7 — 자유" desc="잘 안 쓰이는 단어도 자주 등장. 창작에 어울림." />
      </div>
    </div>
  );
}

function Slider({ label, min, max, step, value, onChange, hint }: {
  label: string; min: number; max: number; step: number; value: number; onChange: (v: number) => void; hint?: string;
}) {
  return (
    <div>
      <div className="text-xs text-muted">{label}</div>
      <div className="flex items-center gap-2 mt-1">
        <input type="range" min={min} max={max} step={step} value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))} className="flex-1" />
        <code className="font-mono w-12 text-right text-sm">
          {Number.isInteger(step) ? value : value.toFixed(2)}
        </code>
      </div>
      {hint && <div className="text-xs text-muted mt-0.5">{hint}</div>}
    </div>
  );
}

function Recipe({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="card p-3">
      <div className="font-medium">{title}</div>
      <div className="text-xs text-muted mt-1">{desc}</div>
    </div>
  );
}

function tempHint(t: number): string {
  if (t < 0.1) return '결정적 (top-1만)';
  if (t < 0.6) return '보수적';
  if (t <= 1.2) return '자연스러운 다양성';
  if (t <= 1.6) return '꽤 자유로움';
  return '거의 무작위';
}

// ──────── 탭 3 — 이야기 만들기 ────────
const START_PROMPTS = ['옛날 옛적에', '어느 날', '깊은 숲 에서', '한 마을 에서'];
const MAX_LEN = 30;

function GenTab() {
  const [prompt, setPrompt] = useState(START_PROMPTS[0]);
  const [seed, setSeed] = useState(7);
  const [temp, setTemp] = useState(1.0);
  const [topK, setTopK] = useState(6);
  const [length, setLength] = useState(14);

  const story = useMemo(() => generate(prompt, seed, temp, topK, length), [prompt, seed, temp, topK, length]);

  return (
    <div className="mt-6 space-y-5">
      <div className="aside-tip">
        <div className="font-medium">🎯 자기회귀 — 한 토큰을 뽑으면 입력에 붙여 다음을 또 뽑는다</div>
        <p className="text-sm mt-1">
          한 번 답을 고를 때마다 그걸 다시 입력에 붙입니다. 30개 토큰을 뽑으려면 신경망이 30번 돕니다.
          시드를 바꾸면 같은 시작이라도 다른 이야기가 나와요.
        </p>
      </div>

      <div className="card p-4 space-y-3">
        <div>
          <div className="text-xs text-muted mb-1">시작 프롬프트</div>
          <div className="flex flex-wrap gap-2">
            {START_PROMPTS.map((p) => (
              <button key={p} onClick={() => setPrompt(p)}
                className={`btn-ghost text-sm ${prompt === p ? 'border-accent text-accent' : ''}`}>
                {p}
              </button>
            ))}
          </div>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <div className="text-xs text-muted">시드</div>
            <div className="flex items-center gap-2 mt-1">
              <input type="number" value={seed} onChange={(e) => setSeed(parseInt(e.target.value || '0'))}
                className="w-20 px-2 py-1 rounded border border-border bg-surface font-mono text-sm" />
              <button onClick={() => setSeed(seed + 1)} className="btn-ghost text-xs">다른 시드</button>
            </div>
          </div>
          <Slider label="temperature" min={0.1} max={1.8} step={0.05} value={temp} onChange={setTemp} hint={tempHint(temp)} />
          <Slider label="top-k" min={1} max={15} step={1} value={topK} onChange={setTopK} />
          <Slider label={`길이 (${length} 토큰)`} min={5} max={MAX_LEN} step={1} value={length} onChange={setLength} />
        </div>
      </div>

      <h2>생성된 이야기</h2>
      <div className="card p-5 min-h-[120px]">
        <div className="text-base leading-relaxed">
          <span className="text-muted">{prompt}</span>
          {story.map((tok, i) => (
            <span key={i}
              className="ml-1 px-1.5 py-0.5 rounded transition"
              style={{ background: 'rgba(168, 85, 247, 0.12)', color: '#7c3aed' }}
            >
              {tok}
            </span>
          ))}
        </div>
      </div>

      <p className="text-xs text-muted">
        시드만 +1 해도 다른 이야기, temperature를 높이면 더 엉뚱한 이야기, top-k를 줄이면 더 안전한 이야기.
        같은 알고리즘으로도 손잡이 세 개만 돌려 결과가 크게 달라지는 점이 LLM의 사용법 그대로예요.
      </p>

      <div className="aside-note text-sm">
        💡 이 데모는 trigram/bigram 통계로 그럴듯한 다음 토큰을 뽑는 미니 LM이에요. 진짜 GPT는 트랜스포머 신경망이
        같은 일을 하지만 — 멀리 떨어진 단어 사이의 관계도 본다는 점, 어휘가 비교할 수 없을 만큼 크다는 점이 다릅니다.
        핵심 알고리즘 — <strong>다음 토큰 분포 만들기 → 샘플링 → 자기회귀</strong> — 는 똑같아요.
      </div>
    </div>
  );
}

function generate(promptStr: string, seed: number, temp: number, topK: number, length: number): string[] {
  const tokens = promptStr.split(/\s+/).filter(Boolean);
  const out: string[] = [];
  const rng = mulberry32(seed);
  const ctx = [...tokens];
  for (let step = 0; step < length; step++) {
    const i1 = MODEL.index.get(ctx[ctx.length - 1]);
    const i2 = ctx.length >= 2 ? MODEL.index.get(ctx[ctx.length - 2]) : undefined;
    const logits = logitsFor(MODEL, i2 ?? null, i1 ?? null);
    const raw = softmax(logits, Math.max(0.05, temp));
    const dist = applyTopK(raw, topK);
    const chosen = sampleFromDist(dist, rng);
    const tok = MODEL.vocab[chosen];
    if (tok === START) continue;
    out.push(tok);
    ctx.push(tok);
    if (tok === END) break;
  }
  return out;
}
