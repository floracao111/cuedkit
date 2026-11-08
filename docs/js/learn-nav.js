// Renders the in-zone nav for the "Learn Cued Speech" pages into
// <nav id="learn-nav">, highlighting the current page via data-step on <body>.
// Labels are hardcoded bilingual (zh primary, en secondary) since this zone
// does not use the general-page i18n switcher.

const LEARN_STEPS = [
  { key: 'what-is-cued-speech', href: 'what-is-cued-speech.html', zh: '什么是线索语', en: 'What Is It' },
  { key: 'alphabet', href: 'alphabet.html', zh: '拼音表', en: 'Alphabet' },
  { key: 'handshapes', href: 'handshapes.html', zh: '手型', en: 'Handshapes' },
  { key: 'positions', href: 'positions.html', zh: '位置', en: 'Positions' },
  { key: 'mouth-shapes', href: 'mouth-shapes.html', zh: '口型', en: 'Mouth Shapes' },
  { key: 'medials', href: 'medials.html', zh: '介音', en: 'Medials' },
  { key: 'combinations', href: 'combinations.html', zh: '组合', en: 'Combinations' },
  { key: 'practice', href: 'practice.html', zh: '练习', en: 'Practice' },
  { key: 'quiz', href: 'quiz.html', zh: '测验', en: 'Quiz' },
  { key: 'speak', href: 'speak.html', zh: '说话', en: 'Speak' },
];

function renderLearnNav() {
  const container = document.getElementById('learn-nav');
  if (!container) return;

  const currentStep = document.body.getAttribute('data-step');

  container.innerHTML = '';
  LEARN_STEPS.forEach((step) => {
    const a = document.createElement('a');
    a.href = step.href;
    a.className = 'stepper-item' + (step.key === currentStep ? ' active' : '');
    a.innerHTML =
      '<span class="zh" style="display:inline;">' + step.zh + '</span>' +
      '<span class="en" style="display:inline; margin-left:0.3rem;">' + step.en + '</span>';
    container.appendChild(a);
  });
}

document.addEventListener('DOMContentLoaded', renderLearnNav);
