// 도트 분류용 8×8 도형 — 동그라미 / 세모 / 네모 3종.
// PLAN의 B 영역(B4 이진 / B5 3종 + softmax)에서 학생이 "라벨이 같은 종이라 모이는데
// 모양·위치·크기가 다 다르다"는 직관을 얻도록 변형(크기·평행이동) 12개씩 생성한다.

export type ShapeLabel = 'circle' | 'triangle' | 'square';
export const SHAPE_LABEL_KO: Record<ShapeLabel, string> = {
  circle: '⭕ 동그라미',
  triangle: '🔺 세모',
  square: '⬛ 네모',
};
export const SHAPE_LABELS: ShapeLabel[] = ['circle', 'triangle', 'square'];

export interface DotSample {
  id: string;
  label: ShapeLabel;
  pixels: number[]; // 길이 64, 0 또는 1
  // B2 전처리에서 *애매한 그림*·*노이즈가 큰 그림*임을 표시. 학생이 직접 토글한다.
  // 기본 데이터셋은 일부 샘플에 noise 또는 mislabel을 심어 두고 flagged=undefined로 시작.
  noisy?: boolean;     // 노이즈 픽셀이 추가됨
  mislabel?: ShapeLabel; // 실제 라벨이 아님 (B2 정제 학습용)
}

const SIZE = 8;
const idx = (x: number, y: number) => y * SIZE + x;
const ZERO = (): number[] => new Array(SIZE * SIZE).fill(0);

/* ───────── 도형 생성기 ─────────
   각 도형은 (cx, cy, r) 세 파라미터로 결정된다. r은 반지름(원·세모·네모 모두 같은 의미). */

function drawCircle(p: number[], cx: number, cy: number, r: number) {
  for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) {
    const d = Math.hypot(x - cx, y - cy);
    if (d <= r + 0.4 && d >= r - 0.6) p[idx(x, y)] = 1;
  }
}

function drawTriangle(p: number[], cx: number, cy: number, r: number) {
  // 위로 향한 정삼각형 외곽선
  const top = { x: cx, y: cy - r };
  const left = { x: cx - r, y: cy + r * 0.85 };
  const right = { x: cx + r, y: cy + r * 0.85 };
  drawLine(p, top.x, top.y, left.x, left.y);
  drawLine(p, top.x, top.y, right.x, right.y);
  drawLine(p, left.x, left.y, right.x, right.y);
}

function drawSquare(p: number[], cx: number, cy: number, r: number) {
  const x1 = Math.round(cx - r), y1 = Math.round(cy - r);
  const x2 = Math.round(cx + r), y2 = Math.round(cy + r);
  for (let x = x1; x <= x2; x++) {
    if (y1 >= 0 && y1 < SIZE && x >= 0 && x < SIZE) p[idx(x, y1)] = 1;
    if (y2 >= 0 && y2 < SIZE && x >= 0 && x < SIZE) p[idx(x, y2)] = 1;
  }
  for (let y = y1; y <= y2; y++) {
    if (x1 >= 0 && x1 < SIZE && y >= 0 && y < SIZE) p[idx(x1, y)] = 1;
    if (x2 >= 0 && x2 < SIZE && y >= 0 && y < SIZE) p[idx(x2, y)] = 1;
  }
}

function drawLine(p: number[], x1: number, y1: number, x2: number, y2: number) {
  const dx = x2 - x1, dy = y2 - y1;
  const steps = Math.max(Math.abs(dx), Math.abs(dy)) * 4;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const xx = Math.round(x1 + dx * t);
    const yy = Math.round(y1 + dy * t);
    if (xx >= 0 && xx < SIZE && yy >= 0 && yy < SIZE) p[idx(xx, yy)] = 1;
  }
}

function makeShape(label: ShapeLabel, cx: number, cy: number, r: number): number[] {
  const p = ZERO();
  if (label === 'circle') drawCircle(p, cx, cy, r);
  else if (label === 'triangle') drawTriangle(p, cx, cy, r);
  else drawSquare(p, cx, cy, r);
  return p;
}

/* 결정론적 변형 생성 — 라벨당 50장. 위치(cx,cy)·크기(r) 조합을 격자로 만든 뒤,
   8×8 그리드를 벗어나는 조합을 제거하고 균등 추출해 50개로 맞춘다. */
function buildVariantList(): { cx: number; cy: number; r: number }[] {
  const all: { cx: number; cy: number; r: number }[] = [];
  const radii = [2.0, 2.3, 2.5, 2.7, 3.0];
  const grid = [2.5, 3, 3.5, 4, 4.5];
  for (const r of radii) {
    for (const cx of grid) {
      for (const cy of grid) {
        if (cx - r < -0.4 || cy - r < -0.4) continue;
        if (cx + r > 7.4 || cy + r > 7.4) continue;
        all.push({ cx, cy, r });
      }
    }
  }
  // 결정론적 균등 추출로 정확히 50개
  if (all.length <= 50) return all;
  const sampled: { cx: number; cy: number; r: number }[] = [];
  const step = all.length / 50;
  for (let i = 0; i < 50; i++) sampled.push(all[Math.floor(i * step)]);
  return sampled;
}

const VARIANTS = buildVariantList();
const N_PER_LABEL = VARIANTS.length;

// 라벨당 오류 인덱스 — 30% (15장).
// 모두 *라벨 오류*로 통일. hidden layer를 가진 모델은 라벨 노이즈에 더 민감하므로 30%면 lesson이 명확해진다.
// 12장은 라벨만 swap, 3장은 라벨 swap + 픽셀 강노이즈.
const MISLABEL_INDICES = new Set([2, 6, 11, 15, 19, 24, 28, 32, 36, 41, 45, 48]);  // 12장
const MISLABEL_NOISY_INDICES = new Set([4, 22, 39]);                                // 3장

// B2 학습은 *세모 vs 네모* 이진 분류이므로, 두 task 라벨 사이에서 직접 mislabel을
// 일으키면 dirty가 결정 경계를 정확히 흐리고 학생이 cleaning 효과를 또렷이 본다.
// 기존 cycle(circle→triangle→square→circle)에서는 square의 mislabel이 circle로 가
// 학습 단계에서 필터링돼 효과가 분산됐다.
function mislabelTo(label: ShapeLabel): ShapeLabel {
  if (label === 'triangle') return 'square';
  if (label === 'square') return 'triangle';
  // circle은 task 밖이므로 cycle 그대로 — 학생 갤러리에서 "동그란데 세모라고 적힌" 명백한 mislabel로 보인다.
  return 'triangle';
}

/* 노이즈 — 결정론적으로 일부 샘플에 노이즈 픽셀 추가. */
function addNoise(p: number[], seed: number, count: number): number[] {
  const out = [...p];
  let s = seed;
  for (let i = 0; i < count; i++) {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    const k = s % 64;
    out[k] = out[k] === 1 ? 0 : 1;
  }
  return out;
}

/* 데이터셋 — 라벨당 50장 = 150장. 약 20%(라벨당 10장)가 더럽다. */
function buildSamples(): DotSample[] {
  const out: DotSample[] = [];
  let counter = 0;

  for (const label of SHAPE_LABELS) {
    VARIANTS.forEach((v, i) => {
      const id = `${label}-${i + 1}`;
      const pixels = makeShape(label, v.cx, v.cy, v.r);

      let noisy = false;
      let mislabel: ShapeLabel | undefined;
      let finalPixels = pixels;

      if (MISLABEL_INDICES.has(i)) {
        // 라벨만 잘못 — 그림은 정상 label인데, 적힌 라벨은 task swap 결과
        mislabel = mislabelTo(label);
      } else if (MISLABEL_NOISY_INDICES.has(i)) {
        // 라벨도 틀리고 픽셀도 깨짐 — 가장 명백히 "이건 빼야 한다"
        finalPixels = addNoise(pixels, counter * 13 + 7, 8);
        noisy = true;
        mislabel = mislabelTo(label);
      }

      out.push({
        id,
        label: mislabel ?? label,
        pixels: finalPixels,
        noisy,
        mislabel: mislabel ? label : undefined,
      });
      counter += 1;
    });
  }

  return out;
}

export const DOT_SAMPLES_DEFAULT: DotSample[] = buildSamples();
export const SAMPLES_PER_LABEL = N_PER_LABEL;
