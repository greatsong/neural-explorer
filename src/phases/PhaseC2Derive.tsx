// PhaseC2Derive — 역전파 식 유도 (사슬규칙 한 줄씩)
// C1에서 다이어그램으로 본 6단계의 식들이 *왜* 그 모양인가를 사슬규칙으로 푼다.
// 이 페이즈가 끝나면 학생은 "직관"을 넘어 식 자체를 *재구성*할 수 있다.
// 데이터·초기 가중치는 C1과 동일(x=2, y=5)이라 학생이 C1에서 본 -3.35, -5.02 같은 숫자를 다시 만나며 식과 직관이 한 줄로 이어진다.

import { useEffect, useState } from 'react';
import { PHASES } from '../phases';
import { useApp } from '../store';
import { BackpropDerivation } from './PhaseC1Derivation';

// C1과 동일한 모델·데이터·초기 가중치
const INIT = { w1: 0.5, b1: 0.1, w2: 1.5, b2: 0.0 };
const SAMPLE = { x: 2, y: 5 };
const relu = (z: number) => (z > 0 ? z : 0);
const reluD = (z: number) => (z > 0 ? 1 : 0);

function trace(W: typeof INIT) {
  const z1 = W.w1 * SAMPLE.x + W.b1;
  const reluP = (reluD(z1) as 0 | 1);
  const h = relu(z1);
  const z2 = W.w2 * h + W.b2;
  const yhat = z2;
  const e = yhat - SAMPLE.y;
  const dw2 = e * h;
  const db2 = e;
  const eh = e * W.w2;
  const ez1 = eh * reluP;
  const dw1 = ez1 * SAMPLE.x;
  const db1 = ez1;
  return { z1, h, z2, yhat, reluP, e, dw2, db2, eh, ez1, dw1, db1 };
}

export function PhaseC2Derive() {
  const meta = PHASES.find((p) => p.id === 'c2')!;
  const markCompleted = useApp((s) => s.markCompleted);

  const t = trace(INIT);

  // 모든 단계를 끝까지 펼쳤는지 BackpropDerivation이 알 길이 없으니, 본 페이즈는
  // 학생이 들어와서 *읽었다*는 가벼운 기준으로 완료 처리한다 — 8초 머무름.
  // (A4도 비슷한 기준 — 마지막 단계 도달 시 완료. 여기는 펼치기 콜백을 안 받기에 시간 기준.)
  const [readyToComplete, setReadyToComplete] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => setReadyToComplete(true), 8000);
    return () => clearTimeout(id);
  }, []);
  useEffect(() => {
    if (readyToComplete) markCompleted('c2');
  }, [readyToComplete, markCompleted]);

  return (
    <article>
      <div className="text-xs font-mono text-muted">PHASE {meta.num}</div>
      <h1>{meta.title}</h1>
      <p className="text-muted mt-2 text-sm leading-relaxed">
        C1에서 다이어그램으로 본 6단계의 식들 — <code>dw₂ = e·h</code>,{' '}
        <code>e_h = e·w₂</code> 등 — 이 <strong>왜 그 모양인가</strong>?
        합성 함수의 미분, 즉 <strong>사슬규칙(연쇄법칙)</strong>으로 한 줄씩 유도합니다.
        같은 모델·같은 데이터(x = {SAMPLE.x}, y = {SAMPLE.y}, 초기 가중치 동일)를 써서,
        C1에서 본 <code>e = -3.35</code>, <code>e_h = -5.02</code> 같은 숫자가 식에서 그대로
        다시 나오는지 확인할 수 있습니다.
      </p>

      <div
        className="mt-4 rounded-md border px-4 py-3 text-sm leading-relaxed"
        style={{ borderColor: 'rgb(var(--color-accent))', backgroundColor: 'rgb(var(--color-accent-bg))' }}
      >
        <div className="text-[12px] font-mono mb-1 text-accent">왜 식 유도가 본질인가</div>
        <p className="mb-1">
          직관과 비유는 잊으면 끝이지만, <strong>사슬규칙은 한 번 이해하면 평생 다시 끌어낼 수 있는 지식</strong>입니다.
          새로운 신경망 구조(RNN·Transformer·Diffusion …)를 만나도 결국 사슬규칙의 적용일 뿐이니까요.
        </p>
        <p className="text-[12.5px] text-muted">
          A4에서 단일 뉴런으로 본 <code>dw = e·x</code>의 유도가, 여기서 두 층으로 자연스럽게 확장됩니다.
        </p>
      </div>

      {/* 식 유도 카드 — 8단계 펼치기 + 단계별 미니 다이어그램 강조 */}
      <BackpropDerivation
        w1={INIT.w1} b1={INIT.b1} w2={INIT.w2} b2={INIT.b2}
        x={SAMPLE.x} y={SAMPLE.y}
        z1={t.z1} h={t.h} z2={t.z2} yhat={t.yhat}
        e={t.e} reluP={t.reluP}
        dw2={t.dw2} db2={t.db2}
        eh={t.eh} ez1={t.ez1}
        dw1={t.dw1} db1={t.db1}
      />

      <div
        className="mt-4 rounded-md border px-4 py-3 text-sm leading-relaxed"
        style={{ borderColor: 'rgb(190,18,60)', backgroundColor: 'rgba(190,18,60,0.05)' }}
      >
        <div className="text-[12px] font-mono mb-1" style={{ color: 'rgb(190,18,60)' }}>
          한 문장 정리
        </div>
        <p>
          역전파는 마법이 아니라 <strong>합성 함수의 미분</strong>입니다 —{' '}
          출력 오차 e가 *가중치 거꾸로*(w₂)와 *활성함수 거꾸로*(ReLU′) 두 단계를 통과하며 입력층까지 흘러갑니다.
          A4의 <code>dw = e·x</code> 패턴이 모든 층에 그대로 반복되고, e 자리에는 그 층까지 흘러온 오차가 들어갈 뿐입니다.
        </p>
        <p className="mt-2 text-[12.5px]">
          다음 C3에서는 같은 사이클이 진짜 손글씨 데이터(MNIST)에서도 그대로 작동하는 모습을 봅니다.
        </p>
      </div>
    </article>
  );
}
