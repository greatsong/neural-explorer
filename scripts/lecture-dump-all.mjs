// 슬라이드별 교사 스크립트용 덤프. 먼저 `npx vite preview --port 4036`을 띄운 뒤: node scripts/lecture-dump-all.mjs scripts/lecture-steps.json private/lecture-all.json 4036
// 전 장·전 단계의 화면 글자 + 제목·태그·발표자 노트를 JSON으로. 사용: node dump-all.mjs <steps.json> <out.json> <port>
import puppeteer from 'puppeteer';
import fs from 'node:fs';
const steps = JSON.parse(fs.readFileSync(process.argv[2], 'utf8')); const out = process.argv[3]; const port = process.argv[4] || '4036';
const b = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'], protocolTimeout: 120000 });
const p = await b.newPage(); await p.setViewport({ width: 1600, height: 900 });
const slides = [];
for (let i = 1; i <= steps.length; i++) {
  const rec = { n: i, steps: [] };
  for (let s = 0; s <= steps[i - 1]; s++) {
    await p.goto('about:blank'); await p.goto(`http://localhost:${port}/#/lecture/${i}?step=${s}`, { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 350));
    const info = await p.evaluate(() => {
      const vis = (el) => { let e = el; while (e) { const st = getComputedStyle(e); if (st.visibility === 'hidden' || st.display === 'none') return false; const o = st.opacity; if (o !== '' && +o < 0.05) return false; e = e.parentElement; } return true; };
      const main = document.querySelector('main') || document.body;
      const h = main.querySelector('h1, h2'); const title = h ? h.textContent.trim() : '';
      const tagEl = [...main.querySelectorAll('span, div')].find(e => /^활동지 /.test(e.textContent.trim()) && e.children.length === 0 && e.getBoundingClientRect().top < 140);
      const tag = tagEl ? tagEl.textContent.trim() : '';
      // 캡션(제목 아래 설명 줄): 글자 크기 34px인 lec-fade 요소
      const caps = [...main.querySelectorAll('.lec-fade')].filter(e => getComputedStyle(e).fontSize === '34px' && vis(e) && e.textContent.trim()).map(e => e.textContent.trim());
      // 보이는 글자 전체
      const all = [];
      main.querySelectorAll('*').forEach(el => { if (el.children.length) return; const t = (el.textContent || '').trim(); if (t && vis(el)) all.push(t); });
      return { title, tag, caps, all };
    });
    if (s === 0) { rec.title = info.title; rec.tag = info.tag; }
    rec.steps.push({ k: s, caps: info.caps, all: info.all });
  }
  // 노트: N 키
  await p.keyboard.press('KeyN'); await new Promise(r => setTimeout(r, 200));
  rec.notes = await p.evaluate(() => { const ps = [...document.querySelectorAll('p.m-0')]; return ps.map(e => e.textContent.trim()).filter(Boolean); });
  slides.push(rec);
}
await b.close(); fs.writeFileSync(out, JSON.stringify(slides, null, 1)); console.log('slides', slides.length, 'notes', slides.filter(x => x.notes.length).length);
