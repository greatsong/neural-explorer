// textbook/*.md -> src/content/docs/*.md (Starlight frontmatter + 링크 변환)
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const SRC = resolve(here, '..', '..', 'textbook');
const OUT = resolve(here, '..', 'src', 'content', 'docs');

// 출력 슬러그(소문자) + 메타
const FILES = [
  { src: 'README.md',       slug: 'index',        title: '신경망 첫걸음 — 1부',     desc: '단일 뉴런의 한 step에서 시작해 손글씨 분류까지 — 자기주도 교재 1부', heroLike: true },
  { src: '00-prologue.md',  slug: '00-prologue',  title: '시작하며',                desc: '이 책을 읽는 법' },
  { src: 'A1.md',           slug: 'a1',           title: 'A1. 인공 뉴런의 예측',    desc: '부품 → 곱·합·활성화 → 예측값' },
  { src: 'A2.md',           slug: 'a2',           title: 'A2. 오차와 MSE',          desc: '예측 − 정답, 그리고 평균 제곱' },
  { src: 'A3.md',           slug: 'a3',           title: 'A3. 경사하강법',          desc: '손실이 줄어드는 방향 + 보폭 η' },
  { src: 'A4.md',           slug: 'a4',           title: 'A4. 기울기 계산하기',     desc: 'e·x 모양 + 표본 평균' },
  { src: 'A5.md',           slug: 'a5',           title: 'A5. 전체 흐름 완성',      desc: '예측 → 오차 → 기울기 → 갱신 한 묶음' },
  { src: 'A6.md',           slug: 'a6',           title: 'A6. 기온 예측 프로젝트',  desc: '인공 뉴런 1개로 서울 기온 회귀' },
  { src: 'B1.md',           slug: 'b1',           title: 'B1. 문제 정의와 라벨',    desc: '세모 vs 네모, 입력·특징·정답' },
  { src: 'B2.md',           slug: 'b2',           title: 'B2. 데이터셋과 전처리',   desc: '기본 데이터 + 정제할 샘플 찾기' },
  { src: 'B3.md',           slug: 'b3',           title: 'B3. 학습 / 평가 데이터 나누기', desc: '왜 나눠야 하는가' },
  { src: 'B4.md',           slug: 'b4',           title: 'B4. 이진 분류 모델 학습', desc: '세모 vs 네모, 시그모이드 출력 1개' },
  { src: 'C1.md',           slug: 'c1',           title: 'C1. MNIST 데이터셋 소개', desc: '왜 손글씨 숫자 분류가 의미 있는가' },
  { src: 'C2.md',           slug: 'c2',           title: 'C2. 미니 MNIST 도전',     desc: '실제 데이터 일부(300장)로 작은 모델을 직접 학습' },
  { src: '99-epilogue.md',  slug: '99-epilogue',  title: '마치며',                  desc: '무엇을 배웠는지 정리하고 다음 단계로' },
];

// (X.md) → (/소문자/), (../) 등은 그대로
function rewriteLinks(md) {
  // [텍스트](Foo.md) 또는 (./Foo.md) 또는 (Foo.md#anchor)
  return md.replace(/\((\.?\/?)([0-9A-Za-z_\-]+)\.md(#[^)]+)?\)/g, (_, _prefix, name, hash) => {
    const lower = name.toLowerCase();
    let slug = lower;
    if (lower === 'readme') slug = '';                          // README → 홈
    else if (lower === '00-prologue') slug = '00-prologue';
    else if (lower === '99-epilogue') slug = '99-epilogue';
    return `(/${slug}${slug ? '/' : ''}${hash || ''})`;
  });
}

// 첫 번째 H1 한 줄 제거 (frontmatter title이 자동 렌더되어 중복 방지)
function stripFirstH1(md) {
  const lines = md.split('\n');
  let removed = false;
  const out = [];
  for (const line of lines) {
    if (!removed && /^#\s+/.test(line)) {
      removed = true;
      continue; // 첫 H1만 제거
    }
    out.push(line);
  }
  // 잇따른 빈 줄 1개도 제거
  while (out.length && out[0].trim() === '') out.shift();
  return out.join('\n');
}

async function main() {
  await mkdir(OUT, { recursive: true });
  for (const f of FILES) {
    const inPath = resolve(SRC, f.src);
    const outPath = resolve(OUT, `${f.slug}.md`);
    const raw = await readFile(inPath, 'utf-8');
    let body = stripFirstH1(raw);
    body = rewriteLinks(body);

    const fm = [
      '---',
      `title: ${JSON.stringify(f.title)}`,
      `description: ${JSON.stringify(f.desc)}`,
      f.slug === 'index' ? 'template: doc' : null,
      '---',
      '',
    ]
      .filter(Boolean)
      .join('\n');

    await writeFile(outPath, fm + body + (body.endsWith('\n') ? '' : '\n'));
    console.log(`✓ ${f.src} → ${f.slug}.md`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
