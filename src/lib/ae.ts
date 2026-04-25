// 단순 오토인코더 — 학생용 시연
//   인코더: x(64) → h1(hidden) ReLU → z(latent)
//   디코더: z(latent) → h2(hidden) ReLU → x'(64) sigmoid
// 손실: BCE (픽셀이 0/1이라 BCE가 MSE보다 학습 빠름)

export interface AE {
  inputSize: number;
  hiddenSize: number;
  latentSize: number;
  encW1: Float32Array; encB1: Float32Array;
  encW2: Float32Array; encB2: Float32Array;
  decW1: Float32Array; decB1: Float32Array;
  decW2: Float32Array; decB2: Float32Array;
}

function randn(): number {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export function createAE(input: number, hidden: number, latent: number): AE {
  const init = (a: Float32Array, scale: number) => {
    for (let i = 0; i < a.length; i++) a[i] = randn() * scale;
  };
  const ae: AE = {
    inputSize: input, hiddenSize: hidden, latentSize: latent,
    encW1: new Float32Array(input * hidden),
    encB1: new Float32Array(hidden),
    encW2: new Float32Array(hidden * latent),
    encB2: new Float32Array(latent),
    decW1: new Float32Array(latent * hidden),
    decB1: new Float32Array(hidden),
    decW2: new Float32Array(hidden * input),
    decB2: new Float32Array(input),
  };
  // 작은 초기화 — 잠재 차원이 작으면 큰 init이 발산 유발
  init(ae.encW1, Math.sqrt(2 / input));
  init(ae.encW2, 0.1);
  init(ae.decW1, 0.1);
  init(ae.decW2, Math.sqrt(2 / hidden));
  return ae;
}

const sigmoid = (z: number) => 1 / (1 + Math.exp(-z));

export function encode(ae: AE, x: number[] | Float32Array): Float32Array {
  const h1 = new Float32Array(ae.hiddenSize);
  for (let h = 0; h < ae.hiddenSize; h++) {
    let s = ae.encB1[h];
    for (let i = 0; i < ae.inputSize; i++) s += x[i] * ae.encW1[i * ae.hiddenSize + h];
    h1[h] = s > 0 ? s : 0;
  }
  const z = new Float32Array(ae.latentSize);
  for (let l = 0; l < ae.latentSize; l++) {
    let s = ae.encB2[l];
    for (let h = 0; h < ae.hiddenSize; h++) s += h1[h] * ae.encW2[h * ae.latentSize + l];
    z[l] = s; // linear
  }
  return z;
}

export function decode(ae: AE, z: number[] | Float32Array): Float32Array {
  const h2 = new Float32Array(ae.hiddenSize);
  for (let h = 0; h < ae.hiddenSize; h++) {
    let s = ae.decB1[h];
    for (let l = 0; l < ae.latentSize; l++) s += z[l] * ae.decW1[l * ae.hiddenSize + h];
    h2[h] = s > 0 ? s : 0;
  }
  const xhat = new Float32Array(ae.inputSize);
  for (let i = 0; i < ae.inputSize; i++) {
    let s = ae.decB2[i];
    for (let h = 0; h < ae.hiddenSize; h++) s += h2[h] * ae.decW2[h * ae.inputSize + i];
    xhat[i] = sigmoid(s);
  }
  return xhat;
}

export function forwardAll(ae: AE, x: number[] | Float32Array) {
  // returns intermediate values for backprop
  const h1 = new Float32Array(ae.hiddenSize);
  for (let h = 0; h < ae.hiddenSize; h++) {
    let s = ae.encB1[h];
    for (let i = 0; i < ae.inputSize; i++) s += x[i] * ae.encW1[i * ae.hiddenSize + h];
    h1[h] = s > 0 ? s : 0;
  }
  const z = new Float32Array(ae.latentSize);
  for (let l = 0; l < ae.latentSize; l++) {
    let s = ae.encB2[l];
    for (let h = 0; h < ae.hiddenSize; h++) s += h1[h] * ae.encW2[h * ae.latentSize + l];
    z[l] = s;
  }
  const h2 = new Float32Array(ae.hiddenSize);
  for (let h = 0; h < ae.hiddenSize; h++) {
    let s = ae.decB1[h];
    for (let l = 0; l < ae.latentSize; l++) s += z[l] * ae.decW1[l * ae.hiddenSize + h];
    h2[h] = s > 0 ? s : 0;
  }
  const xhat = new Float32Array(ae.inputSize);
  for (let i = 0; i < ae.inputSize; i++) {
    let s = ae.decB2[i];
    for (let h = 0; h < ae.hiddenSize; h++) s += h2[h] * ae.decW2[h * ae.inputSize + i];
    xhat[i] = sigmoid(s);
  }
  return { h1, z, h2, xhat };
}

export function trainBatch(ae: AE, batch: (number[] | Float32Array)[], lr: number): number {
  const dEncW1 = new Float32Array(ae.encW1.length);
  const dEncB1 = new Float32Array(ae.encB1.length);
  const dEncW2 = new Float32Array(ae.encW2.length);
  const dEncB2 = new Float32Array(ae.encB2.length);
  const dDecW1 = new Float32Array(ae.decW1.length);
  const dDecB1 = new Float32Array(ae.decB1.length);
  const dDecW2 = new Float32Array(ae.decW2.length);
  const dDecB2 = new Float32Array(ae.decB2.length);

  let lossSum = 0;
  for (const x of batch) {
    const { h1, z, h2, xhat } = forwardAll(ae, x);
    // BCE 손실
    let loss = 0;
    for (let i = 0; i < ae.inputSize; i++) {
      const t = x[i];
      const p = Math.max(1e-9, Math.min(1 - 1e-9, xhat[i]));
      loss += -(t * Math.log(p) + (1 - t) * Math.log(1 - p));
    }
    lossSum += loss / ae.inputSize;

    // dL/dlogit_out = xhat - x  (sigmoid + BCE 결합)
    const dOut = new Float32Array(ae.inputSize);
    for (let i = 0; i < ae.inputSize; i++) dOut[i] = xhat[i] - x[i];

    // decoder W2, B2
    for (let h = 0; h < ae.hiddenSize; h++) {
      const hv = h2[h];
      for (let i = 0; i < ae.inputSize; i++) {
        dDecW2[h * ae.inputSize + i] += hv * dOut[i];
      }
    }
    for (let i = 0; i < ae.inputSize; i++) dDecB2[i] += dOut[i];

    // dh2 = dOut · decW2.T (then ReLU mask)
    const dh2 = new Float32Array(ae.hiddenSize);
    for (let h = 0; h < ae.hiddenSize; h++) {
      if (h2[h] <= 0) continue;
      let s = 0;
      for (let i = 0; i < ae.inputSize; i++) s += ae.decW2[h * ae.inputSize + i] * dOut[i];
      dh2[h] = s;
    }

    // decoder W1, B1
    for (let l = 0; l < ae.latentSize; l++) {
      const zv = z[l];
      for (let h = 0; h < ae.hiddenSize; h++) {
        dDecW1[l * ae.hiddenSize + h] += zv * dh2[h];
      }
    }
    for (let h = 0; h < ae.hiddenSize; h++) dDecB1[h] += dh2[h];

    // dz = dh2 · decW1.T (linear, no activation on z)
    const dz = new Float32Array(ae.latentSize);
    for (let l = 0; l < ae.latentSize; l++) {
      let s = 0;
      for (let h = 0; h < ae.hiddenSize; h++) s += ae.decW1[l * ae.hiddenSize + h] * dh2[h];
      dz[l] = s;
    }

    // encoder W2, B2
    for (let h = 0; h < ae.hiddenSize; h++) {
      const hv = h1[h];
      for (let l = 0; l < ae.latentSize; l++) {
        dEncW2[h * ae.latentSize + l] += hv * dz[l];
      }
    }
    for (let l = 0; l < ae.latentSize; l++) dEncB2[l] += dz[l];

    // dh1 = dz · encW2.T (then ReLU mask)
    const dh1 = new Float32Array(ae.hiddenSize);
    for (let h = 0; h < ae.hiddenSize; h++) {
      if (h1[h] <= 0) continue;
      let s = 0;
      for (let l = 0; l < ae.latentSize; l++) s += ae.encW2[h * ae.latentSize + l] * dz[l];
      dh1[h] = s;
    }

    // encoder W1, B1
    for (let i = 0; i < ae.inputSize; i++) {
      const xi = x[i];
      if (xi === 0) continue;
      for (let h = 0; h < ae.hiddenSize; h++) {
        dEncW1[i * ae.hiddenSize + h] += xi * dh1[h];
      }
    }
    for (let h = 0; h < ae.hiddenSize; h++) dEncB1[h] += dh1[h];
  }

  const N = batch.length;
  // 그래디언트 클리핑 — 발산 방지
  const clip = (a: Float32Array, max: number) => {
    let norm2 = 0;
    for (let i = 0; i < a.length; i++) norm2 += a[i] * a[i];
    const norm = Math.sqrt(norm2 / a.length);
    if (norm > max) {
      const s = max / norm;
      for (let i = 0; i < a.length; i++) a[i] *= s;
    }
  };
  for (const g of [dEncW1, dEncB1, dEncW2, dEncB2, dDecW1, dDecB1, dDecW2, dDecB2]) clip(g, 5);

  const scale = lr / N;
  for (let i = 0; i < ae.encW1.length; i++) ae.encW1[i] -= scale * dEncW1[i];
  for (let i = 0; i < ae.encB1.length; i++) ae.encB1[i] -= scale * dEncB1[i];
  for (let i = 0; i < ae.encW2.length; i++) ae.encW2[i] -= scale * dEncW2[i];
  for (let i = 0; i < ae.encB2.length; i++) ae.encB2[i] -= scale * dEncB2[i];
  for (let i = 0; i < ae.decW1.length; i++) ae.decW1[i] -= scale * dDecW1[i];
  for (let i = 0; i < ae.decB1.length; i++) ae.decB1[i] -= scale * dDecB1[i];
  for (let i = 0; i < ae.decW2.length; i++) ae.decW2[i] -= scale * dDecW2[i];
  for (let i = 0; i < ae.decB2.length; i++) ae.decB2[i] -= scale * dDecB2[i];

  return lossSum / N;
}
