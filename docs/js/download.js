// download.html ("Get your kit"): the parts list, the printable face reference, the Arduino code and credits.
// Built once. Every piece of text is a zh/en pair, so switching language needs no rebuild.
// The 3D model cards and previews were archived (see CuedKit/archive/website-3d-downloads/README.txt):
// the printed hand ships in the kit, so the site no longer shares model files.

const BOM = [
  { group: { en: 'Hand', zh: '手' }, items: [
    { en: '3D-printed hand', zh: '3D 打印的机械手', qty: '1' },
    { en: '3D-printed index finger', zh: '3D 打印的食指', qty: '1' },
    { en: 'MG90S servos', zh: 'MG90S 舵机', qty: '6', image: 'image/parts/mg90s.png' },
    { en: 'Jumper wires, pin-to-socket', zh: '杜邦线，公对母', qty: '18' },
    { en: 'Fishing line', zh: '鱼线', qty: '' },
  ] },
  { group: { en: 'Arm', zh: '手臂' }, items: [
    { en: '3D-printed arm base', zh: '3D 打印的手臂底座', qty: '1' },
    { en: '3D-printed arm link', zh: '3D 打印的手臂连杆', qty: '1' },
    { en: 'RDS3225 servos with U brackets', zh: 'RDS3225 舵机，含 U 型支架', qty: '3', image: 'image/parts/rds3225.png' },
    { en: 'M3 screws', zh: 'M3 螺丝', qtyLabel: { en: 'a bunch', zh: '一大把' } },
    { en: 'Zip ties', zh: '扎带', qty: '2' },
  ] },
  { group: { en: 'Electronics', zh: '电子元件' }, items: [
    { en: 'PCA9685 servo driver board', zh: 'PCA9685 舵机驱动板', qty: '1' },
    { en: 'Arduino Uno', zh: 'Arduino Uno', qty: '1' },
    { en: '5V power supply for the servo driver board', zh: '舵机驱动板用的 5V 电源', qty: '1' },
  ] },
];

function dlNode(tag, className, text) {
  const n = document.createElement(tag);
  if (className) n.className = className;
  if (text !== undefined) n.textContent = text;
  return n;
}

// <span class="zh">..</span><span class="en">..</span> inside a new element
function dlPair(tag, className, label) {
  const n = dlNode(tag, className);
  n.appendChild(dlNode('span', 'zh', label.zh));
  n.appendChild(dlNode('span', 'en', label.en));
  return n;
}

function dlHeading(label) {
  return dlPair('h2', 'alpha-heading', label);
}

function renderDownload() {
  const root = document.getElementById('download-root');
  root.textContent = '';

  // the face sheet is the fourth box of the kit, next to hand, arm and electronics
  const faceBox = dlNode('div', 'bom-group face-group pal-4');
  faceBox.appendChild(dlPair('div', 'bom-title', { en: 'Face sheet', zh: '脸部图' }));

  // the preview: click it to see the sheet large
  const viewer = dlNode('button', 'face-viewer');
  viewer.type = 'button';
  viewer.setAttribute('aria-label', 'Preview');
  viewer.appendChild(buildFaceFigure({ numbers: false }));
  viewer.addEventListener('click', openFaceDialog);
  faceBox.appendChild(viewer);
  // no download button here: the sheet comes in the kit. The large preview (opened by clicking
  // the picture) still has the PDF and image downloads for anyone who wants to print their own.

  const bom = dlNode('section');
  bom.id = 'parts';
  bom.appendChild(dlHeading({ en: 'What is in the kit', zh: '套件包含' }));
  const bomGrid = dlNode('div', 'bom-grid');
  BOM.forEach((group, i) => {
    const box = dlNode('div', 'bom-group pal-' + (i + 1));
    box.appendChild(dlPair('div', 'bom-title', group.group));
    const ul = dlNode('ul', 'bom-list');
    group.items.forEach((item) => {
      const li = dlNode('li');
      if (item.image) li.className = 'has-image';
      li.appendChild(dlPair('span', 'bom-item', item));
      if (item.qty) li.appendChild(dlNode('span', 'bom-qty', '×' + item.qty));
      else if (item.qtyLabel) li.appendChild(dlPair('span', 'bom-qty', item.qtyLabel));
      if (item.image) {
        // the picture goes on its own line, under the text
        const picture = dlNode('div', 'bom-image');
        const img = dlNode('img', 'bom-thumb');
        img.src = item.image;
        img.alt = item.en;
        img.loading = 'lazy';
        picture.appendChild(img);
        li.appendChild(picture);
      }
      ul.appendChild(li);
    });
    box.appendChild(ul);
    bomGrid.appendChild(box);
  });
  bomGrid.appendChild(faceBox);
  bom.appendChild(bomGrid);
  root.appendChild(bom);

  // the Arduino code (our own, open source)
  const code = dlNode('p', 'credit-line');
  code.appendChild(dlPair('span', '', { en: 'Arduino code (open source): ', zh: 'Arduino 程序（开源）：' }));
  const codeLink = dlPair('a', '', { en: 'Download .zip', zh: '下载 .zip' });
  codeLink.href = 'downloads/firmware/cuedkit-firmware.zip';
  codeLink.setAttribute('download', '');
  code.appendChild(codeLink);

  // the notes under the parts sit together in one block, so they stay close to each other
  const notes = dlNode('div', 'credit-block');
  notes.appendChild(code);

  // what comes next: same text as the About page, "finger mechanics" highlighted
  const next = dlNode('p', 'credit-line');
  const nextZh = dlNode('span', 'zh');
  const nextEn = dlNode('span', 'en');
  setRichText(nextZh, window.I18N_ZH['about.nextText']);
  setRichText(nextEn, window.I18N_EN['about.nextText']);
  next.appendChild(nextZh);
  next.appendChild(nextEn);
  notes.appendChild(next);

  // attribution the finger's license asks for, right under it
  const credit = dlNode('p', 'credit-line');
  credit.appendChild(dlPair('span', '', {
    en: 'The finger mechanism is adapted from Overengineered Mechanical Hand V2, a licensed design by TLPOD: ',
    zh: '手指机构改编自 TLPOD 的 Overengineered Mechanical Hand V2（已获授权的设计）：',
  }));
  const creditLink = dlPair('a', '', { en: 'TLPOD on MakerWorld', zh: 'TLPOD 的 MakerWorld 主页' });
  creditLink.href = 'https://makerworld.com/@user_940602127';
  creditLink.target = '_blank';
  creditLink.rel = 'noopener';
  credit.appendChild(creditLink);
  notes.appendChild(credit);
  root.appendChild(notes);
}

// the script sits at the end of the page, so the container already exists
renderDownload();
if (location.hash === '#parts') document.getElementById('parts').scrollIntoView();
