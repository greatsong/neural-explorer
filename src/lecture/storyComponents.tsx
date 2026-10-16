import { LectureVideo } from './LectureVideo';

const asset = (name: string) => `${import.meta.env.BASE_URL}lecture-assets/${name}`;

// 원본의 모든 도입 페이지를 같은 순서와 비율로 보존한다.
export function OriginalPage({ page, video, step = 0 }: { page: number; video?: string; step?: number }) {
  const poster = asset(`source/slide-${String(page).padStart(2, '0')}.png`);
  if (page === 2) return <div className="w-full h-full flex items-center justify-center">
    <div className="relative h-full aspect-video max-w-full">
      <img src={poster} className="h-full w-full object-contain" alt="송석리 교사의 경력과 저서 소개"/>
      <div className="absolute top-0 left-0 w-full h-[15.56%] bg-white flex items-center pl-[12px] text-[44px] leading-[1.5] font-bold text-[#33257A]">안녕하세요 여러분! 만나서 반갑습니다! :)</div>
      <div aria-label="경력" className="absolute left-[1.9%] top-[17.5%] w-[65%] h-[40%] bg-white text-[38px] leading-[45.3px] font-bold text-[#1c1e21]">
        <p>[경력]</p>
        <p>2005 – 2015 선린인터넷고 교사</p>
        <p>2016 – 2020 한성과학고 교사</p>
        <p>2021 – 2025 서울고 교사</p>
        <p>2020 – 2026.8. 서울대 사범대학 강사</p>
        <p>2020 – 현재 서울대 평생교육원 강사</p>
        <p>2026 – 현재 당곡고 교사</p>
      </div>
    </div>
  </div>;
  // 14장(하사비스): 원본 그림의 "1단계·2단계" 상자를 가리고, 클릭마다 한 줄씩 보인다
  if (page === 14) return <div className="w-full h-full flex items-center justify-center">
    <div className="relative h-full aspect-video max-w-full">
      <img src={poster} className="h-full w-full object-contain" alt="데미스 하사비스 소개"/>
      <div className="absolute bg-white flex items-stretch" style={{ left: '40.3%', top: '85.8%', width: '58%', height: '12.2%' }}>
        <div className="flex-1 rounded-2xl bg-accent-bg flex flex-col items-center justify-center text-[27px] leading-[1.45] font-bold text-accent">
          <div className="lec-fade" style={{ opacity: step >= 1 ? 1 : 0 }}>“1단계: 지능을 푼다.</div>
          <div className="lec-fade" style={{ opacity: step >= 2 ? 1 : 0 }}>2단계: 그것으로 다른 모든 문제를 푼다.”</div>
        </div>
      </div>
    </div>
  </div>;
  if (!video) return <img src={poster} className="w-full h-full object-contain" alt={`세종특강 원본 ${page}장`}/>;
  return <LectureVideo src={asset(`source/${video}`)} poster={poster} label={page === 12 ? '이세돌 인터뷰' : '하사비스 특강'} jumpPoints={page === 12 ? [255] : undefined}/>;
}

export function FutureBook() {
  return <div className="h-full flex flex-col gap-[16px] pt-[12px]"><p className="text-[30px] font-semibold">우리는 10년 전 알파고 사건 이후의 바둑계의 변화를 타산지석 삼아야 합니다.</p><img src={asset('future-book.png')} className="w-full flex-1 min-h-0 object-contain" alt="먼저 온 미래 책 이미지와 정재승의 추천 글"/></div>;
}
export function CareerList({ step = 0 }: { step?: number }) {
  // 두 질문(대체불가능한 직업 / 사라질 직업)은 클릭 1에서 나타난다. 그 전에는 흰 덮개로 가린다.
  const cover = (left: string, width: string) => <div className="absolute bg-white" style={{ left, width, top: '0.8%', height: '5.6%' }} />;
  return <div className="h-full flex flex-col gap-[12px] pt-[10px]"><p className="text-[30px] font-semibold">2016년에 내다본 직업의 미래. 지금 보면 어떤 생각이 드나요?</p>
    <div className="relative flex-1 min-h-0 self-center aspect-[16/9] max-w-full">
      <img src={asset('careers-2016.png')} className="w-full h-full object-contain" alt="한국고용정보원 2016년 자료: 인공지능 대체 가능성이 낮거나 높다고 본 직업 목록"/>
      {step < 1 && cover('31.5%', '19%')}
      {step < 1 && cover('50.5%', '18.5%')}
    </div><p className="text-[20px] text-muted">2016년의 전망 자료를 보며, 여러분의 관심 분야에서 어떤 일을 만들고 싶은지 생각해 보세요.</p></div>;
}
export function ClosingMessage() {
  // 2026-10-16: 1장(원본 표지)과 같은 보라 전면에 응원 문구만. 머리글·제목은 fullBleed로 숨긴다.
  return <div className="absolute inset-0 flex flex-col items-center justify-center text-center text-white" style={{ background: 'rgb(106, 70, 255)' }}>
    <p className="text-[64px] font-bold leading-[1.5] tracking-tight">아톰과 비트가 연결된 새로운 세상을 창조할<br/><span style={{ color: 'rgba(255,255,255,0.72)' }}>여러분의 미래를 응원합니다! :)</span></p>
  </div>;
}
