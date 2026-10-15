// lecture-steps.json 재생성. 먼저 `npx vite preview --port 4035`를 띄운 뒤: node scripts/lecture-gen-steps.mjs
import puppeteer from 'puppeteer';
import fs from 'node:fs';
const b=await puppeteer.launch({headless:'new',args:['--no-sandbox']}); const p=await b.newPage(); await p.setViewport({width:1600,height:900});
await p.goto('http://localhost:4035/#/lecture/1',{waitUntil:'networkidle0'});
const total=await p.evaluate(()=>{const m=document.body.innerText.match(/(\d+) \/ (\d+)\s*$/m); return m?+m[2]:0;});
const steps=[]; const titles=[];
for(let i=1;i<=total;i++){ await p.goto('about:blank'); await p.goto(`http://localhost:4035/#/lecture/${i}?step=0`,{waitUntil:'networkidle0'}); await new Promise(r=>setTimeout(r,200));
  const t=await p.evaluate(()=>document.body.innerText); const ms=[...t.matchAll(/(\d+) \/ (\d+)/g)].map(m=>[+m[1],+m[2]]);
  const st=ms.find(([,d])=>d!==total); steps.push(st?st[1]:0);
  const h=await p.evaluate(()=>{const e=document.querySelector('h1,h2'); return e?e.textContent.trim():'';}); titles.push(h); }
await b.close(); fs.writeFileSync('scripts/lecture-steps.json', JSON.stringify(steps)); console.log('total',total,'steps sum',steps.reduce((a,c)=>a+c+1,0)); titles.forEach((t,i)=>{ if(i>=50&&i<=68) console.log(i+1, steps[i], t); });
