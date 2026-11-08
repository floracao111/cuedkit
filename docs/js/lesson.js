// The lesson engine (lesson.html). Runs a lesson, a practice round or a quiz, one step at a
// time. The physical hand is the teacher: every demonstration happens on your hand, and
// every answer is checked by what you pick, with the hand following your choices.
//
//   lesson.html?lesson=hand-1     a lesson from curriculum.js
//   lesson.html?practice=hand     10 random questions on one topic
//   lesson.html?quiz=1            20 mixed questions, scored
//
// Step types (from curriculum.js): info, explore, watch, choose, make, build.
// The hand has to be connected: the page asks for it before anything starts.

const params = new URLSearchParams(location.search);

const mainEl = document.getElementById('lesson-main');
const actionBtn = document.getElementById('lesson-action');
const feedbackEl = document.getElementById('lesson-feedback');
const footEl = document.getElementById('lesson-foot');
const barEl = document.getElementById('lesson-bar');
const handChip = document.getElementById('hand-chip');

const GAP_BETWEEN_SYLLABLES_MS = 400;

let session = null;        // { kind, id, title, steps }
let queue = [];            // steps still to do: { step, retry }
let current = null;        // the step on screen
let doneCount = 0;
let asked = 0;             // questions answered for the first time
let firstTryCorrect = 0;
let demoToken = 0;         // changes whenever the screen moves on, to stop old demonstrations
let finished = false;

// ---------- small DOM helpers ----------

function node(tag, className, text) {
  const n = document.createElement(tag);
  if (className) n.className = className;
  if (text !== undefined) n.textContent = text;
  return n;
}

// Chinese on top, English underneath (the same pattern as the other course pages).
function bilingual(text, className, tag) {
  const wrap = node(tag || 'div', className);
  if (text.zh) wrap.appendChild(node('span', 'zh', text.zh));
  if (text.en) wrap.appendChild(node('span', 'en', text.en));
  return wrap;
}

function handIsConnected() {
  return getSerialStatus() === 'connected';
}

// ---------- the hand ----------

// Run hand commands one after another. Resolves false if the hand is not there.
async function runOnHand(lines, options) {
  if (!handIsConnected()) return false;
  const token = demoToken;
  const gap = options && options.gap ? GAP_BETWEEN_SYLLABLES_MS : 350;
  try {
    for (let i = 0; i < lines.length; i++) {
      if (token !== demoToken) return false;       // the screen moved on
      await sendLine(lines[i]);
      if (i < lines.length - 1) await serialSleep(gap);
    }
    return true;
  } catch (error) {
    explainSerialError(error);
    return false;
  }
}

async function runOnHandBusy(lines, options) {
  setRobotBusy(true);
  const ok = await runOnHand(lines, options);
  setRobotBusy(false);
  return ok;
}

function setRobotBusy(on) {
  mainEl.classList.toggle('is-busy', on);
}

// ---------- header: hand status ----------

const CHIP_TEXT = {
  connected: ['机械手已连接', 'Hand connected'],
  connecting: ['正在连接…', 'Connecting…'],
  disconnected: ['未连接', 'Not connected'],
  unsupported: ['需要 Chrome 或 Edge', 'Needs Chrome or Edge'],
};

function renderHandStatus() {
  const status = isSerialSupported() ? getSerialStatus() : 'unsupported';
  const text = CHIP_TEXT[status];
  handChip.dataset.state = status;
  handChip.textContent = '';
  handChip.appendChild(node('span', 'chip-dot'));
  handChip.appendChild(node('span', 'zh', text[0]));
  handChip.appendChild(node('span', 'en', text[1]));
}

// The page needs the hand. Until it is connected, show this instead of the lesson.
function renderGate() {
  mainEl.textContent = '';
  footEl.hidden = true;
  const status = isSerialSupported() ? getSerialStatus() : 'unsupported';

  const box = node('div', 'gate');
  if (status === 'unsupported') {
    box.appendChild(bilingual({ zh: '需要 Chrome 或 Edge', en: 'Chrome or Edge needed' }, 'step-title', 'h1'));
    box.appendChild(bilingual({
      zh: '连接机械手需要电脑上的 Google Chrome 或 Microsoft Edge 浏览器。',
      en: 'Connecting to the hand needs Google Chrome or Microsoft Edge on a computer.',
    }, 'step-body'));
  } else {
    box.appendChild(bilingual({ zh: '先连接你的机械手', en: 'Connect your hand first' }, 'step-title', 'h1'));
    box.appendChild(bilingual({
      zh: '课程里的每一步，都是机械手在做动作。请用 USB 线连接机械手，然后点“连接”。',
      en: 'In every step of the course, your hand does the demonstrating. Plug the hand in with the USB cable, then press Connect.',
    }, 'step-body'));
    const btn = node('button', 'btn btn-lg');
    btn.type = 'button';
    btn.disabled = status === 'connecting';
    btn.appendChild(node('span', 'zh', status === 'connecting' ? '正在连接…' : '连接'));
    btn.appendChild(node('span', 'en', status === 'connecting' ? 'Connecting…' : 'Connect'));
    btn.addEventListener('click', () => connectSerial());
    box.appendChild(btn);
  }
  mainEl.appendChild(box);
}

handChip.addEventListener('click', () => {
  if (getSerialStatus() === 'disconnected') connectSerial();
});

document.addEventListener('serialstatuschange', () => {
  renderHandStatus();
  if (finished || !session) return;
  if (!handIsConnected()) {
    demoToken++;
    renderGate();
  } else if (!current) {
    startSession();           // first connection: begin
  } else {
    footEl.hidden = false;
    renderStep();             // reconnected: show the same step again
  }
});

function updateProgress() {
  const total = doneCount + queue.length + (current ? 1 : 0);
  barEl.style.width = (total ? Math.round((doneCount / total) * 100) : 0) + '%';
}

// ---------- footer: the main button and the feedback ----------

function setAction(mode, enabled) {
  actionBtn.dataset.mode = mode;
  actionBtn.disabled = !enabled;
  const labels = { check: ['检查', 'Check'], next: ['继续', 'Continue'] };
  const label = labels[mode];
  actionBtn.textContent = '';
  actionBtn.appendChild(node('span', 'zh', label[0]));
  actionBtn.appendChild(node('span', 'en', label[1]));
}

function showFeedback(correct, explain) {
  footEl.dataset.result = correct ? 'ok' : 'bad';
  feedbackEl.hidden = false;
  feedbackEl.textContent = '';
  feedbackEl.appendChild(bilingual(correct ? { zh: '答对了！', en: 'Correct!' } : { zh: '再想想', en: 'Not quite' }, 'feedback-title'));
  if (explain) feedbackEl.appendChild(bilingual(explain, 'feedback-text'));
}

function clearFeedback() {
  footEl.dataset.result = '';
  feedbackEl.hidden = true;
  feedbackEl.textContent = '';
}

actionBtn.addEventListener('click', () => {
  if (actionBtn.disabled) return;
  if (actionBtn.dataset.mode === 'check') checkAnswer();
  else advance();
});

document.addEventListener('keydown', (event) => {
  if (event.target.closest && event.target.closest('input, textarea')) return;
  if (event.key === 'Enter' && !actionBtn.disabled && !actionBtn.hidden) {
    event.preventDefault();
    actionBtn.click();
  }
  if (!current || current.answered) return;
  const optionButtons = mainEl.querySelectorAll('.option');
  const n = Number(event.key);
  if (n >= 1 && n <= optionButtons.length) optionButtons[n - 1].click();
});

// ---------- flow ----------

function startSession() {
  if (!session) session = buildSession();
  if (!session) {
    mainEl.textContent = '';
    mainEl.appendChild(bilingual({ zh: '找不到这一课。', en: 'That lesson was not found.' }, 'lesson-missing'));
    const back = node('a', 'btn');
    back.href = 'use.html';
    back.appendChild(node('span', 'zh', '回到课程'));
    mainEl.appendChild(back);
    footEl.hidden = true;
    return;
  }
  setTitle();
  if (!handIsConnected()) return renderGate();

  footEl.hidden = false;
  queue = session.steps.map((step) => ({ step, retry: false }));
  next();
}

function setTitle() {
  if (session) document.title = session.title[siteLanguage()] + ' — Cued Kit';
}
document.addEventListener('languagechange', setTitle);

function buildSession() {
  if (params.get('lesson')) {
    const lesson = findLesson(params.get('lesson'));
    return lesson ? { kind: 'lesson', id: lesson.id, title: lesson.title, steps: lesson.steps() } : null;
  }
  if (params.get('practice')) {
    const topic = PRACTICE_TOPICS[params.get('practice')];
    return topic ? { kind: 'practice', id: params.get('practice'), title: topic.title, steps: practiceSteps(params.get('practice'), 10) } : null;
  }
  if (params.has('quiz')) {
    return { kind: 'quiz', id: 'quiz', title: { zh: '测验', en: 'Quiz' }, steps: quizSteps() };
  }
  return null;
}

function next() {
  demoToken++;
  setRobotBusy(false);
  clearFeedback();
  const item = queue.shift();
  if (!item) {
    current = null;
    updateProgress();
    return finish();
  }
  current = { item, step: item.step, selected: null, answered: false, tried: new Set(), build: { hand: 0, glide: 0, position: 0 } };
  renderStep();
  updateProgress();
  window.scrollTo(0, 0);
}

function advance() {
  doneCount++;
  next();
}

function renderStep() {
  mainEl.textContent = '';
  mainEl.classList.remove('answered');
  const step = current.step;
  const renderers = { info: renderInfo, explore: renderExplore, watch: renderChoice, choose: renderChoice, make: renderMake, build: renderBuild };
  renderers[step.type](step);
  if (current.answered) { /* answered steps are not redrawn after a reconnect */ }
}

// ---------- info ----------

function renderInfo(step) {
  mainEl.appendChild(bilingual(step.title, 'step-title', 'h1'));
  step.body.forEach((paragraph) => mainEl.appendChild(bilingual(paragraph, 'step-body')));

  if (step.demoText) {
    const btn = node('button', 'btn btn-secondary robot-btn');
    btn.type = 'button';
    btn.appendChild(node('span', 'zh', step.demoLabel.zh));
    btn.appendChild(node('span', 'en', step.demoLabel.en));
    btn.addEventListener('click', () => {
      const items = textToSyllables(step.demoText).filter((i) => i.cue.ok);
      runOnHandBusy(items.map((i) => i.pinyin), { gap: true });
    });
    mainEl.appendChild(btn);
  }

  if (step.link) {
    const link = node('a', 'btn btn-secondary');
    link.href = step.link.href;
    link.appendChild(node('span', 'zh', step.link.label.zh));
    link.appendChild(node('span', 'en', step.link.label.en));
    mainEl.appendChild(link);
  }
  setAction('next', true);
}

// ---------- explore ----------

function renderExplore(step) {
  mainEl.appendChild(bilingual(step.title, 'step-title', 'h1'));
  (step.intro || []).forEach((paragraph) => mainEl.appendChild(bilingual(paragraph, 'step-body')));

  const counter = node('div', 'explore-counter');
  mainEl.appendChild(counter);

  const list = node('div', 'explore-list');
  mainEl.appendChild(list);

  function updateCounter() {
    counter.textContent = '';
    counter.appendChild(node('span', 'zh', '已试 ' + current.tried.size + ' / ' + step.rows.length));
    counter.appendChild(node('span', 'en', 'Tried ' + current.tried.size + ' of ' + step.rows.length));
    setAction('next', current.tried.size >= step.rows.length);
  }

  step.rows.forEach((row, rowIndex) => {
    const rowEl = node('div', 'explore-row' + (current.tried.has(rowIndex) ? ' tried' : ''));
    rowEl.appendChild(bilingual(row.label, 'explore-label'));

    const buttons = node('div', 'explore-buttons');
    row.buttons.forEach((button) => {
      const btn = node('button', 'chip-btn robot-btn', button.text);
      btn.type = 'button';
      if (button.title) btn.title = button.title[siteLanguage()];
      btn.addEventListener('click', async () => {
        list.querySelectorAll('.chip-btn.on').forEach((b) => b.classList.remove('on'));
        btn.classList.add('on');
        rowEl.classList.add('tried');
        current.tried.add(rowIndex);
        updateCounter();
        await runOnHandBusy([button.line]);
      });
      buttons.appendChild(btn);
    });
    rowEl.appendChild(buttons);
    list.appendChild(rowEl);
  });
  updateCounter();
}

// ---------- watch and choose ----------

function optionContent(option) {
  const box = node('span', 'option-content');
  if (option.sentence) {
    box.appendChild(node('span', 'option-sentence', option.sentence));
    box.appendChild(node('span', 'option-pinyin', textToSyllables(option.sentence).map((i) => showPinyin(i.pinyin)).join(' ')));
  } else {
    box.appendChild(node('span', 'option-text', option.text));
    if (option.sub) box.appendChild(node('span', 'option-pinyin', option.sub));
  }
  return box;
}

function renderChoice(step) {
  const layout = node('div', 'q-layout');
  const left = node('div', 'q-left');
  const right = node('div', 'q-right');
  layout.appendChild(left);
  layout.appendChild(right);
  mainEl.appendChild(layout);

  left.appendChild(bilingual(step.prompt, 'step-title', 'h1'));
  if (step.type === 'watch') left.appendChild(buildWatchArea(step));

  const grid = node('div', 'options' + (step.options.some((o) => o.sentence) ? ' options-wide' : ''));
  step.options.forEach((option, index) => {
    const btn = node('button', 'option');
    btn.type = 'button';
    btn.appendChild(optionContent(option));
    btn.addEventListener('click', () => {
      if (current.answered) return;
      current.selected = index;
      grid.querySelectorAll('.option').forEach((b) => b.classList.remove('selected'));
      btn.classList.add('selected');
      setAction('check', true);
    });
    grid.appendChild(btn);
  });
  right.appendChild(grid);
  setAction('check', false);

  // restore the choice if the step is redrawn
  if (current.selected !== null) {
    grid.querySelectorAll('.option')[current.selected].classList.add('selected');
    setAction('check', true);
  }
}

// "Watch your hand": the hand performs the question, with a Replay button.
function buildWatchArea(step) {
  const area = node('div', 'watch-area');
  const card = node('div', 'robot-card');
  card.appendChild(bilingual({ zh: '请看你的机械手', en: 'Watch your hand' }, 'robot-card-title'));
  const replay = node('button', 'btn btn-secondary btn-sm robot-btn');
  replay.type = 'button';
  replay.appendChild(node('span', 'zh', '再看一遍'));
  replay.appendChild(node('span', 'en', 'Replay'));
  replay.addEventListener('click', () => runOnHandBusy(step.demo.lines, { gap: step.demo.gap }));
  card.appendChild(replay);
  area.appendChild(card);
  runOnHandBusy(step.demo.lines, { gap: step.demo.gap });
  return area;
}

// ---------- make (press a handshape or a position and the hand follows) ----------

// A row of numbered buttons. kind 'hand' = handshapes 1-8, 'pos' = positions 1-5.
function numberPicker(kind, onPick, selected) {
  const count = kind === 'hand' ? 8 : 5;
  const row = node('div', 'num-row');
  for (let n = 1; n <= count; n++) {
    const btn = node('button', 'num-btn robot-btn' + (selected === n ? ' selected' : ''));
    btn.type = 'button';
    btn.appendChild(node('span', 'num-label', kind === 'hand' ? '手型' : '位置'));
    btn.appendChild(node('span', 'num-value', String(n)));
    btn.addEventListener('click', () => {
      row.querySelectorAll('.num-btn').forEach((b) => b.classList.remove('selected'));
      btn.classList.add('selected');
      onPick(n);
    });
    row.appendChild(btn);
  }
  return row;
}

function renderMake(step) {
  const layout = node('div', 'q-layout');
  const left = node('div', 'q-left');
  const right = node('div', 'q-right');
  layout.appendChild(left);
  layout.appendChild(right);
  mainEl.appendChild(layout);

  left.appendChild(bilingual(step.prompt, 'step-title', 'h1'));
  if (step.hint) left.appendChild(bilingual(step.hint, 'step-hint'));

  const pick = (value) => {
    if (current.answered) return;
    current.selected = value;
    setAction('check', true);
    runOnHandBusy([step.kind === 'hand' ? String(value) : 'a' + value]);
  };
  right.appendChild(numberPicker(step.kind, pick, current.selected));
  setAction('check', current.selected !== null);
}

// ---------- build (a whole syllable: handshape, medial handshape, position) ----------

function renderBuild(step) {
  const layout = node('div', 'q-layout');
  const left = node('div', 'q-left');
  const right = node('div', 'q-right');
  layout.appendChild(left);
  layout.appendChild(right);
  mainEl.appendChild(layout);

  left.appendChild(bilingual(step.prompt, 'step-title', 'h1'));
  left.appendChild(bilingual(step.hint, 'step-hint'));

  const state = current.build;
  const updateAction = () => {
    const ready = state.hand && state.position && (!step.cue.glideHand || state.glide);
    setAction('check', Boolean(ready));
  };

  const addSection = (title, control) => {
    const section = node('div', 'build-section');
    section.appendChild(bilingual(title, 'build-label'));
    section.appendChild(control);
    right.appendChild(section);
  };

  // choosing only selects; "Try it on the hand" performs the whole cue
  addSection({ zh: step.cue.glideHand ? '声母的手型' : '手型', en: step.cue.glideHand ? 'Handshape of the initial' : 'Handshape' },
    numberPicker('hand', (n) => { if (!current.answered) { state.hand = n; updateAction(); } }, state.hand));
  if (step.cue.glideHand) {
    addSection({ zh: '介音的手型', en: 'Handshape of the medial' },
      numberPicker('hand', (n) => { if (!current.answered) { state.glide = n; updateAction(); } }, state.glide));
  }
  addSection({ zh: '位置', en: 'Position' },
    numberPicker('pos', (n) => { if (!current.answered) { state.position = n; updateAction(); } }, state.position));

  const tryBtn = node('button', 'btn btn-secondary robot-btn build-try');
  tryBtn.type = 'button';
  tryBtn.appendChild(node('span', 'zh', '让机械手试一试'));
  tryBtn.appendChild(node('span', 'en', 'Try it on the hand'));
  tryBtn.addEventListener('click', () => {
    if (!state.hand || !state.position) {
      showNotice('先选好手型和位置。', 'Choose a handshape and a position first.');
      return;
    }
    const lines = [String(state.hand), 'a' + state.position];
    if (step.cue.glideHand && state.glide) lines.push(String(state.glide));
    runOnHandBusy(lines);
  });
  left.appendChild(tryBtn);
  updateAction();
}

// ---------- checking ----------

function checkAnswer() {
  const step = current.step;
  let correct = false;

  if (step.type === 'watch' || step.type === 'choose') {
    const buttons = mainEl.querySelectorAll('.option');
    correct = Boolean(step.options[current.selected].correct);
    buttons.forEach((btn, i) => {
      btn.disabled = true;
      if (step.options[i].correct) btn.classList.add('correct');
      else if (i === current.selected) btn.classList.add('wrong');
    });
  } else if (step.type === 'make') {
    correct = current.selected === step.answer;
  } else if (step.type === 'build') {
    const s = current.build;
    correct = s.hand === step.cue.hand && (s.glide || 0) === step.cue.glideHand && s.position === step.cue.position;
  }

  current.answered = true;
  mainEl.classList.add('answered');
  if (!current.item.retry) {
    asked++;
    if (correct) firstTryCorrect++;
  }

  showFeedback(correct, step.explain);
  setAction('next', true);

  // Show the right answer on the hand (a 'watch' question already showed it).
  if (!correct || step.type === 'choose' || step.type === 'build') {
    const reveal = step.reveal || (step.type === 'make' ? { lines: [step.kind === 'hand' ? String(step.answer) : 'a' + step.answer] } : null);
    if (reveal) runOnHandBusy(reveal.lines);
  }

  // A missed question comes back once at the end of a lesson or practice round.
  if (!correct && !current.item.retry && session.kind !== 'quiz') {
    queue.push({ step, retry: true });
  }
}

// ---------- the end ----------

function finish() {
  finished = true;
  const result = recordSession(session.kind, session.id, firstTryCorrect, asked);
  const percent = Math.round(result.accuracy * 100);

  mainEl.textContent = '';
  mainEl.classList.add('finished');
  footEl.hidden = true;
  barEl.style.width = '100%';

  const title = session.kind === 'quiz'
    ? (percent >= 90 ? { zh: '太棒了！', en: 'Excellent!' } : percent >= 70 ? { zh: '不错！', en: 'Well done!' } : { zh: '继续练习', en: 'Keep practising' })
    : { zh: '完成了！', en: 'Done!' };
  mainEl.appendChild(bilingual(title, 'step-title finish-title', 'h1'));

  const stats = node('div', 'finish-stats');
  const stat = (zh, en, value) => {
    const box = node('div', 'finish-stat');
    box.appendChild(node('div', 'finish-value', value));
    box.appendChild(bilingual({ zh, en }, 'finish-label'));
    stats.appendChild(box);
  };
  stat('正确率', 'Accuracy', asked ? percent + '%' : '—');
  mainEl.appendChild(stats);

  const buttons = node('div', 'finish-buttons');
  const addLink = (href, label, primary) => {
    const link = node('a', 'btn' + (primary ? '' : ' btn-secondary'));
    link.href = href;
    link.appendChild(node('span', 'zh', label.zh));
    link.appendChild(node('span', 'en', label.en));
    buttons.appendChild(link);
  };

  if (session.kind === 'lesson') {
    const index = LESSONS.findIndex((l) => l.id === session.id);
    const following = LESSONS[index + 1];
    if (following) addLink('lesson.html?lesson=' + following.id, { zh: '下一课：' + following.title.zh, en: 'Next: ' + following.title.en }, true);
    addLink('lesson.html?lesson=' + session.id, { zh: '再练一次', en: 'Practise again' }, !following);
  } else {
    addLink(location.pathname + location.search, { zh: '再来一轮', en: 'Go again' }, true);
  }
  addLink('use.html', { zh: '回到课程', en: 'Back to the course' }, false);
  mainEl.appendChild(buttons);
}

// ---------- go ----------

renderHandStatus();
startSession();
