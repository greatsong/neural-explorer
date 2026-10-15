import { build } from 'vite';
import react from '@vitejs/plugin-react';
import { cp, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'private/lecture-complete');
await build({
  configFile: false, root, base: './', publicDir: false,
  plugins: [react(), {
    name: 'offline-system-fonts', enforce: 'pre',
    transform(code, id) {
      if (id === path.join(root, 'src/index.css')) return code.replace(/^@import url\(['"]https?:[^\n]+\n/gm, '');
    },
  }],
  define: { 'process.env.NODE_ENV': JSON.stringify('production') },
  build: {
    outDir: out, emptyOutDir: true, cssCodeSplit: false,
    lib: { entry: path.join(root, 'src/lecture/offline.tsx'), name: 'NeuralLecture', formats: ['iife'], fileName: () => 'lecture.js', cssFileName: 'lecture' },
  },
});
await cp(path.join(root, 'public/lecture-assets'), path.join(out, 'lecture-assets'), { recursive: true });
const css = await readFile(path.join(out, 'lecture.css'), 'utf8');
if (/https?:\/\//.test(css)) throw new Error('Offline CSS still has an external dependency');
await writeFile(path.join(out, 'index.html'), `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>손으로 풀어보는 딥러닝의 원리 · 완성본</title><link rel="stylesheet" href="lecture.css"></head><body><div id="root"></div><script src="lecture.js"></script></body></html>`);
await writeFile(path.join(out, '사용안내.txt'), '이 폴더의 index.html을 Chrome에서 열면 인터넷 없이 발표할 수 있습니다.\n폴더 안의 파일과 lecture-assets 폴더를 함께 보관하세요.\n\n다음/이전: 화면 아래 버튼 또는 좌우 방향키(영상 화면에서도 슬라이드를 넘깁니다)\n전체 화면: F (다시 누르면 해제)\n발표자 노트: N\n처음/마지막: Home / End\n영상: 재생 버튼으로 시작, 영상이 끝나면 아래 다음 버튼으로 이동\n영상 화면에서는 Space로 재생·정지합니다. 10초 이동은 −10초·+10초 버튼을 사용합니다.\n탐색 막대를 드래그하거나 구간 바로가기를 눌러 원하는 부분으로 이동할 수 있습니다. 이세돌 인터뷰는 4:15, 하사비스 특강은 1분 단위로 이동합니다.\n다음 버튼이나 방향키로 넘기면 영상과 소리가 멈춥니다.\n');
console.log(`Offline lecture: ${out}/index.html`);
