// The course content: what each handshape and position stands for, the lessons, and the
// question generators. Lessons are built from steps (see lesson.js for how each step type
// is shown). The physical hand is the teacher: most steps make it move.
//
// Hand commands (see cuedkit-speech.ino): "3" = handshape 3, "a2" = arm to position 2,
// "ma" = perform the syllable.
//
// Needs encoder.js (and pinyin-pro for sentences) to be loaded first.

// ---------- what the handshapes and positions mean ----------

const HAND_INFO = {
  1: { initials: ['p', 'd', 'zh'], desc: { zh: '只伸出食指，其他手指收起。', en: 'Only the index finger is out; the other fingers are folded.' } },
  2: { initials: ['k', 'q', 'z'], desc: { zh: '伸出食指和中指，其他手指收起。', en: 'Index and middle fingers are out; the others are folded.' } },
  3: { initials: ['h', 'r', 's'], desc: { zh: '伸出中指、无名指和小指，食指和拇指收起。', en: 'Middle, ring and little fingers are out; the index finger and thumb are folded.' } },
  4: { initials: ['n', 'b', 'yu'], desc: { zh: '食指到小指四根手指伸出，只有拇指收起。', en: 'All four fingers are out; only the thumb is folded.' } },
  5: { initials: ['t', 'm', 'f'], zero: true, desc: { zh: '五根手指全部伸出。没有声母的音节也用这个手型。', en: 'All five fingers are out. Syllables with no consonant use this handshape too.' } },
  6: { initials: ['w', 'l', 'x'], desc: { zh: '拇指和食指伸出，其他手指收起。', en: 'Thumb and index finger are out; the others are folded.' } },
  7: { initials: ['g', 'ch', 'j'], desc: { zh: '拇指、食指和中指伸出，其他手指收起。', en: 'Thumb, index and middle fingers are out; the others are folded.' } },
  8: { initials: ['sh', 'y', 'c'], desc: { zh: '伸出食指和中指，并且食指向外侧张开，像比“耶”。', en: 'Index and middle fingers are out, with the index finger spread sideways, like a peace sign.' } },
};

const POSITION_INFO = {
  1: { finals: ['an', 'e', 'o'], place: { zh: '眼角旁', en: 'beside the eye' } },
  2: { finals: ['a', 'ou', 'er', 'en'], place: { zh: '脸的外面', en: 'out to the side of the face' } },
  3: { finals: ['i', 'v', 'ang'], place: { zh: '嘴角', en: 'at the corner of the mouth' } },
  4: { finals: ['ai', 'u', 'ao'], place: { zh: '下巴', en: 'at the chin' } },
  5: { finals: ['eng', 'ong', 'ei'], place: { zh: '喉咙', en: 'at the throat' } },
};

// ü is typed v inside the code; show it as ü to people.
function showPinyin(text) {
  return String(text).replace(/v/g, 'ü');
}

// ---------- small helpers ----------

function shuffle(list) {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function sampleOf(list, n) {
  return shuffle(list).slice(0, n);
}

function oneOf(list) {
  return list[Math.floor(Math.random() * list.length)];
}

// The consonants worth asking about (yu is a medial, not a consonant).
function consonantsOf(hand) {
  return HAND_INFO[hand].initials.filter((c) => c !== 'yu');
}

function handOfInitial(initial) {
  return Number(Object.keys(HAND_INFO).find((h) => HAND_INFO[h].initials.includes(initial)));
}

function positionOfFinal(final) {
  return Number(Object.keys(POSITION_INFO).find((p) => POSITION_INFO[p].finals.includes(final)));
}

function cueSignature(cue) {
  return cue.hand + '-' + cue.glideHand + '-' + cue.position;
}

// ---------- question generators ----------
// Every question is { type, prompt, ...} with bilingual text {zh, en}.
//   reveal  = hand commands to run afterwards to show the right answer (when not shown already)
//   demo    = what the hand shows as the question itself (watch questions)

const T = (zh, en) => ({ zh, en });

// The hand shows a handshape; which consonant can it stand for?
function qWatchHand(n, scope) {
  const correct = oneOf(consonantsOf(n));
  const pool = scope.filter((h) => h !== n);
  const others = (pool.length ? pool : [1, 2, 3, 4, 5, 6, 7, 8].filter((h) => h !== n)).flatMap(consonantsOf);
  const options = shuffle([{ text: correct, correct: true }].concat(sampleOf(others, 3).map((text) => ({ text }))));
  return {
    type: 'watch',
    prompt: T('这是哪个声母？', 'Which consonant is this?'),
    demo: { lines: [String(n)] },
    options,
    explain: T('这是手型 ' + n + '，表示 ' + HAND_INFO[n].initials.join('、') + '。', 'This is handshape ' + n + ', used for ' + HAND_INFO[n].initials.join(', ') + '.'),
  };
}

// Pick the handshape for a consonant on a row of handshapes; each press moves the hand.
function qMakeHand(initial) {
  const n = handOfInitial(initial);
  return {
    type: 'make',
    kind: 'hand',
    answer: n,
    prompt: T('做出「' + initial + '」的手型', 'Make the handshape for “' + initial + '”'),
    hint: T('点一个数字，机械手就会做出来。', 'Tap a number and the hand makes it.'),
    explain: T('「' + initial + '」用手型 ' + n + '。', '“' + initial + '” uses handshape ' + n + '.'),
  };
}

function handOption(n, correct) {
  const option = { text: '手型 ' + n, sub: 'Handshape ' + n };
  if (correct) option.correct = true;
  return option;
}

// Which handshape is used for this consonant? (diagram options; the hand then shows the answer)
function qChooseHand(initial, scope) {
  const n = handOfInitial(initial);
  const pool = scope.filter((h) => h !== n);
  const others = pool.length >= 3 ? pool : [1, 2, 3, 4, 5, 6, 7, 8].filter((h) => h !== n);
  return {
    type: 'choose',
    prompt: T('「' + initial + '」用哪个手型？', 'Which handshape is used for “' + initial + '”?'),
    options: shuffle([handOption(n, true)].concat(sampleOf(others, 3).map((h) => handOption(h, false)))),
    reveal: { lines: [String(n)] },
    explain: T('「' + initial + '」用手型 ' + n + '。', '“' + initial + '” uses handshape ' + n + '.'),
  };
}

// The arm moves; which vowel can it stand for?
function qWatchPosition(n, scope) {
  const correct = oneOf(POSITION_INFO[n].finals);
  const pool = scope.filter((p) => p !== n);
  const others = (pool.length ? pool : [1, 2, 3, 4, 5].filter((p) => p !== n)).flatMap((p) => POSITION_INFO[p].finals);
  const options = shuffle([{ text: showPinyin(correct), correct: true }].concat(sampleOf(others, 3).map((text) => ({ text: showPinyin(text) }))));
  return {
    type: 'watch',
    prompt: T('这是哪个韵母？', 'Which vowel is this?'),
    demo: { lines: ['a' + n] },
    options,
    explain: T('这是位置 ' + n + '（' + POSITION_INFO[n].place.zh + '），表示 ' + POSITION_INFO[n].finals.map(showPinyin).join('、') + '。',
      'This is position ' + n + ' (' + POSITION_INFO[n].place.en + '), used for ' + POSITION_INFO[n].finals.map(showPinyin).join(', ') + '.'),
  };
}

// Move the arm to where a vowel goes.
function qMakePosition(final) {
  const n = positionOfFinal(final);
  return {
    type: 'make',
    kind: 'pos',
    answer: n,
    prompt: T('移到「' + showPinyin(final) + '」的位置', 'Move to the position for “' + showPinyin(final) + '”'),
    hint: T('点一个数字，机械手就会移过去。', 'Tap a number and the arm moves there.'),
    explain: T('「' + showPinyin(final) + '」在位置 ' + n + '（' + POSITION_INFO[n].place.zh + '）。', '“' + showPinyin(final) + '” goes at position ' + n + ' (' + POSITION_INFO[n].place.en + ').'),
  };
}

// The hand cues a syllable; which syllable was it? (the wrong options have different cues)
function qWatchSyllable(syllable, pool) {
  const cue = encodeSyllable(syllable);
  const others = shuffle(pool.filter((s) => s !== syllable && cueSignature(encodeSyllable(s)) !== cueSignature(cue)));
  const picked = [];
  const seen = new Set([cueSignature(cue)]);
  others.forEach((s) => {
    const sig = cueSignature(encodeSyllable(s));
    if (picked.length < 3 && !seen.has(sig)) { picked.push(s); seen.add(sig); }
  });
  return {
    type: 'watch',
    prompt: T('这是哪个音节？', 'Which syllable is this?'),
    demo: { lines: [syllable] },
    options: shuffle([{ text: showPinyin(syllable), correct: true }].concat(picked.map((s) => ({ text: showPinyin(s) })))),
    explain: explainSyllable(syllable, cue),
  };
}

// Build a syllable's cue yourself: handshape, (medial handshape), position. Try it on the hand.
function qBuildSyllable(syllable) {
  const cue = encodeSyllable(syllable);
  return {
    type: 'build',
    syllable,
    cue,
    prompt: T('打出「' + showPinyin(syllable) + '」', 'Cue “' + showPinyin(syllable) + '”'),
    hint: T('选好，再让机械手试一试。', 'Choose, then try it on the hand.'),
    explain: explainSyllable(syllable, cue),
    reveal: { lines: [syllable] },
  };
}

// The hand cues a whole word or sentence; which one was it?
function qWatchSentence(text, pool) {
  const items = textToSyllables(text).filter((item) => item.cue.ok);
  const signature = (t) => textToSyllables(t).filter((i) => i.cue.ok).map((i) => cueSignature(i.cue)).join(',');
  const mine = signature(text);
  const others = shuffle(pool.filter((t) => t !== text && signature(t) !== mine));
  return {
    type: 'watch',
    prompt: T('这是哪一句？', 'Which one is this?'),
    demo: { lines: items.map((item) => item.pinyin), gap: true },
    options: shuffle([{ sentence: text, correct: true }].concat(others.slice(0, 3).map((t) => ({ sentence: t })))),
    explain: T('这句是「' + text + '」。', 'The sentence is “' + text + '”.'),
  };
}

function explainSyllable(syllable, cue) {
  const shown = showPinyin(syllable);
  const hands = cue.glideHand ? '手型 ' + cue.hand + ' 变成手型 ' + cue.glideHand : '手型 ' + cue.hand;
  const handsEn = cue.glideHand ? 'handshape ' + cue.hand + ' changing into handshape ' + cue.glideHand : 'handshape ' + cue.hand;
  return T('「' + shown + '」：' + hands + '，位置 ' + cue.position + '。', '“' + shown + '”: ' + handsEn + ', position ' + cue.position + '.');
}

// ---------- word and sentence lists ----------

const WORDS = ['你好', '谢谢', '再见', '老师', '朋友', '学习', '中国', '妈妈', '爸爸', '水果'];
const SHORT_SENTENCES = ['我爱你', '你好吗', '我是学生', '请坐', '谢谢你', '早上好', '对不起', '没关系'];
// From the Mandarin Cued Speech examples (中文线索语示例).
const SENTENCES = [
  '你叫什么名字', '我喜欢看书和听音乐', '请填一下这个表格', '萝卜青菜，各有所爱',
  '人生难得一知己', '大熊猫圆滚滚很可爱', '请扫码支付', '我们想置换一套大点的房子',
  '时间不早了，我们该走了',
];

// ---------- syllable lists ----------

const SIMPLE_SYLLABLES = ['ba', 'ma', 'da', 'ni', 'hao', 'ke', 'pi', 'tu', 'gu', 'si', 'ze', 'lan', 'fen', 'cai', 'shan', 'zhi', 'ri', 'ji', 'qi', 'xi'];
const ZERO_SYLLABLES = ['a', 'o', 'e', 'ai', 'ei', 'ao', 'ou', 'an', 'en', 'ang', 'eng', 'er', 'yi', 'wu', 'yu'];
const MEDIAL_SYLLABLES = ['xiao', 'liu', 'hua', 'xue', 'shuo', 'jia', 'nian', 'guang', 'gui', 'lian', 'qiang', 'tuan'];

// ---------- steps ----------
// explore  : buttons that make the hand do something; done when each row was tried
// info     : a short explanation (optionally with a button that shows it on the hand)
// watch / choose / make / build : questions

function exploreHands(hands, intro) {
  return {
    type: 'explore',
    kind: 'hand',
    title: T('点一点，看机械手怎么做', 'Tap and watch the hand'),
    intro,
    rows: hands.map((n) => ({
      hand: n,
      label: T('手型 ' + n, 'Handshape ' + n),
      desc: HAND_INFO[n].desc,
      buttons: HAND_INFO[n].initials.map((c) => ({ text: c, line: String(n) }))
        .concat(HAND_INFO[n].zero ? [{ text: '∅', title: T('没有声母', 'no consonant'), line: String(n) }] : []),
    })),
  };
}

function explorePositions(positions, intro) {
  return {
    type: 'explore',
    kind: 'pos',
    title: T('点一点，看机械手移到哪里', 'Tap and watch where the hand goes'),
    intro,
    rows: positions.map((n) => ({
      position: n,
      label: T('位置 ' + n + '：' + POSITION_INFO[n].place.zh, 'Position ' + n + ': ' + POSITION_INFO[n].place.en),
      buttons: POSITION_INFO[n].finals.map((f) => ({ text: showPinyin(f), line: 'a' + n })),
    })),
  };
}

function exploreSyllables(syllables, intro) {
  return {
    type: 'explore',
    kind: 'syl',
    title: T('点一点，看机械手打出来', 'Tap and watch the hand cue it'),
    intro,
    rows: syllables.map((s) => {
      const cue = encodeSyllable(s);
      return { syllable: s, label: { zh: showPinyin(s), en: '' }, desc: explainSyllable(s, cue), buttons: [{ text: showPinyin(s), line: s }] };
    }),
  };
}

function infoStep(title, body, extra) {
  return Object.assign({ type: 'info', title, body }, extra || {});
}

// ---------- lessons ----------

const ALL_HANDS = [1, 2, 3, 4, 5, 6, 7, 8];
const ALL_POSITIONS = [1, 2, 3, 4, 5];

function handQuestions(hands, extraRounds) {
  const questions = [];
  hands.forEach((n) => questions.push(qWatchHand(n, hands)));
  shuffle(hands).slice(0, 2).forEach((n) => questions.push(qMakeHand(oneOf(consonantsOf(n)))));
  shuffle(hands).slice(0, 2).forEach((n) => questions.push(qChooseHand(oneOf(consonantsOf(n)), hands)));
  for (let i = 0; i < (extraRounds || 0); i++) questions.push(qWatchHand(oneOf(hands), hands));
  return shuffle(questions);
}

function positionQuestions(positions, extraRounds) {
  const questions = [];
  positions.forEach((n) => questions.push(qWatchPosition(n, positions)));
  shuffle(positions).slice(0, 2).forEach((n) => questions.push(qMakePosition(oneOf(POSITION_INFO[n].finals))));
  for (let i = 0; i < (extraRounds || 0); i++) questions.push(qWatchPosition(oneOf(positions), positions));
  return shuffle(questions);
}

function syllableQuestions(pool, watchCount, buildCount) {
  const picks = sampleOf(pool, watchCount + buildCount);
  return picks.slice(0, watchCount).map((s) => qWatchSyllable(s, pool))
    .concat(picks.slice(watchCount).map((s) => qBuildSyllable(s)));
}

function sentenceQuestions(pool, count) {
  return sampleOf(pool, count).map((t) => qWatchSentence(t, pool));
}

const UNITS = [
  { id: 'hand', title: T('手型', 'Handshapes'), blurb: T('8 个手型，对应声母。', 'The 8 handshapes, for consonants.'), read: 'handshapes.html' },
  { id: 'position', title: T('位置', 'Positions'), blurb: T('5 个位置，对应韵母。', 'The 5 positions, for vowels.'), read: 'positions.html' },
  { id: 'syllable', title: T('音节', 'Syllables'), blurb: T('把手型和位置合在一起。', 'Putting handshape and position together.'), read: 'combinations.html' },
  { id: 'sentence', title: T('词和句子', 'Words and sentences'), blurb: T('用线索语打出完整的话。', 'Cue whole words and sentences.'), read: null },
];

const LESSONS = [
  {
    id: 'hand-1', unit: 'hand', title: T('手型 1–4', 'Handshapes 1–4'),
    steps: () => [
      infoStep(T('8 个手型', 'The 8 handshapes'), [
        T('每个手型对应几个声母。点一个声母，机械手就做出它的手型。', 'Each handshape covers a few consonants. Tap one and your hand makes its handshape.'),
      ]),
      exploreHands([1, 2, 3, 4]),
    ].concat(handQuestions([1, 2, 3, 4])),
  },
  {
    id: 'hand-2', unit: 'hand', title: T('手型 5–8', 'Handshapes 5–8'),
    steps: () => [
      exploreHands([5, 6, 7, 8], [
        T('∅ 表示没有声母的音节，也用手型 5。', '∅ means no consonant. Those syllables use handshape 5 too.'),
      ]),
    ].concat(handQuestions([5, 6, 7, 8])),
  },
  {
    id: 'hand-3', unit: 'hand', title: T('8 个手型复习', 'All 8 handshapes'),
    steps: () => handQuestions(ALL_HANDS, 4),
  },
  {
    id: 'pos-1', unit: 'position', title: T('位置 1–3', 'Positions 1–3'),
    steps: () => [
      infoStep(T('5 个位置', 'The 5 positions'), [
        T('手臂移到不同的位置，表示韵母。点一个韵母，看手臂去哪里。', 'The arm moves to a position to show the vowel. Tap one and watch where it goes.'),
      ]),
      explorePositions([1, 2, 3]),
    ].concat(positionQuestions([1, 2, 3])),
  },
  {
    id: 'pos-2', unit: 'position', title: T('位置 4–5', 'Positions 4–5'),
    steps: () => [explorePositions([4, 5])].concat(positionQuestions([4, 5], 2)),
  },
  {
    id: 'pos-3', unit: 'position', title: T('5 个位置复习', 'All 5 positions'),
    steps: () => positionQuestions(ALL_POSITIONS, 4),
  },
  {
    id: 'syl-1', unit: 'syllable', title: T('声母 + 韵母', 'Consonant + vowel'),
    steps: () => [
      infoStep(T('手型 + 位置 = 音节', 'Handshape + position = a syllable'), [
        T('先做声母的手型，再移到韵母的位置。', 'First the consonant’s handshape, then the vowel’s position.'),
      ]),
      exploreSyllables(['ma', 'ba', 'ni', 'hao', 'ke', 'pi']),
    ].concat(syllableQuestions(SIMPLE_SYLLABLES, 5, 3)),
  },
  {
    id: 'syl-2', unit: 'syllable', title: T('没有声母的音节', 'No consonant'),
    steps: () => [
      infoStep(T('没有声母，用手型 5', 'No consonant: handshape 5'), [
        T('yi、wu、yu 读作 i、u、ü，也没有声母。', 'yi, wu and yu sound like i, u and ü, so they have no consonant either.'),
      ]),
      exploreSyllables(['a', 'ai', 'an', 'er', 'yi', 'wu', 'yu']),
    ].concat(syllableQuestions(ZERO_SYLLABLES, 5, 3)),
  },
  {
    id: 'syl-3', unit: 'syllable', title: T('介音：y、w、yu', 'Medials: y, w, yu'),
    steps: () => [
      infoStep(T('手型在路上变化', 'The handshape changes on the way'), [
        T('介音 y、w、yu 用手型 8、6、4。手先做声母，再变成介音。', 'The medials y, w and yu use handshapes 8, 6 and 4. The hand starts as the consonant, then changes.'),
      ]),
      exploreSyllables(['xiao', 'liu', 'hua', 'xue']),
    ].concat(syllableQuestions(MEDIAL_SYLLABLES, 5, 3)),
  },
  {
    id: 'syl-4', unit: 'syllable', title: T('音节综合练习', 'Syllable practice'),
    steps: () => syllableQuestions(SIMPLE_SYLLABLES.concat(ZERO_SYLLABLES, MEDIAL_SYLLABLES), 7, 3),
  },
  {
    id: 'sen-1', unit: 'sentence', title: T('两个字的词', 'Two-syllable words'),
    steps: () => [
      infoStep(T('一个字，一个音节', 'One character, one syllable'), [
        T('机械手一个字一个字地打。', 'The hand cues one character at a time.'),
      ], { demoLabel: T('看机械手打「你好」', 'Watch the hand cue “你好”'), demoText: '你好' }),
    ].concat(sentenceQuestions(WORDS, 6)),
  },
  {
    id: 'sen-2', unit: 'sentence', title: T('短句', 'Short sentences'),
    steps: () => sentenceQuestions(SHORT_SENTENCES, 6),
  },
  {
    id: 'sen-3', unit: 'sentence', title: T('完整的句子', 'Full sentences'),
    steps: () => sentenceQuestions(SENTENCES, 6).concat([
      infoStep(T('轮到你了', 'Your turn'), [
        T('去“说话”页面，输入任何句子。', 'Go to the Speak page and type any sentence.'),
      ], { link: { href: 'speak.html', label: T('说话', 'Speak') } }),
    ]),
  },
];

function findLesson(id) {
  return LESSONS.find((lesson) => lesson.id === id) || null;
}

// ---------- practice and quiz ----------

const PRACTICE_TOPICS = {
  hand: { title: T('手型', 'Handshapes'), build: (n) => handQuestions(ALL_HANDS, Math.max(0, n - 8)).slice(0, n) },
  position: { title: T('位置', 'Positions'), build: (n) => positionQuestions(ALL_POSITIONS, Math.max(0, n - 7)).slice(0, n) },
  syllable: { title: T('音节', 'Syllables'), build: (n) => syllableQuestions(SIMPLE_SYLLABLES.concat(ZERO_SYLLABLES, MEDIAL_SYLLABLES), n - 3, 3) },
  sentence: { title: T('词和句子', 'Words and sentences'), build: (n) => sentenceQuestions(WORDS.concat(SHORT_SENTENCES, SENTENCES), n) },
};

function practiceSteps(topic, count) {
  const entry = PRACTICE_TOPICS[topic];
  return entry ? entry.build(count || 10) : [];
}

function quizSteps() {
  return shuffle([].concat(
    handQuestions(ALL_HANDS, 2).slice(0, 6),
    positionQuestions(ALL_POSITIONS, 1).slice(0, 5),
    syllableQuestions(SIMPLE_SYLLABLES.concat(ZERO_SYLLABLES, MEDIAL_SYLLABLES), 5, 2),
    sentenceQuestions(WORDS.concat(SHORT_SENTENCES, SENTENCES), 2),
  ));
}
