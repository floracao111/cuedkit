// calibrate.html: the starting-position code used during hand assembly (opened from the
// "pause and calibrate" step in the hand assembly guide).

const CALIBRATION_CODE = "#include <Wire.h>\n#include <Adafruit_PWMServoDriver.h>\n\n// CuedKit calibration: moves every finger servo to the same starting position\n// (all fingers open) so you can attach the servo horns the right way round.\n// Upload it once, leave the hand powered, and attach the horns as the guide says.\n//\n// Servo driver pins: 0 thumb, 1 index, 2 middle, 3 ring, 4 pinky, 5 index sideways turn.\n\nAdafruit_PWMServoDriver pca = Adafruit_PWMServoDriver(0x40);\n\nvoid setup() {\n  pca.begin();\n  pca.setPWMFreq(50);\n\n  pca.setPWM(0, 0, 500);  // thumb, open\n  pca.setPWM(1, 0, 300);  // index, open\n  pca.setPWM(2, 0, 500);  // middle, open\n  pca.setPWM(3, 0, 500);  // ring, open\n  pca.setPWM(4, 0, 500);  // pinky, open\n  pca.setPWM(5, 0, 500);  // index sideways turn, in\n}\n\nvoid loop() {}\n";

const CAL_TEXT = {
  s1: { zh: '起始位置代码', en: 'Starting-position code' },
  s1Intro: { zh: '装摇臂之前，先让所有手指舵机转到同一个起始位置。', en: 'Before you attach the horns, move every finger servo to the same starting position.' },
  steps: [
    { zh: '在 Arduino IDE 里安装 “Adafruit PWM Servo Driver Library”。', en: 'In the Arduino IDE, install “Adafruit PWM Servo Driver Library”.' },
    { zh: '把下面的代码上传到 Arduino。', en: 'Upload the code below to the Arduino.' },
    { zh: '舵机会转到起始位置（手指全开）。保持通电，再装摇臂。', en: 'The servos move to the starting position (fingers open). Keep it powered, then attach the horns.' },
  ],
  copy: { zh: '复制代码', en: 'Copy code' },
  copied: { zh: '已复制！', en: 'Copied!' },
  download: { zh: '下载 .ino 文件', en: 'Download .ino file' },
};

function calText(obj) { return obj[siteLanguage()] || obj.en; }

function calNode(tag, className, text) {
  const n = document.createElement(tag);
  if (className) n.className = className;
  if (text !== undefined) n.textContent = text;
  return n;
}

function bi(label, tag) {
  const wrap = calNode(tag || 'div', 'cal-bi');
  wrap.appendChild(calNode('span', 'zh', label.zh));
  wrap.appendChild(calNode('span', 'en', label.en));
  return wrap;
}

function renderCalibrate() {
  const root = document.getElementById('calibrate-root');
  root.textContent = '';

  const s1 = calNode('section');
  const heading = calNode('h2', 'alpha-heading');
  heading.appendChild(calNode('span', 'zh', CAL_TEXT.s1.zh));
  heading.appendChild(calNode('span', 'en', CAL_TEXT.s1.en));
  s1.appendChild(heading);
  s1.appendChild(bi(CAL_TEXT.s1Intro, 'p'));
  const steps = calNode('ol', 'cal-steps');
  CAL_TEXT.steps.forEach((step) => { const li = calNode('li'); li.appendChild(bi(step)); steps.appendChild(li); });
  s1.appendChild(steps);
  const code = calNode('pre', 'code-block');
  code.appendChild(calNode('code', '', CALIBRATION_CODE));
  s1.appendChild(code);
  const buttons = calNode('div', 'cal-buttons');
  const copyBtn = calNode('button', 'btn');
  copyBtn.type = 'button';
  copyBtn.textContent = calText(CAL_TEXT.copy);
  copyBtn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(CALIBRATION_CODE);
      copyBtn.textContent = calText(CAL_TEXT.copied);
      setTimeout(() => { copyBtn.textContent = calText(CAL_TEXT.copy); }, 1800);
    } catch (e) {
      const range = document.createRange();
      range.selectNodeContents(code);
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
    }
  });
  buttons.appendChild(copyBtn);
  const dl = calNode('a', 'btn btn-secondary', calText(CAL_TEXT.download));
  dl.href = 'downloads/firmware/cuedkit-calibration.ino';
  dl.setAttribute('download', '');
  buttons.appendChild(dl);
  s1.appendChild(buttons);
  root.appendChild(s1);
}

document.addEventListener('DOMContentLoaded', renderCalibrate);
document.addEventListener('languagechange', renderCalibrate);
