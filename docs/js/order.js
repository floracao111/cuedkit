// Kit orders without a form or a server: the "Order" button opens the visitor's email app with a message
// ready to fill in (name, country, use, how many), in the language they are reading.
// The address comes from js/site-config.js. Needs i18n.js (getLanguage) loaded first.

const ORDER_MESSAGE = {
  subject: { en: 'CuedKit order', zh: '订购 CuedKit 套件' },
  body: {
    en: [
      'Hi! I would like to order a CuedKit.',
      '',
      'Name:',
      'Country / city:',
      'What I will use it for (school, research, personal):',
      'How many kits:',
    ],
    zh: [
      '你好！我想订购一套 CuedKit。',
      '',
      '姓名：',
      '国家 / 城市：',
      '用途（学校、研究、个人）：',
      '数量：',
    ],
  },
};

function orderHref(email) {
  const lang = getLanguage() === 'zh' ? 'zh' : 'en';
  const subject = encodeURIComponent(ORDER_MESSAGE.subject[lang]);
  const body = encodeURIComponent(ORDER_MESSAGE.body[lang].join('\r\n'));
  return 'mailto:' + email + '?subject=' + subject + '&body=' + body;
}

function setupOrderLinks() {
  const email = String(window.SITE_EMAIL || '').trim();
  // with an address: opens a ready-to-fill email. Without one, a button that has a
  // data-order-fallback goes to that page instead (the others stay hidden).
  document.querySelectorAll('[data-order]').forEach((a) => {
    const fallback = a.getAttribute('data-order-fallback');
    a.hidden = !email && !fallback;
    if (email) a.href = orderHref(email);
    else if (fallback) a.href = fallback;
  });
  document.querySelectorAll('[data-email]').forEach((a) => {
    a.hidden = !email;
    if (email) {
      a.href = 'mailto:' + email;
      a.textContent = email;
    }
  });
}

document.addEventListener('DOMContentLoaded', setupOrderLinks);
document.addEventListener('languagechange', setupOrderLinks);
