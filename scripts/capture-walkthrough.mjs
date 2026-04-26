#!/usr/bin/env node
/**
 * 1~4부(p1~p12) 첫 화면을 캡처해 웹앱 안 가이드(/guide)에서 카드 썸네일로 씁니다.
 * 5·6부는 히든 스테이지라 가이드 본문에 다루지 않으므로 캡처도 만들지 않습니다.
 */
import puppeteer from 'puppeteer';
import path from 'node:path';
import fs from 'node:fs/promises';

const BASE = process.env.BASE || 'http://localhost:4035';
const OUT = path.resolve('public/walkthrough');
await fs.mkdir(OUT, { recursive: true });

const SLEEP = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({ headless: 'new' });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
await page.goto(BASE);
await SLEEP(400);

async function shoot(name) {
  const file = path.join(OUT, `${name}.png`);
  try {
    await page.evaluate(() => {
      const a = document.querySelector('article');
      if (a) a.scrollIntoView({ block: 'start' });
    });
  } catch (_) {}
  await SLEEP(150);
  await page.screenshot({ path: file, fullPage: true });
  console.log('✓', name);
}

for (const id of ['p1','p2','p3','p4','p5','p6','p7','p8','p9','p10','p11','p12']) {
  try {
    await page.goto(BASE + '/#/' + id);
    await SLEEP(700);
    await shoot(id);
  } catch (e) {
    console.warn('✗', id, e.message);
  }
}

await browser.close();
console.log('Done.');
