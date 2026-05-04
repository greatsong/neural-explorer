// PhaseMnistIntro — MNIST 데이터셋 소개 (C1)
// MNIST 의 탄생 배경(우편번호 자동 분류), 70년 정확도 변천사, 28×28 픽셀 시각화,
// 미국식 손글씨 문화 차이까지 학생이 손글씨 숫자 분류 문제의 의미를 잡고 C2 (실제 학습) 로 들어갈 수 있게.

import { useEffect } from 'react';
import { useApp } from '../store';
import { PHASES } from '../phases';

// 28×28 그리드에 그릴 간단한 픽셀 스트로크. 실제 MNIST 샘플 대신 분위기를 잡아 주는 illustrative 버전.
// 좌표는 (x, y) — x 가 column, y 가 row. 0~27.
type DigitStrokes = number[][]; // 채워진 셀 좌표 모음

const DIGIT_5: DigitStrokes = [
  // 윗 가로획
  [8, 5], [9, 5], [10, 5], [11, 5], [12, 5], [13, 5], [14, 5], [15, 5], [16, 5], [17, 5], [18, 5],
  [8, 6], [9, 6], [10, 6], [11, 6], [12, 6], [13, 6], [14, 6], [15, 6], [16, 6], [17, 6], [18, 6],
  // 왼쪽 세로
  [7, 7], [7, 8], [7, 9], [7, 10], [7, 11], [7, 12], [7, 13],
  [8, 7], [8, 8], [8, 9], [8, 10], [8, 11], [8, 12], [8, 13],
  // 가운데 곡선
  [9, 13], [10, 13], [11, 13], [12, 13], [13, 13], [14, 13], [15, 13], [16, 13],
  [9, 14], [10, 14], [11, 14], [12, 14], [13, 14], [14, 14], [15, 14], [16, 14], [17, 14],
  // 오른쪽 세로
  [17, 15], [17, 16], [17, 17], [17, 18], [17, 19], [17, 20],
  [18, 15], [18, 16], [18, 17], [18, 18], [18, 19], [18, 20],
  // 아래 곡선
  [7, 20], [8, 20], [9, 21], [10, 21], [11, 21], [12, 21], [13, 21], [14, 21], [15, 21], [16, 21],
  [7, 21], [8, 21], [9, 22], [10, 22], [11, 22], [12, 22], [13, 22], [14, 22], [15, 22], [16, 22],
];

const DIGIT_3: DigitStrokes = [
  // 위 곡선
  [9, 5], [10, 5], [11, 5], [12, 5], [13, 5], [14, 5], [15, 5], [16, 5],
  [8, 6], [9, 6], [10, 6], [11, 6], [12, 6], [13, 6], [14, 6], [15, 6], [16, 6], [17, 6],
  // 오른쪽 위 세로
  [16, 7], [16, 8], [16, 9], [17, 7], [17, 8], [17, 9],
  // 가운데 만남
  [12, 10], [13, 10], [14, 10], [15, 10], [16, 10],
  [11, 11], [12, 11], [13, 11], [14, 11], [15, 11], [16, 11],
  [13, 12], [14, 12], [15, 12], [16, 12],
  // 오른쪽 아래 세로
  [16, 13], [16, 14], [16, 15], [16, 16], [16, 17], [16, 18],
  [17, 13], [17, 14], [17, 15], [17, 16], [17, 17], [17, 18],
  // 아래 곡선
  [9, 19], [10, 19], [11, 19], [12, 19], [13, 19], [14, 19], [15, 19], [16, 19],
  [8, 20], [9, 20], [10, 20], [11, 20], [12, 20], [13, 20], [14, 20], [15, 20], [16, 20], [17, 20],
];

// "헷갈리는" 4 — 위가 거의 닫혀서 9 처럼 보이는 케이스
const HARD_4: DigitStrokes = [
  [13, 5], [14, 5], [15, 5],
  [12, 6], [13, 6], [14, 6], [15, 6],
  [12, 7], [13, 7], [16, 7],
  [11, 8], [12, 8], [16, 8],
  [11, 9], [12, 9], [16, 9],
  [10, 10], [11, 10], [16, 10],
  // 가로
  [9, 11], [10, 11], [11, 11], [12, 11], [13, 11], [14, 11], [15, 11], [16, 11], [17, 11],
  [9, 12], [10, 12], [11, 12], [12, 12], [13, 12], [14, 12], [15, 12], [16, 12], [17, 12],
  // 오른쪽 아래
  [16, 13], [16, 14], [16, 15], [16, 16], [16, 17], [16, 18], [16, 19], [16, 20],
  [17, 13], [17, 14], [17, 15], [17, 16], [17, 17], [17, 18], [17, 19], [17, 20],
];

// 헷갈리는 9 — 꼬리가 짧아 4 처럼 보이는 케이스
const HARD_9: DigitStrokes = [
  // 윗 동그라미
  [10, 5], [11, 5], [12, 5], [13, 5], [14, 5], [15, 5],
  [9, 6], [10, 6], [15, 6], [16, 6],
  [9, 7], [16, 7],
  [9, 8], [16, 8],
  [9, 9], [16, 9],
  [9, 10], [10, 10], [15, 10], [16, 10],
  // 닫힘
  [10, 11], [11, 11], [12, 11], [13, 11], [14, 11], [15, 11], [16, 11],
  [10, 12], [11, 12], [12, 12], [13, 12], [14, 12], [15, 12], [16, 12],
  // 짧은 꼬리
  [16, 13], [16, 14], [16, 15], [16, 16],
  [17, 13], [17, 14], [17, 15], [17, 16],
];

function PixelDigit({ pixels, label, hint }: { pixels: DigitStrokes; label?: string; hint?: string }) {
  const filled = new Set(pixels.map(([x, y]) => `${x},${y}`));
  const cell = 5; // px per cell at viewBox 140
  return (
    <div className="inline-flex flex-col items-center gap-1">
      <svg viewBox="0 0 140 140" width="100" height="100" style={{ background: '#000', borderRadius: 4 }}>
        {Array.from({ length: 28 }).map((_, y) =>
          Array.from({ length: 28 }).map((__, x) => {
            const on = filled.has(`${x},${y}`);
            return (
              <rect
                key={`${x}-${y}`}
                x={x * cell}
                y={y * cell}
                width={cell}
                height={cell}
                fill={on ? '#fff' : 'none'}
              />
            );
          })
        )}
      </svg>
      {label && <div className="text-xs font-mono text-muted">{label}</div>}
      {hint && <div className="text-[10px] text-muted text-center max-w-[100px]">{hint}</div>}
    </div>
  );
}

// 손으로 그린 글리프 — SVG path 로 펜 스트로크 표현
function StrokeGlyph({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 32 32" width="48" height="56">
      <path d={d} fill="none" stroke="rgb(var(--color-text))" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

interface Style { label: string; path: string; desc: string }
function HandwritingCompare({ digit, styles }: { digit: string; styles: Style[] }) {
  const cols = styles.length === 2 ? 'grid-cols-2' : 'grid-cols-3';
  return (
    <div className="border border-border rounded-md p-3">
      <div className="text-base font-bold mb-2">숫자 {digit}</div>
      <div className={`grid ${cols} gap-3`}>
        {styles.map((s, i) => (
          <div key={i} className="text-center">
            <div className="text-[11px] text-muted mb-1">{s.label}</div>
            <div className="h-16 flex items-center justify-center bg-surface rounded"><StrokeGlyph d={s.path} /></div>
            <div className="text-[11px] mt-1 text-muted">{s.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function PhaseMnistIntro() {
  const meta = PHASES.find((p) => p.id === 'c1')!;
  const markCompleted = useApp((s) => s.markCompleted);
  useEffect(() => { markCompleted('c1'); }, [markCompleted]);

  return (
    <article>
      <div className="text-xs font-mono text-muted">PHASE {meta.num}</div>
      <h1>{meta.title}</h1>
      <p className="text-muted mt-2">
        다음 단계(C2) 에서 우리가 만든 인공 뉴런 망에게 손글씨 숫자를 시킬 거예요. 그런데 그 숫자 뭉치 — <strong>MNIST</strong> —
        가 어떤 데이터고, 왜 30 년 넘게 머신러닝의 "헬로 월드" 가 되었는지부터 알면 다음이 훨씬 잘 이해됩니다.
      </p>

      {/* ───────── 왜 만들어졌나 ───────── */}
      <section className="card p-4 mt-5 space-y-2">
        <h2 className="text-lg font-bold">1. 시작은 우편번호 자동 분류</h2>
        <p className="text-sm leading-relaxed">
          1980 년대 미국 우체국(USPS)은 매년 수십억 통의 편지를 분류하느라 골치였어요. 사람이 봉투 위에 휘갈겨 쓴
          5 자리 ZIP 코드를 컴퓨터가 읽어야 했는데, 사람마다 글씨가 너무 달라 쉽지 않았습니다. 미국 정부는
          <strong> NIST(미국 표준기술연구소)</strong> 에 손글씨 숫자 데이터를 모으게 했어요.
        </p>
        <ul className="list-disc pl-5 text-sm text-muted">
          <li><code>SD-3</code> — 미국 인구조사국 <strong>직원들</strong> 이 정성껏 쓴 숫자. 깔끔.</li>
          <li><code>SD-1</code> — 미국 <strong>고등학생</strong> 들이 휘갈겨 쓴 숫자. 지저분.</li>
        </ul>
        <p className="text-sm leading-relaxed">
          초기 연구자들은 깔끔한 SD-3 으로 학습하고 지저분한 SD-1 로 평가했는데 정확도가 폭락했어요 — 두 셋의
          분포가 너무 달랐던 거죠. 1998 년 <strong>얀 르쿤(Yann LeCun)</strong> 등이 두 셋을 잘 섞어 균형을 맞춘 게
          바로 우리가 쓰는 <strong>MNIST(Modified NIST)</strong>. 그 뒤로 30 년 동안 머신러닝 연구의 표준 시작점이 되었습니다.
        </p>
      </section>

      {/* ───────── 데이터 형식 ───────── */}
      <section className="card p-4 mt-4 space-y-3">
        <h2 className="text-lg font-bold">2. 데이터는 어떻게 생겼나 — 28×28 회색 픽셀</h2>
        <p className="text-sm leading-relaxed">
          한 장은 가로 28 칸, 세로 28 칸의 격자 위에 0~255 의 회색 값이 채워진 그림이에요. 글자는 흰색,
          배경은 검정. 라벨은 0~9 중 하나. 학습용 <strong>60,000</strong> 장, 평가용 <strong>10,000</strong> 장.
        </p>
        <div className="flex flex-wrap gap-4 justify-center mt-2">
          <PixelDigit pixels={DIGIT_5} label="라벨: 5" hint="전형적인 5" />
          <PixelDigit pixels={DIGIT_3} label="라벨: 3" hint="전형적인 3" />
        </div>
        <p className="text-[12px] text-muted text-center">
          격자 한 칸이 픽셀 하나. 위 그림은 28×28 그리드가 어떻게 한 글자를 표현하는지 감 잡으라고 손으로
          그린 illustrative 버전이에요 — 실제 MNIST 는 회색 그라데이션이 더 부드럽습니다.
        </p>
      </section>

      {/* ───────── 어려운 케이스 ───────── */}
      <section className="card p-4 mt-4 space-y-3">
        <h2 className="text-lg font-bold">3. "어려운 MNIST" — 사람도 헷갈리는 글자들</h2>
        <p className="text-sm leading-relaxed">
          MNIST 가 만만해 보여도 실제로 <strong>사람도 1~2 % 는 헷갈리는</strong> 케이스가 섞여 있어요.
          글씨를 쓴 사람의 손버릇·기분에 따라 4 가 9 처럼, 7 이 1 처럼, 5 가 3 처럼 보이기도 합니다.
        </p>
        <div className="flex flex-wrap gap-4 justify-center mt-2">
          <PixelDigit pixels={HARD_4} label="라벨: 4" hint="위가 닫혀 9 같아 보임" />
          <PixelDigit pixels={HARD_9} label="라벨: 9" hint="꼬리가 짧아 4 같아 보임" />
        </div>
        <p className="text-[12px] text-muted">
          이런 모호한 글자가 정확도 99 % → 99.9 % 로 가는 마지막 0.9 % 의 정체. 모델이 "사람이 봐도 어려운"
          케이스에서 얼마나 잘 버티느냐로 진짜 실력이 판가름 납니다.
        </p>
      </section>

      {/* ───────── 정확도 변천사 ───────── */}
      <section className="card p-4 mt-4 space-y-3">
        <h2 className="text-lg font-bold">4. 30 년 정확도 변천사 — 0.95 % 의 길</h2>
        <table className="w-full text-sm font-mono">
          <thead className="text-muted">
            <tr className="border-b border-border">
              <th className="text-left py-1.5">연도</th>
              <th className="text-left">모델</th>
              <th className="text-right">오류율</th>
              <th className="text-right">정확도</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-border/50">
              <td className="py-1">1998</td>
              <td>선형 분류기 (LeCun et al.)</td>
              <td className="text-right">12 %</td>
              <td className="text-right">88 %</td>
            </tr>
            <tr className="border-b border-border/50">
              <td className="py-1">1998</td>
              <td>K-최근접이웃 (KNN)</td>
              <td className="text-right">5 %</td>
              <td className="text-right">95 %</td>
            </tr>
            <tr className="border-b border-border/50 bg-accent-bg/30">
              <td className="py-1">1998</td>
              <td><strong>LeNet-5 (CNN, 르쿤)</strong></td>
              <td className="text-right">0.95 %</td>
              <td className="text-right">99.05 %</td>
            </tr>
            <tr className="border-b border-border/50">
              <td className="py-1">2012</td>
              <td>깊은 CNN + 데이터 증강</td>
              <td className="text-right">0.23 %</td>
              <td className="text-right">99.77 %</td>
            </tr>
            <tr>
              <td className="py-1">현재</td>
              <td>SOTA (앙상블·트랜스포머 등)</td>
              <td className="text-right">~0.13 %</td>
              <td className="text-right">99.87 %</td>
            </tr>
          </tbody>
        </table>
        <div className="text-[12px] text-muted leading-relaxed">
          1998 년 르쿤의 <strong>LeNet-5</strong> 가 합성곱(CNN)을 처음 본격 적용해 99 % 벽을 깬 게 결정적인 순간이었어요.
          이후 20 여 년간 모델은 점점 깊어졌고 데이터 증강·정규화 기법이 쌓이며 99.8 % 대까지 올라갔습니다. 사람의 정확도가
          약 99.5 % 라는 보고가 있으니, 지금 모델은 이미 <strong>사람보다 잘 맞히는</strong> 영역에 들어왔어요.
        </div>
      </section>

      {/* ───────── 문화 차이 ───────── */}
      <section className="card p-4 mt-4 space-y-3">
        <h2 className="text-lg font-bold">5. 손글씨 숫자도 문화마다 다르다</h2>
        <p className="text-sm leading-relaxed">
          MNIST 는 <strong>미국 사람들이 쓴 숫자</strong> 모음입니다. 0~9 는 전 세계 공통 아라비아 숫자지만,
          학교에서 처음 가르치는 방식이 나라마다 달라서 같은 숫자도 손버릇이 갈려요. 두 가지 대표적인 차이를 보면:
        </p>
        <div className="space-y-3 mt-2">
          <HandwritingCompare
            digit="1"
            styles={[
              { label: '🇺🇸 미국식', path: 'M 16 5 L 16 27', desc: '짧은 세로획 한 번. 머리 거의 없음.' },
              { label: '🇰🇷 한국식', path: 'M 9 11 L 16 5 L 16 27', desc: '위에 작은 머리(짧은 가로획·갈고리)를 먼저 그리고 세로획.' },
            ]}
          />
          <HandwritingCompare
            digit="7"
            styles={[
              { label: '🇺🇸 미국식 / 🇰🇷 한국식', path: 'M 7 7 L 25 7 L 13 27', desc: '윗 가로획 + 비스듬한 내림. 가운데 가로선 없음.' },
              { label: '🇪🇺 유럽식 (프·독 등)', path: 'M 7 7 L 25 7 L 13 27 M 11 17 L 19 17', desc: '가운데에 가로선 추가. 머리 달린 1 과 헷갈리지 않으려고.' },
            ]}
          />
        </div>
        <p className="text-[12px] text-muted leading-relaxed mt-2">
          반면 <strong>4·9 같은 다른 숫자</strong>는 국가별 차이보다 사람마다 차이가 더 커요. 위가 닫힌 4 /
          열린 4, 꼬리가 곧은 9 / 굽은 9 모두 한 나라 안에서도 섞여 있습니다.
        </p>
        <div className="aside-tip text-[12px] mt-2">
          시사점 — <strong>모델은 학습한 데이터의 문화·손버릇에 종속</strong> 됩니다. 미국 데이터로 학습한
          모델은 한국 사람이 머리 달아 쓴 1 을 7 로 잘못 보거나, 가운데 줄 그어진 유럽식 7 을 1 또는 다른 숫자로
          헷갈리기 쉬워요. 진짜 응용을 만들려면 그 지역·그 모집단에서 모은 데이터로 다시 학습해야 해요. 이게
          다음 단원에서 만날 <strong>"데이터 편향"</strong> 의 첫 모습.
        </div>
      </section>

      {/* ───────── 왜 표준이 되었나 ───────── */}
      <section className="card p-4 mt-4 space-y-2">
        <h2 className="text-lg font-bold">6. 왜 MNIST 가 "헬로 월드"가 되었나</h2>
        <ul className="list-disc pl-5 text-sm space-y-1">
          <li><strong>적당히 어렵고 적당히 쉽다</strong> — 단순 모델로도 88 % 는 나오지만, 99 % 넘기려면 진짜 실력이 필요.</li>
          <li><strong>크기가 작다</strong> — 노트북에서도 몇 분 안에 학습 가능.</li>
          <li><strong>완전 공개</strong> — 누구나 같은 데이터로 자기 모델 정확도를 비교할 수 있음.</li>
          <li><strong>"새 모델 만들면 일단 MNIST" </strong>의 전통 — 30 년간 수만 편의 논문이 출발점으로 사용.</li>
        </ul>
        <p className="text-sm text-muted leading-relaxed mt-2">
          요즘은 너무 쉬워졌다는 비판이 많아 후속 데이터셋(<code>Fashion-MNIST</code>, <code>CIFAR-10</code>, <code>ImageNet</code>)
          이 등장했어요. 그래도 입문자가 첫발을 떼는 데에는 여전히 가장 잘 맞는 자료입니다 — 우리도 다음 C2 에서
          이걸로 직접 학습시켜 봅니다.
        </p>
      </section>

      <div className="aside-note mt-5 text-sm">
        <strong>다음 단계 (C2)</strong> — 이 데이터를 인공 뉴런 망에 직접 학습시켜 정확도가 어디까지 오르는지,
        어떤 글자에서 모델이 헷갈리는지 직접 확인합니다.
      </div>
    </article>
  );
}
