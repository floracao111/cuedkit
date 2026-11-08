// One language at a time, for the whole site.
//
// The language lives in localStorage ('lang': 'en' or 'zh', default 'en') and is written on
// <html lang>. Text that exists in both languages is written as a pair,
//   <span class="zh">...</span><span class="en">...</span>
// and the stylesheet shows only the one that matches. This script also
//   - adds the EN / 中文 switch to pages that do not have one yet
//   - picks the matching half of a "中文 — English" page title
// It is loaded in <head> so the right language is on screen from the first paint.

(function () {
  const KEY = 'lang';

  function current() {
    try { return localStorage.getItem(KEY) === 'zh' ? 'zh' : 'en'; } catch (e) { return 'en'; }
  }

  let originalTitle = null;

  function applyTitle(lang) {
    if (originalTitle === null) originalTitle = document.title;
    // "中文 — English" titles: keep the half in the chosen language. Other titles stay as they are.
    if (/[一-鿿]/.test(originalTitle) && originalTitle.indexOf(' — ') > -1) {
      const parts = originalTitle.split(' — ');
      document.title = lang === 'zh' ? parts[0] : parts[1];
    }
  }

  function apply() {
    const lang = current();
    document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';
    applyTitle(lang);
    document.querySelectorAll('[data-lang-btn]').forEach((btn) => {
      btn.classList.toggle('active', btn.getAttribute('data-lang-btn') === lang);
    });
    document.querySelectorAll('[data-placeholder-zh]').forEach((el) => {
      el.setAttribute('placeholder', lang === 'zh' ? el.getAttribute('data-placeholder-zh') : el.getAttribute('data-placeholder-en'));
    });
  }

  // 'zh' or 'en', for scripts that build their own text
  window.siteLanguage = current;

  apply();

  document.addEventListener('DOMContentLoaded', () => {
    // Pages that load i18n.js already have a working switch; add one to the rest.
    if (!document.querySelector('.lang-switch')) {
      const host = document.querySelector('.header-actions') || document.querySelector('.site-header');
      if (host) {
        const box = document.createElement('div');
        box.className = 'lang-switch';
        [['en', 'EN'], ['zh', '中文']].forEach(([code, label]) => {
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.setAttribute('data-lang-btn', code);
          btn.textContent = label;
          btn.addEventListener('click', () => {
            try { localStorage.setItem(KEY, code); } catch (e) { /* storage blocked */ }
            apply();
            document.dispatchEvent(new CustomEvent('languagechange'));
          });
          box.appendChild(btn);
        });
        host.appendChild(box);
      }
    }
    apply();
  });

  document.addEventListener('languagechange', apply);
})();
