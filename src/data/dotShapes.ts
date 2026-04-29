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

/* 결정론적 변형 — 같은 라벨의 12장이 위치·크기로 살짝씩 다르게 생긴다 */
const VARIANTS: { cx: number; cy: number; r: number }[] = [
  { cx: 3.5, cy: 3.5, r: 3 },     // center, large
  { cx: 3.5, cy: 3.5, r: 2.5 },   // center, medium
  { cx: 3.5, cy: 3.5, r: 2 },     // center, small
  { cx: 2.5, cy: 2.5, r: 2 },     // top-left small
  { cx: 4.5, cy: 4.5, r: 2 },     // bottom-right small
  { cx: 2.5, cy: 4.5, r: 2 },     // bottom-left
  { cx: 4.5, cy: 2.5, r: 2 },     // top-right
  { cx: 3.5, cy: 4.5, r: 2.5 },   // center-low medium
  { cx: 3.5, cy: 2.5, r: 2.5 },   // center-high medium
  { cx: 3, cy: 3, r: 2.5 },       // slight off-center
  { cx: 4, cy: 4, r: 2.5 },       // slight off-center 2
  { cx: 3.5, cy: 3.5, r: 2.7 },   // center, ~mid
];

/* 노이즈 — 결정론적으로 일부 샘플에 노이즈 픽셀 추가 */
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

/* 데이터셋 — 라벨당 12장 = 36장. 일부에 noise·mislabel을 심는다. */
function buildSamples(): DotSample[] {
  const out: DotSample[] = [];
  let counter = 0;

  for (const label of SHAPE_LABELS) {
    VARIANTS.forEach((v, i) => {
      const id = `${label}-${i + 1}`;
      const pixels = makeShape(label, v.cx, v.cy, v.r);

      // 결정론적 노이즈/오라벨: B2 학생이 정제할 거리 만들기
      // 라벨당 1개 노이즈, 라벨당 1개 mislabel(같은 라벨 그림인데 다른 라벨로 등록됨)
      let noisy = false;
      let mislabel: ShapeLabel | undefined;
      let finalPixels = pixels;

      if (i === 5) {
        // 노이즈 픽셀 추가 — 학생이 보고 "이상해 보인다"는 것을 잡아낼 후보
        finalPixels = addNoise(pixels, counter * 7 + 11, 6);
        noisy = true;
      }
      if (i === 9) {
        // 오라벨 — 그림은 label인데, 다음 라벨로 잘못 적힌 것처럼
        mislabel = SHAPE_LABELS[(SHAPE_LABELS.indexOf(label) + 1) % SHAPE_LABELS.length];
      }

      out.push({
        id,
        label: mislabel ?? label, // 데이터셋의 *적힌* 라벨 (mislabel이 있으면 잘못된 라벨)
        pixels: finalPixels,
        noisy,
        mislabel: mislabel ? label : undefined, // 정답 라벨 (정제 후 학생이 발견)
      });
      counter += 1;
    });
  }

  return out;
}

export const DOT_SAMPLES_DEFAULT: DotSample[] = buildSamples();
export const SAMPLES_PER_LABEL = VARIANTS.length;
