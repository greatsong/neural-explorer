import { useEffect, useMemo, useState } from 'react';
import { useApp } from '../store';

type Tab = 'idea' | 'bpe' | 'compare';

export function Phase16() {
  const [tab, setTab] = useState<Tab>('idea');
  const markCompleted = useApp((s) => s.markCompleted);

  useEffect(() => {
    if (tab === 'compare') markCompleted('p16');
  }, [tab, markCompleted]);

  return (
    <article>
      <div className="text-xs font-mono text-muted">PHASE 16</div>
      <h1>토큰 — 단어보다 작고, 글자보다 큰 조각</h1>
      <p className="text-muted mt-2">
        모델은 글자도 단어도 아닌 <strong>토큰(token)</strong> 단위로 문장을 받아요.
        "Hello world"는 단어 두 개일 수 있지만, "공부했어요"는 한 글자씩 쪼개져 토큰 5~8개가 되기도 합니다.
        왜 그런지, BPE라는 규칙을 직접 따라가며 봅시다.
      </p>

      <div className="flex gap-1 mt-6 border-b border-border">
        <TabBtn active={tab === 'idea'} onClick={() => setTab('idea')}>① 토크나이저 시연</TabBtn>
        <TabBtn active={tab === 'bpe'} onClick={() => setTab('bpe')}>② BPE 미니 시뮬레이터</TabBtn>
        <TabBtn active={tab === 'compare'} onClick={() => setTab('compare')}>③ 영어 vs 한글</TabBtn>
      </div>

      {tab === 'idea' && <IdeaTab />}
      {tab === 'bpe' && <BpeTab />}
      {tab === 'compare' && <CompareTab />}
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

// ──────── 탭 1: 시연 ────────
function IdeaTab() {
  const samples = [
    { label: '영어 — 친숙한 단어', text: 'Hello world' },
    { label: '영어 — 긴 단어', text: 'Tokenization is fun' },
    { label: '한글 — 인사', text: '안녕하세요' },
    { label: '한글 — 활용형', text: '공부했어요' },
    { label: '한·영 섞임', text: 'GPT는 한글을 잘게 쪼개요' },
  ];

  return (
    <div className="mt-6 space-y-5">
      <div className="aside-tip">
        <div className="font-medium">🎯 핵심 아이디어</div>
        <p className="text-sm mt-1">
          영어는 자주 등장하는 <strong>단어 통째로</strong> 한 토큰이 되는 경우가 많아요.
          한글은 자주 등장하는 조합이 적어서 <strong>한 글자씩 또는 바이트 단위</strong>로 쪼개지는 경우가 많고,
          그래서 토큰이 더 많이 나옵니다.
        </p>
      </div>

      <h2>예시 — GPT 스타일 토크나이저</h2>
      <div className="space-y-3">
        {samples.map((s, i) => {
          const toks = pseudoTokenize(s.text);
          return (
            <div key={i} className="card p-4">
              <div className="flex items-baseline justify-between gap-3">
                <div>
                  <div className="text-xs font-mono text-muted">{s.label}</div>
                  <div className="text-base mt-0.5">{s.text}</div>
                </div>
                <div className="text-xs text-muted shrink-0">
                  글자 <strong className="text-text">{[...s.text].length}</strong> ·
                  토큰 <strong className="text-accent">{toks.length}</strong>
                </div>
              </div>
              <div className="flex gap-1 mt-3 flex-wrap">
                {toks.map((t, j) => (
                  <span
                    key={j}
                    className="px-2 py-1 rounded text-sm font-mono"
                    style={{ background: tokHue(j), color: '#0f172a' }}
                  >
                    {t.replace(/ /g, '·')}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-sm text-muted">
        ※ 실제 GPT 토크나이저(BPE/cl100k)는 50,000개가 넘는 토큰 사전을 가지고 있어요.
        여기서는 동작 직관만 보기 위해 작은 사전으로 흉내냅니다.
      </p>
    </div>
  );
}

// ──────── 탭 2: BPE ────────
interface BpeStep {
  step: number;
  pair: [string, string] | null;
  count: number;
  vocab: string[]; // 토큰 종류
  encoded: string[][]; // 각 단어를 토큰 시퀀스로
}

function BpeTab() {
  const corpus = useMemo(
    () => ['low', 'low', 'low', 'lower', 'newer', 'newer', 'newer', 'wider', 'widest'],
    []
  );
  const [step, setStep] = useState(0);
  const history = useMemo(() => bpeRun(corpus, 8), [corpus]);
  const cur = history[Math.min(step, history.length - 1)];

  return (
    <div className="mt-6 space-y-5">
      <div className="aside-tip">
        <div className="font-medium">🎯 BPE의 단순한 규칙</div>
        <p className="text-sm mt-1">
          ① 모든 단어를 글자 단위로 쪼갠다. ② <strong>가장 자주 함께 등장하는 두 토큰을 합쳐</strong> 새 토큰으로 만든다.
          ③ 이걸 반복한다. 그게 끝. 자주 등장하는 묶음일수록 빨리 한 덩어리가 돼요.
        </p>
      </div>

      <h2>코퍼스</h2>
      <div className="card p-4 text-sm font-mono">
        {corpus.join(' · ')}
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <button
          onClick={() => setStep(Math.max(0, step - 1))}
          className="btn-ghost text-sm"
          disabled={step === 0}
        >
          ← 이전
        </button>
        <button
          onClick={() => setStep(Math.min(history.length - 1, step + 1))}
          className="btn-primary text-sm"
          disabled={step === history.length - 1}
        >
          다음 합치기 →
        </button>
        <button onClick={() => setStep(0)} className="btn-ghost text-sm">
          처음으로
        </button>
        <span className="text-sm text-muted ml-2">스텝 {cur.step} / {history.length - 1}</span>
      </div>

      <div className="card p-4 space-y-3">
        <div className="text-sm">
          {cur.pair ? (
            <>
              이번 스텝: <code className="font-mono px-2 py-0.5 rounded bg-amber-200/40">{cur.pair[0]}</code>
              + <code className="font-mono px-2 py-0.5 rounded bg-amber-200/40">{cur.pair[1]}</code>
              → <code className="font-mono px-2 py-0.5 rounded bg-accent-bg text-accent">{cur.pair.join('')}</code>
              <span className="text-muted ml-2">(코퍼스 안에 {cur.count}번 나옴)</span>
            </>
          ) : (
            <span className="text-muted">아직 아무 합치기도 하지 않은 시작 상태입니다.</span>
          )}
        </div>

        <div>
          <div className="text-xs text-muted mb-1">현재 토큰 사전 ({cur.vocab.length}개)</div>
          <div className="flex flex-wrap gap-1">
            {cur.vocab.map((v, i) => (
              <span key={i} className="px-2 py-0.5 rounded text-xs font-mono bg-surface border border-border">
                {v.replace(/_/g, '_')}
              </span>
            ))}
          </div>
        </div>

        <div>
          <div className="text-xs text-muted mb-1">코퍼스 단어가 어떻게 쪼개져 있는지</div>
          <div className="space-y-1">
            {corpus.map((w, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <code className="font-mono text-muted w-20">{w}</code>
                <div className="flex gap-1 flex-wrap">
                  {cur.encoded[i].map((t, j) => (
                    <span key={j} className="px-2 py-0.5 rounded text-xs font-mono" style={{ background: tokHue(j), color: '#0f172a' }}>
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <p className="text-sm text-muted">
        몇 스텝만 지나도 'low', 'er', 'new' 같은 자주 쓰이는 묶음이 한 토큰이 됩니다.
        이런 식으로 50,000번쯤 합치면 GPT 사전이 만들어져요.
        반대로 한글은 학습 코퍼스에 같은 글자 조합이 영어만큼 자주 등장하지 않아 합쳐지는 일이 적습니다.
      </p>
    </div>
  );
}

// ──────── 탭 3: 비교 + 입력 ────────
function CompareTab() {
  const [text, setText] = useState('GPT는 한글을 더 잘게 쪼개요. GPT splits Korean more.');
  const toks = pseudoTokenize(text);
  const chars = [...text].length;
  const words = text.trim().split(/\s+/).filter(Boolean).length;

  const samples = [
    { label: '영어 짧은 문장', text: 'I love AI.' },
    { label: '한글 같은 의미', text: '나는 인공지능이 좋아요.' },
    { label: '영어 긴 단어',   text: 'Internationalization is hard.' },
    { label: '한글 활용형',    text: '국제화는 어렵습니다.' },
  ];

  return (
    <div className="mt-6 space-y-5">
      <div>
        <label className="text-sm text-muted">아무 문장이나 넣어보세요</label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={2}
          className="mt-2 w-full px-3 py-2 rounded-md border border-border bg-surface font-mono text-sm"
        />
      </div>

      <div className="card p-4">
        <div className="text-xs text-muted mb-2">
          글자 {chars} · 단어 {words} · <strong className="text-accent">토큰 {toks.length}</strong>
        </div>
        <div className="flex gap-1 flex-wrap">
          {toks.map((t, j) => (
            <span key={j} className="px-2 py-1 rounded text-sm font-mono" style={{ background: tokHue(j), color: '#0f172a' }}>
              {t.replace(/ /g, '·')}
            </span>
          ))}
        </div>
      </div>

      <h2>같은 의미, 다른 토큰 수</h2>
      <div className="grid sm:grid-cols-2 gap-3">
        {samples.map((s, i) => {
          const t = pseudoTokenize(s.text);
          const ratio = t.length / [...s.text].length;
          return (
            <div key={i} className="card p-4">
              <div className="text-xs font-mono text-muted">{s.label}</div>
              <div className="mt-1">{s.text}</div>
              <div className="text-xs text-muted mt-2">
                글자 {[...s.text].length} · 토큰 <strong className="text-accent">{t.length}</strong> · 글자당 {ratio.toFixed(2)} 토큰
              </div>
              <div className="flex gap-1 mt-2 flex-wrap">
                {t.map((tt, j) => (
                  <span key={j} className="px-1.5 py-0.5 rounded text-xs font-mono" style={{ background: tokHue(j), color: '#0f172a' }}>
                    {tt.replace(/ /g, '·')}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="aside-tip">
        <div className="font-medium">💡 왜 한글이 더 잘게 쪼개질까?</div>
        <p className="text-sm mt-1">
          GPT 토크나이저는 거대한 영어 코퍼스로 BPE를 학습했어요. 그래서 'tion', 'ing', 'the'처럼
          영어에서 자주 붙어 다니는 묶음은 통째로 한 토큰이 되지만, 한글에서 자주 붙어 다니는 묶음은
          상대적으로 학습이 덜 되어 한 글자(또는 그 글자의 UTF-8 바이트)씩 쪼개지는 경우가 많아요.
          → 같은 의미를 한글로 쓰면 토큰 수가 많아지고, 그만큼 API 비용도 올라가는 경향이 있습니다.
        </p>
      </div>
    </div>
  );
}

// ──────── 토크나이저 흉내 ────────
// 실제 cl100k가 아닌, 직관 전달용 단순 사전 + 폴백.
const KNOWN_WORDS = new Set([
  // 영어 자주 쓰이는 단어
  'Hello', 'world', 'is', 'fun', 'I', 'love', 'AI',
  'GPT', 'splits', 'Korean', 'more', 'hard',
  // 한글 자주 쓰이는 1~2글자 (의도적으로 짧게)
  '나', '는', '안녕', '하세요',
]);

function pseudoTokenize(text: string): string[] {
  // 1) 공백/구두점 분리하면서 공백을 토큰 앞에 붙이는 GPT 스타일을 살짝 흉내
  const out: string[] = [];
  const re = /(\s+)|([A-Za-z]+)|([0-9]+)|([가-힯]+)|([^\s\w])/g;
  let lastSpace = '';
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const [tok] = m;
    if (m[1]) {
      lastSpace += tok;
      continue;
    }
    const prefix = lastSpace.length > 0 ? ' ' : '';
    lastSpace = '';
    if (m[2]) {
      // 영어 단어
      const candidate = prefix + tok;
      if (KNOWN_WORDS.has(tok)) {
        out.push(candidate);
      } else {
        // 알려지지 않은 단어 — 길면 음절 단위 비슷하게 잘게
        const chunks = splitEnglish(tok);
        chunks.forEach((c, i) => out.push(i === 0 ? prefix + c : c));
      }
    } else if (m[3]) {
      out.push(prefix + tok);
    } else if (m[4]) {
      // 한글 — 한 글자씩 (실제 BPE에서도 잘 합쳐지지 않음)
      const chars = [...tok];
      chars.forEach((c, i) => out.push(i === 0 ? prefix + c : c));
    } else if (m[5]) {
      out.push(prefix + tok);
    }
  }
  return out;
}

function splitEnglish(word: string): string[] {
  // 흔한 접미사 잘라보기 — Internationalization 같은 단어 직관용
  const suffixes = ['ization', 'ation', 'tion', 'ing', 'er', 'est', 'ly', 's'];
  const parts: string[] = [];
  let rest = word;
  while (rest.length > 0) {
    let matched = '';
    for (const suf of suffixes) {
      if (rest.length > suf.length && rest.endsWith(suf)) {
        matched = suf;
        break;
      }
    }
    if (matched) {
      parts.unshift(matched);
      rest = rest.slice(0, rest.length - matched.length);
      if (rest.length <= 5) {
        parts.unshift(rest);
        rest = '';
      }
    } else {
      // 5글자 단위로 자르기
      if (rest.length <= 5) {
        parts.unshift(rest);
        rest = '';
      } else {
        parts.unshift(rest.slice(-5));
        rest = rest.slice(0, -5);
      }
    }
  }
  return parts;
}

// 토큰 색 — 인덱스로 결정적
function tokHue(i: number): string {
  const palette = ['#bbf7d0', '#fde68a', '#fdba74', '#f9a8d4', '#bfdbfe', '#c7d2fe', '#fecaca', '#a5f3fc'];
  return palette[i % palette.length];
}

// ──────── BPE 미니 ────────
const END = '_';

function bpeRun(corpus: string[], maxMerges: number): BpeStep[] {
  // 각 단어를 글자 + 끝표시(_)로 시작
  let encoded: string[][] = corpus.map((w) => [...w].concat(END));
  const vocab = new Set<string>();
  encoded.forEach((seq) => seq.forEach((t) => vocab.add(t)));

  const history: BpeStep[] = [
    { step: 0, pair: null, count: 0, vocab: [...vocab], encoded: encoded.map((s) => [...s]) },
  ];

  for (let s = 1; s <= maxMerges; s++) {
    // 가장 자주 나오는 인접 쌍 찾기
    const counts = new Map<string, number>();
    const pairs = new Map<string, [string, string]>();
    for (const seq of encoded) {
      for (let i = 0; i + 1 < seq.length; i++) {
        const k = seq[i] + '' + seq[i + 1];
        counts.set(k, (counts.get(k) ?? 0) + 1);
        if (!pairs.has(k)) pairs.set(k, [seq[i], seq[i + 1]]);
      }
    }
    if (counts.size === 0) break;
    const best = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
    if (best[1] < 2) break;
    const [a, b] = pairs.get(best[0])!;
    // 합치기 적용
    encoded = encoded.map((seq) => {
      const out: string[] = [];
      let i = 0;
      while (i < seq.length) {
        if (i + 1 < seq.length && seq[i] === a && seq[i + 1] === b) {
          out.push(a + b);
          i += 2;
        } else {
          out.push(seq[i]);
          i += 1;
        }
      }
      return out;
    });
    vocab.add(a + b);
    history.push({
      step: s,
      pair: [a, b],
      count: best[1],
      vocab: [...vocab],
      encoded: encoded.map((s) => [...s]),
    });
  }

  return history;
}
