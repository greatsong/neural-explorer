// 해시 뒤 쿼리를 읽는다. 예: #/a3?mode=b&present=1 → mode=b, present=1
// 수업에서 화면의 시작 상태를 주소로 정해 두고 여는 데 쓴다.
export function hashParams(): URLSearchParams {
  const hash = window.location.hash;
  const q = hash.indexOf('?');
  if (q < 0) return new URLSearchParams();
  return new URLSearchParams(hash.slice(q + 1).split('#')[0]);
}
