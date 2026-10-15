import { useEffect, useRef, useState, type CSSProperties } from 'react';

function timeLabel(seconds: number) {
  const value = Math.max(0, Math.floor(Number.isFinite(seconds) ? seconds : 0));
  return `${Math.floor(value / 60)}:${String(value % 60).padStart(2, '0')}`;
}

export function LectureVideo({ src, poster, label, jumpPoints }: { src: string; poster: string; label: string; jumpPoints?: number[] }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [rate, setRate] = useState(1);
  const [fullscreen, setFullscreen] = useState(false);
  const [message, setMessage] = useState('');
  useEffect(() => {
    const video = videoRef.current;
    const onFullscreen = () => setFullscreen(document.fullscreenElement === containerRef.current);
    document.addEventListener('fullscreenchange', onFullscreen);
    return () => {
      document.removeEventListener('fullscreenchange', onFullscreen);
      if (video) { video.pause(); video.removeAttribute('src'); video.load(); }
    };
  }, []);
  const toggle = async () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      try { await video.play(); setMessage(''); }
      catch { setMessage('재생을 시작하지 못했습니다. 재생 버튼을 다시 눌러 주세요.'); }
    } else video.pause();
  };
  const seek = (seconds: number) => {
    const video = videoRef.current;
    if (!video || !duration) return;
    video.currentTime = Math.min(duration, Math.max(0, seconds));
    setCurrent(video.currentTime);
    setMessage('');
  };
  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await containerRef.current?.requestFullscreen();
    } catch { setMessage('브라우저의 전체 화면 기능을 사용해 주세요.'); }
  };
  const button = 'h-[52px] px-[22px] rounded-xl border border-border bg-white text-[23px] font-semibold hover:bg-accent-bg focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent disabled:opacity-35';
  const marks = (jumpPoints ?? Array.from({ length: Math.max(0, Math.ceil(duration / 60)) }, (_, i) => i * 60)).filter(t => t < duration - 1);
  return <div ref={containerRef} data-lecture-player className="h-full w-full flex flex-col bg-white pointer-events-auto" onClick={e => e.stopPropagation()}>
    <div className="relative flex-1 min-h-0 bg-black">
      <video ref={videoRef} src={src} poster={poster} playsInline preload="metadata" aria-label={label}
        className="w-full h-full object-contain cursor-pointer" onClick={() => void toggle()}
        onLoadedMetadata={e => setDuration(Number.isFinite(e.currentTarget.duration) ? e.currentTarget.duration : 0)}
        onDurationChange={e => setDuration(Number.isFinite(e.currentTarget.duration) ? e.currentTarget.duration : 0)}
        onTimeUpdate={e => setCurrent(e.currentTarget.currentTime)}
        onPlay={() => { setPlaying(true); setMessage(''); }} onPause={() => setPlaying(false)}
        onSeeked={() => setMessage('')}
        onVolumeChange={e => { setVolume(e.currentTarget.volume); setMuted(e.currentTarget.muted); }}
        onRateChange={e => setRate(e.currentTarget.playbackRate)}
        onEnded={() => setMessage('영상이 끝났습니다. 아래의 다음 버튼으로 이어가세요.')}
        onError={() => setMessage('영상을 불러오지 못했습니다. 영상 파일이 함께 있는지 확인해 주세요.')}/>
      {!playing && current < 0.1 && <button type="button" onClick={() => void toggle()} aria-label="화면에서 영상 재생" className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[106px] h-[106px] rounded-full bg-accent/95 text-white text-[48px] shadow-xl hover:bg-accent focus-visible:outline focus-visible:outline-4 focus-visible:outline-white">▶</button>}
      {message && <p role="status" className="absolute top-[20px] left-1/2 -translate-x-1/2 bg-white/95 text-text rounded-xl px-[24px] py-[12px] text-[23px] whitespace-nowrap">{message}</p>}
    </div>
    <div className="shrink-0 px-[48px] pt-[12px] pb-[14px] border-t border-border">
      <div className="flex items-center gap-[18px] mb-[12px]">
        <output className="text-[24px] font-bold tabular-nums w-[75px] text-accent">{timeLabel(current)}</output>
        <input type="range" aria-label="재생 위치" aria-valuetext={`${timeLabel(current)} / ${timeLabel(duration)}`} min={0} max={duration || 0} step={0.1} value={current} disabled={!duration}
          onChange={e => seek(Number(e.target.value))} style={{ '--lecture-progress': `${duration ? current / duration * 100 : 0}%` } as CSSProperties} className="lecture-seek flex-1"/>
        <span className="text-[22px] text-muted tabular-nums w-[65px] text-right">{timeLabel(duration)}</span>
      </div>
      <div className="flex items-center gap-[12px]">
        <button type="button" aria-label={playing ? '일시정지' : '재생'} onClick={() => void toggle()} className={`${button} min-w-[168px] !bg-accent !text-white !border-accent`}>{playing ? 'Ⅱ 일시정지' : '▶ 재생'}</button>
        <button type="button" onClick={() => seek(current - 10)} disabled={!duration} className={button} aria-label="10초 뒤로">−10초</button>
        <button type="button" onClick={() => seek(current + 10)} disabled={!duration} className={button} aria-label="10초 앞으로">+10초</button>
        <span className="text-[18px] text-muted ml-[8px] flex-1">Space 재생·정지</span>
        <select aria-label="재생 속도" value={rate} onChange={e => { if (videoRef.current) videoRef.current.playbackRate = Number(e.target.value); }} className="h-[52px] px-[12px] border border-border rounded-xl bg-white text-[22px]">
          {[0.75, 1, 1.25, 1.5, 2].map(value => <option key={value} value={value}>{value}×</option>)}
        </select>
        <button type="button" aria-label={muted ? '음소거 해제' : '음소거'} onClick={() => { if (videoRef.current) videoRef.current.muted = !muted; }} className={`${button} !px-[14px]`}>{muted ? '소리 켜기' : '소리 끄기'}</button>
        <input type="range" aria-label="음량" min={0} max={1} step={0.05} value={muted ? 0 : volume} onChange={e => { const v = videoRef.current; if (v) { v.volume = Number(e.target.value); v.muted = v.volume === 0; } }} className="w-[100px] accent-[rgb(var(--color-accent))]"/>
        <button type="button" onClick={() => void toggleFullscreen()} className={button}>{fullscreen ? '화면 복귀' : '전체 화면'}</button>
      </div>
      <div className="flex items-center gap-[10px] mt-[12px] h-[36px]">
        <span className="text-[19px] text-muted mr-[6px]">구간 바로가기</span>
        {marks.map((time, i) => <button type="button" key={time} onClick={() => seek(time)} aria-label={`${timeLabel(time)}로 이동`} className={`rounded-lg px-[17px] py-[4px] text-[20px] tabular-nums font-semibold hover:bg-accent-bg ${current >= time && current < (marks[i + 1] ?? duration + 1) ? 'bg-accent-bg text-accent' : 'text-muted bg-surface'}`}>{timeLabel(time)}</button>)}
      </div>
    </div>
  </div>;
}
