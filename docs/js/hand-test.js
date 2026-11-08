// connect.html: buttons to try every handshape and arm position on the connected hand.
// Shown once the hand is connected (see connect.js); needs serial.js and hand-ui.js.

const HT_TEXT = {
  title: { zh: '测试你的手', en: 'Test your hand' },
  handshapes: { zh: '手型', en: 'Handshapes' },
  positions: { zh: '位置', en: 'Positions' },
  others: { zh: '其他', en: 'Others' },
  open: { zh: '全开', en: 'Open' },
  close: { zh: '全合', en: 'Close' },
  rest: { zh: '手臂回位', en: 'Arm rest' },
};

function htNode(tag, className, text) {
  const n = document.createElement(tag);
  if (className) n.className = className;
  if (text !== undefined) n.textContent = text;
  return n;
}

function htBilingual(label, tag) {
  const wrap = htNode(tag || 'div', 'cal-bi');
  wrap.appendChild(htNode('span', 'zh', label.zh));
  wrap.appendChild(htNode('span', 'en', label.en));
  return wrap;
}

async function htPress(root, button, line) {
  if (getSerialStatus() !== 'connected') {
    showNotice('请先连接机械手。', 'Connect your hand first.');
    return;
  }
  button.classList.add('playing');
  root.classList.add('is-busy');
  try {
    await sendLine(line);
  } catch (error) {
    explainSerialError(error);
  }
  root.classList.remove('is-busy');
  button.classList.remove('playing');
}

function htGroup(root, label, palette, buttons) {
  const group = htNode('div', 'group pal-' + palette);
  group.appendChild(htBilingual(label)).classList.add('group-title-bi');
  const row = htNode('div', 'letter-row');
  buttons.forEach((b) => {
    const btn = htNode('button', 'letter-btn' + (b.wide ? ' letter-wide' : ''));
    btn.type = 'button';
    if (b.label) {
      btn.appendChild(htNode('span', 'zh', b.label.zh));
      btn.appendChild(htNode('span', 'en', b.label.en));
    } else {
      btn.textContent = b.text;
    }
    btn.addEventListener('click', () => htPress(root, btn, b.line));
    row.appendChild(btn);
  });
  group.appendChild(row);
  return group;
}

function renderHandTest(root) {
  root.textContent = '';

  const h = htNode('h2', 'alpha-heading');
  h.appendChild(htNode('span', 'zh', HT_TEXT.title.zh));
  h.appendChild(htNode('span', 'en', HT_TEXT.title.en));
  root.appendChild(h);

  const grid = htNode('div', 'test-grid');
  grid.appendChild(htGroup(root, HT_TEXT.handshapes, 1, [1, 2, 3, 4, 5, 6, 7, 8].map((n) => ({ text: String(n), line: String(n) }))));
  grid.appendChild(htGroup(root, HT_TEXT.positions, 2, [1, 2, 3, 4, 5].map((n) => ({ text: String(n), line: 'a' + n }))));
  grid.appendChild(htGroup(root, HT_TEXT.others, 3, [
    { label: HT_TEXT.open, line: 'open', wide: true },
    { label: HT_TEXT.close, line: 'close', wide: true },
    { label: HT_TEXT.rest, line: 'rest', wide: true },
  ]));
  root.appendChild(grid);
}
