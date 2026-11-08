// Applies translations to elements with [data-i18n] using the dictionary
// selected by localStorage 'lang' (default 'en'). Dictionaries are loaded
// as global objects window.I18N_EN / window.I18N_ZH by i18n/en.js and i18n/zh.js,
// which must be included before this file.

function getLanguage() {
  return localStorage.getItem('lang') || 'en';
}

function getDictionary() {
  return getLanguage() === 'zh' ? window.I18N_ZH : window.I18N_EN;
}

function t(key) {
  const dict = getDictionary();
  return (dict && dict[key]) || key;
}

// Puts text into an element and highlights whatever is written between *stars*.
// Built with DOM nodes (no innerHTML), so the dictionary text can never inject markup.
function setRichText(el, text) {
  el.textContent = '';
  String(text).split('*').forEach((part, i) => {
    if (!part) return;
    if (i % 2 === 1) {
      const mark = document.createElement('mark');
      mark.className = 'hl';
      mark.textContent = part;
      el.appendChild(mark);
    } else {
      el.appendChild(document.createTextNode(part));
    }
  });
}

function applyTranslations() {
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    if (el.hasAttribute('data-i18n-rich')) setRichText(el, t(el.getAttribute('data-i18n')));
    else el.textContent = t(el.getAttribute('data-i18n'));
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
    el.setAttribute('placeholder', t(el.getAttribute('data-i18n-placeholder')));
  });
  document.documentElement.lang = getLanguage() === 'zh' ? 'zh-CN' : 'en';
  // the tab title follows the page's main heading, in the chosen language
  const heading = document.querySelector('h1[data-i18n]');
  if (heading && heading.getAttribute('data-i18n') !== 'index.heroTitle') document.title = heading.textContent + ' — Cued Kit';
  document.querySelectorAll('[data-lang-btn]').forEach((btn) => {
    btn.classList.toggle('active', btn.getAttribute('data-lang-btn') === getLanguage());
  });
}

function setLanguage(lang) {
  localStorage.setItem('lang', lang);
  applyTranslations();
  document.dispatchEvent(new CustomEvent('languagechange'));
}

document.addEventListener('DOMContentLoaded', () => {
  applyTranslations();
  document.querySelectorAll('[data-lang-btn]').forEach((btn) => {
    btn.addEventListener('click', () => setLanguage(btn.getAttribute('data-lang-btn')));
  });
});
