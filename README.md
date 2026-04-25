# 🧠 Neural Explorer

코드 없이 슬라이더와 그림판으로 신경망의 원리를 배우는 12단계 인터랙티브 학습 앱.

대상: 고등학생 (수업 4차시 분량)

## 페이즈 구성

**1부 — 뉴런의 기초**
1. 인공 뉴런 해부 (가중치·편향·활성화)
2. 순전파 퀴즈
3. 오차 측정
4. 수동 학습
5. 자동 학습 (경사 하강법)

**2부 — 분류와 평가**
6. 입시 합격 예측 (정시 / 학종 시나리오)
7. 데이터 추가 후 재학습 + SNS 합불 통지서
8. 정확도
9. 평가의 함정 (정밀도·재현율, 코로나·암 시나리오)

**3부 — 직접 만들기**
10. 도트 그림 학습 + 오픈소스 갤러리 공유 ([neural-explorer-gallery](https://github.com/greatsong/neural-explorer-gallery), CC-BY 4.0)

**4부 — 깊은 학습**
11. 신경망 설계 (2종 → 3종 → 10종, 복잡도와 신경망 크기)
12. MNIST 도전

## 개발

```bash
npm install
npm run dev      # http://localhost:4033
npm run build
```

## 스택

- Vite + React + TypeScript + Tailwind
- Zustand (상태 영속), KaTeX, Recharts
- Astro Starlight 톤 (라이트/다크)

## 라이선스

MIT (앱 코드) · 갤러리 데이터셋은 CC-BY 4.0
