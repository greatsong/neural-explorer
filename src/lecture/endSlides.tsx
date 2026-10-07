// 마무리 — ChatGPT 같은 AI는 "여러 단어를 받아 다음 단어를 맞히도록" 학습한 모델이다.
// 다음 단어 확률은 앱 E4의 우화 말뭉치(storyCorpus)와 n-gram 통계로 실제 계산한다(가짜 숫자 없음).
import { useEffect, useMemo, useState, type ComponentType, type ReactNode } from 'react';
import { Layout, M, Key, Hot } from './common';
import { Badge, ACCENT, ACCENT_BG, MUTED, TEXT, BG, SURFACE, ORANGE, ORANGE_BG, VB_W, VB_H } from './NeuronFigure';
import { STORY_CORPUS } from '../data/storyCorpus';
import { buildNGram, logitsFor, softmax } from '../lib/ngram';
import type { SlideDef } from './slides';

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
        step === 0 ? <>ChatGPT에 "어느 날 토끼 가"를 넣으면 기계가 하는 일은 하나. <Key>다음 단어</Key>를 고르는 것.</> : null,
        step === 1 ? <>단어마다 점수를 매김. 어휘의 모든 단어에 대해.</> : null,
        step === 2 ? <>점수가 가장 높은 단어를 고름. (실제 ChatGPT는 가끔 2등, 3등도 섞어 고름)</> : null,
        step === 3 ? <>고른 단어를 문장 끝에 붙이고, 또 다음 단어. 이것을 <Key>반복</Key>해 글을 씀.</> : null,
      ]}
    />
  );
};

/* ───────── 2. 같은 그림 ───────── */
const EndNet: ComponentType<{ step: number }> = ({ step }) => {
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
          <text x={(CX + NX) / 2} y={400} textAnchor="middle" fill={MUTED} fontSize={19}>입력: 단어를 숫자로</text>

          {/* 은닉층 */}
          <Fade show={step >= 2}>
            <rect x={cols[0] - 45} y={12} width={cols[2] - cols[0] + 90} height={30} rx={8} fill={ACCENT_BG} />
            <text x={(cols[0] + cols[2]) / 2} y={34} textAnchor="middle" fill={ACCENT} fontSize={19} fontWeight={700}>은닉층 수십 층</text>
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
        step === 0 ? <>ChatGPT의 내부 구조도 오늘 본 그림과 같음. 입력층, 은닉층, 출력층.</> : null,
        step === 1 ? <>글자는 계산할 수 없으니 단어를 <Key>숫자</Key>로 바꿔 넣음.</> : null,
        step === 2 ? <>가운데는 뉴런이 층층이. 뉴런 하나하나는 <M>Σ</M>와 활성화 함수, 1-1의 계산 그대로.</> : null,
        step === 3 ? <>1-5의 그림에서 입력 수천, 출력 수만으로 커졌을 뿐.</> : null,
        step === 3 ? <>출력층은 <Key>단어마다 뉴런 하나</Key>. 가장 큰 값이 나온 뉴런의 단어가 "다음 단어".</> : null,
      ]}
    />
  );
};

/* ───────── 3. 학습도 같은 네 단계 ───────── */
const EndTrain: ComponentType<{ step: number }> = ({ step }) => {
  const sent = ['어느', '날', '토끼', '가', '길', '을', '잃었다'];
  const dist = useMemo(() => nextDist(START_CTX), []);
  const ring = ['예측', '오차', '기울기', '업데이트'];
  const RX = 760, RY = 222, RR = 136;
  return (
    <Layout
      figure={
        <Svg>
          {/* 인터넷의 문장 하나 */}
          <text x={40} y={40} fill={MUTED} fontSize={19}>인터넷에 있던 문장 하나</text>
          <Sentence words={sent.slice(0, 4)} y={90} />
          <Fade show={step >= 1}>
            <g>
              <rect x={454} y={60} width={110} height={60} rx={12} fill={ORANGE_BG} stroke={ORANGE} strokeWidth={3} />
              <text x={509} y={100} textAnchor="middle" fill={ORANGE} fontSize={28} fontWeight={700}>{sent[4]}</text>
              <text x={509} y={142} textAnchor="middle" fill={ORANGE} fontSize={19}>정답: 문장에 이미 있음</text>
            </g>
          </Fade>
          <Fade show={step === 0}><rect x={454} y={60} width={110} height={60} rx={12} fill={BG} stroke={MUTED} strokeWidth={2} strokeDasharray="8 6" /><text x={509} y={100} textAnchor="middle" fill={MUTED} fontSize={28} fontWeight={700}>?</text></Fade>
          {/* 예측 분포 (학습 전 모델의 흉내: 상위 후보를 흐리게) */}
          <Fade show={step >= 1}>
            <text x={104} y={200} textAnchor="end" fill={MUTED} fontSize={19}>모델의 예측</text>
            <Bars dist={dist.slice(0, 4)} y={230} pick />
            <Badge cx={120} cy={420} anchor="start" label={`예측 "${show(dist[0].w)}"  vs  정답 "${sent[4]}"  →  오차`} color={ORANGE} size={21} />
          </Fade>
          {/* 네 단계 고리 */}
          <Fade show={step >= 2}>
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
            <text x={RX} y={RY + 10} textAnchor="middle" fill={TEXT} fontSize={24} fontWeight={700}>4B와 같음</text>
          </Fade>
          <Fade show={step >= 3}>
            <Badge cx={RX} cy={RY + RR + 52} label="파라미터 30억 개를 동시에, 단어 수조 개로 반복" color={ORANGE} fill={ORANGE_BG} size={21} />
          </Fade>
        </Svg>
      }
      lines={[
        step === 0 ? <>어떻게 배웠나. 인터넷의 문장을 가져와 앞 네 단어만 보여 주고 다음 단어를 가리면 문제가 됨.</> : null,
        step === 1 ? <>정답은 문장에 이미 있음. 사람이 답을 달 필요가 없음. 모델은 "{'숲'}"을 골랐는데 정답은 "길". 이 차이가 <Hot>오차</Hot>.</> : null,
        step === 2 ? <>그다음은 4B 그대로. 오차 → 기울기 → 업데이트. 뉴런 하나에서 한 것을 뉴런 수십억 개에 동시에 함.</> : null,
        step === 3 ? <>문장 수조 개로 이 네 단계를 반복한 결과가 ChatGPT. 하는 일은 끝까지 "다음 단어 맞히기"임.</> : null,
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
  return (
    <Layout
      figure={
        <Svg>
          <line x1={ox} y1={oy} x2={980} y2={oy} stroke={MUTED} strokeWidth={2} />
          {items.map((it, i) => {
            const x = ox + 60 + i * 230;
            const h = (Math.log10(it.n) / maxLog) * maxH;
            return (
              <Fade key={i} show={step >= i}>
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
        step === 0 ? <>오늘 종이로 고친 숫자는 <M>w</M>와 <M>b</M>, 2개.</> : null,
        step === 1 ? <>1-4에서 센 작은 신경망은 11개.</> : null,
        step === 2 ? <>손글씨 숫자를 읽는 신경망은 12,730개.</> : null,
        step === 3 ? <>"3B 모델"은 30억 개. 숫자가 다를 뿐 하는 일은 같음. <Key>예측 → 오차 → 기울기 → 업데이트</Key>.</> : null,
      ]}
    />
  );
};

/* ───────── 5. 오늘의 핵심 키워드 (활동지 끝-2의 다섯 단어) ───────── */
const EndFive: ComponentType<{ step: number }> = ({ step }) => {
  const words = [
    ['예측', '입력 × 가중치 + 편향 → ReLU'],
    ['오차', 'e = 예측 − 정답'],
    ['기울기', 'dw = e·x, db = e'],
    ['학습률', 'η, 한 번에 옮기는 보폭'],
    ['업데이트', '새 w = w − η · dw'],
  ];
  return (
    <Layout
      figure={
        <div className="h-full flex items-center justify-center gap-[18px]">
          {words.map(([w, d], i) => (
            <div key={w} className={`lec-fade flex items-center gap-[18px] ${i <= step ? 'opacity-100' : 'opacity-15'}`}>
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
        step < 4 ? <>활동지 끝-2. 이 다섯 단어를 모두 써서 "뉴런 하나가 어떻게 학습하는가"를 4~5문장으로 적음.</> : <>오늘 여러분이 손으로 풀었던 과정이 ChatGPT 학습의 가장 기본적인 원리입니다.</>,
      ]}
    />
  );
};

export const END_SLIDES: SlideDef[] = [
  { id: 'end-next', section: 'end', tag: '마무리', title: 'ChatGPT는 다음 단어를 맞히는 기계', steps: 3, component: EndNext,
    notes: ['토큰이 정확하지만 "단어"라고 설명함. 후보 막대는 앱 E4 말뭉치로 실제 계산한 값.', '"다음 단어 →"를 눌러 문장이 끝날 때까지 이어 감. ChatGPT는 1등만 고르지 않고 가끔 섞어 고르기 때문에 매번 조금 다른 글이 나옴.'] },
  { id: 'end-net', section: 'end', tag: '마무리', title: 'ChatGPT의 내부 구조', steps: 3, component: EndNet,
    notes: ['입력 단어를 숫자로 바꿔 넣고, 출력층은 단어마다 뉴런 하나. 1-5 그림의 입력 3·출력 2가 수천·수만으로 커진 것.'] },
  { id: 'end-train', section: 'end', tag: '마무리', title: '배우는 방법도 4B와 같다', steps: 3, component: EndTrain,
    notes: ['핵심: 정답이 문장 안에 이미 있어 사람이 답을 달 필요가 없음. 인터넷의 글 전체가 문제집이자 정답지.', '오차 → 기울기 → 업데이트를 30억 개 파라미터에 동시에, 수조 단어로 반복.'] },
  { id: 'end-3b', section: 'end', tag: '끝-1', title: '3B의 의미', steps: 3, component: End3B,
    notes: ['끝-1: 오늘 고친 파라미터 2개, 3B 모델은 30억 개. 눈금은 로그.'] },
  { id: 'end-five', section: 'end', tag: '끝-2', title: '오늘의 핵심 키워드', steps: 4, component: EndFive,
    notes: ['끝-2: 다섯 단어로 한 단계에 한 문장씩.'] },
];
