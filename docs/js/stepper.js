// Renders the shared step-progress nav into <nav id="stepper"> based on the
// current page's data-step attribute on <body>.

const STEPPER_STEPS = [
  { key: 'download', href: 'download.html', i18n: 'stepper.download' },
  { key: 'hand-assembly', href: 'hand-assembly.html', i18n: 'stepper.handAssembly' },
  { key: 'arm-assembly', href: 'arm-assembly.html', i18n: 'stepper.armAssembly' },
  { key: 'use', href: 'use.html', i18n: 'stepper.use' },
];

function renderStepper() {
  const container = document.getElementById('stepper');
  if (!container) return;

  const currentStep = document.body.getAttribute('data-step');

  container.innerHTML = '';
  STEPPER_STEPS
    .forEach((step, i) => {
      const a = document.createElement('a');
      a.href = step.href;
      a.className = 'stepper-item' + (step.key === currentStep ? ' active' : '');
      a.innerHTML =
        '<span class="stepper-num">' + (i + 1) + '</span>' +
        '<span class="stepper-label">' + t(step.i18n) + '</span>';
      container.appendChild(a);
    });
}

document.addEventListener('DOMContentLoaded', renderStepper);
document.addEventListener('languagechange', renderStepper);
