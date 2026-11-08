// Renders the assembly tutorials (hand-assembly.html, arm-assembly.html) as numbered grids
// of short clips. Each page has <div id="assembly-videos-grid" data-section="hand|arm">.
// Clip N of a section lives at assembly-videos/<prefix>NN.mp4 (poster: <prefix>NN.jpg),
// e.g. hand-01.mp4, arm-01.mp4. Numbering restarts in each section.
// To describe a clip, fill in its caption ({ en, zh }). Order = order on the page.
// Optional actions add buttons under the caption: [{ href | image | note, label: { en, zh } }, ...].
//   href  -> link to another page;  image -> opens that image in a pop-up;
//   note  -> opens a pop-up with a short message (use it while an image is under construction).

const ASSEMBLY_VIDEO_DIR = 'assembly-videos/';

const HAND_VIDEOS = [
  { caption: { en: 'Cut the horns shorter with a plier.', zh: '用钳子把摇臂剪短。' } }, // 1
  { caption: { en: 'Run a fishing line through the last two holes on the servo horn.', zh: '取一根钓鱼线或透明 PVC 线，穿过舵机摇臂的最后两个孔。' } }, // 2
  { caption: { en: 'Thread the fishing line through the hole of the finger pulley as shown in the video.', zh: '如视频所示，把钓鱼线穿过手指滑轮上的孔。' } }, // 3
  { caption: { en: 'Tie a knot to connect the servo horn to the finger pulley.', zh: '打个结，把舵机摇臂和手指滑轮连接起来。' } }, // 4
  { caption: { en: 'Insert these four servo motors in the direction shown in the video.', zh: '按视频中的方向装入这四个舵机。' } }, // 5
  { caption: { en: "Insert these two servo motors in the direction shown in the video. They're flipped compared to the first four.", zh: '按视频中的方向装入这两个舵机。它们与前四个方向相反。' } }, // 6
  { caption: { en: 'Connect the servo horn to the index finger the same way as before.', zh: '用同样的方法把舵机摇臂连接到食指上。' } }, // 7
  {
    caption: { en: 'Pause the assembly here and calibrate. Run this code on the servos first to move every motor to the same starting position.', zh: '先在此暂停组装并进行校准。运行这段代码，让所有舵机回到同一个初始位置。' },
    actions: [
      { href: 'calibrate.html', label: { en: 'Get calibration code', zh: '获取校准代码' } },
      { note: { en: 'This image is under construction.', zh: '此图片建设中。' }, label: { en: 'See which pin', zh: '查看接线对应' } },
    ],
  }, // 8
  { caption: { en: 'After calibration is done, attach the servo horns onto the servo motors.', zh: '校准完成后，把舵机摇臂装到舵机上。' } }, // 9
  { caption: { en: 'Connect a long servo horn to the base of the index finger.', zh: '把一个长舵机摇臂连接到食指根部。' } }, // 10
  { caption: { en: 'Next, fasten the servo horns with screws.', zh: '接下来，用螺丝固定舵机摇臂。' } }, // 11
  { caption: { en: 'Screw each servo horn down onto its servo motor.', zh: '把每个舵机摇臂用螺丝拧紧在舵机上。' } }, // 12
  { caption: { en: 'Apply a thin layer of superglue inside this slot.', zh: '在这个槽内涂一层薄薄的强力胶。' } }, // 13
  { caption: { en: 'Press the slot onto the long servo horn.', zh: '把这个槽压到长舵机摇臂上。' } }, // 14
  { caption: { en: 'Screw the index finger pulley down onto the servo motor as well.', zh: '同样用螺丝把食指滑轮固定在舵机上。' } }, // 15
  { caption: { en: 'Your hand is now assembled.', zh: '机械手组装完成。' } }, // 16
  { caption: { en: "Extend each servo motor's cable with 3 jumper wires.", zh: '每个舵机用 3 根杜邦线延长线缆。' } }, // 17
  { caption: { en: 'After extending, connect each servo motor to its pin on the servo driver board, as in step 8.', zh: '延长完成后，按第 8 步的方式，把每个舵机接到舵机驱动板对应的引脚上。' } }, // 18
];

const ARM_VIDEOS = [
  {
    caption: { en: 'Connect the three big servo motors to pins 7 to 9.', zh: '把三个大舵机接到 7 至 9 号引脚上。' },
    actions: [
      { note: { en: 'This image is under construction.', zh: '此图片建设中。' }, label: { en: 'See which pin', zh: '查看接线对应' } },
    ],
  }, // 1
  { caption: { en: 'Put servo 7 into the slot in the arm base.', zh: '把 7 号舵机装入手臂底座的槽中。' } }, // 2
  { caption: { en: 'Assemble servos 8 and 9 with the arm link.', zh: '把 8 号和 9 号舵机与手臂连杆组装在一起。' } }, // 3
  { caption: { en: 'Put everything together as shown in the video. From bottom to top, the servos go 7, 8, 9.', zh: '如视频所示，把所有部件组装在一起。舵机从下到上依次为 7、8、9 号。' } }, // 4
  { caption: { en: 'Attach a bracket to the palm, then attach the bracket to the top of the arm.', zh: '把支架装到手掌上，再把支架连接到手臂顶部。' } }, // 5
  { caption: { en: 'Fasten the servo driver board and Arduino Uno onto the arm base with M3 screws.', zh: '用 M3 螺丝把舵机驱动板和 Arduino Uno 固定到手臂底座上。' } }, // 6
  { caption: { en: 'Use zip ties to organize the wires and fasten them to the arm.', zh: '用扎带整理线材，并固定在手臂上。' } }, // 7
  {
    image: ASSEMBLY_VIDEO_DIR + 'arm-finished.jpg',
    alt: { en: 'The finished CuedKit: the robotic hand on its three-servo arm, wired to the Arduino.', zh: '组装完成的 CuedKit：安装在三舵机机械臂上的机械手，已连接 Arduino。' },
    caption: { en: 'Congrats! Your hand and arm are fully assembled.', zh: '恭喜，手和手臂已全部组装完成！' },
  }, // 8: a photo, not a video
];

// Parts that come in the kit (if printing your own, the Bill of Materials covers these).
const HAND_KIT = [
  { en: '3D-printed hand', zh: '3D 打印的机械手' },
  { en: '3D-printed index finger', zh: '3D 打印的食指' },
  { en: 'MG90S servos, with their horns and screws', zh: 'MG90S 舵机（含摇臂和螺丝）' },
  { en: 'Fishing line', zh: '钓鱼线或透明 PVC 线' },
  { en: 'Jumper wires (pin-to-socket)', zh: '杜邦线（公对母）' },
  { en: 'PCA9685 servo driver board', zh: 'PCA9685 舵机驱动板' },
  { en: 'Arduino Uno', zh: 'Arduino Uno' },
];

// Things people supply themselves.
const HAND_TOOLS = [
  { en: 'Plier', zh: '钳子' },
  { en: 'Scissors', zh: '剪刀' },
  { en: 'Screwdriver', zh: '螺丝刀' },
  { en: 'Superglue', zh: '强力胶' },
];

const ARM_KIT = [
  { en: '3D-printed arm base', zh: '3D 打印的手臂底座' },
  { en: '3D-printed arm link', zh: '3D 打印的手臂连杆' },
  { en: 'RDS3225 servos with U brackets', zh: 'RDS3225 舵机，含 U 型支架' },
  { en: 'Jumper wires (pin-to-socket)', zh: '杜邦线（公对母）' },
  { en: 'M3 screws', zh: 'M3 螺丝' },
  { en: 'Zip ties', zh: '扎带' },
];

const ARM_TOOLS = [
  { en: 'Screwdriver', zh: '螺丝刀' },
  { en: 'Plier', zh: '钳子' },
];

const ASSEMBLY_SECTIONS = {
  hand: { id: 'hand', prefix: 'hand-', videos: HAND_VIDEOS, kit: HAND_KIT, tools: HAND_TOOLS },
  arm: { id: 'arm', prefix: 'arm-', videos: ARM_VIDEOS, kit: ARM_KIT, tools: ARM_TOOLS },
};

const ICON_PLAY = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l11-6.5z"/></svg>';
const ICON_STOP = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6.5" y="6.5" width="11" height="11"/></svg>';

function pick(obj) {
  if (!obj) return '';
  return obj[getLanguage()] || obj.en || '';
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

function stopVideo(video) {
  video.pause();
  video.currentTime = 0;
}

// Caption on the left, optional buttons on the right. Every card gets the same
// text area so a button never makes its row taller than the others.
function buildMeta(item) {
  const meta = el('div', 'video-meta');
  const caption = pick(item.caption);
  meta.appendChild(el('p', 'video-caption', caption));

  if (item.actions && item.actions.length) {
    const row = el('div', 'video-actions');
    item.actions.forEach((action) => {
      const label = pick(action.label);
      if (action.image || action.note) {
        const btn = el('button', 'btn btn-secondary btn-sm', label);
        btn.type = 'button';
        btn.addEventListener('click', () => openImageDialog(action.image || '', label, action.note ? pick(action.note) : ''));
        row.appendChild(btn);
      } else {
        const link = el('a', 'btn btn-secondary btn-sm', label);
        link.href = action.href;
        row.appendChild(link);
      }
    });
    meta.appendChild(row);
  }
  return meta;
}

function renderVideoCard(item, index, section) {
  const n = index + 1;
  const padded = String(n).padStart(2, '0');

  const card = el('article', 'video-card');
  card.id = section.id + '-' + n;

  const frame = el('div', 'video-frame');
  const num = el('span', 'video-num', (getLanguage() === 'zh' ? '步骤 ' : 'Step ') + n);

  if (item.image) {
    frame.classList.add('is-image');
    const img = document.createElement('img');
    img.src = item.image;
    img.alt = pick(item.alt);
    img.loading = 'lazy';
    frame.append(img, num);
    card.append(frame, buildMeta(item));
    return card;
  }

  const video = document.createElement('video');
  video.muted = true;
  video.loop = true;
  video.playsInline = true;
  video.preload = 'none';
  video.poster = ASSEMBLY_VIDEO_DIR + section.prefix + padded + '.jpg';

  const source = document.createElement('source');
  source.src = ASSEMBLY_VIDEO_DIR + section.prefix + padded + '.mp4';
  source.type = 'video/mp4';
  source.addEventListener('error', () => {
    frame.replaceChildren(el('div', 'video-empty', t('assembly.videoSoon')), num);
  });
  video.appendChild(source);

  const play = el('button', 'video-play');
  play.type = 'button';
  play.setAttribute('aria-label', t('assembly.play') + ' ' + n);
  play.innerHTML = '<span class="video-play-icon">' + ICON_PLAY + '</span>';
  play.addEventListener('click', () => video.play().catch(() => {}));

  const stop = el('button', 'video-stop');
  stop.type = 'button';
  stop.setAttribute('aria-label', t('assembly.stop') + ' ' + n);
  stop.innerHTML = ICON_STOP;
  stop.addEventListener('click', () => stopVideo(video));

  video.addEventListener('play', () => {
    document.querySelectorAll('.video-frame video').forEach((other) => {
      if (other !== video && !other.paused) stopVideo(other);
    });
    frame.classList.add('is-playing');
  });
  video.addEventListener('pause', () => frame.classList.remove('is-playing'));

  frame.append(video, play, stop, num);
  card.append(frame, buildMeta(item));
  return card;
}

// One shared pop-up for images. Esc, the close button, or a click outside closes it.
function openImageDialog(src, alt, note) {
  let dialog = document.getElementById('image-dialog');
  if (!dialog) {
    dialog = document.createElement('dialog');
    dialog.id = 'image-dialog';
    dialog.className = 'image-dialog';
    dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.close(); });
    document.body.appendChild(dialog);
  }
  dialog.innerHTML = '';

  const close = el('button', 'image-dialog-close', '×');
  close.type = 'button';
  close.setAttribute('aria-label', t('assembly.close'));
  close.addEventListener('click', () => dialog.close());

  if (!src) {
    dialog.append(close, el('div', 'image-dialog-empty', note || t('assembly.imageSoon')));
    dialog.showModal();
    return;
  }

  const img = document.createElement('img');
  img.alt = alt;
  img.addEventListener('error', () => img.replaceWith(el('div', 'image-dialog-empty', t('assembly.imageSoon'))));
  img.src = src;

  dialog.append(close, img);
  dialog.showModal();
}

function renderList(id, items) {
  const box = document.getElementById(id);
  if (!box) return null;
  box.innerHTML = '';
  const list = el('ul', 'tool-list');
  items.forEach((item) => list.appendChild(el('li', '', pick(item))));
  box.appendChild(list);
  return box;
}

function renderNeeds(section) {
  renderList('assembly-tools', section.tools);
  const kit = renderList('assembly-kit', section.kit);
  if (!kit) return;
  const note = el('p', 'kit-note', t('assembly.diyNote') + ' ');
  const link = el('a', '', t('assembly.diyLink'));
  link.href = 'download.html#parts';
  note.appendChild(link);
  kit.appendChild(note);
}

function renderAssembly() {
  const grid = document.getElementById('assembly-videos-grid');
  if (!grid) return;
  const section = ASSEMBLY_SECTIONS[grid.dataset.section];
  if (!section) return;
  grid.innerHTML = '';
  section.videos.forEach((item, i) => grid.appendChild(renderVideoCard(item, i, section)));
  renderNeeds(section);
}

document.addEventListener('DOMContentLoaded', renderAssembly);
document.addEventListener('languagechange', renderAssembly);
