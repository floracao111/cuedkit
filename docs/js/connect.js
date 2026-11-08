// connect.html page logic: the Connect / Disconnect button and the connection status
// line, driven by the real state from serial.js. When connected it shows the hand test.

const CONNECT_STATUS_KEYS = {
  disconnected: 'connect.status.disconnected',
  connecting: 'connect.status.connecting',
  connected: 'connect.status.connected',
};

const CONNECT_ERROR_KEYS = {
  busy: 'connect.error.busy',
  'no-response': 'connect.error.noResponse',
  lost: 'connect.error.lost',
};

let lastConnectError;

function renderConnectState() {
  const btn = document.getElementById('connect-btn');
  const statusEl = document.getElementById('connect-status');
  if (!btn || !statusEl) return;

  const status = getSerialStatus();
  btn.setAttribute('data-i18n', status === 'connected' ? 'connect.disconnectButton' : 'connect.connectButton');
  btn.disabled = status === 'connecting' || !isSerialSupported();
  applyTranslations();

  const errorKey = status === 'disconnected' ? CONNECT_ERROR_KEYS[lastConnectError] : undefined;
  statusEl.textContent = t(errorKey || CONNECT_STATUS_KEYS[status]);
  statusEl.dataset.state = errorKey ? 'error' : status;

  // Once the hand is connected, go straight to testing it and starting the course.
  const connected = status === 'connected';
  const testEl = document.getElementById('hand-test');
  if (testEl && connected && testEl.hidden) renderHandTest(testEl);
  if (testEl) testEl.hidden = !connected;
  document.getElementById('start-btn').hidden = !connected;
  document.getElementById('connect-help').hidden = connected;
  document.getElementById('connect-note').hidden = connected;
}

document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('connect-btn');
  if (!btn) return;

  btn.addEventListener('click', async () => {
    if (isSerialConnected()) {
      await disconnectSerial();
    } else {
      lastConnectError = undefined;
      await connectSerial();
    }
  });

  document.addEventListener('serialstatuschange', (event) => {
    lastConnectError = event.detail.error;
    renderConnectState();
  });
  document.addEventListener('languagechange', renderConnectState);

  renderConnectState();
});
