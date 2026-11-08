// alphabet.html: a page of letter buttons. One button is one letter; tapping it makes the
// hand show that consonant's handshape or that vowel's position.
//
// Hand commands (see cuedkit-speech.ino): "3" = handshape 3, "a2" = arm to position 2.

const alphaRoot = document.getElementById('alpha');
const alphaStatus = document.getElementById('alpha-status');

function aNode(tag, className, text) {
  const n = document.createElement(tag);
  if (className) n.className = className;
  if (text !== undefined) n.textContent = text;
  return n;
}

function aBilingual(text, className) {
  const wrap = aNode('div', className);
  wrap.appendChild(aNode('span', 'zh', text.zh));
  if (text.en) wrap.appendChild(aNode('span', 'en', text.en));
  return wrap;
}

function renderAlphaStatus() {
  alphaStatus.textContent = '';
  alphaStatus.dataset.state = getSerialStatus();
  const status = getSerialStatus();

  if (status === 'connected') {
    alphaStatus.appendChild(aNode('span', 'zh', '机械手已连接，点一个字母试试！'));
    alphaStatus.appendChild(aNode('span', 'en', 'Your hand is connected. Tap a letter!'));
  } else if (status === 'connecting') {
    alphaStatus.appendChild(aNode('span', 'zh', '正在连接机械手…'));
    alphaStatus.appendChild(aNode('span', 'en', 'Connecting to your hand…'));
  } else {
    const link = aNode('a');
    link.href = 'connect.html';
    link.appendChild(aNode('span', 'zh', '先连接你的机械手，点这里。'));
    link.appendChild(aNode('span', 'en', 'Connect your hand first. Tap here.'));
    alphaStatus.appendChild(link);
  }
}

async function pressLetter(button, line, facePosition) {
  if (getSerialStatus() !== 'connected') {
    showNotice('请先连接机械手。', 'Connect your hand first.');
    return;
  }
  alphaRoot.querySelectorAll('.letter-btn.playing').forEach((b) => b.classList.remove('playing'));
  button.classList.add('playing');
  if (facePosition) highlightFaceSpot(facePosition);
  alphaRoot.classList.add('is-busy');
  try {
    await sendLine(line);
  } catch (error) {
    explainSerialError(error);
  }
  alphaRoot.classList.remove('is-busy');
  button.classList.remove('playing');
  highlightFaceSpot(null);
}

function buildGroup(number, title, desc, letters, line, facePosition) {
  const group = aNode('div', 'group pal-' + (((number - 1) % 8) + 1));

  const head = aNode('div', 'group-head');
  head.appendChild(aNode('span', 'group-num', String(number)));
  head.appendChild(aBilingual(title, 'group-title'));
  group.appendChild(head);
  if (desc) group.appendChild(aBilingual(desc, 'group-desc'));

  const row = aNode('div', 'letter-row');
  letters.forEach((letter) => {
    const btn = aNode('button', 'letter-btn', letter);
    btn.type = 'button';
    btn.addEventListener('click', () => pressLetter(btn, line, facePosition));
    row.appendChild(btn);
  });
  group.appendChild(row);
  if (facePosition) {
    group.addEventListener('mouseenter', () => highlightFaceSpot(facePosition));
    group.addEventListener('mouseleave', () => highlightFaceSpot(null));
  }
  return group;
}

function buildAlphabet() {
  const hands = document.getElementById('alpha-hands');
  Object.keys(HAND_INFO).forEach((key) => {
    const n = Number(key);
    const info = HAND_INFO[n];
    const letters = info.initials.slice();
    if (info.zero) letters.push('∅');
    hands.appendChild(buildGroup(n, { zh: '手型 ' + n, en: 'Handshape ' + n }, null, letters, String(n)));
  });

  const positions = document.getElementById('alpha-positions');
  Object.keys(POSITION_INFO).forEach((key) => {
    const n = Number(key);
    const info = POSITION_INFO[n];
    positions.appendChild(buildGroup(n,
      { zh: '位置 ' + n + '：' + info.place.zh, en: 'Position ' + n + ': ' + info.place.en },
      null, info.finals.map(showPinyin), 'a' + n, n));
  });

  // the printed face the arm points at, with the five spots numbered
  document.getElementById('alpha-face').appendChild(buildFaceFigure({ numbers: true }));
}

buildAlphabet();
renderAlphaStatus();
document.addEventListener('serialstatuschange', renderAlphaStatus);
