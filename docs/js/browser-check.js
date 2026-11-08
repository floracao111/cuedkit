// Detects Web Serial API support and surfaces a warning where needed.
// Used on index.html (informational banner) and connect.html (banner + disables the Connect button).

function isWebSerialSupported() {
  return 'serial' in navigator;
}

document.addEventListener('DOMContentLoaded', () => {
  if (isWebSerialSupported()) return;

  const banner = document.getElementById('browser-warning');
  if (banner) banner.hidden = false;

  const connectBtn = document.getElementById('connect-btn');
  if (connectBtn) connectBtn.disabled = true;
});
