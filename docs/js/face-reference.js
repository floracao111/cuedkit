// The face reference: the printed A4 sheet the arm points at, drawn on the page.
// One picture (image/face-reference.webp) plus the five red swirls on top. The swirl
// positions are in millimetres on the A4 sheet, the same numbers as the printable PDF
// (downloads/printables/cuedkit-face-reference-A4.pdf), so the page and the print agree.
//
//   buildFaceFigure({ numbers: true })  -> a <div class="face-figure">; numbers: true adds
//   a small 1-5 badge next to each swirl (used on the alphabet page, not on the print).
//   highlightFaceSpot(n) / highlightFaceSpot(null) pulses the swirl of position n.

const FACE_SPOTS = [
  { n: 1, x: 47.0, y: 109.9, badge: [10.5, 8.5] },    // under the corner of the eye
  { n: 2, x: 16.5, y: 162.6, badge: [10.5, 8.5] },    // out to the side of the face
  { n: 3, x: 66.0, y: 169.3, badge: [-10.5, 9] },     // corner of the mouth
  { n: 4, x: 105.0, y: 199.0, badge: [12, 0] },       // chin
  { n: 5, x: 105.8, y: 263.0, badge: [12, 0] },       // throat
];
const FACE_BADGE_COLOURS = ['#9BD67F', '#8BC5EE', '#F8B26A', '#C3AEEB', '#F5A3AE'];
const FACE_SWIRL = '#E8505B';
const FACE_FILES = { pdf: 'downloads/printables/cuedkit-face-reference-A4.pdf', png: 'downloads/printables/cuedkit-face-reference-A4.png' };
const FACE_SVG_NS = 'http://www.w3.org/2000/svg';

// a round spiral, 2.6 turns, radius 36 (the swirl is drawn at that size, then scaled to 20 mm)
function faceSwirlPath() {
  const steps = 200;
  let d = '';
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const a = -1.2 + t * 2.6 * 2 * Math.PI;
    const r = 36 * t;
    d += (i ? 'L' : 'M') + (r * Math.cos(a)).toFixed(2) + ',' + (r * Math.sin(a)).toFixed(2);
  }
  return d;
}

function faceSvg(tag, attrs) {
  const el = document.createElementNS(FACE_SVG_NS, tag);
  Object.keys(attrs || {}).forEach((k) => el.setAttribute(k, attrs[k]));
  return el;
}

function buildFaceFigure(options) {
  const withNumbers = Boolean(options && options.numbers);
  const figure = document.createElement('div');
  figure.className = 'face-figure';

  const img = document.createElement('img');
  img.src = 'image/face-reference.webp';
  img.alt = '';
  img.className = 'face-img';
  figure.appendChild(img);

  const svg = faceSvg('svg', { viewBox: '0 0 210 297', class: 'face-spots', 'aria-hidden': 'true' });
  const path = faceSwirlPath();
  FACE_SPOTS.forEach((spot) => {
    const place = faceSvg('g', { transform: 'translate(' + spot.x + ' ' + spot.y + ')', class: 'face-spot', 'data-n': String(spot.n) });
    const pulse = faceSvg('g', { class: 'face-pulse' });
    pulse.appendChild(faceSvg('path', {
      d: path, transform: 'scale(0.2469)', fill: 'none', stroke: FACE_SWIRL,
      'stroke-width': '9', 'stroke-linecap': 'round', 'stroke-linejoin': 'round',
    }));
    place.appendChild(pulse);
    if (withNumbers) {
      const badge = faceSvg('g', { transform: 'translate(' + spot.badge[0] + ' ' + spot.badge[1] + ')' });
      badge.appendChild(faceSvg('circle', { r: '4.6', fill: FACE_BADGE_COLOURS[spot.n - 1], stroke: '#fff', 'stroke-width': '1.2' }));
      const label = faceSvg('text', { 'text-anchor': 'middle', 'dominant-baseline': 'central', y: '0.3', 'font-size': '6', 'font-weight': '800', fill: '#4B3A2C', 'font-family': 'inherit' });
      label.textContent = String(spot.n);
      badge.appendChild(label);
      place.appendChild(badge);
    }
    svg.appendChild(place);
  });
  figure.appendChild(svg);
  return figure;
}

function highlightFaceSpot(n) {
  document.querySelectorAll('.face-spot').forEach((g) => {
    g.classList.toggle('active', n !== null && Number(g.getAttribute('data-n')) === n);
  });
}

// A large preview of the printed sheet (the download page opens this from the small preview).
function openFaceDialog() {
  let dialog = document.getElementById('face-dialog');
  if (!dialog) {
    dialog = document.createElement('dialog');
    dialog.id = 'face-dialog';
    dialog.className = 'face-dialog';
    dialog.appendChild(buildFaceFigure({ numbers: false }));

    // under the picture: how to print it, and both downloads
    const bar = document.createElement('div');
    bar.className = 'face-dialog-bar pal-5';
    const note = document.createElement('p');
    note.className = 'face-dialog-note';
    note.innerHTML = '<span class="zh">按 100% 比例打印在 A4 纸上。手臂会指向这些旋涡。</span><span class="en">Print on A4 at 100% size. The arm points at the swirls.</span>';
    bar.appendChild(note);
    [[FACE_FILES.pdf, '下载 PDF', 'Download PDF'], [FACE_FILES.png, '下载图片', 'Download image']].forEach(([href, zh, en]) => {
      const a = document.createElement('a');
      a.className = 'file-get';
      a.href = href;
      a.setAttribute('download', '');
      a.innerHTML = '<span class="zh">' + zh + '</span><span class="en">' + en + '</span>';
      bar.appendChild(a);
    });
    dialog.appendChild(bar);
    const close = document.createElement('button');
    close.type = 'button';
    close.className = 'face-dialog-close';
    close.setAttribute('aria-label', 'Close');
    close.textContent = '×';
    close.addEventListener('click', () => dialog.close());
    dialog.appendChild(close);
    // a click on the dark backdrop closes it too
    dialog.addEventListener('click', (event) => { if (event.target === dialog) dialog.close(); });
    dialog.setAttribute('tabindex', '-1');
    document.body.appendChild(dialog);
  }
  dialog.showModal();
  dialog.focus();
}
