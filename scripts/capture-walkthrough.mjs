#!/usr/bin/env node
/**
 * 단계별 화면 캡처 — 웹앱 부록(/guide)에서 학습자가 변화의 흐름을 따라갈 수 있도록.
 * 각 페이즈마다 "처음 → 만진 후 → 결과" 식의 시퀀스로 캡처합니다.
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
    const btn = [...document.querySelectorAll('button')].find(
      (b) => b.textContent.trim() === t || b.textContent.trim().startsWith(t)
    );
    btn?.click();
  }, text);
  await SLEEP(350);
}

async function setRange(idx, value) {
  await page.evaluate(
    (i, v) => {
      const el = document.querySelectorAll('article input[type="range"]')[i];
      if (!el) return;
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      setter.call(el, String(v));
      el.dispatchEvent(new Event('input', { bubbles: true }));
    },
    idx,
    value
  );
  await SLEEP(180);
}

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

async function safe(name, fn) {
  try {
    await fn();
  } catch (e) {
    console.warn('✗', name, e.message);
  }
}

// ── 1~12: 첫 화면만 (부록의 빠른 미리보기 카드)
for (const id of ['p1','p2','p3','p4','p5','p6','p7','p8','p9','p10','p11','p12']) {
  await safe(id, async () => {
    await go('#/' + id);
    await shoot(id);
  });
}

// ── 두 포털
await safe('portal-1', async () => {
  await go('#/p12');
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await SLEEP(200);
  await shoot('portal-1');
});
await safe('portal-2', async () => {
  await go('#/p14');
  await clickByText('② 학습');
  await clickByText('학습 시작');
  await SLEEP(2500);
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await SLEEP(200);
  await shoot('portal-2');
});

// ── p13: 평균과 분포 — blend / noise 변화
await safe('p13', async () => {
  await go('#/p13');
  await shoot('p13-1-mean');                    // 시작
  await setRange(0, 0.5); await shoot('p13-2-blend');   // blend = 0.5
  await setRange(1, 0.3); await shoot('p13-3-noise');   // noise = 0.3
});

// ── p14: 오토인코더 — 학습 전/후 + 잠재 공간 탐험
await safe('p14', async () => {
  await go('#/p14');
  await shoot('p14-1-structure');
  await clickByText('② 학습');
  await SLEEP(200);
  await shoot('p14-2-before');                  // 학습 전
  await clickByText('학습 시작');
  await SLEEP(2500);
  await shoot('p14-3-after');                   // 학습 후 손실
  await clickByText('③ 잠재 공간 탐험');
  await SLEEP(400);
  await shoot('p14-4-explore');                 // z=(0,0) 부근
  await setRange(0, 1.5); await setRange(1, 1.5);
  await shoot('p14-5-edge');                    // 잠재 공간 모서리
});

// ── p15: 텍스트→숫자
await safe('p15', async () => {
  await go('#/p15');
  await shoot('p15-1-codepoint');
  await clickByText('② 직접 입력해보기');
  await SLEEP(200);
  await shoot('p15-2-input');
  await clickByText('③ 한글·영어·이모지');
  await SLEEP(200);
  await shoot('p15-3-compare');
});

// ── p16: 토큰 BPE 단계별
await safe('p16', async () => {
  await go('#/p16');
  await shoot('p16-1-tokenizer');
  await clickByText('② BPE 미니 시뮬레이터');
  await SLEEP(200);
  await shoot('p16-2-bpe-0');                   // 스텝 0
  for (let i = 0; i < 3; i++) await clickByText('다음 합치기');
  await shoot('p16-3-bpe-3');                   // 스텝 3
  for (let i = 0; i < 5; i++) await clickByText('다음 합치기');
  await shoot('p16-4-bpe-8');                   // 스텝 8 (끝)
  await clickByText('③ 영어 vs 한글');
  await SLEEP(200);
  await shoot('p16-5-compare');
});

// ── p17: 임베딩 + 3D
await safe('p17', async () => {
  await go('#/p17');
  await shoot('p17-1-onehot');
  await clickByText('② 임베딩 행렬 W');
  await SLEEP(500);
  await shoot('p17-2-embed');
  await clickByText('③ 직접 만져보기');
  await SLEEP(300);
  await shoot('p17-3-play-default');            // cos 0.99
  await setRange(0, -1);                        // d1 → -1
  await shoot('p17-4-play-far');                // cos -0.3
});

// ── p18: Word2Vec (학습 전/후 + 벡터 산수)
await safe('p18', async () => {
  await go('#/p18');
  await shoot('p18-1-before');
  await clickByText('학습 시작');
  await SLEEP(3500);
  await shoot('p18-2-trained');                 // 학습 끝, 손실 그래프
  await clickByText('② 임베딩 공간');
  await SLEEP(600);
  await shoot('p18-3-space-en');                // EN 클러스터
  await clickByText('③ 벡터 산수');
  await SLEEP(300);
  await clickByText('king - man + woman');
  await SLEEP(200);
  await shoot('p18-4-king');
  await clickByText('boy - man + woman');
  await SLEEP(200);
  await shoot('p18-5-boy');
});

// ── p19: 시퀀스 / RNN
await safe('p19', async () => {
  await go('#/p19');
  await shoot('p19-1-why');
  await clickByText('② 평균 임베딩의 한계');
  await SLEEP(200);
  await shoot('p19-2-avg');
  await clickByText('③ RNN');
  await SLEEP(200);
  await setRange(0, 0); await shoot('p19-3-rnn-c0');
  await setRange(0, 0.5); await shoot('p19-4-rnn-c5');
  await setRange(0, 0.9); await shoot('p19-5-rnn-c9');
});

// ── p20: 어텐션 — 가중치 변화 + 출력
await safe('p20', async () => {
  await go('#/p20');
  await shoot('p20-1-idea');
  await clickByText('② 어텐션 행렬 만지기');
  await SLEEP(200);
  await shoot('p20-2-default');
  // 마지막 행("봤다")이 "쥐를"을 더 보도록 — 9개 슬라이더 중 7번 idx (행2,col1)
  await setRange(7, 5); await setRange(6, 1);
  await shoot('p20-3-modified');
  await clickByText('③ 가중 합 결과');
  await SLEEP(200);
  await shoot('p20-4-output');
});

// ── p21: 멀티헤드
await safe('p21', async () => {
  await go('#/p21');
  await shoot('p21-1-heads');
  await clickByText('② 트랜스포머 블록');
  await SLEEP(200);
  await shoot('p21-2-block');
  await clickByText('③ 1층 vs 6층');
  await SLEEP(200);
  await setRange(0, 1); await shoot('p21-3-depth-1');
  await setRange(0, 6); await shoot('p21-4-depth-6');
  await setRange(0, 12); await shoot('p21-5-depth-12');
});

// ── p22: GPT 다음 토큰
await safe('p22', async () => {
  await go('#/p22');
  await shoot('p22-1-logits');
  await clickByText('② 샘플링 슬라이더');
  await SLEEP(200);
  await setRange(0, 0.1); await shoot('p22-2-temp-low');
  await setRange(0, 1.0); await shoot('p22-3-temp-mid');
  await setRange(0, 2.0); await shoot('p22-4-temp-high');
  await clickByText('③ 자기회귀 생성');
  await SLEEP(200);
  await shoot('p22-5-gen-0');
  for (let i = 0; i < 4; i++) await clickByText('한 토큰 더');
  await shoot('p22-6-gen-4');
});

await browser.close();
console.log('Done.');
