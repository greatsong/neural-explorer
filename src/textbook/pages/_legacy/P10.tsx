// 10장 — 도트 그림 학습: 내가 만든 데이터로 내가 만든 분류기 (고1 친화 톤)
import { Aside, Capture, CoreInsights, KeyTakeaways, LabBox, LabSteps, LabQuestions, LabTip, LearningGoals, MathCorner, M, Mb } from '../components';

export function TextbookP10() {
  return (
    <>
      <p className="lead text-lg leading-8 text-text/90">
        지금까지 우리는 다른 사람이 만들어 둔 데이터로 모델을 돌려 봤다. 이 장에서는 한 발짝 더
        나아간다 — <strong>데이터를 직접 만든다</strong>. 8×8 도트로 두 가지 그림을 그리고,
        그 그림으로 단일 뉴런 한 개를 학습시킨다. 마지막에는 다른 사람이 그린 그림으로
        내 모델을 시험해 보고, 내 그림을 갤러리에 공유할 수도 있다.
      </p>
      <p>
        모델이 아니라 <strong>데이터의 입장</strong>에서 한 번 서 본다. 모델보다 먼저 만지는 게
        데이터라는 것, 그 데이터의 질과 다양성이 모델 성능을 거의 다 결정한다는 것 — 이 장에서
        직접 손끝으로 확인한다.
      </p>

      <LearningGoals
        items={[
          '8×8 도트 그림이 64차원 입력 벡터(0/1로 이뤄진 64개의 숫자)로 바뀌는 과정을 설명할 수 있다.',
          '데이터 수집 → 전처리 → 정제 → 학습 → 테스트의 흐름을 직접 한 바퀴 돌려 본다.',
          '내가 만든 데이터의 다양성이 모델의 일반화 능력에 어떻게 영향을 주는지 자기 말로 설명할 수 있다.',
        ]}
      />

      <CoreInsights
        items={[
          '내가 직접 그린 도트 그림으로 분류기를 학습시키면, 신경망의 모든 약점과 강점이 내 손끝에서 드러난다.',
          '모델보다 먼저 만지는 게 데이터다. 수집·전처리·정제 — 이 세 단계가 학습 결과의 절반 이상을 결정한다.',
          '데이터셋의 다양성이 곧 모델의 일반화 능력이다. 한 사람의 그림만으로 학습한 모델은 다른 사람의 그림에서 흔들린다.',
        ]}
      />

      <h2>10.1 모델이 아니라 데이터부터</h2>
      <p>
        지금까지의 장은 모두 "이미 잘 정리된 데이터"에서 시작했다. 학생 점수, 시험 결과, 의료 영상
        — 다 누군가 미리 모으고 다듬어 둔 것이다. 그러나 현실의 머신러닝 프로젝트는 정반대로 시작한다.
      </p>
      <p>
        모델 코드를 짜기 전에 <strong>데이터를 모으고 다듬는 데 80% 이상의 시간이 든다</strong>고
        한다. 이 장은 그 80%의 세계를 짧게라도 직접 경험해 보자는 시간이다.
      </p>
      <ul className="list-disc pl-6 my-3 leading-7 space-y-1">
        <li><strong>수집(collection)</strong> — 라벨이 붙은 예시를 모은다. 이 장에서는 직접 도트를 찍어 모은다.</li>
        <li><strong>전처리(preprocessing)</strong> — 모델이 먹기 좋게 다듬는다. 자유로운 그림을 8×8 격자로 줄이고, 검정/흰색의 0/1 값으로 바꾼다.</li>
        <li><strong>정제(cleaning)</strong> — 잘못 라벨된 그림, 두 라벨 어디에도 속하지 않는 모호한 그림을 빼낸다.</li>
      </ul>

      <Aside kind="caution" title="쓰레기를 넣으면 쓰레기가 나온다 (garbage in, garbage out)">
        모델은 우리가 보여 준 그대로를 진실이라고 믿는다. "동그라미"라고 라벨을 붙였는데
        네모처럼 그렸다면, 모델은 "아, 네모가 동그라미구나" 하고 학습한다. 그래서 학습 전에
        잘못된 라벨, 모호한 그림을 골라내는 <strong>정제 단계</strong>가 반드시 필요하다.
      </Aside>

      <h2>10.2 8×8 도트 = 64개의 숫자</h2>
      <p>
        화면에는 정사각형 격자 64칸이 보인다. 각 칸은 두 가지 상태밖에 없다 — 칠해졌거나(1),
        비었거나(0). 이 64칸을 한 줄로 쭉 펼쳐 적으면 길이 64짜리 숫자 묶음이 된다.
        이게 바로 모델이 받는 <strong>입력 벡터</strong>다.
      </p>
      <Mb>{`x \\;=\\; (x_1,\\, x_2,\\, x_3,\\, \\dots,\\, x_{64}),\\quad x_i \\in \\{0, 1\\}`}</Mb>
      <p>
        1장에서는 입력이 두 개였다. 6장에서는 네 개였다. 이 장에서는 64개다. 그러나 식의
        모양은 변하지 않는다 — 입력 64개에 가중치 64개를 곱해 더하고, 편향을 보태고, 활성화 함수를
        지나면 끝이다. 신경망의 식은 입력이 천 개든 만 개든 같은 한 줄이다.
      </p>
      <Mb>{`y \\;=\\; \\sigma\\!\\left(\\sum_{i=1}^{64} w_i x_i + b\\right)`}</Mb>
      <p>
        여기서 <M>{`\\sigma`}</M>(시그모이드)는 합을 0과 1 사이의 확률처럼 짓눌러 주는 활성화 함수다.
        1장에서 ReLU와 함께 이름만 잠깐 봤던 그 함수다. 출력이 0.5보다 크면 두 번째 라벨, 작거나 같으면
        첫 번째 라벨로 분류한다.
      </p>

      <Aside kind="key" title="🧩 내 그림에서 색지도까지 — 네 단계로 따라가기">
        <p className="mb-3">
          시뮬레이터를 열기 전에, 머릿속에서 한 번 따라가 보자. <strong>같은 8×8 격자가 네 번 등장</strong>한다.
          모양은 똑같은데 그 안에 들어가는 숫자만 다르다.
        </p>
        <ol className="grid grid-cols-2 sm:grid-cols-4 gap-2 list-none p-0 m-0">
          <li className="rounded-md border border-border p-2">
            <div className="text-[10px] font-mono text-muted">①</div>
            <div className="text-sm font-medium">내 그림</div>
            <div className="text-[11px] text-muted leading-tight mt-1">8×8 격자에 검정/흰 칸을 직접 그린다.</div>
          </li>
          <li className="rounded-md border border-border p-2">
            <div className="text-[10px] font-mono text-muted">②</div>
            <div className="text-sm font-medium">64개의 0/1</div>
            <div className="text-[11px] text-muted leading-tight mt-1">격자를 한 줄로 펼쳐 입력 벡터 <M>{`x`}</M>로.</div>
          </li>
          <li className="rounded-md border border-border p-2">
            <div className="text-[10px] font-mono text-muted">③</div>
            <div className="text-sm font-medium">64개의 가중치 <M>{`w_i`}</M></div>
            <div className="text-[11px] text-muted leading-tight mt-1">학습이 끝나면 픽셀마다 한 숫자가 자리 잡는다.</div>
          </li>
          <li className="rounded-md border border-border p-2">
            <div className="text-[10px] font-mono text-muted">④</div>
            <div className="text-sm font-medium">색지도</div>
            <div className="text-[11px] text-muted leading-tight mt-1">가중치를 다시 8×8로 펼쳐 색으로 칠하면 모델의 머릿속이 보인다.</div>
          </li>
        </ol>
        <p className="text-xs text-muted mt-3">
          ②와 ③의 자리가 정확히 1:1로 맞물린다 — 같은 픽셀의 입력에는 같은 자리의 가중치가 곱해진다. 그래서 ④의 색지도가 ①의 그림과 같은 8×8로 그려지는 것이다.
          이걸 머리에 두고 나면, 다음 절의 식 한 줄이 <em>"같은 자리끼리 64번 곱해 더한다"</em>는 한 문장으로 보인다.
        </p>
      </Aside>

      <h2>10.3 학습 — 페이즈 5에서 본 그 식이 다시 돈다</h2>
      <p>
        학습은 새로운 마법이 아니다. 5장에서 본 그 갱신 식이 64차원에서 80번 반복된다.
        예측이 정답보다 너무 컸으면 가중치를 줄이고, 너무 작았으면 늘린다. 오차 <M>{`e = \\hat{y} - y`}</M>
        만큼, 입력 <M>{`x_i`}</M>가 켜진 픽셀에 한해서 가중치를 조금씩 옮긴다.
      </p>
      <Mb>{`w_i \\leftarrow w_i - \\eta \\cdot e \\cdot x_i,\\quad b \\leftarrow b - \\eta \\cdot e`}</Mb>
      <p>
        80 에폭이 끝나면 64개의 가중치가 모두 자기 자리를 잡는다. 학습된 가중치를 8×8 격자에
        다시 펼쳐 색으로 칠해 보면 — <strong>"이 픽셀이 켜지면 첫 번째 라벨"</strong>이라는 파란 픽셀과
        <strong> "이 픽셀이 켜지면 두 번째 라벨"</strong>이라는 주황 픽셀의 지도가 보인다.
        모델이 무엇을 학습했는지가 그림 한 장에 다 들어 있다.
      </p>

      <h2>10.4 다양성이 곧 일반화 능력이다</h2>
      <p>
        한 사람의 그림 24장만으로 학습한 모델을 다른 사람의 그림으로 시험해 보면 — 종종 흔들린다.
        "동그라미"의 굵기, 위치, 기울기가 학습 데이터와 조금만 달라도 모델이 헷갈린다.
        이 흔들림이 신경망의 본질적 약점인 <strong>일반화(generalization) 문제</strong>다.
      </p>
      <p>
        해법은 단순하다 — <strong>다양한 그림을 더 많이 모은다</strong>. 친구 5명이 각자 그린 동그라미가
        같은 동그라미여도 미묘하게 다르다. 그 다양성이 곧 모델의 유연성으로 이어진다.
        이 장 마지막의 갤러리 공유 기능은 그래서 있다 — 다음 학기 학생들은 여러분의 그림으로 학습한다.
      </p>

      <Aside kind="key" title="과적합과 일반화 — 한 줄 미리보기">
        한 사람의 데이터에만 너무 잘 맞춰진 모델을 <strong>과적합(overfitting)</strong>됐다고 한다.
        반대로 처음 보는 데이터에서도 잘 작동하는 능력을 <strong>일반화(generalization)</strong>라 한다.
        둘의 균형을 맞추는 기술은 11장 이후에 본격적으로 다룬다. 이 장에서는 "데이터의 다양성"이
        그 출발점이라는 것만 손끝으로 느껴 두자.
      </Aside>

      <LabBox step="실습 10-1" title="네 단계로 내 분류기 한 바퀴 돌리기">
        <p>
          상단의 <strong>"▶ 실습 앱에서 직접 만져보기"</strong>로 10장 시뮬레이터를 연다.
          ① 그림 모으기 → ② 학습 → ③ 테스트 → ④ 갤러리 공유의 네 탭이 차례로 보인다.
        </p>

        <Capture
          src="/textbook/captures/p10.png"
          alt="페이즈 10 도트 그림 학습 화면"
          caption="▲ 8×8 격자 위에 마우스로 도트를 찍는다. 각 라벨당 12장의 프리셋을 불러올 수도 있고, 직접 그려 추가할 수도 있다."
        />

        <LabSteps>
          <li><strong>① 그림 모으기</strong> — 두 라벨 짝(예: 동그라미 / 네모)을 고르고, 프리셋 24장을 불러온다. 그 위에 직접 그린 그림을 5장 이상 추가한다.</li>
          <li><strong>① 정제</strong> — "모은 그림" 영역에서 두 라벨 어디에도 속하지 않는 모호한 그림을 삭제한다. 한 칸만 찍힌 빈약한 그림도 빼낸다.</li>
          <li><strong>② 학습</strong> — "학습 시작 (80 에폭)" 버튼을 누른다. 손실 곡선이 떨어지고, 학습된 가중치가 8×8 색지도로 시각화된다.</li>
          <li><strong>③ 테스트</strong> — 한 번도 학습하지 않은 새 그림을 그려 본다. 모델이 어떤 라벨을, 얼마의 확신도로 답하는지 확인한다.</li>
          <li><strong>④ 갤러리 공유</strong> (선택) — 만 14세 이상이라면 CC-BY 4.0으로 그림을 공개 데이터셋에 기여할 수 있다.</li>
        </LabSteps>

        <LabQuestions>
          <li>학습된 가중치 색지도에서 파란 픽셀과 주황 픽셀이 어떤 자리에 모여 있는가? 그게 두 라벨의 "차이"를 어떻게 표현하고 있는지 한 줄로 적어 보자.</li>
          <li>일부러 한쪽 라벨에 같은 그림만 잔뜩 넣고 학습시키면, 테스트에서 어떤 일이 벌어질까? 직접 해 보자.</li>
          <li>친구가 그린 동그라미를 테스트 탭에 그렸을 때, 내 동그라미보다 확신도가 낮게 나오는가? 왜 그런지 자기 말로 설명해 보자.</li>
        </LabQuestions>

        <LabTip>
          학습이 잘 안 될 땐 ① 데이터가 너무 적은지, ② 두 라벨의 그림이 서로 너무 비슷한지,
          ③ 잘못 라벨된 그림이 섞여 있는지 — 이 세 가지를 차례로 점검한다. 모델 탓이 아니라
          데이터 탓일 때가 훨씬 많다.
        </LabTip>
      </LabBox>

      <MathCorner title="입력 차원 = 픽셀 수">
        <p>
          이 장의 모델이 받는 입력의 개수는 단순한 곱셈으로 정해진다.
        </p>
        <Mb>{`\\text{입력 차원} \\;=\\; (\\text{가로 픽셀}) \\times (\\text{세로 픽셀}) \\;=\\; 8 \\times 8 \\;=\\; 64`}</Mb>
        <p>
          만약 격자를 16×16으로 늘리면 입력 차원은 256이 된다. 28×28(MNIST 손글씨 숫자 데이터셋의
          크기)이라면 784다. 컬러 사진이라면 픽셀 하나당 RGB 세 값이 있으니 차원이 또 3배가 된다.
        </p>
        <p>
          입력 차원이 늘면 가중치의 개수도 그만큼 늘어난다. 이 장의 모델은 가중치 64개 + 편향 1개 =
          총 65개의 학습 대상이 있다. 진짜 신경망은 이 숫자가 수억~수천억까지 간다 — 그래도 식은
          여전히 한 줄이다.
        </p>
      </MathCorner>

      <KeyTakeaways
        items={[
          '8×8 도트 그림은 길이 64의 0/1 입력 벡터로 바뀌어 모델에 들어간다.',
          '머신러닝의 80%는 데이터다 — 수집 · 전처리 · 정제의 세 단계가 학습 결과를 거의 다 결정한다.',
          '학습 식은 5장에서 본 그 갱신 식 그대로다. 차원만 64로 늘었을 뿐 골격은 같다.',
          '데이터셋의 다양성이 곧 모델의 일반화 능력이다 — 한 사람의 그림만으로는 다른 사람의 그림을 잘 못 맞춘다.',
          '내 그림을 갤러리에 공유하면 다음 학기의 누군가가 내 데이터로 학습한다 — 그게 오픈 데이터셋의 힘이다.',
        ]}
      />
    </>
  );
}
