// Web Serial link to the CuedKit hand (Arduino running cuedkit-speech.ino).
//
// Protocol, 115200 baud, one text line per command:
//   website -> hand   "2" (handshape 2), "a3" (arm position 3), "hao" (a pinyin syllable)
//   hand -> website   any number of info lines, then "DONE" once the move has finished
// Opening the port resets the Arduino, which then prints "CuedKit speech ready.".
// Commands are queued: each one waits for the previous one's "DONE".
//
// Status ('disconnected' | 'connecting' | 'connected') is announced with a
// 'serialstatuschange' event on document: detail = { status, error }.
// error is one of: 'busy' (port could not be opened), 'no-response' (opened, but nothing
// answered like the hand), 'lost' (unplugged or closed by the system), or undefined.
//
// A Web Serial connection does not survive moving to another page, so every page that
// loads this file reconnects by itself to the port you already approved (no new popup),
// unless you pressed Disconnect.

const SERIAL_BAUD_RATE = 115200;
const SERIAL_READY_TIMEOUT_MS = 5000;     // wait for the "ready" line after the Arduino resets
const SERIAL_PING_TIMEOUT_MS = 2500;      // if no ready line, ask once and wait for DONE
const SERIAL_COMMAND_TIMEOUT_MS = 20000;  // the longest single move takes about 3 s
const SERIAL_OPEN_ATTEMPTS = 6;           // the previous page may still be releasing the port
const SERIAL_OPEN_RETRY_MS = 400;
const SERIAL_READY_TEXT = 'CuedKit speech ready';
const SERIAL_DONE_TEXT = 'DONE';
const SERIAL_AUTOCONNECT_KEY = 'cuedkit.autoconnect';
const SERIAL_PORT_KEY = 'cuedkit.serialPort';

let serialStatus = 'disconnected';
let serialSession = null;            // { port, writer, reader, readClosed, active }
let serialPending = null;            // { lines, resolve, reject, timer } for the command in flight
let serialWaiters = [];              // { test, resolve, reject, timer } used by the handshake
let serialQueue = Promise.resolve(); // commands run one after another
const serialEncoder = new TextEncoder();

function serialSleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function storeGet(key) {
  try { return localStorage.getItem(key); } catch (e) { return null; }
}
function storeSet(key, value) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch (e) { /* storage blocked: reconnecting just won't be automatic */ }
}

function isSerialSupported() {
  return 'serial' in navigator;
}

function getSerialStatus() {
  return serialStatus;
}

function isSerialConnected() {
  return serialStatus === 'connected';
}

function setSerialStatus(status, error) {
  serialStatus = status;
  document.dispatchEvent(new CustomEvent('serialstatuschange', { detail: { status, error } }));
}

// Resolves with the next status that is not 'connecting'.
function whenSerialSettled() {
  if (serialStatus !== 'connecting') return Promise.resolve(serialStatus);
  return new Promise((resolve) => {
    const onChange = (event) => {
      if (event.detail.status === 'connecting') return;
      document.removeEventListener('serialstatuschange', onChange);
      resolve(event.detail.status);
    };
    document.addEventListener('serialstatuschange', onChange);
  });
}

// ---------- incoming lines ----------

function handleSerialLine(line) {
  const waiterIndex = serialWaiters.findIndex((w) => w.test(line));
  if (waiterIndex >= 0) {
    const [waiter] = serialWaiters.splice(waiterIndex, 1);
    clearTimeout(waiter.timer);
    waiter.resolve(line);
    return;
  }

  if (serialPending) {
    if (line === SERIAL_DONE_TEXT) {
      const pending = serialPending;
      serialPending = null;
      clearTimeout(pending.timer);
      pending.resolve(pending.lines);
    } else {
      serialPending.lines.push(line);
    }
  }
}

// Resolves with the first incoming line that passes test(); rejects after timeoutMs.
function waitForSerialLine(test, timeoutMs) {
  return new Promise((resolve, reject) => {
    const waiter = { test, resolve, reject, timer: null };
    waiter.timer = setTimeout(() => {
      serialWaiters = serialWaiters.filter((w) => w !== waiter);
      reject(new Error('timeout'));
    }, timeoutMs);
    serialWaiters.push(waiter);
  });
}

function failSerialWaiters(error) {
  const waiters = serialWaiters;
  serialWaiters = [];
  waiters.forEach((w) => { clearTimeout(w.timer); w.reject(error); });

  if (serialPending) {
    const pending = serialPending;
    serialPending = null;
    clearTimeout(pending.timer);
    pending.reject(error);
  }
}

async function readSerialLines(session) {
  const reader = session.reader;
  let buffer = '';
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += value;
      let newline;
      while ((newline = buffer.indexOf('\n')) >= 0) {
        const line = buffer.slice(0, newline).replace(/\r$/, '');
        buffer = buffer.slice(newline + 1);
        handleSerialLine(line);
      }
    }
  } catch (e) {
    // the device was unplugged or the port broke
  } finally {
    try { reader.releaseLock(); } catch (e) { /* already released */ }
  }

  if (session.active) {
    // We did not close it ourselves: the connection was lost.
    session.active = false;
    serialSession = null;
    failSerialWaiters(new Error('lost'));
    setSerialStatus('disconnected', 'lost');
  }
}

// ---------- opening and closing ----------

async function openPortWithRetry(port) {
  let lastError;
  for (let attempt = 0; attempt < SERIAL_OPEN_ATTEMPTS; attempt++) {
    try {
      await port.open({ baudRate: SERIAL_BAUD_RATE });
      return;
    } catch (e) {
      lastError = e;
      await serialSleep(SERIAL_OPEN_RETRY_MS);
    }
  }
  throw lastError;
}

async function closeSerialSession(session) {
  if (!session) return;
  session.active = false;
  try { await session.reader.cancel(); } catch (e) { /* already closed */ }
  try { await session.readClosed; } catch (e) { /* ignore */ }
  try { session.writer.releaseLock(); } catch (e) { /* ignore */ }
  try { await session.port.close(); } catch (e) { /* ignore */ }
}

async function writeSerialLine(text) {
  if (!serialSession) throw new Error('not-connected');
  await serialSession.writer.write(serialEncoder.encode(text + '\n'));
}

// The Arduino resets when the port opens. Wait for its ready line; if none shows up
// (some boards do not reset), send a blank line once and wait for DONE instead.
async function serialHandshake(readyPromise) {
  try {
    await readyPromise;
    return;
  } catch (e) { /* no ready line, try the ping */ }

  const pong = waitForSerialLine((line) => line === SERIAL_DONE_TEXT, SERIAL_PING_TIMEOUT_MS);
  await writeSerialLine(' ');
  await pong;
}

async function openSerialPort(port) {
  setSerialStatus('connecting');
  let session = null;
  let errorCode = 'busy';

  try {
    await openPortWithRetry(port);

    // Register the wait for the ready line before reading starts, so it cannot be missed.
    const readyPromise = waitForSerialLine((line) => line.includes(SERIAL_READY_TEXT), SERIAL_READY_TIMEOUT_MS);
    readyPromise.catch(() => {});

    const decoder = new TextDecoderStream();
    const readClosed = port.readable.pipeTo(decoder.writable).catch(() => {});
    session = {
      port,
      writer: port.writable.getWriter(),
      reader: decoder.readable.getReader(),
      readClosed,
      active: true,
    };
    serialSession = session;
    readSerialLines(session);

    errorCode = 'no-response';
    await serialHandshake(readyPromise);
  } catch (e) {
    if (serialSession === session) serialSession = null;
    failSerialWaiters(e);
    await closeSerialSession(session);
    setSerialStatus('disconnected', errorCode);
    return false;
  }

  const info = port.getInfo ? port.getInfo() : {};
  storeSet(SERIAL_PORT_KEY, info.usbVendorId !== undefined ? info.usbVendorId + ':' + info.usbProductId : '');
  storeSet(SERIAL_AUTOCONNECT_KEY, '1');
  setSerialStatus('connected');
  return true;
}

// Ask which port to use (needs a click) and connect to it.
// Returns true when connected; failures are reported through 'serialstatuschange'.
async function connectSerial() {
  if (!isSerialSupported() || serialStatus !== 'disconnected') return isSerialConnected();

  let port;
  try {
    port = await navigator.serial.requestPort();
  } catch (e) {
    return false; // the person closed the picker
  }
  return openSerialPort(port);
}

async function disconnectSerial() {
  storeSet(SERIAL_AUTOCONNECT_KEY, null);
  const session = serialSession;
  serialSession = null;
  failSerialWaiters(new Error('disconnected'));
  await closeSerialSession(session);
  setSerialStatus('disconnected');
}

// Reconnect to the port approved earlier, with no popup. Runs on every page load.
async function autoConnectSerial() {
  if (!isSerialSupported() || serialStatus !== 'disconnected') return;
  if (storeGet(SERIAL_AUTOCONNECT_KEY) !== '1') return;

  let ports;
  try { ports = await navigator.serial.getPorts(); } catch (e) { return; }

  const remembered = storeGet(SERIAL_PORT_KEY);
  let port = ports.find((p) => {
    const info = p.getInfo ? p.getInfo() : {};
    return remembered && info.usbVendorId + ':' + info.usbProductId === remembered;
  });
  if (!port && ports.length === 1) port = ports[0];
  if (!port) return;

  await openSerialPort(port);
}

// ---------- sending ----------

// Send one line and wait for the hand to finish. Resolves with the info lines the hand
// printed (for example ["ni: initial=n ... -> hand 4, arm 3"]). Rejects with an Error
// whose message is 'not-connected', 'timeout', 'lost' or 'disconnected'.
function sendLine(text) {
  const run = () => sendLineNow(text);
  const result = serialQueue.then(run, run);
  serialQueue = result.catch(() => {});
  return result;
}

async function sendLineNow(text) {
  if (serialStatus === 'connecting') await whenSerialSettled();
  if (serialStatus !== 'connected') throw new Error('not-connected');

  const line = String(text).replace(/[\r\n]+/g, ' ').trim();
  if (!line) return [];

  return new Promise((resolve, reject) => {
    const pending = { lines: [], resolve, reject, timer: null };
    pending.timer = setTimeout(() => {
      if (serialPending === pending) serialPending = null;
      reject(new Error('timeout'));
    }, SERIAL_COMMAND_TIMEOUT_MS);
    serialPending = pending;

    writeSerialLine(line).catch((e) => {
      if (serialPending === pending) serialPending = null;
      clearTimeout(pending.timer);
      reject(e);
    });
  });
}

// Kept for older callers: send a command string to the hand.
async function sendCommand(command) {
  return sendLine(command);
}

// ---------- page lifecycle ----------

document.addEventListener('DOMContentLoaded', () => {
  autoConnectSerial();
});

// Let go of the port quickly when leaving the page, so the next page can open it.
window.addEventListener('pagehide', () => {
  if (serialSession) {
    serialSession.active = false;
    try { serialSession.reader.cancel(); } catch (e) { /* ignore */ }
  }
});
