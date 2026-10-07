#!/bin/zsh
# 특강 슬라이드를 헤드리스 크롬으로 한 장씩 캡처한다. 사용: scripts/lecture-shots.sh <출력폴더> [슬라이드 번호들...]
# 각 슬라이드의 단계 수는 src/lecture 의 steps 값을 lecture-steps.json 에서 읽는다 (아래 node 한 줄로 생성).
OUT=${1:-/tmp/lecture-shots}; shift
mkdir -p "$OUT"
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
STEPS=$(cat "$(dirname "$0")/lecture-steps.json")
N=$(echo "$STEPS" | python3 -c 'import json,sys; print(len(json.load(sys.stdin)))')
SLIDES=("$@"); [ ${#SLIDES[@]} -eq 0 ] && SLIDES=($(seq 1 $N))
for i in $SLIDES; do
  k=$(echo "$STEPS" | python3 -c "import json,sys; print(json.load(sys.stdin)[$i-1])")
  for s in $(seq 0 $k); do
    "$CHROME" --headless=new --disable-gpu --hide-scrollbars --window-size=1600,900 --virtual-time-budget=2500 \
      --screenshot="$OUT/s$(printf %02d $i)-$s.png" "http://localhost:4035/#/lecture/$i?step=$s" >/dev/null 2>&1
  done
done
ls "$OUT" | wc -l
