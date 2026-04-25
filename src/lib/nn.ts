// 순수 TS로 작성한 단순 MLP (입력 → 은닉 1층 ReLU → softmax 출력)
// MNIST 300장 정도 학습용. 미니배치 SGD.

export interface MLP {
  inputSize: number;
  hiddenSize: number;
  outputSize: number;
  w1: Float32Array; // [inputSize * hiddenSize]
  b1: Float32Array; // [hiddenSize]
  w2: Float32Array; // [hiddenSize * outputSize]
  b2: Float32Array; // [outputSize]
}

function randn(): number {
  // Box–Muller
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export function createMLP(inputSize: number, hiddenSize: number, outputSize: number, seed = 42): MLP {
  // simple deterministic-ish init using Math.random (we don't seed for now; rely on consistency-not-required)
  void seed;
  const w1Scale = Math.sqrt(2 / inputSize);
  const w2Scale = Math.sqrt(2 / hiddenSize);
  const w1 = new Float32Array(inputSize * hiddenSize);
  const w2 = new Float32Array(hiddenSize * outputSize);
  for (let i = 0; i < w1.length; i++) w1[i] = randn() * w1Scale;
  for (let i = 0; i < w2.length; i++) w2[i] = randn() * w2Scale;
  return {
    inputSize, hiddenSize, outputSize,
    w1, b1: new Float32Array(hiddenSize),
    w2, b2: new Float32Array(outputSize),
  };
}

export function paramCount(m: MLP | { inputSize: number; hiddenSize: number; outputSize: number }): number {
  return m.inputSize * m.hiddenSize + m.hiddenSize + m.hiddenSize * m.outputSize + m.outputSize;
}

export function forward(m: MLP, x: Float32Array): { hidden: Float32Array; logits: Float32Array; probs: Float32Array } {
  const hidden = new Float32Array(m.hiddenSize);
  for (let h = 0; h < m.hiddenSize; h++) {
    let sum = m.b1[h];
    for (let i = 0; i < m.inputSize; i++) sum += x[i] * m.w1[i * m.hiddenSize + h];
    hidden[h] = sum > 0 ? sum : 0; // ReLU
  }
  const logits = new Float32Array(m.outputSize);
  for (let o = 0; o < m.outputSize; o++) {
    let sum = m.b2[o];
    for (let h = 0; h < m.hiddenSize; h++) sum += hidden[h] * m.w2[h * m.outputSize + o];
    logits[o] = sum;
  }
  // softmax
  let max = logits[0];
  for (let o = 1; o < m.outputSize; o++) if (logits[o] > max) max = logits[o];
  const probs = new Float32Array(m.outputSize);
  let zsum = 0;
  for (let o = 0; o < m.outputSize; o++) {
    probs[o] = Math.exp(logits[o] - max);
    zsum += probs[o];
  }
  for (let o = 0; o < m.outputSize; o++) probs[o] /= zsum;
  return { hidden, logits, probs };
}

export function predict(m: MLP, x: Float32Array): number {
  const { probs } = forward(m, x);
  let best = 0;
  for (let i = 1; i < probs.length; i++) if (probs[i] > probs[best]) best = i;
  return best;
}

export interface TrainSample { x: Float32Array; y: number }

export function trainStep(m: MLP, batch: TrainSample[], lr: number): number {
  // accumulate gradients across batch
  const dw1 = new Float32Array(m.w1.length);
  const db1 = new Float32Array(m.b1.length);
  const dw2 = new Float32Array(m.w2.length);
  const db2 = new Float32Array(m.b2.length);
  let lossSum = 0;
  const N = batch.length;

  for (const { x, y } of batch) {
    const { hidden, probs } = forward(m, x);
    // cross-entropy loss
    lossSum += -Math.log(Math.max(probs[y], 1e-9));
    // dL/dlogits = probs - one_hot
    const dLogits = new Float32Array(m.outputSize);
    for (let o = 0; o < m.outputSize; o++) dLogits[o] = probs[o];
    dLogits[y] -= 1;

    // dW2[h,o] += hidden[h] * dLogits[o], dB2[o] += dLogits[o]
    for (let h = 0; h < m.hiddenSize; h++) {
      const hv = hidden[h];
      for (let o = 0; o < m.outputSize; o++) {
        dw2[h * m.outputSize + o] += hv * dLogits[o];
      }
    }
    for (let o = 0; o < m.outputSize; o++) db2[o] += dLogits[o];

    // dHidden[h] = (sum_o W2[h,o] * dLogits[o]) * 1[hidden[h] > 0]
    const dHidden = new Float32Array(m.hiddenSize);
    for (let h = 0; h < m.hiddenSize; h++) {
      if (hidden[h] <= 0) continue;
      let s = 0;
      for (let o = 0; o < m.outputSize; o++) s += m.w2[h * m.outputSize + o] * dLogits[o];
      dHidden[h] = s;
    }

    // dW1[i,h] += x[i] * dHidden[h], dB1[h] += dHidden[h]
    for (let i = 0; i < m.inputSize; i++) {
      const xi = x[i];
      if (xi === 0) continue;
      for (let h = 0; h < m.hiddenSize; h++) {
        if (dHidden[h] === 0) continue;
        dw1[i * m.hiddenSize + h] += xi * dHidden[h];
      }
    }
    for (let h = 0; h < m.hiddenSize; h++) db1[h] += dHidden[h];
  }

  // SGD update (averaged grad)
  const scale = lr / N;
  for (let i = 0; i < m.w1.length; i++) m.w1[i] -= scale * dw1[i];
  for (let i = 0; i < m.b1.length; i++) m.b1[i] -= scale * db1[i];
  for (let i = 0; i < m.w2.length; i++) m.w2[i] -= scale * dw2[i];
  for (let i = 0; i < m.b2.length; i++) m.b2[i] -= scale * db2[i];

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
