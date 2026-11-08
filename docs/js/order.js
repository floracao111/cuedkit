// Kit orders without a form or a server: the "Order" button opens a small pop-up with the
// email address (to read or copy) and a button that opens the visitor's email app with a
// message ready to fill in (name, country, use, how many), in the language they are reading.
//
// The address comes from js/site-config.js in two pieces and is only put together, and
// written into the page, when someone clicks Order. That keeps it out of the page's plain
// text, where simple email-harvesting bots look. Needs i18n.js (getLanguage, t) loaded first.

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

function orderEmail() {
  const parts = window.SITE_EMAIL_PARTS;
  return Array.isArray(parts) && parts.length === 2 ? parts.join('@') : '';
}

function orderHref(email) {
  const lang = getLanguage() === 'zh' ? 'zh' : 'en';
  const subject = encodeURIComponent(ORDER_MESSAGE.subject[lang]);
  const body = encodeURIComponent(ORDER_MESSAGE.body[lang].join('\r\n'));
  return 'mailto:' + email + '?subject=' + subject + '&body=' + body;
}

function orderNode(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function copyText(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    return navigator.clipboard.writeText(text);
  }
  return Promise.reject(new Error('no clipboard'));
}

function openOrderDialog() {
  const email = orderEmail();
  let dialog = document.getElementById('order-dialog');
  if (!dialog) {
    dialog = document.createElement('dialog');
    dialog.id = 'order-dialog';
    dialog.className = 'image-dialog order-dialog';
    dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.close(); });
    document.body.appendChild(dialog);
  }
  dialog.textContent = '';

  const close = orderNode('button', 'image-dialog-close', '×');
  close.type = 'button';
  close.setAttribute('aria-label', t('assembly.close'));
  close.addEventListener('click', () => dialog.close());

  const body = orderNode('div', 'order-body');
  body.appendChild(orderNode('h2', 'order-title', t('order.title')));
  body.appendChild(orderNode('p', 'order-text', t('order.text')));

  if (email) {
    const address = orderNode('p', 'order-address', email);
    body.appendChild(address);

    const row = orderNode('div', 'order-actions');
    const copy = orderNode('button', 'btn btn-secondary btn-sm', t('order.copy'));
    copy.type = 'button';
    copy.addEventListener('click', () => {
      copyText(email).then(
        () => { copy.textContent = t('order.copied'); },
        () => {
          // no clipboard access: select the address so it can be copied by hand
          const range = document.createRange();
          range.selectNodeContents(address);
          const selection = window.getSelection();
          selection.removeAllRanges();
          selection.addRange(range);
        }
      );
    });
    const open = orderNode('a', 'btn btn-sm', t('order.open'));
    open.href = orderHref(email);
    row.append(copy, open);
    body.appendChild(row);
  }

  dialog.append(close, body);
  dialog.showModal();
}

function setupOrderLinks() {
  document.querySelectorAll('[data-order]').forEach((a) => {
    if (a.dataset.orderReady) return;
    a.dataset.orderReady = '1';
    // without JavaScript the link still goes to its href (the Contact page)
    a.addEventListener('click', (e) => {
      e.preventDefault();
      openOrderDialog();
    });
  });
}

document.addEventListener('DOMContentLoaded', setupOrderLinks);
document.addEventListener('languagechange', () => {
  const dialog = document.getElementById('order-dialog');
  if (dialog && dialog.open) dialog.close();
});
