// E4 — 학생용 mini 언어모델. 진짜 신경망이 아니라 trigram/bigram/unigram backoff 통계 기반.
// 신경망 LM의 출력(어휘 전체에 대한 logit 분포)을 모방한다.
// 학생에게 보여줄 것: "다음 토큰 분포 + temperature/top-k/seed → 매번 다른 이야기"

export interface NGramModel {
  vocab: string[];
  index: Map<string, number>;
  // unigram[v] = log count + 1 (smoothed). 사용 시 별도 정규화.
  unigram: number[];
  // bigram[prev][v]
  bigram: Map<number, number[]>;
  // trigram[prev2*V + prev1][v]
  trigram: Map<number, number[]>;
  startTokens: number[]; // 문장 첫 토큰 후보 (코퍼스 첫 토큰들)
}

const START = '<s>';
const END = '.';

export function buildNGram(corpus: string[]): NGramModel {
  const vocabSet = new Set<string>([START]);
  const sentences: string[][] = [];
  for (const line of corpus) {
    const toks = line.split(/\s+/).filter(Boolean);
    if (toks.length === 0) continue;
    sentences.push([START, START, ...toks]);
    for (const t of toks) vocabSet.add(t);
  }
  const vocab = Array.from(vocabSet);
  const index = new Map<string, number>();
  vocab.forEach((w, i) => index.set(w, i));
  const V = vocab.length;
  const unigram = new Array(V).fill(0);
  const bigram = new Map<number, number[]>();
  const trigram = new Map<number, number[]>();
  const startSet = new Set<number>();

  for (const sent of sentences) {
    // 첫 진짜 토큰 (START 2개 다음)
    if (sent.length >= 3) startSet.add(index.get(sent[2])!);
    for (let i = 0; i < sent.length; i++) {
      const t = index.get(sent[i])!;
      if (sent[i] !== START) unigram[t] += 1;
      if (i >= 1) {
        const p = index.get(sent[i - 1])!;
        if (!bigram.has(p)) bigram.set(p, new Array(V).fill(0));
        bigram.get(p)![t] += 1;
      }
      if (i >= 2) {
        const p1 = index.get(sent[i - 1])!;
        const p2 = index.get(sent[i - 2])!;
        const key = p2 * V + p1;
        if (!trigram.has(key)) trigram.set(key, new Array(V).fill(0));
        trigram.get(key)![t] += 1;
      }
    }
  }

  return { vocab, index, unigram, bigram, trigram, startTokens: Array.from(startSet) };
}

// 다음 토큰 logit 분포 — trigram (있으면) + bigram + unigram을 보간.
// 학생 시각화용으로 마지막에 정규화하지 않고 raw 점수를 반환 (softmax는 호출 측에서).
export function logitsFor(model: NGramModel, prev2: number | null, prev1: number | null): number[] {
  const V = model.vocab.length;
  const out = new Array(V).fill(0);
  let triCounts: number[] | null = null;
  if (prev2 != null && prev1 != null) {
    triCounts = model.trigram.get(prev2 * V + prev1) ?? null;
  }
  const biCounts = prev1 != null ? (model.bigram.get(prev1) ?? null) : null;

  // 가중치 — 더 긴 컨텍스트가 강하게.
  for (let v = 0; v < V; v++) {
    let score = 0;
    if (triCounts) score += triCounts[v] * 3;
    if (biCounts)  score += biCounts[v] * 2;
    score += Math.log(1 + model.unigram[v]) * 0.5;
    // smoothing: 모든 토큰에 약간의 floor
    score += 0.05;
    out[v] = score;
  }
  return out;
}

export function softmax(logits: number[], temperature: number): number[] {
  const t = Math.max(0.05, temperature);
  const scaled = logits.map((x) => x / t);
  const m = Math.max(...scaled);
  const e = scaled.map((x) => Math.exp(x - m));
  const s = e.reduce((a, b) => a + b, 0);
  return e.map((x) => x / s);
}

export function applyTopK(probs: number[], k: number): number[] {
  if (k <= 0 || k >= probs.length) return probs.slice();
  const idx = probs.map((_, i) => i).sort((a, b) => probs[b] - probs[a]);
  const out = new Array(probs.length).fill(0);
  for (let r = 0; r < k; r++) out[idx[r]] = probs[idx[r]];
  const s = out.reduce((a, b) => a + b, 0);
  if (s < 1e-9) return probs.slice();
  return out.map((v) => v / s);
}

export function sampleFromDist(dist: number[], rng: () => number): number {
  const r = rng();
  let acc = 0;
  for (let i = 0; i < dist.length; i++) {
    acc += dist[i];
    if (r <= acc) return i;
  }
  return dist.length - 1;
}

export function mulberry32(seed: number): () => number {
  let a = (seed >>> 0) || 1;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export { START, END };
