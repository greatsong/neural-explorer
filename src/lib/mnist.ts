// MNIST 300장 로더 (28x28, 픽셀 값 0~255 → 0~1)
export interface Sample {
  pixels: Float32Array; // length 784, normalized
  label: number;        // 0..9
}

let cache: Sample[] | null = null;

function decodeBase64(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export async function loadMnist(): Promise<Sample[]> {
  if (cache) return cache;
  const res = await fetch('/mnist.json');
  const data: { samples: { p: string; l: number }[] } = await res.json();
  cache = data.samples.map((s) => {
    const bytes = decodeBase64(s.p);
    const arr = new Float32Array(784);
    for (let i = 0; i < 784; i++) arr[i] = bytes[i] / 255;
    return { pixels: arr, label: s.l };
  });
  return cache;
}

// 특정 라벨만 필터링
export function filterByLabels(samples: Sample[], labels: number[]): Sample[] {
  const set = new Set(labels);
  return samples.filter((s) => set.has(s.label));
}

// 라벨 → 0..N-1 인덱스 재매핑 (예: [0,1,7] → 0,1,2)
export function remapLabels(samples: Sample[], labels: number[]): { sample: Sample; idx: number }[] {
  const map = new Map(labels.map((l, i) => [l, i]));
  return samples.map((s) => ({ sample: s, idx: map.get(s.label)! }));
}
