// Wires every [data-demo] button on the learning pages to the hand.
//
// A demo id turns into one or more lines for the hand (see cuedkit-speech.ino):
//   handshape-N   "N"        show handshape N
//   position-N    "aN"       move the arm to position N
//   medial-y/w/yu "8" "6" "4"  the handshape the medial borrows
//   combo-<pinyin>  "<pinyin>"  perform the whole syllable, e.g. combo-xiao -> "xiao"
//   wave          "1".."8"   step through all 8 handshapes, then open the hand

const DEMO_STEP_PAUSE_MS = 700;   // pause between steps of a multi-step demo

const MEDIAL_HANDSHAPE = { y: 8, w: 6, yu: 4 };

function demoLines(id) {
  let match;
  if ((match = /^handshape-([1-8])$/.exec(id))) return [match[1]];
  if ((match = /^position-([1-5])$/.exec(id))) return ['a' + match[1]];
  if ((match = /^medial-(y|w|yu)$/.exec(id))) return [String(MEDIAL_HANDSHAPE[match[1]])];
  if ((match = /^combo-([a-z]+)$/.exec(id))) return [match[1]];
  if (id === 'wave') return ['1', '2', '3', '4', '5', '6', '7', '8', 'open'];
  return null;
}

let demoRunning = false;

function setDemoButtonsDisabled(disabled) {
  document.querySelectorAll('[data-demo]').forEach((btn) => { btn.disabled = disabled; });
}

async function runDemo(id) {
  const lines = demoLines(id);
  if (!lines) {
    showNotice('这个演示还没有准备好。', 'This demo is not ready yet.');
    return;
  }
  if (demoRunning) return;

  demoRunning = true;
  setDemoButtonsDisabled(true);
  try {
    for (let i = 0; i < lines.length; i++) {
      await sendLine(lines[i]);
      if (i < lines.length - 1) await serialSleep(DEMO_STEP_PAUSE_MS);
    }
  } catch (error) {
    explainSerialError(error);
  } finally {
    demoRunning = false;
    setDemoButtonsDisabled(false);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('[data-demo]').forEach((btn) => {
    btn.addEventListener('click', () => runDemo(btn.getAttribute('data-demo')));
  });
});
