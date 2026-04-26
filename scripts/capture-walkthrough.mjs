#!/usr/bin/env node
import puppeteer from 'puppeteer';
import path from 'node:path';
import fs from 'node:fs/promises';

const BASE = process.env.BASE || 'http://localhost:4035';
const OUT = path.resolve('docs/screenshots');

await fs.mkdir(OUT, { recursive: true });

const SLEEP = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({ headless: 'new' });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });

// 보너스 두 개 모두 풀고 5부 완료 상태로 이동
await page.goto(BASE);
await page.evaluate(() => {
  const data = {
    state: {
      completed: { p10: true, p11: true, p12: true, p13: true, p14: true },
      theme: 'light',
      bonusUnlocked: true,
      bonusUnlocked2: true,
    },
    version: 0,
  };
  localStorage.setItem('neural-explorer-state', JSON.stringify(data));
});
await page.reload();
await SLEEP(500);

async function go(hash) {
  await page.goto(BASE + '/' + hash);
  await SLEEP(700);
}

async function clickByText(text) {
  await page.evaluate((t) => {
    const btn = [...document.querySelectorAll('button')].find((b) => b.textContent.trim() === t || b.textContent.trim().startsWith(t));
    btn?.click();
  }, text);
  await SLEEP(400);
}

async function setRange(idx, value) {
  await page.evaluate((i, v) => {
    const el = document.querySelectorAll('article input[type="range"]')[i];
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    setter.call(el, String(v));
    el.dispatchEvent(new Event('input', { bubbles: true }));
  }, idx, value);
  await SLEEP(150);
}

async function scrollToContent() {
  await page.evaluate(() => {
    const el = document.querySelector('article');
    if (el) el.scrollIntoView({ behavior: 'instant', block: 'start' });
  });
  await SLEEP(150);
}

async function shoot(name) {
  const file = path.join(OUT, `${name}.png`);
  await scrollToContent();
  await page.screenshot({ path: file, fullPage: true });
  console.log('✓', name);
}

// p13 평균과 분포
await go('#/p13');
await shoot('p13-mean');

// p14 오토인코더 — ②학습 / ③탐험
await go('#/p14');
await clickByText('② 학습');
await SLEEP(200);
await shoot('p14-train');
// 학습 트리거 후 탐험 탭
await clickByText('학습 시작');
await SLEEP(2500);
await clickByText('③ 잠재 공간 탐험');
await SLEEP(400);
await shoot('p14-explore');

// p15 텍스트→숫자
await go('#/p15');
await shoot('p15-codepoint');
await clickByText('② 직접 입력해보기');
await shoot('p15-input');
await clickByText('③ 한글·영어·이모지');
await shoot('p15-compare');

// p16 토큰
await go('#/p16');
await shoot('p16-tokenizer');
await clickByText('② BPE 미니 시뮬레이터');
await SLEEP(200);
for (let i = 0; i < 5; i++) await clickByText('다음 합치기');
await shoot('p16-bpe');
await clickByText('③ 영어 vs 한글');
await shoot('p16-compare');

// p17 임베딩 + 3D
await go('#/p17');
await clickByText('② 임베딩 행렬 W');
await shoot('p17-embed');
await clickByText('③ 직접 만져보기');
await shoot('p17-play');

// p18 Word2Vec
await go('#/p18');
await clickByText('학습 시작');
await SLEEP(3500);
await shoot('p18-train');
await clickByText('② 임베딩 공간');
await SLEEP(500);
await shoot('p18-space');
await clickByText('③ 벡터 산수');
await SLEEP(300);
await clickByText('king - man + woman');
await SLEEP(200);
await shoot('p18-arith');

// p19 시퀀스
await go('#/p19');
await clickByText('② 평균 임베딩의 한계');
await shoot('p19-avg');
await clickByText('③ RNN');
await shoot('p19-rnn');

// p20 어텐션
await go('#/p20');
await clickByText('② 어텐션 행렬 만지기');
await shoot('p20-matrix');
await clickByText('③ 가중 합 결과');
await shoot('p20-output');

// p21 멀티헤드
await go('#/p21');
await shoot('p21-heads');
await clickByText('② 트랜스포머 블록');
await shoot('p21-block');
await clickByText('③ 1층 vs 6층');
await shoot('p21-depth');

// p22 GPT 다음 토큰
await go('#/p22');
await shoot('p22-logits');
await clickByText('② 샘플링 슬라이더');
await shoot('p22-sampling');
await clickByText('③ 자기회귀 생성');
await SLEEP(200);
for (let i = 0; i < 4; i++) await clickByText('한 토큰 더');
await shoot('p22-generate');

// 두 개 포털
await go('#/p12');
await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
await SLEEP(200);
await shoot('portal-1');
await go('#/p14');
await clickByText('② 학습');
await SLEEP(200);
await clickByText('학습 시작');
await SLEEP(2500);
await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
await SLEEP(200);
await shoot('portal-2');

await browser.close();
console.log('Done.');
