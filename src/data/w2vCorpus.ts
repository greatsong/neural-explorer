// 토이 코퍼스 — 의도적으로 짝(pair) 관계를 반복 노출시켜 작은 모델에서도
// 벡터 산수가 작동하도록 만든 학습용 데이터.

export const EN_CORPUS = [
  // 왕 - 남자 + 여자 ≈ 여왕 을 만들기 위한 페어 강화
  'the king is a man',
  'the king is a man',
  'the king is a man',
  'the queen is a woman',
  'the queen is a woman',
  'the queen is a woman',
  'a king rules the country',
  'a queen rules the country',
  'king and queen rule together',
  'king and queen are royal',

  // 왕자 / 공주 페어
  'the prince is a young man',
  'the prince is a young man',
  'the princess is a young woman',
  'the princess is a young woman',
  'prince and princess are royal',
  'prince and princess are young',

  // 아버지 / 어머니 페어
  'the father is a man',
  'the father is a man',
  'the mother is a woman',
  'the mother is a woman',
  'father and mother are parents',

  // 소년 / 소녀 페어
  'the boy is a young man',
  'the boy is a young man',
  'the girl is a young woman',
  'the girl is a young woman',
  'boy and girl are children',

  // 동물 클러스터
  'the cat is an animal',
  'the dog is an animal',
  'cat and dog are pets',
  'a kitten is a young cat',
  'a puppy is a young dog',
  'kitten and puppy are baby pets',

  // 과일/음식 클러스터
  'an apple is a fruit',
  'a banana is a fruit',
  'apple and banana are fruits',
  'bread is a food',
  'rice is a food',
  'we eat bread and rice',
  'we eat apple and banana',
];

export const KO_CORPUS = [
  // 왕 - 남자 + 여자 ≈ 여왕
  '왕 은 남자 이다',
  '왕 은 남자 이다',
  '왕 은 남자 이다',
  '여왕 은 여자 이다',
  '여왕 은 여자 이다',
  '여왕 은 여자 이다',
  '왕 은 나라 를 다스린다',
  '여왕 은 나라 를 다스린다',
  '왕 과 여왕 은 함께 다스린다',
  '왕 과 여왕 은 왕족 이다',

  '왕자 는 어린 남자 이다',
  '왕자 는 어린 남자 이다',
  '공주 는 어린 여자 이다',
  '공주 는 어린 여자 이다',
  '왕자 와 공주 는 왕족 이다',
  '왕자 와 공주 는 어리다',

  '아빠 는 남자 이다',
  '아빠 는 남자 이다',
  '엄마 는 여자 이다',
  '엄마 는 여자 이다',
  '아빠 와 엄마 는 부모 이다',

  '소년 은 어린 남자 이다',
  '소년 은 어린 남자 이다',
  '소녀 는 어린 여자 이다',
  '소녀 는 어린 여자 이다',
  '소년 과 소녀 는 어린이 이다',

  '고양이 는 동물 이다',
  '강아지 는 동물 이다',
  '고양이 와 강아지 는 반려동물 이다',
  '새끼 고양이 는 어린 고양이 이다',
  '새끼 강아지 는 어린 강아지 이다',
  '새끼 고양이 와 새끼 강아지 는 반려동물 이다',

  '사과 는 과일 이다',
  '바나나 는 과일 이다',
  '사과 와 바나나 는 과일 이다',
  '빵 은 음식 이다',
  '밥 은 음식 이다',
  '우리 는 빵 과 밥 을 먹는다',
  '우리 는 사과 와 바나나 를 먹는다',
];
