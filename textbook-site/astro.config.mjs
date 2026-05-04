import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

// https://astro.build/config
export default defineConfig({
  site: 'https://greatsong.github.io',
  base: '/neural-explorer',
  trailingSlash: 'always',
  markdown: {
    remarkPlugins: [remarkMath],
    rehypePlugins: [rehypeKatex],
  },
  integrations: [
    starlight({
      title: '신경망 첫걸음',
      description:
        '단일 뉴런의 한 step에서 시작해 손글씨 분류까지 — 자기주도 교재 1부',
      defaultLocale: 'root',
      locales: {
        root: { label: '한국어', lang: 'ko' },
      },
      head: [
        {
          tag: 'link',
          attrs: {
            rel: 'stylesheet',
            href: 'https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css',
            integrity:
              'sha384-nB0miv6/jRmo5UMMR1wu3Gz6NLsoTkbqJghGIsx//Rlm+ZU03BU6SQNC66uf4l5+',
            crossorigin: 'anonymous',
          },
        },
      ],
      social: {
        github: 'https://github.com/greatsong/neural-explorer',
      },
      sidebar: [
        { label: '시작하며', link: '/00-prologue/' },
        {
          label: 'A. 단일 인공 뉴런의 학습',
          items: [
            { label: 'A1. 인공 뉴런의 예측', link: '/a1/' },
            { label: 'A2. 오차와 MSE', link: '/a2/' },
            { label: 'A3. 경사하강법', link: '/a3/' },
            { label: 'A4. 기울기 계산하기', link: '/a4/' },
            { label: 'A5. 전체 흐름 완성', link: '/a5/' },
            { label: 'A6. 기온 예측 프로젝트', link: '/a6/' },
          ],
        },
        {
          label: 'B. 분류 문제 해결하기',
          items: [
            { label: 'B1. 문제 정의와 라벨', link: '/b1/' },
            { label: 'B2. 데이터셋과 전처리', link: '/b2/' },
            { label: 'B3. 학습 / 평가 데이터 나누기', link: '/b3/' },
            { label: 'B4. 이진 분류 모델 학습', link: '/b4/' },
          ],
        },
        {
          label: 'C. 딥러닝으로 손글씨 분류하기',
          items: [
            { label: 'C1. MNIST 데이터셋 소개', link: '/c1/' },
            { label: 'C2. 미니 MNIST 도전', link: '/c2/' },
          ],
        },
        { label: '마치며', link: '/99-epilogue/' },
      ],
      customCss: ['./src/styles/custom.css'],
    }),
  ],
});
