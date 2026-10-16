// 마무리 — ChatGPT 같은 AI는 "여러 단어를 받아 다음 단어를 맞히도록" 학습한 모델이다.
// 다음 단어 확률은 앱 E4의 우화 말뭉치(storyCorpus)와 n-gram 통계로 실제 계산한다(가짜 숫자 없음).
import { useEffect, useMemo, useState, type ComponentType, type ReactNode } from 'react';
import { Layout, M, Key, Hot } from './common';
import { Badge, ACCENT, ACCENT_BG, MUTED, TEXT, BG, SURFACE, ORANGE, ORANGE_BG, VB_W, VB_H } from './NeuronFigure';
import { STORY_CORPUS } from '../data/storyCorpus';
import { buildNGram, logitsFor, softmax } from '../lib/ngram';
import type { SlideDef } from './slides';
import { EndTrainDemo } from './endTrainDemo';

const MODEL = buildNGram(STORY_CORPUS);
const START_CTX = ['어느', '날', '토끼', '가'];
const TEMP = 1;

function nextDist(ctx: string[]) {
  const idx = (w: string | undefined) => (w === undefined ? null : (MODEL.index.get(w) ?? null));
  const prev1 = idx(ctx[ctx.length - 1]);
  const prev2 = idx(ctx[ctx.length - 2]);
  const probs = softmax(logitsFor(MODEL, prev2, prev1), TEMP);
  const order = probs.map((_, i) => i).sort((a, b) => probs[b] - probs[a]);
  return order.filter((i) => MODEL.vocab[i] !== '<s>').slice(0, 6).map((i) => ({ w: MODEL.vocab[i], p: probs[i] }));
}
const show = (w: string) => (w === '.' ? '(끝)' : w);

const Svg = ({ children }: { children: ReactNode }) => (
  <svg viewBox={`0 0 ${VB_W} ${VB_H}`} className="w-full h-full" preserveAspectRatio="xMidYMid meet" fontFamily="Pretendard, system-ui, sans-serif">
    <defs>
      <marker id="end-arr" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto" markerUnits="userSpaceOnUse"><path d="M0,0 L10,5 L0,10 z" fill={ACCENT} /></marker>
      <marker id="end-arr-o" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto" markerUnits="userSpaceOnUse"><path d="M0,0 L10,5 L0,10 z" fill={ORANGE} /></marker>
    </defs>
    {children}
  </svg>
);
function Fade({ show: s, children }: { show: boolean; children: ReactNode }) {
  return <g className="lec-fade" style={{ opacity: s ? 1 : 0 }}>{children}</g>;
}

/* 문장 띠 — 단어 칩이 한 줄로 */
export function sentenceEnd(words: string[], x = 40) { return words.reduce((cx, w) => cx + Math.max(show(w).length * 26 + 28, 60) + 12, x); }
function Sentence({ words, blank, x = 40, y = 70, hotLast }: { words: string[]; blank?: boolean; x?: number; y?: number; hotLast?: boolean }) {
  let cx = x;
  const chips = words.map((w, i) => {
    const label = show(w);
    const wdt = Math.max(label.length * 26 + 28, 60);
    const el = (
      <g key={i}>
        <rect x={cx} y={y - 30} width={wdt} height={60} rx={12} fill={hotLast && i === words.length - 1 ? ACCENT : SURFACE} stroke={hotLast && i === words.length - 1 ? ACCENT : MUTED} strokeOpacity={0.5} strokeWidth={2} />
        <text x={cx + wdt / 2} y={y + 10} textAnchor="middle" fill={hotLast && i === words.length - 1 ? '#fff' : TEXT} fontSize={28} fontWeight={700}>{label}</text>
      </g>
    );
    cx += wdt + 12;
    return el;
  });
  return (
    <g>
      {chips}
      {blank && (
        <g>
          <rect x={cx} y={y - 30} width={120} height={60} rx={12} fill={BG} stroke={ORANGE} strokeWidth={3} strokeDasharray="10 7" />
          <text x={cx + 60} y={y + 12} textAnchor="middle" fill={ORANGE} fontSize={30} fontWeight={700}>?</text>
        </g>
      )}
    </g>
  );
}

/* 후보 막대 */
function Bars({ dist, x = 120, y = 150, pick, dim }: { dist: { w: string; p: number }[]; x?: number; y?: number; pick?: boolean; dim?: boolean }) {
  const rowH = 44, maxW = 520;
  return (
    <g opacity={dim ? 0.35 : 1}>
      {dist.map((d, i) => {
        const top = i === 0 && pick;
        return (
          <g key={d.w}>
            <text x={x - 16} y={y + i * rowH + 10} textAnchor="end" fill={top ? ACCENT : TEXT} fontSize={26} fontWeight={700}>{show(d.w)}</text>
            <rect x={x} y={y + i * rowH - 16} width={Math.max(6, d.p * maxW)} height={32} rx={8} fill={top ? ACCENT : ACCENT_BG} stroke={top ? ACCENT : 'none'} className="lec-fade" />
            <text x={x + Math.max(6, d.p * maxW) + 12} y={y + i * rowH + 10} fill={top ? ACCENT : MUTED} fontSize={24} fontWeight={top ? 700 : 500}>{Math.round(d.p * 100)}%</text>
          </g>
        );
      })}
    </g>
  );
}

/* ───────── 1. 다음 단어 맞히기 ───────── */
const EndNext: ComponentType<{ step: number }> = ({ step }) => {
  const [ctx, setCtx] = useState<string[]>(START_CTX);
  useEffect(() => { if (step <= 2) setCtx(START_CTX); if (step === 3) setCtx((c) => (c.length === START_CTX.length ? [...c, nextDist(c)[0].w] : c)); }, [step]);
  const dist = useMemo(() => nextDist(ctx), [ctx]);
  const ended = ctx[ctx.length - 1] === '.';
  const addOne = () => setCtx((c) => (c[c.length - 1] === '.' ? c : [...c, nextDist(c)[0].w]));
  return (
    <Layout
      figure={
        <Svg>
          <Sentence words={ctx} blank={!ended} hotLast={step >= 3 && ctx.length > START_CTX.length} />
          <Fade show={step >= 1}>
            <text x={120} y={124} textAnchor="start" fill={MUTED} fontSize={19}>다음 단어 후보와 확률</text>
            {!ended && <Bars dist={dist} pick={step >= 2} y={164} />}
          </Fade>
          <Fade show={step >= 2 && !ended}>
            <path d={`M ${Math.max(sentenceEnd(ctx) + 80, 120 + dist[0].p * 520 + 150) - 14} 164 C ${Math.max(sentenceEnd(ctx) + 80, 120 + dist[0].p * 520 + 150) - 14} 110, ${sentenceEnd(ctx) + 170} 70, ${sentenceEnd(ctx) + 128} 70`} fill="none" stroke={ORANGE} strokeWidth={3} strokeDasharray="8 6" markerEnd="url(#end-arr-o)" />
            <Badge cx={Math.max(sentenceEnd(ctx) + 80, 120 + dist[0].p * 520 + 150)} cy={164} anchor="start" label="가장 높은 단어를 고름" color={ORANGE} fill={ORANGE_BG} size={21} />
          </Fade>
          {ended && <Badge cx={120} cy={164} anchor="start" label="문장이 끝났음. 처음부터 다시." color={MUTED} size={22} />}
        </Svg>
      }
      aside={
        <div onClick={(e) => e.stopPropagation()} className={`lec-fade ${step >= 3 ? '' : 'opacity-0'}`}>
          <button type="button" className="btn-primary text-[20px] px-[16px] py-[8px] mb-[10px] w-full justify-center" onClick={addOne} disabled={ended}>다음 단어 →</button>
          <button type="button" className="btn-ghost text-[18px] px-[16px] py-[6px] w-full justify-center" onClick={() => setCtx(START_CTX)}>처음부터</button>
          <div className="text-[16px] text-muted mt-[12px] leading-snug">앱 E4의 우화 말뭉치 {STORY_CORPUS.length}문장으로 만든 작은 모델. 숫자는 실제 계산값.</div>
        </div>
      }
      lines={[
        step === 0 ? <>우리는 숫자 7을 맞히도록 학습시켰음. ChatGPT에 "어느 날 토끼 가"를 넣으면 기계가 하는 일은 하나. <Key>다음 단어</Key>를 고르는 것. 실제로는 토큰이라는 조각 단위이지만 여기서는 단어로 봄.</> : null,
        step === 1 ? <>단어를 숫자로 바꾸어 신경망에서 계산하고, 어휘의 모든 단어에 점수를 매김.</> : null,
        step === 2 ? <>점수가 가장 높은 단어를 고름. (실제 ChatGPT는 확률에 따라 뽑기를 하므로 2등, 3등이 뽑히기도 함)</> : null,
        step === 3 ? <>고른 단어를 문장 끝에 붙이고, 또 다음 단어. 이것을 <Key>반복</Key>해 글을 씀.</> : null,
      ]}
    />
  );
};

/* ───────── 2. 같은 그림 ───────── */
export const EndNet: ComponentType<{ step: number }> = ({ step }) => {
  const dist = useMemo(() => nextDist(START_CTX), []);
  const ROWS = Array.from({ length: 6 }, (_, r) => 60 + r * 60);  // 은닉·출력 열의 세로 위치
  const IY = [90, 170, 250, 330];                                   // 입력 단어 네 개
  const CX = 95, NX = 190;                                          // 단어 칩, 숫자 알약
  const cols = [330, 450, 570];
  const OX = 790, BX = 900, BW = 85;
  const maxP = dist[0].p;
  return (
    <Layout
      figure={
        <Svg>
          {/* 선: 숫자 → 은닉, 은닉 ↔ 은닉, 은닉 → 출력 (모두 완전 연결, 흐리게) */}
          <Fade show={step >= 2}>
            {IY.map((iy, i) => ROWS.map((ry, r) => (
              <line key={`i${i}${r}`} x1={NX + 28} y1={iy} x2={cols[0] - 15} y2={ry} stroke={MUTED} strokeOpacity={0.22} strokeWidth={1.2} />
            )))}
            {cols.slice(0, -1).map((cx, c) => ROWS.map((y1, i) => ROWS.map((y2, j) => (
              <line key={`h${c}${i}${j}`} x1={cx + 15} y1={y1} x2={cols[c + 1] - 15} y2={y2} stroke={MUTED} strokeOpacity={0.18} strokeWidth={1.2} />
            ))))}
          </Fade>
          <Fade show={step >= 3}>
            {ROWS.map((y1, i) => ROWS.map((y2, j) => (
              <line key={`o${i}${j}`} x1={cols[2] + 15} y1={y1} x2={OX - 15} y2={y2}
                stroke={j === 0 ? ACCENT : MUTED} strokeOpacity={j === 0 ? 0.55 : 0.18} strokeWidth={j === 0 ? 1.8 : 1.2} />
            )))}
          </Fade>

          {/* 입력: 단어 칩 → 숫자 알약 */}
          {START_CTX.map((w, i) => (
            <g key={i}>
              <rect x={CX - 55} y={IY[i] - 25} width={110} height={50} rx={10} fill={SURFACE} stroke={MUTED} strokeOpacity={0.5} strokeWidth={2} />
              <text x={CX} y={IY[i] + 9} textAnchor="middle" fill={TEXT} fontSize={26} fontWeight={700}>{w}</text>
              <Fade show={step >= 1}>
                <rect x={NX - 28} y={IY[i] - 17} width={56} height={34} rx={17} fill={ACCENT} />
                <text x={NX} y={IY[i] + 8} textAnchor="middle" fill={BG} fontSize={21} fontWeight={700}>{MODEL.index.get(w)}</text>
              </Fade>
            </g>
          ))}
            <text x={(CX + NX) / 2} y={400} textAnchor="middle" fill={MUTED} fontSize={19}>단어 → 번호 → 숫자 벡터</text>

          {/* 은닉층 */}
          <Fade show={step >= 2}>
            <rect x={cols[0] - 45} y={12} width={cols[2] - cols[0] + 90} height={30} rx={8} fill={ACCENT_BG} />
            <text x={(cols[0] + cols[2]) / 2} y={34} textAnchor="middle" fill={ACCENT} fontSize={19} fontWeight={700}>기본 원리를 연결한 단순화 그림</text>
            {cols.map((cx, c) => ROWS.map((y, r) => <circle key={`${c}${r}`} cx={cx} cy={y} r={15} fill={ACCENT_BG} stroke={ACCENT} strokeWidth={2} />))}
            <text x={(cols[0] + cols[2]) / 2} y={400} textAnchor="middle" fill={MUTED} fontSize={19}>뉴런마다 Σ와 활성화 함수</text>
          </Fade>

          {/* 출력층: 단어마다 뉴런 하나, 값은 막대로 */}
          <Fade show={step >= 3}>
            {dist.map((d, i) => {
              const y = ROWS[i], top = i === 0;
              return (
                <g key={d.w}>
                  <circle cx={OX} cy={y} r={15} fill={top ? ACCENT : ACCENT_BG} stroke={ACCENT} strokeWidth={2} />
                  <text x={OX + 28} y={y + 8} fill={top ? ACCENT : TEXT} fontSize={21} fontWeight={700}>{show(d.w)}</text>
                  <rect x={BX} y={y - 8} width={Math.max(4, (d.p / maxP) * BW)} height={16} rx={4} fill={top ? ACCENT : ACCENT_BG} />
                </g>
              );
            })}
            <Badge cx={OX + 100} cy={26} label="다음 단어" color={ACCENT} fill={ACCENT_BG} size={19} />
            <text x={(OX + BX + BW) / 2} y={400} textAnchor="middle" fill={MUTED} fontSize={19}>출력: 단어마다 뉴런 하나</text>
          </Fade>
        </Svg>
      }
      lines={[
        step === 0 ? <>실제 내부 구조는 더 복잡함. 여기서는 <Key>입력 → 계산 → 예측</Key>의 공통점을 봄.</> : null,
        step === 1 ? <>글을 토큰으로 나누고 번호를 붙인 뒤, 계산에 쓸 <Key>숫자 벡터</Key>로 바꿈.</> : null,
        step === 2 ? <>여러 층에서 계산하며 다음 토큰을 예측함. 오늘 배운 가중치와 활성화 함수도 쓰임.</> : null,
        step === 3 ? <>후보마다 점수를 내고 확률로 바꿔 다음 토큰을 고름. 그림에서는 단어를 후보로 표시함.</> : null,
      ]}
    />
  );
};

/* ───────── 3. 학습도 같은 네 단계 ───────── */
const EndTrain: ComponentType<{ step: number }> = ({ step }) => {
  const sent = ['어느', '날', '토끼', '가', '숲', '으로', '갔다'];
  const dist = useMemo(() => nextDist(START_CTX), []);
  const ring = ['예측', '오차·손실', '기울기', '업데이트'];
  const RX = 760, RY = 222, RR = 136;
  return (
    <Layout
      figure={
        <Svg>
          {/* 인터넷의 문장 하나 */}
          <text x={40} y={40} fill={MUTED} fontSize={19}>인터넷에 있던 문장 하나</text>
          <Sentence words={sent.slice(0, 4)} y={90} />
          <Fade show={step >= 0}>
            <g>
              <rect x={454} y={60} width={110} height={60} rx={12} fill={ORANGE_BG} stroke={ORANGE} strokeWidth={3} />
              <text x={509} y={100} textAnchor="middle" fill={ORANGE} fontSize={28} fontWeight={700}>{sent[4]}</text>
              <text x={509} y={142} textAnchor="middle" fill={ORANGE} fontSize={19}>정답: 문장에 이미 있음</text>
            </g>
          </Fade>
          {/* 예측 분포 (학습 전 모델의 흉내: 상위 후보를 흐리게) */}
          <Fade show={step >= 0}>
            <text x={104} y={200} textAnchor="end" fill={MUTED} fontSize={19}>모델의 예측</text>
            <Bars dist={dist.slice(0, 4)} y={230} pick />
            <Badge cx={120} cy={420} anchor="start" label={`정답 "${sent[4]}"에 준 확률로 손실 계산`} color={ORANGE} size={21} />
          </Fade>
          {/* 네 단계 고리 */}
          <Fade show={step >= 1}>
            <circle cx={RX} cy={RY} r={RR} fill="none" stroke={MUTED} strokeOpacity={0.35} strokeWidth={2} strokeDasharray="6 6" />
            {ring.map((k, i) => {
              const a = -Math.PI / 2 + (i * Math.PI) / 2;
              const x = RX + RR * Math.cos(a), y = RY + RR * Math.sin(a);
              return (
                <g key={k}>
                  <rect x={x - 66} y={y - 24} width={132} height={48} rx={12} fill={ACCENT_BG} stroke={ACCENT} strokeWidth={2.5} />
                  <text x={x} y={y + 9} textAnchor="middle" fill={ACCENT} fontSize={23} fontWeight={700}>{i + 1} {k}</text>
                </g>
              );
            })}
            <text x={RX} y={RY - 9} textAnchor="middle" fill={TEXT} fontSize={22} fontWeight={700}><tspan x={RX}>학습의</tspan><tspan x={RX} dy={30}>기본 흐름</tspan></text>
          </Fade>
          <Fade show={step >= 1}>
            <Badge cx={RX} cy={RY + RR + 52} label="많은 문장으로 예측과 업데이트를 반복" color={ORANGE} fill={ORANGE_BG} size={21} />
          </Fade>
        </Svg>
      }
      lines={[
        step === 0 ? <>인터넷의 문장에서 앞 네 단어만 보여 주고 다음 단어를 가리면 문제가 됨. 정답은 문장 속의 "숲".</> : null,
        step === 0 ? <>정답 "숲"에 준 확률 66%. 이 확률이 낮을수록 <Hot>손실</Hot>이 커지고, 100%가 아니면 0이 아님. e = ŷ − y처럼 단어끼리 빼지는 않음.</> : null,
        step === 1 ? <>손실에서 기울기를 구하고 파라미터를 업데이트함. 많은 글에서 이것을 반복하는 것이 <Key>사전학습</Key>. ChatGPT는 그 뒤 추가 학습도 거침.</> : null,
      ]}
    />
  );
};

/* ───────── 4. 3B의 의미 ───────── */
const End3B: ComponentType<{ step: number }> = ({ step }) => {
  const items = [
    { n: 2, label: '4-B의 뉴런 하나', sub: 'w, b' },
    { n: 11, label: '1-4의 3 × 2 × 1', sub: '가중치 8 + 편향 3' },
    { n: 12730, label: '1-4의 784-16-10', sub: '손글씨 숫자' },
    { n: 3_000_000_000, label: '3B 모델', sub: 'B = billion, 10억' },
  ];
  const ox = 80, oy = 366, maxH = 290, maxLog = Math.log10(3e9);
  // 활동지 끝-1의 두 빈칸(오늘 고친 개수, 3B의 개수)은 질문 단계(0, 4) 다음에 막대를 공개한다
  const at = [1, 1, 1, 2];
  return (
    <Layout
      figure={
        <Svg>
          <line x1={ox} y1={oy} x2={980} y2={oy} stroke={MUTED} strokeWidth={2} />
          {items.map((it, i) => {
            const x = ox + 60 + i * 230;
            const h = (Math.log10(it.n) / maxLog) * maxH;
            return (
              <Fade key={i} show={step >= at[i]}>
                <rect x={x} y={oy - h} width={120} height={h} rx={10} fill={i === items.length - 1 ? ACCENT : ACCENT_BG} stroke={ACCENT} strokeWidth={2.5} />
                <text x={x + 60} y={oy - h - 16} textAnchor="middle" fill={i === items.length - 1 ? ACCENT : TEXT} fontSize={i === items.length - 1 ? 34 : 28} fontWeight={700}>{it.n.toLocaleString('ko-KR')}개</text>
                <text x={x + 60} y={oy + 32} textAnchor="middle" fill={TEXT} fontSize={21} fontWeight={700}>{it.label}</text>
                <text x={x + 60} y={oy + 58} textAnchor="middle" fill={MUTED} fontSize={18}>{it.sub}</text>
              </Fade>
            );
          })}
          <text x={ox} y={60} fill={MUTED} fontSize={19}>학습으로 값이 정해지는 숫자(파라미터)의 개수 · 눈금은 10배마다 한 칸</text>
        </Svg>
      }
      lines={[
        step === 0 ? <>오늘 손으로 업데이트한 파라미터는 몇 개? "3B 모델"의 파라미터는 몇 개?</> : null,
        step === 1 ? <><M>w</M>와 <M>b</M>, 2개. 1-4에서 센 작은 신경망은 11개, 손글씨 숫자를 읽는 신경망은 12,730개.</> : null,
        step === 1 ? <>"3B 모델"의 B는 billion, 10억. 그럼 파라미터는 몇 개?</> : null,
        step === 2 ? <>30억 개. 모델 구조와 계산식은 달라도 흐름은 이어짐. <Key>예측 → 오차·손실 → 기울기 → 업데이트</Key>.</> : null,
      ]}
    />
  );
};

/* ───────── 5. 오늘의 핵심 키워드 (활동지 끝-2의 다섯 단어) ───────── */
const EndFive: ComponentType<{ step: number }> = ({ step }) => {
  const words = [
    ['예측', '4-B의 모델: ŷ = wx + b'],
    ['오차', 'e = 예측 − 정답'],
    ['기울기', 'dw = e·x, db = e'],
    ['학습률', 'η, 한 번에 옮기는 보폭'],
    ['업데이트', '새 w = w − η·dw, 새 b = b − η·db'],
  ];
  return (
    <Layout
      figure={
        <div className="h-full flex items-center justify-center gap-[18px]">
          {words.map(([w, d], i) => (
            <div key={w} className={`lec-fade flex items-center gap-[18px] ${i <= step + 4 ? 'opacity-100' : 'opacity-15'}`}>
              <div className="w-[210px] rounded-2xl border-2 border-accent bg-accent-bg/50 px-[18px] py-[26px] text-center">
                <div className="text-[36px] font-bold text-accent">{w}</div>
                <div className="text-[18px] text-muted mt-[10px] leading-snug">{d}</div>
              </div>
              {i < words.length - 1 && <div className="text-[34px] text-muted">→</div>}
            </div>
          ))}
        </div>
      }
      lines={[
        <>활동지 끝-2는 집에서 과제. 이 다섯 단어를 모두 써서 "뉴런 하나가 어떻게 학습하는가"를 4~5문장으로 적음.</>,
        <>오늘 손으로 푼 과정이 ChatGPT 학습의 가장 기본적인 원리임.</>,
      ]}
    />
  );
};

export const END_SLIDES: SlideDef[] = [
  { id: 'end-next', section: 'end', tag: '마무리', title: 'ChatGPT는 다음 단어를 맞히는 기계', steps: 3, component: EndNext,
    notes: ['토큰이 정확하지만 "단어"라고 설명함. 후보 막대는 앱 E4 말뭉치로 실제 계산한 값.', '"다음 단어 →"를 눌러 문장이 끝날 때까지 이어 감. ChatGPT는 확률에 따라 뽑기를 하므로 같은 입력에도 다른 글이 나올 수 있음.'] },
  { id: 'end-train', section: 'end', tag: '마무리', title: '손실을 줄이며 배우는 원리가 이어진다', steps: 1, component: EndTrain,
    notes: ['사전학습에서는 이어지는 토큰이 정답이 된다. 분류 손실을 쓰므로 4-B의 e = ŷ − y를 단어에 적용하지 않는다.', '파라미터 수와 뉴런 수를 구분한다. 3B는 뒤 장에서 별도의 규모 예시로 소개한다.'] },
  { id: 'end-train-demo', section: 'end', tag: '마무리', title: '업데이트를 반복하면 그럴듯한 확률이 된다', steps: 1, component: EndTrainDemo,
    notes: ['실제 계산: 입력 16 → 6 → 6 → 7 신경망, 교차 엔트로피 손실, η = 1.2. 학습 전에는 출력 가중치가 0이라 모든 칸이 같은 확률.', '정답 비율(주황 눈금)은 앞 장의 n-gram 모델을 temperature 1.5로 계산한 값. 손실은 정답 비율 자체의 불확실성 때문에 0이 아닌 값(약 1.3)에서 안정됨. 그 외 칸은 나머지 단어 전부의 합.'] },
  { id: 'end-3b', section: 'end', tag: '끝-1', title: '3B의 의미', steps: 2, component: End3B,
    notes: ['끝-1: 오늘 고친 파라미터 2개, 3B 모델은 30억 개. 눈금은 로그.'] },
  { id: 'end-five', section: 'end', tag: '끝-2', title: '오늘의 핵심 키워드', steps: 0, component: EndFive,
    notes: ['끝-2는 과제로 안내. 다섯 단어를 한 번에 보여 줌.'] },
];
