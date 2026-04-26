// 브라우저에서 작동하는 아주 작은 skip-gram 학습기.
// 음성표본 + 시그모이드 + SGD. 200~500 스텝이면 토이 코퍼스에서 의미 클러스터가 보임.

export interface W2VModel {
  vocab: string[];
  index: Map<string, number>;
  W: number[][];   // 입력 임베딩 — 단어 수 × dim
  C: number[][];   // 출력(컨텍스트) 임베딩 — 단어 수 × dim
  dim: number;
}

export function tokenize(line: string): string[] {
  // 한글: 공백 단위 / 영어: 공백 단위 + 소문자화 + 구두점 제거
  return line
    .replace(/[.,!?]/g, '')
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);
}

export function buildVocab(corpus: string[]): { vocab: string[]; index: Map<string, number> } {
  const set = new Set<string>();
  for (const line of corpus) for (const w of tokenize(line)) set.add(w);
  const vocab = [...set];
  const index = new Map<string, number>();
  vocab.forEach((w, i) => index.set(w, i));
  return { vocab, index };
}

export function initModel(corpus: string[], dim = 3, seed = 42): W2VModel {
  const { vocab, index } = buildVocab(corpus);
  const rand = mulberry32(seed);
  const W = Array.from({ length: vocab.length }, () =>
    Array.from({ length: dim }, () => (rand() - 0.5) * 0.5)
  );
  const C = Array.from({ length: vocab.length }, () =>
    Array.from({ length: dim }, () => (rand() - 0.5) * 0.5)
  );
  return { vocab, index, W, C, dim };
}

interface TrainOptions {
  windowSize?: number;
  negatives?: number;
  lr?: number;
  steps?: number;
  seed?: number;
}

export function trainSkipGram(
  model: W2VModel,
  corpus: string[],
  opts: TrainOptions = {}
): { lossHistory: number[] } {
  const windowSize = opts.windowSize ?? 2;
  const negatives = opts.negatives ?? 4;
  const lr = opts.lr ?? 0.05;
  const steps = opts.steps ?? 400;
  const rand = mulberry32(opts.seed ?? 7);
  const sentences = corpus.map((l) => tokenize(l).map((w) => model.index.get(w)!).filter((x) => x !== undefined));

  const lossHistory: number[] = [];
  let stepLoss = 0, stepCount = 0;

  for (let step = 0; step < steps; step++) {
    // 1) 무작위 (center, context) 쌍 뽑기
    const sIdx = Math.floor(rand() * sentences.length);
    const sent = sentences[sIdx];
    if (sent.length < 2) continue;
    const ci = Math.floor(rand() * sent.length);
    const lo = Math.max(0, ci - windowSize);
    const hi = Math.min(sent.length - 1, ci + windowSize);
    const choices: number[] = [];
    for (let k = lo; k <= hi; k++) if (k !== ci) choices.push(k);
    if (choices.length === 0) continue;
    const center = sent[ci];
    const contextIdx = sent[choices[Math.floor(rand() * choices.length)]];

    const v = model.W[center];

    // 2) 양성 업데이트
    {
      const u = model.C[contextIdx];
      const dot = v.reduce((s, vi, i) => s + vi * u[i], 0);
      const sig = sigmoid(dot);
      const grad = sig - 1; // 양성 라벨
      stepLoss += -Math.log(Math.max(1e-9, sig));
      stepCount++;
      for (let i = 0; i < model.dim; i++) {
        const dv = grad * u[i];
        const du = grad * v[i];
        v[i] -= lr * dv;
        u[i] -= lr * du;
      }
    }

    // 3) 음성 표본 업데이트
    for (let n = 0; n < negatives; n++) {
      const negIdx = Math.floor(rand() * model.vocab.length);
      if (negIdx === contextIdx || negIdx === center) continue;
      const u = model.C[negIdx];
      const dot = v.reduce((s, vi, i) => s + vi * u[i], 0);
      const sig = sigmoid(dot);
      const grad = sig; // 음성 라벨
      stepLoss += -Math.log(Math.max(1e-9, 1 - sig));
      stepCount++;
      for (let i = 0; i < model.dim; i++) {
        const dv = grad * u[i];
        const du = grad * v[i];
        v[i] -= lr * dv;
        u[i] -= lr * du;
      }
    }

    if ((step + 1) % 25 === 0) {
      lossHistory.push(stepLoss / Math.max(1, stepCount));
      stepLoss = 0;
      stepCount = 0;
    }
  }

  return { lossHistory };
}

export function vec(model: W2VModel, word: string): number[] | null {
  const i = model.index.get(word.toLowerCase());
  if (i === undefined) return null;
  return model.W[i];
}

export function cosine(a: number[], b: number[]): number {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  const d = Math.sqrt(na) * Math.sqrt(nb);
  if (d < 1e-9) return 0;
  return dot / d;
}

export function nearest(model: W2VModel, target: number[], excludes: Set<string> = new Set(), topK = 5) {
  const out: { word: string; sim: number }[] = [];
  for (let i = 0; i < model.vocab.length; i++) {
    const w = model.vocab[i];
    if (excludes.has(w)) continue;
    out.push({ word: w, sim: cosine(target, model.W[i]) });
  }
  out.sort((a, b) => b.sim - a.sim);
  return out.slice(0, topK);
}

export function add(a: number[], b: number[]): number[] {
  return a.map((v, i) => v + b[i]);
}
export function sub(a: number[], b: number[]): number[] {
  return a.map((v, i) => v - b[i]);
}

function sigmoid(x: number): number {
  if (x >= 0) {
    const e = Math.exp(-x);
    return 1 / (1 + e);
  } else {
    const e = Math.exp(x);
    return e / (1 + e);
  }
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
