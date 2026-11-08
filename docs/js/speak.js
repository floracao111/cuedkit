// speak.html: type Chinese or pinyin, see each syllable's cue, and have the hand perform it.
//
// encoder.js works out the cues (so the page can preview them without a hand connected).
// The syllables are then sent one at a time as pinyin; the hand answers each with DONE.

const SPEAK_SYLLABLE_GAP_MS = 400;   // pause between syllables

const speakInput = document.getElementById('speak-input');
const speakBtn = document.getElementById('speak-btn');
const stopBtn = document.getElementById('stop-btn');
const speakStatus = document.getElementById('speak-status');
const speakChips = document.getElementById('speak-chips');

let speakItems = [];          // syllables for the current text
let speaking = false;
let stopRequested = false;
let composing = false;        // true while an input method (IME) is mid-word
let progressText = null;      // [zh, en] while speaking

function makeSpan(cls, text, inline) {
  const span = document.createElement('span');
  span.className = cls;
  span.textContent = text;
  if (inline) span.style.display = 'inline';
  return span;
}

function cueHtml(cue) {
  const hands = cue.glideHand ? cue.hand + '→' + cue.glideHand : String(cue.hand);
  return '<span class="zh">手型 ' + hands + ' · 位置 ' + cue.position + '</span>' +
    '<span class="en">Handshape ' + hands + ' · Position ' + cue.position + '</span>';
}

function renderChips() {
  speakChips.textContent = '';

  if (speakItems.length === 0) {
    const hint = document.createElement('p');
    hint.className = 'speak-empty';
    hint.appendChild(makeSpan('zh', '输入文字后，这里会显示每个音节的手型和位置。', true));
    hint.appendChild(makeSpan('en', 'Type something to see each syllable’s handshape and position here.'));
    speakChips.appendChild(hint);
    return;
  }

  speakItems.forEach((item) => {
    const chip = document.createElement('div');
    chip.className = 'chip' + (item.cue.ok ? '' : ' chip-skip');

    const charEl = document.createElement('div');
    charEl.className = 'chip-char';
    charEl.textContent = item.char || item.pinyin;
    chip.appendChild(charEl);

    const pinyinEl = document.createElement('div');
    pinyinEl.className = 'chip-pinyin';
    pinyinEl.textContent = item.char ? item.pinyin : '';
    chip.appendChild(pinyinEl);

    const cueEl = document.createElement('div');
    cueEl.className = 'chip-cue';
    cueEl.innerHTML = item.cue.ok ? cueHtml(item.cue) : '<span class="zh">无法编码</span><span class="en">Can’t cue</span>';
    chip.appendChild(cueEl);

    item.el = chip;
    speakChips.appendChild(chip);
  });
}

function refreshItems() {
  speakItems = textToSyllables(speakInput.value);
  renderChips();
  renderSpeakStatus();
}

function renderSpeakStatus() {
  speakStatus.textContent = '';

  if (progressText) {
    speakStatus.appendChild(makeSpan('zh', progressText[0], true));
    speakStatus.appendChild(makeSpan('en', progressText[1]));
    return;
  }

  const status = getSerialStatus();
  if (status === 'connected') {
    speakStatus.appendChild(makeSpan('zh', '机械手已连接。', true));
    speakStatus.appendChild(makeSpan('en', 'The hand is connected.'));
  } else if (status === 'connecting') {
    speakStatus.appendChild(makeSpan('zh', '正在连接机械手…', true));
    speakStatus.appendChild(makeSpan('en', 'Connecting to the hand…'));
  } else {
    const link = document.createElement('a');
    link.href = 'connect.html';
    link.appendChild(makeSpan('zh', '机械手未连接，请先连接。', true));
    link.appendChild(makeSpan('en', 'The hand is not connected. Connect it first.'));
    speakStatus.appendChild(link);
  }
}

function setSpeaking(on) {
  speaking = on;
  speakInput.disabled = on;
  speakBtn.disabled = on;
  stopBtn.disabled = !on;
}

async function speak() {
  if (speaking) return;

  const queue = speakItems.filter((item) => item.cue.ok);
  if (queue.length === 0) {
    showNotice('还没有可以打的音节，请输入中文或拼音。', 'Nothing to cue yet. Type Chinese or pinyin.');
    return;
  }
  if (getSerialStatus() === 'disconnected') {
    showNotice('请先连接机械手。', 'Connect your hand first.');
    return;
  }

  speakItems.forEach((item) => item.el && item.el.classList.remove('chip-active', 'chip-done'));
  stopRequested = false;
  setSpeaking(true);

  try {
    for (let i = 0; i < queue.length; i++) {
      if (stopRequested) break;

      const item = queue[i];
      item.el.classList.add('chip-active');
      progressText = ['正在打 ' + (i + 1) + ' / ' + queue.length, 'Cueing ' + (i + 1) + ' of ' + queue.length];
      renderSpeakStatus();

      await sendLine(item.pinyin);
      item.el.classList.remove('chip-active');
      item.el.classList.add('chip-done');

      if (i < queue.length - 1 && !stopRequested) await serialSleep(SPEAK_SYLLABLE_GAP_MS);
    }
  } catch (error) {
    explainSerialError(error);
  } finally {
    speakItems.forEach((item) => item.el && item.el.classList.remove('chip-active'));
    progressText = null;
    setSpeaking(false);
    renderSpeakStatus();
    speakInput.focus();
  }
}

speakBtn.addEventListener('click', speak);

// The syllable that is already moving always finishes; Stop prevents the next one.
stopBtn.addEventListener('click', () => {
  stopRequested = true;
  progressText = ['正在停止…', 'Stopping…'];
  renderSpeakStatus();
});

speakInput.addEventListener('input', () => { if (!composing) refreshItems(); });
speakInput.addEventListener('compositionstart', () => { composing = true; });
speakInput.addEventListener('compositionend', () => { composing = false; refreshItems(); });
speakInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && !event.isComposing) speak();
});

document.addEventListener('serialstatuschange', renderSpeakStatus);
refreshItems();
