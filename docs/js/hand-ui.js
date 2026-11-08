// Small UI helpers shared by the pages that talk to the hand:
//  - showNotice(zh, en): a short toast at the bottom of the page
//  - explainSerialError(error): turns a failed hand command into a toast
//  - the "Connect" button in the page header shows whether the hand is connected

function showNotice(zh, en) {
  let el = document.getElementById('notice');
  if (!el) {
    el = document.createElement('div');
    el.id = 'notice';
    el.className = 'dev-notice';
    el.setAttribute('role', 'status');
    document.body.appendChild(el);
  }

  el.textContent = '';
  [['zh', zh], ['en', en]].forEach(([cls, text]) => {
    if (!text) return;
    const span = document.createElement('span');
    span.className = cls;
    span.textContent = text;
    el.appendChild(span);
  });

  el.hidden = false;
  clearTimeout(showNotice._timer);
  showNotice._timer = setTimeout(() => { el.hidden = true; }, 3500);
}

// Tell the person what went wrong after a failed sendLine().
function explainSerialError(error) {
  if (error && error.message === 'not-connected') {
    showNotice('请先连接机械手。', 'Connect your hand first.');
  } else {
    showNotice('机械手没有响应，请检查连接。', 'The hand did not respond. Check the connection.');
  }
}

const DEVICE_BUTTON_TEXT = {
  connecting: ['连接中…', 'Connecting…'],
  connected: ['已连接', 'Connected'],
};

function updateDeviceButtons() {
  const status = (typeof getSerialStatus === 'function') ? getSerialStatus() : 'disconnected';

  document.querySelectorAll('.device-btn').forEach((btn) => {
    const zh = btn.querySelector('.zh');
    const en = btn.querySelector('.en');
    if (!zh || !en) return;

    if (btn.dataset.zh === undefined) {
      btn.dataset.zh = zh.textContent;
      btn.dataset.en = en.textContent;
    }

    const text = DEVICE_BUTTON_TEXT[status] || [btn.dataset.zh, btn.dataset.en];
    zh.textContent = text[0];
    en.textContent = text[1];
    btn.classList.toggle('connected', status === 'connected');
  });
}

document.addEventListener('DOMContentLoaded', updateDeviceButtons);
document.addEventListener('serialstatuschange', updateDeviceButtons);
