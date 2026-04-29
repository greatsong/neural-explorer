// 순수 TS로 작성한 단순 MLP. 임의 층수 지원.
// layers = [입력, 은닉1, 은닉2, ..., 출력].
// 출력층 활성화: 'softmax'(다중 분류, 기본) 또는 'sigmoid'(이진 분류 — 출력 뉴런 1개).

export type OutputType = 'softmax' | 'sigmoid';

export interface MLP {
  // 단일 은닉층 시절의 호환 필드
  inputSize: number;
  hiddenSize: number;
  outputSize: number;
  // 일반화된 표현
  layers: number[];          // 각 층의 뉴런 수
  weights: Float32Array[];   // weights[k]: layers[k] x layers[k+1]
  biases: Float32Array[];    // biases[k]:  layers[k+1]
  // 출력 모드 — 'sigmoid'는 outputSize===1인 BCE 학습용.
  outputType: OutputType;
  // 단일 은닉층 호환용 별칭 (layers.length === 3 일 때만 의미)
  w1: Float32Array;
  b1: Float32Array;
  w2: Float32Array;
  b2: Float32Array;
}

function randn(): number {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export function createDeepMLP(layers: number[], outputType: OutputType = 'softmax'): MLP {
  if (layers.length < 2) throw new Error('layers must have >= 2 entries');
  if (outputType === 'sigmoid' && layers[layers.length - 1] !== 1) {
    throw new Error('sigmoid output requires outputSize === 1');
  }
  const weights: Float32Array[] = [];
  const biases: Float32Array[] = [];
  for (let k = 0; k < layers.length - 1; k++) {
    const a = layers[k], b = layers[k + 1];
    const scale = Math.sqrt(2 / a);
    const w = new Float32Array(a * b);
    for (let i = 0; i < w.length; i++) w[i] = randn() * scale;
    weights.push(w);
    biases.push(new Float32Array(b));
  }
  const inputSize = layers[0];
  const outputSize = layers[layers.length - 1];
  const hiddenSize = layers.length >= 3 ? layers[1] : 0;
  return {
    inputSize, hiddenSize, outputSize,
    layers: layers.slice(),
    weights, biases,
    outputType,
    w1: weights[0],
    b1: biases[0],
    w2: weights[weights.length - 1],
    b2: biases[biases.length - 1],
  };
}

// 단일 은닉층 호환 API
export function createMLP(inputSize: number, hiddenSize: number, outputSize: number, seed = 42): MLP {
  void seed;
  return createDeepMLP([inputSize, hiddenSize, outputSize]);
}

export function paramCount(m: MLP | { inputSize: number; hiddenSize: number; outputSize: number } | { layers: number[] }): number {
  if ('layers' in m && Array.isArray((m as { layers: number[] }).layers)) {
    const ls = (m as { layers: number[] }).layers;
    let n = 0;
    for (let k = 0; k < ls.length - 1; k++) n += ls[k] * ls[k + 1] + ls[k + 1];
    return n;
  }
  const mm = m as { inputSize: number; hiddenSize: number; outputSize: number };
  return mm.inputSize * mm.hiddenSize + mm.hiddenSize + mm.hiddenSize * mm.outputSize + mm.outputSize;
}

export interface ForwardResult {
  hidden: Float32Array;       // 첫 은닉층 활성값 (호환용)
  activations: Float32Array[]; // 각 층(입력 포함) 활성값
  preacts: Float32Array[];     // 각 hidden/output의 활성화 전(z)
  logits: Float32Array;
  probs: Float32Array;
}

export function forward(m: MLP, x: Float32Array): ForwardResult {
  const activations: Float32Array[] = [x];
  const preacts: Float32Array[] = [];
  let cur: Float32Array = x;
  for (let k = 0; k < m.weights.length; k++) {
    const a = m.layers[k], b = m.layers[k + 1];
    const w = m.weights[k];
    const bias = m.biases[k];
    const z = new Float32Array(b);
    for (let j = 0; j < b; j++) {
      let s = bias[j];
      for (let i = 0; i < a; i++) s += cur[i] * w[i * b + j];
      z[j] = s;
    }
    preacts.push(z);
    if (k < m.weights.length - 1) {
      const out = new Float32Array(b);
      for (let j = 0; j < b; j++) out[j] = z[j] > 0 ? z[j] : 0; // ReLU
      activations.push(out);
      cur = out;
    } else {
      const probs = new Float32Array(b);
      if (m.outputType === 'sigmoid') {
        // sigmoid (이진 분류용 — outputSize===1)
        for (let j = 0; j < b; j++) probs[j] = 1 / (1 + Math.exp(-z[j]));
      } else {
        // softmax
        let max = z[0];
        for (let j = 1; j < b; j++) if (z[j] > max) max = z[j];
        let zsum = 0;
        for (let j = 0; j < b; j++) { probs[j] = Math.exp(z[j] - max); zsum += probs[j]; }
        for (let j = 0; j < b; j++) probs[j] /= zsum;
      }
      activations.push(probs);
      return {
        hidden: activations[1] ?? new Float32Array(0),
        activations, preacts,
        logits: z, probs,
      };
    }
  }
  // 도달 불가
  throw new Error('forward: empty network');
}

export function predict(m: MLP, x: Float32Array): number {
  const { probs } = forward(m, x);
  if (m.outputType === 'sigmoid') {
    return probs[0] >= 0.5 ? 1 : 0;
  }
  let best = 0;
  for (let i = 1; i < probs.length; i++) if (probs[i] > probs[best]) best = i;
  return best;
}

export interface TrainSample { x: Float32Array; y: number }

export function trainStep(m: MLP, batch: TrainSample[], lr: number): number {
  const dWs = m.weights.map((w) => new Float32Array(w.length));
  const dBs = m.biases.map((b) => new Float32Array(b.length));
  let lossSum = 0;
  const N = batch.length;
  const L = m.weights.length;

  for (const { x, y } of batch) {
    const { activations, probs } = forward(m, x);
    let dZ: Float32Array;
    if (m.outputType === 'sigmoid') {
      // 이진 BCE — y ∈ {0, 1}, p = σ(z)
      const p = probs[0];
      const t = y;
      lossSum += -(t * Math.log(Math.max(p, 1e-9)) + (1 - t) * Math.log(Math.max(1 - p, 1e-9)));
      dZ = new Float32Array(1);
      dZ[0] = p - t;
    } else {
      lossSum += -Math.log(Math.max(probs[y], 1e-9));
      // 출력층 gradient: probs - onehot
      dZ = new Float32Array(probs.length);
      for (let o = 0; o < probs.length; o++) dZ[o] = probs[o];
      dZ[y] -= 1;
    }

    for (let k = L - 1; k >= 0; k--) {
      const aIn = activations[k];          // 이 층 입력
      const a = m.layers[k], b = m.layers[k + 1];
      const w = m.weights[k];
      const dW = dWs[k];
      const dB = dBs[k];
      // dW[i,j] += aIn[i] * dZ[j]
      for (let i = 0; i < a; i++) {
        const xi = aIn[i];
        if (xi === 0) continue;
        for (let j = 0; j < b; j++) {
          if (dZ[j] === 0) continue;
          dW[i * b + j] += xi * dZ[j];
        }
      }
      for (let j = 0; j < b; j++) dB[j] += dZ[j];

      if (k > 0) {
        // 이전 층으로 전파: dA_prev = W * dZ, ReLU 미분 적용
        const aPrev = activations[k]; // 이미 ReLU 통과한 값 (= aIn)
        const dPrev = new Float32Array(a);
        for (let i = 0; i < a; i++) {
          if (aPrev[i] <= 0) { dPrev[i] = 0; continue; }
          let s = 0;
          for (let j = 0; j < b; j++) s += w[i * b + j] * dZ[j];
          dPrev[i] = s;
        }
        dZ = dPrev;
      }
    }
  }

  const scale = lr / N;
  for (let k = 0; k < L; k++) {
    const w = m.weights[k], b = m.biases[k];
    const dW = dWs[k], dB = dBs[k];
    for (let i = 0; i < w.length; i++) w[i] -= scale * dW[i];
    for (let i = 0; i < b.length; i++) b[i] -= scale * dB[i];
  }
  // 호환 별칭 갱신
  m.w1 = m.weights[0]; m.b1 = m.biases[0];
  m.w2 = m.weights[m.weights.length - 1]; m.b2 = m.biases[m.biases.length - 1];

  return lossSum / N;
}

export function evaluate(m: MLP, samples: TrainSample[]): number {
  let correct = 0;
  for (const s of samples) if (predict(m, s.x) === s.y) correct++;
  return correct / samples.length;
}

export function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
