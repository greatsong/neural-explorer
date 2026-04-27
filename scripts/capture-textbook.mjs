// 교과서용 페이즈 캡처 자동화 스크립트.
// 사용: 1) 다른 터미널에서 dev 서버를 4036에 띄운 뒤  2) node scripts/capture-textbook.mjs
// 결과: public/textbook/captures/p<N>.png 갱신.
import puppeteer from 'puppeteer';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const ROOT = resolve(dirname(__filename), '..');
const OUT_DIR = resolve(ROOT, 'public/textbook/captures');
const PORT = process.env.PORT || 4036;
const BASE = `http://localhost:${PORT}`;

const PHASES = ['p1','p2','p3','p4','p5','p6','p7','p8','p9','p10','p11','p12'];

async function captureMain(page, slug) {
  const url = `${BASE}/#/${slug}`;
  await page.goto(url, { waitUntil: 'networkidle2' });
  // 페이지 안의 인터랙션이 마운트될 시간을 약간 준다.
  await new Promise((r) => setTimeout(r, 700));
  // main 영역 (사이드바 제외) 캡처가 가장 깨끗하다.
  const mainHandle = await page.$('main');
  const target = mainHandle ?? page;
  const path = resolve(OUT_DIR, `${slug}.png`);
  await target.screenshot({ path, type: 'png' });
  console.log(`✓ ${slug} → ${path}`);
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const browser = await puppeteer.launch({
    headless: 'new',
    defaultViewport: { width: 1280, height: 900, deviceScaleFactor: 2 },
  });
  try {
    const page = await browser.newPage();
    page.on('pageerror', (e) => console.warn('  ! pageerror', e.message));
    for (const slug of PHASES) {
      try {
        await captureMain(page, slug);
      } catch (e) {
        console.warn(`  × ${slug} failed:`, e.message);
      }
    }
  } finally {
    await browser.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
