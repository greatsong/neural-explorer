import { useEffect, useMemo, useState } from 'react';
import { useApp } from '../store';

type Tab = 'logits' | 'sampling' | 'generate';

// 손글씨 시뮬레이션: 짧은 문맥 → 다음 토큰 분포
// "고양이는" 다음에 올 만한 토큰을 점수(logit)로 직접 부여한 미니 어휘.
const VOCAB = ['귀엽다', '잔다', '쥐를', '동물', '간식', '집사', '울음', '뛴다', '그림', '먹는다', '낮잠', '소리', '강아지', '주인', '안녕', '밥', '문', '?', '.', '!'];
const BASE_LOGITS_BY_CONTEXT: Record<string, number[]> = {
  '고양이는': [4.2, 3.6, 2.4, 2.1, 1.7, 2.0, 1.5, 1.8, 0.6, 1.4, 1.6, 0.9, 0.5, 1.2, 0.3, 1.0, 0.6, 0.4, 0.8, 0.4],
  '오늘 날씨가': [0.3, 0.2, 0.4, 0.4, 0.2, 0.1, 0.2, 0.3, 0.5, 0.1, 0.5, 0.3, 0.1, 0.2, 0.5, 0.1, 0.1, 0.6, 1.4, 1.0],
  '나는 인공지능을': [0.4, 0.2, 0.3, 0.6, 0.2, 0.2, 0.2, 0.3, 0.7, 1.4, 0.4, 0.2, 0.5, 0.3, 0.2, 0.2, 0.1, 0.5, 1.6, 0.5],
};

// 더 자연스러운 결과를 위해 컨텍스트별 자유 텍스트도 허용 — 매핑이 없으면 무작위 베이스
function logitsForContext(ctx: string): number[] {
  if (BASE_LOGITS_BY_CONTEXT[ctx]) return BASE_LOGITS_BY_CONTEXT[ctx];
  // 알지 못하는 문맥 → 거의 균등 + 약간의 변동
  return VOCAB.map((_, i) => 0.5 + (Math.sin(i * 1.3 + hash(ctx)) + 1) * 0.6);
}

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return (h % 1000) / 100;
}

export function Phase22() {
  const [tab, setTab] = useState<Tab>('logits');
  const markCompleted = useApp((s) => s.markCompleted);

  useEffect(() => {
    if (tab === 'generate') markCompleted('p22');
  }, [tab, markCompleted]);

  return (
    <article>
      <div className="text-xs font-mono text-muted">PHASE 22</div>
      <h1>GPT의 다음 토큰 — 샘플링이 곧 창의성</h1>
      <p className="text-muted mt-2">
        GPT가 답하는 방식은 한 번에 한 토큰씩 — 매번 어휘 전체에 대해 <strong>확률 분포</strong>를 만들고,
        그 분포에서 한 토큰을 <strong>샘플링</strong>합니다. 어떻게 뽑느냐(temperature, top-k, top-p)에 따라
        같은 모델이 진지한 답을 줄 수도, 엉뚱한 시도 줄 수도 있어요.
      </p>

      <div className="flex gap-1 mt-6 border-b border-border">
        <TabBtn active={tab === 'logits'} onClick={() => setTab('logits')}>① 어휘 분포</TabBtn>
        <TabBtn active={tab === 'sampling'} onClick={() => setTab('sampling')}>② 샘플링 슬라이더</TabBtn>
        <TabBtn active={tab === 'generate'} onClick={() => setTab('generate')}>③ 자기회귀 생성</TabBtn>
      </div>

      {tab === 'logits' && <LogitsTab />}
      {tab === 'sampling' && <SamplingTab />}
      {tab === 'generate' && <GenerateTab />}
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
function LogitsTab() {
  const [ctx, setCtx] = useState<string>('고양이는');
  const logits = logitsForContext(ctx);
  const probs = softmax(logits, 1.0);
  const order = probs.map((_, i) => i).sort((a, b) => probs[b] - probs[a]);

  return (
    <div className="mt-6 space-y-5">
      <div className="aside-tip">
        <div className="font-medium">🎯 마지막 층의 출력 = 어휘에 대한 점수</div>
        <p className="text-sm mt-1">
          트랜스포머의 마지막 출력은 어휘 크기만큼의 숫자 벡터예요. 이걸 <strong>logit</strong>이라 부르고,
          softmax를 거치면 <strong>확률 분포</strong>가 됩니다.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {Object.keys(BASE_LOGITS_BY_CONTEXT).map((c) => (
          <button key={c} onClick={() => setCtx(c)} className={`btn-ghost text-sm ${ctx === c ? 'border-accent text-accent' : ''}`}>
            "{c}"
          </button>
        ))}
      </div>

      <h2>top-10 단어 (T=1.0)</h2>
      <div className="card p-4 space-y-1.5">
        {order.slice(0, 10).map((i, rank) => (
          <div key={i} className="flex items-center gap-3 text-sm">
            <code className="w-6 text-right text-muted">{rank + 1}</code>
            <code className={`font-mono w-20 ${rank === 0 ? 'text-accent font-semibold' : ''}`}>{VOCAB[i]}</code>
            <div className="flex-1 h-3 bg-surface rounded overflow-hidden">
              <div className="h-full rounded bg-accent" style={{ width: `${probs[i] * 100}%` }} />
            </div>
            <code className="font-mono w-14 text-right">{(probs[i] * 100).toFixed(1)}%</code>
          </div>
        ))}
      </div>
    </div>
  );
}

// ──────── 탭 2 ────────
function SamplingTab() {
  const [temp, setTemp] = useState(1.0);
  const [topK, setTopK] = useState(0); // 0 = 끔
  const [topP, setTopP] = useState(1.0);
  const ctx = '고양이는';
  const logits = logitsForContext(ctx);

  const distRaw = useMemo(() => softmax(logits, Math.max(0.05, temp)), [logits, temp]);
  const dist = useMemo(() => applyTopKP(distRaw, topK, topP), [distRaw, topK, topP]);
  const order = dist.map((_, i) => i).sort((a, b) => dist[b] - dist[a]);

  return (
    <div className="mt-6 space-y-5">
      <div className="aside-tip">
        <div className="font-medium">🎯 샘플링이 곧 창의성</div>
        <p className="text-sm mt-1">
          temperature로 분포의 뾰족함을 조절하고, top-k / top-p로 후보를 잘라내요.
          진지한 답이 필요하면 낮게, 다양한 표현이 필요하면 높게.
        </p>
      </div>

      <div className="card p-4 grid sm:grid-cols-3 gap-4">
        <Slider label="temperature" min={0.0} max={2.0} step={0.05} value={temp} onChange={setTemp} hint={tempHint(temp)} />
        <Slider label="top-k (0=꺼짐)" min={0} max={20} step={1} value={topK} onChange={setTopK} hint={topK === 0 ? '제한 없음' : `상위 ${topK}개만`} />
        <Slider label="top-p (nucleus)" min={0.1} max={1.0} step={0.05} value={topP} onChange={setTopP} hint={topP >= 0.99 ? '제한 없음' : `누적 확률 ${(topP * 100).toFixed(0)}%까지`} />
      </div>

      <h2>"{ctx}" 다음 — 조절된 분포</h2>
      <div className="card p-4 space-y-1.5">
        {order.slice(0, 12).map((i, rank) => (
          <div key={i} className="flex items-center gap-3 text-sm">
            <code className="w-6 text-right text-muted">{rank + 1}</code>
            <code className={`font-mono w-20 ${rank === 0 ? 'text-accent font-semibold' : ''}`}>{VOCAB[i]}</code>
            <div className="flex-1 h-3 bg-surface rounded overflow-hidden">
              <div className="h-full rounded" style={{ width: `${dist[i] * 100}%`, background: dist[i] > 0 ? '#a855f7' : 'transparent' }} />
            </div>
            <code className="font-mono w-14 text-right">{(dist[i] * 100).toFixed(1)}%</code>
          </div>
        ))}
      </div>

      <div className="grid sm:grid-cols-3 gap-3 text-sm">
        <Recipe temp={0} title="T=0 — 결정적" desc="언제나 같은 답. 사실 확인·요약에 어울려요." />
        <Recipe temp={1} title="T=1 — 균형" desc="기본값. 자연스럽고 다양한 답." />
        <Recipe temp={2} title="T=2 — 엉뚱" desc="확률이 평탄해져 사실상 무작위에 가깝습니다." />
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
        <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(parseFloat(e.target.value))} className="flex-1" />
        <code className="font-mono w-12 text-right text-sm">{typeof value === 'number' && !Number.isInteger(step) ? value.toFixed(2) : value}</code>
      </div>
      {hint && <div className="text-xs text-muted mt-0.5">{hint}</div>}
    </div>
  );
}

function Recipe({ title, desc }: { temp: number; title: string; desc: string }) {
  return (
    <div className="card p-3">
      <div className="font-medium">{title}</div>
      <div className="text-xs text-muted mt-1">{desc}</div>
    </div>
  );
}

function tempHint(t: number): string {
  if (t <= 0.1) return '사실상 결정적 (top-1만)';
  if (t < 0.7) return '안정적, 보수적인 답';
  if (t <= 1.2) return '자연스러운 다양성';
  if (t <= 1.6) return '꽤 자유로운 답';
  return '거의 무작위에 가까움';
}

// ──────── 탭 3 ────────
function GenerateTab() {
  const [prompt, setPrompt] = useState('고양이는');
  const [temp, setTemp] = useState(1.0);
  const [topK, setTopK] = useState(8);
  const [seq, setSeq] = useState<string[]>([]);
  const [seed, setSeed] = useState(7);

  const reset = () => { setSeq([]); };

  const step = () => {
    const ctx = prompt + (seq.length ? ' ' + seq.join(' ') : '');
    const logits = logitsForContext(seq.length === 0 ? prompt : ctx);
    const distRaw = softmax(logits, Math.max(0.05, temp));
    const dist = applyTopKP(distRaw, topK, 1.0);
    const r = mulberry32(seed + seq.length * 31)();
    let acc = 0;
    let chosen = 0;
    for (let i = 0; i < dist.length; i++) {
      acc += dist[i];
      if (r <= acc) { chosen = i; break; }
    }
    setSeq([...seq, VOCAB[chosen]]);
  };

  return (
    <div className="mt-6 space-y-5">
      <div className="aside-tip">
        <div className="font-medium">🎯 자기회귀 생성</div>
        <p className="text-sm mt-1">
          한 토큰을 뽑으면, 그걸 다시 입력에 붙여서 다음 토큰을 또 뽑아요. 이게 GPT가 문장을 만드는 방식입니다.
          한 번에 한 토큰씩 — 그래서 답이 길수록 시간이 걸려요.
        </p>
      </div>

      <div className="card p-4 space-y-3">
        <label className="block text-sm">
          프롬프트
          <input value={prompt} onChange={(e) => { setPrompt(e.target.value); setSeq([]); }}
            className="mt-1 w-full px-3 py-2 rounded border border-border bg-surface font-mono" />
          <div className="text-xs text-muted mt-1">예시: "고양이는", "오늘 날씨가", "나는 인공지능을"</div>
        </label>
        <div className="grid sm:grid-cols-3 gap-3">
          <Slider label="temperature" min={0.0} max={2.0} step={0.05} value={temp} onChange={setTemp} />
          <Slider label="top-k" min={1} max={20} step={1} value={topK} onChange={setTopK} />
          <div>
            <div className="text-xs text-muted">시드</div>
            <div className="flex items-center gap-2 mt-1">
              <input type="number" value={seed} onChange={(e) => setSeed(parseInt(e.target.value || '0'))}
                className="w-24 px-2 py-1 rounded border border-border bg-surface font-mono text-sm" />
              <button onClick={() => { setSeed(seed + 1); setSeq([]); }} className="btn-ghost text-xs">새 시드</button>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={step} className="btn-primary text-sm">한 토큰 더 →</button>
          <button onClick={reset} className="btn-ghost text-sm">초기화</button>
        </div>
      </div>

      <div className="card p-4 min-h-[100px]">
        <div className="text-xs text-muted">생성된 시퀀스</div>
        <div className="mt-2 text-lg font-mono leading-relaxed flex flex-wrap gap-1">
          <span>{prompt}</span>
          {seq.map((tok, i) => (
            <span key={i} className="px-2 rounded" style={{ background: 'rgba(168, 85, 247, 0.18)', color: '#a855f7' }}>{tok}</span>
          ))}
        </div>
      </div>

      <div className="aside-note">
        💡 진짜 GPT는 어휘가 50,000개가 넘고, 한 번 뽑을 때마다 트랜스포머 전체가 한 번 돌아갑니다.
        지금까지의 모든 단계 — 토큰화, 임베딩, 어텐션, 멀티헤드, 깊은 블록, 다음 토큰 분포 — 가 한 줄에 모두 들어 있어요.
      </div>
    </div>
  );
}

// ──────── 헬퍼 ────────
function softmax(arr: number[], temperature: number): number[] {
  const t = Math.max(0.05, temperature);
  const scaled = arr.map((x) => x / t);
  const m = Math.max(...scaled);
  const e = scaled.map((x) => Math.exp(x - m));
  const s = e.reduce((a, b) => a + b, 0);
  return e.map((x) => x / s);
}

function applyTopKP(probs: number[], k: number, p: number): number[] {
  const idx = probs.map((_, i) => i).sort((a, b) => probs[b] - probs[a]);
  const out = new Array(probs.length).fill(0);
  let cum = 0;
  for (let r = 0; r < idx.length; r++) {
    if (k > 0 && r >= k) break;
    out[idx[r]] = probs[idx[r]];
    cum += probs[idx[r]];
    if (p < 1.0 && cum >= p) break;
  }
  // 재정규화
  const s = out.reduce((a, b) => a + b, 0);
  if (s < 1e-9) return probs.slice();
  return out.map((v) => v / s);
}

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
