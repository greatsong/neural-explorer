// 특강 슬라이드 글자 겹침 검사. 먼저 `npx vite preview --port 4035`를 띄운 뒤: node scripts/lecture-overlap-check.mjs scripts/lecture-steps.json 34 75
// 전 장·전 단계에서 글자 요소(SVG text, 글자만 가진 HTML 요소)의 화면 상자가 서로 겹치는 곳을 찾는다.
// 사용: node overlap-check.mjs <steps.json> <from> <to>
import puppeteer from 'puppeteer';
import fs from 'node:fs';
const steps = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const FROM = +process.argv[3] || 1, TO = +process.argv[4] || steps.length;
const b = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'], protocolTimeout: 120000 });
const p = await b.newPage(); await p.setViewport({ width: 1600, height: 900 });
const found = [];
for (let i = FROM; i <= TO; i++) for (let s = 0; s <= steps[i - 1]; s++) {
  await p.goto('about:blank'); await p.goto(`http://localhost:4035/#/lecture/${i}?step=${s}`, { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 500));
  const hits = await p.evaluate(() => {
    const vis = (el) => { const st = getComputedStyle(el); if (st.visibility === 'hidden' || st.display === 'none') return false; let e = el; while (e) { const o = getComputedStyle(e).opacity; if (o !== '' && +o < 0.05) return false; e = e.parentElement; } return true; };
    const items = [];
    document.querySelectorAll('svg text').forEach((t) => { if (!vis(t) || !t.textContent.trim()) return; const r = t.getBoundingClientRect(); if (r.width > 0) items.push({ t: t.textContent.trim().slice(0, 24), r }); });
    document.querySelectorAll('main *').forEach((el) => {
      if (el.closest('svg')) return;
      if (el.children.length) return; const txt = (el.textContent || '').trim(); if (!txt || !vis(el)) return;
      const r = el.getBoundingClientRect(); if (r.width > 0 && r.height > 0 && r.height < 120) items.push({ t: txt.slice(0, 24), r });
    });
    const out = [];
    for (let a = 0; a < items.length; a++) for (let c = a + 1; c < items.length; c++) {
      const A = items[a].r, B = items[c].r;
      const w = Math.min(A.right, B.right) - Math.max(A.left, B.left), h = Math.min(A.bottom, B.bottom) - Math.max(A.top, B.top);
      if (w <= 2 || h <= 2) continue;
      const inter = w * h, small = Math.min(A.width * A.height, B.width * B.height);
      if (inter / small > 0.12) out.push(`${items[a].t} ⟂ ${items[c].t} (${Math.round(inter / small * 100)}%)`);
    }
    return out;
  });
  if (hits.length) found.push({ slide: i, step: s, hits });
}
await b.close();
for (const f of found) console.log(`slide ${f.slide} step ${f.step}: ${f.hits.join(' | ')}`);
console.log('검사 끝. 겹침 있는 단계 수', found.length);
