// 마무리 — 어텐션. 원본 개념(질문·열쇠·값 벡터, 내적 점수 ÷ √d, 소프트맥스, 가중합)을 2차원 정수 벡터로 손계산.
import { useState, type ComponentType, type ReactNode } from 'react';
import { Layout, M, Key, Hot, Slider, fmt2 } from './common';
import { ACCENT, ACCENT_BG, MUTED, TEXT, BG, SURFACE, ORANGE, VB_W, VB_H } from './NeuronFigure';
import type { SlideDef } from './slides';

const WORDS = ['어느', '날', '토끼', '가'];
const K: [number, number][] = [[1, 0], [0, 2], [2, 1], [1, 1]];   // 열쇠 벡터
const V: [number, number][] = [[1, 1], [3, 0], [0, 4], [1, 2]];   // 값 벡터
const Q0: [number, number] = [2, 1];                               // 질문 벡터(기본)
const SQRT_D = Math.SQRT2;                                          // 벡터 길이 d = 2

function attention(q: [number, number]) {
  const dot = K.map((k) => q[0] * k[0] + q[1] * k[1]);
  const score = dot.map((d) => d / SQRT_D);
  const ex = score.map((s) => Math.exp(s));
  const sum = ex.reduce((a, b) => a + b, 0);
  const p = ex.map((e) => e / sum);
  const out: [number, number] = [0, 0];
  p.forEach((pi, i) => { out[0] += pi * V[i][0]; out[1] += pi * V[i][1]; });
  return { dot, score, p, out };
}
const vec = (v: [number, number]) => `(${v[0]}, ${v[1]})`;
const pct = (p: number) => `${Math.round(p * 100)}%`;

const Svg = ({ children }: { children: ReactNode }) => (
  <svg viewBox={`0 0 ${VB_W} ${VB_H}`} className="w-full h-full" preserveAspectRatio="xMidYMid meet" fontFamily="Pretendard, system-ui, sans-serif">{children}</svg>
);
const Fade = ({ show, children }: { show: boolean; children: ReactNode }) => <g className="lec-fade" style={{ opacity: show ? 1 : 0 }}>{children}</g>;

/* ───────── 1. 어텐션: 어느 단어를 더 볼까 ───────── */
const AttnIdea: ComponentType<{ step: number }> = ({ step }) => {
  const { p } = attention(Q0);
  const CX = [150, 330, 510, 690];          // 단어 칩 중심
  const CY = 110, W = 140, H = 64;
  const QX = 690, QY = 330;                 // 물음표(다음 단어 자리)
  const show = step >= 2;
  return (
    <Layout
      figure={
        <Svg>
          <defs>
            <marker id="attn-arrow" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto" markerUnits="userSpaceOnUse">
              <path d="M0,0 L10,5 L0,10 z" fill={ACCENT} />
            </marker>
          </defs>
          {/* 단어 → 물음표: 선 굵기가 관심 비율 */}
          {WORDS.map((_, i) => (
            <line key={i} x1={CX[i]} y1={CY + H / 2 + 4} x2={QX - 8 + (i - 3) * 10} y2={QY - 36}
              stroke={show ? ACCENT : MUTED} strokeOpacity={show ? 0.25 + p[i] * 0.75 : 0.25}
              strokeWidth={show ? 2 + p[i] * 16 : 2} strokeLinecap="round" className={show && p[i] > 0.3 ? 'lec-flow' : ''} />
          ))}
          {/* 단어 칩 */}
          {WORDS.map((w, i) => (
            <g key={w}>
              <rect x={CX[i] - W / 2} y={CY - H / 2} width={W} height={H} rx={12} fill={show && p[i] > 0.3 ? ACCENT_BG : SURFACE} stroke={show && p[i] > 0.3 ? ACCENT : MUTED} strokeOpacity={show && p[i] > 0.3 ? 1 : 0.5} strokeWidth={2.5} />
              <text x={CX[i]} y={CY + 11} textAnchor="middle" fill={TEXT} fontSize={30} fontWeight={700}>{w}</text>
              <Fade show={show}>
                <rect x={CX[i] - 50} y={CY - H / 2 - 48} width={100} height={34} rx={8} fill={p[i] > 0.3 ? ACCENT : BG} stroke={ACCENT} strokeWidth={1.5} />
                <text x={CX[i]} y={CY - H / 2 - 24} textAnchor="middle" fill={p[i] > 0.3 ? '#fff' : ACCENT} fontSize={22} fontWeight={700}>{pct(p[i])}</text>
              </Fade>
            </g>
          ))}
          {/* 다음 단어 자리 */}
          <rect x={QX - 70} y={QY - 32} width={140} height={64} rx={12} fill={BG} stroke={ORANGE} strokeWidth={3} strokeDasharray="10 7" />
          <text x={QX} y={QY + 12} textAnchor="middle" fill={ORANGE} fontSize={32} fontWeight={700}>?</text>
          <text x={QX} y={QY + 62} textAnchor="middle" fill={MUTED} fontSize={19}>다음 단어</text>
          <Fade show={step >= 1 && !show}>
            <text x={QX - 100} y={QY + 12} textAnchor="end" fill={ORANGE} fontSize={23} fontWeight={700}>앞의 네 단어를 똑같이 볼까?</text>
          </Fade>
          <Fade show={show}>
            <text x={QX - 100} y={QY + 12} textAnchor="end" fill={ACCENT} fontSize={23} fontWeight={700}>관심 비율의 합 = 100%</text>
          </Fade>
          {/* 섞은 벡터 → 뉴런 */}
          <Fade show={step >= 3}>
            <line x1={QX + 72} y1={QY} x2={QX + 140} y2={QY} stroke={ACCENT} strokeWidth={4} markerEnd="url(#attn-arrow)" />
            <rect x={QX + 150} y={QY - 44} width={150} height={88} rx={14} fill={ACCENT_BG} stroke={ACCENT} strokeWidth={2.5} />
            <text x={QX + 225} y={QY - 10} textAnchor="middle" fill={ACCENT} fontSize={21} fontWeight={700}>섞은 벡터</text>
            <text x={QX + 225} y={QY + 22} textAnchor="middle" fill={MUTED} fontSize={18}>→ 뉴런(Σ, 활성화)</text>
          </Fade>
        </Svg>
      }
      lines={[
        step === 0 ? <>"어느 날 토끼 가" 다음 단어를 맞히려면 앞 단어들을 봐야 함.</> : null,
        step === 1 ? <>네 단어를 똑같은 비율로 볼까? 아님. 지금 예측에 중요한 단어가 따로 있음.</> : null,
        step === 2 ? <><Key>어텐션</Key> = 단어마다 관심 비율을 매기는 장치. 비율의 합은 100%. "토끼"에 <Hot>{pct(p[2])}</Hot>.</> : null,
        step === 3 ? <>비율대로 단어 벡터를 섞어 뉴런(Σ, 활성화)에 넘김. 비율을 정하는 가중치도 학습됨.</> : null,
      ]}
    />
  );
};

/* ───────── 2. 어텐션 계산: 질문·열쇠·값 ───────── */
const AttnCalc: ComponentType<{ step: number }> = ({ step }) => {
  const [q, setQ] = useState<[number, number]>(Q0);
  const { dot, score, p, out } = attention(q);
  const custom = q[0] !== Q0[0] || q[1] !== Q0[1];
  const top = p.indexOf(Math.max(...p));
  const th = 'text-muted font-medium text-left px-[12px] py-[6px] border-b border-border text-[20px]';
  const td = 'px-[12px] py-[9px] border-b border-border/60 tabular-nums text-[24px]';
  const dim = (on: boolean) => (on ? '' : 'opacity-0');
  return (
    <Layout
      figure={
        <div className="h-full flex flex-col justify-center">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className={th}>단어</th>
                <th className={th}>열쇠 k</th>
                <th className={`${th} ${dim(step >= 1)}`}>q·k</th>
                <th className={`${th} ${dim(step >= 1)}`}>÷ √2</th>
                <th className={`${th} ${dim(step >= 2)}`}>확률 p</th>
                <th className={`${th} ${dim(step >= 3)}`}>값 v</th>
                <th className={`${th} ${dim(step >= 3)}`}>p × v</th>
              </tr>
            </thead>
            <tbody>
              {WORDS.map((w, i) => {
                const hot = step >= 2 && i === top;
                return (
                  <tr key={w} className={hot ? 'bg-accent-bg text-accent font-bold' : 'text-text'}>
                    <td className={`${td} font-bold`}>{w}</td>
                    <td className={td}>{vec(K[i])}</td>
                    <td className={`${td} ${dim(step >= 1)}`}>{q[0]}·{K[i][0]} + {q[1]}·{K[i][1]} = <b>{dot[i]}</b></td>
                    <td className={`${td} ${dim(step >= 1)}`}>{fmt2(score[i])}</td>
                    <td className={`${td} ${dim(step >= 2)}`}>
                      <span className="inline-block align-middle h-[18px] rounded-sm mr-[8px]" style={{ width: `${Math.max(4, p[i] * 120)}px`, background: hot ? 'rgb(var(--color-accent))' : 'rgb(var(--color-accent-bg))' }} />
                      {fmt2(p[i])}
                    </td>
                    <td className={`${td} ${dim(step >= 3)}`}>{vec(V[i])}</td>
                    <td className={`${td} ${dim(step >= 3)}`}>({fmt2(p[i] * V[i][0])}, {fmt2(p[i] * V[i][1])})</td>
                  </tr>
                );
              })}
              <tr className={`lec-fade ${dim(step >= 3)}`}>
                <td className={`${td} text-muted`} colSpan={5}>합 = 섞은 벡터</td>
                <td className={td} />
                <td className={`${td} font-bold text-accent`}>({fmt2(out[0])}, {fmt2(out[1])})</td>
              </tr>
            </tbody>
          </table>
          <div className={`lec-fade mt-[18px] text-[19px] text-muted ${dim(step >= 2)}`}>확률 p = 점수를 지수 함수에 넣어 합이 1이 되게 나눈 것(소프트맥스). 합 = {fmt2(p.reduce((a, b) => a + b, 0))}</div>
        </div>
      }
      asideWidth={340}
      aside={
        <div onClick={(e) => e.stopPropagation()}>
          <div className="text-[18px] text-muted mb-[6px]">질문 벡터 q (지금 위치 "가")</div>
          <div className="text-[26px] font-bold text-accent mb-[12px] tabular-nums">q = {vec(q)}</div>
          <Slider label="q₁" value={q[0]} set={(v) => setQ([v, q[1]])} min={-3} max={3} step={1} />
          <Slider label="q₂" value={q[1]} set={(v) => setQ([q[0], v])} min={-3} max={3} step={1} />
          <button type="button" className="btn-ghost text-[17px] px-[12px] py-[6px]" onClick={() => setQ(Q0)} disabled={!custom}>기본값으로</button>
          <div className="mt-[18px] text-[17px] text-muted leading-snug">q, k, v는 단어 벡터에 가중치를 곱해 만듦. 이 가중치도 파라미터라 학습으로 정해짐.</div>
        </div>
      }
      lines={[
        step === 0 ? <>단어마다 <Key>열쇠 k</Key>, 지금 위치에는 <Key>질문 q</Key>. 둘 다 숫자 두 개짜리 벡터로 줄여서 봄.</> : null,
        step === 1 ? <>점수 = q와 k의 <Key>내적</Key> q₁k₁ + q₂k₂. 방향이 비슷할수록 큼. 벡터 길이의 제곱근 √2로 나눔.</> : null,
        step === 2 ? <>점수를 <Key>확률</Key>로. 합이 1. 가장 큰 쪽이 <M>{WORDS[top]}</M>, {pct(p[top])}.</> : null,
        step === 3 ? <>확률 × <Key>값 v</Key>를 모두 더한 것이 섞은 벡터. 이것이 다음 층의 뉴런으로 들어감.</> : null,
        step === 4 ? <>이 계산이 <Key>어텐션</Key>. ChatGPT는 질문을 여러 개(헤드) 동시에 묻고, 층마다 반복함.</> : null,
      ]}
    />
  );
};

export const ATTENTION_SLIDES: SlideDef[] = [
  { id: 'attn-idea', section: 'end', tag: '마무리', title: '어텐션: 중요한 단어를 더 본다', steps: 3, component: AttnIdea,
    notes: ['트랜스포머 한 층 = 어텐션 + 오늘 본 완전 연결 층. 어텐션은 "지금 예측에 어느 단어가 중요한가"를 비율로 정한다.', '비율은 실제 어텐션 식(q·k ÷ √d → 소프트맥스)으로 2차원 정수 벡터에서 계산한 값.'] },
  { id: 'attn-calc', section: 'end', tag: '마무리', title: '어텐션 계산: 질문 · 열쇠 · 값', formula: '점수 = q·k ÷ √d → 확률 p → Σ p·v', steps: 4, component: AttnCalc,
    notes: ['원본 식 softmax(QKᵀ/√d)V를 단어 넷, d = 2로 손계산. 슬라이더로 질문 벡터를 바꾸면 어느 단어를 더 보는지가 바뀐다(q = (0, 2)이면 "날").', '고등학생: 내적 = 성분끼리 곱해 더한 것, 지수 함수는 음수를 양수로 만들고 큰 차이를 더 키운다.'] },
];
