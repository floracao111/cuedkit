// Mandarin Cued Speech encoder: text -> one cue (handshape + position) per syllable.
//
// The rules below are the same ones the Arduino runs (parseSyllable() in
// arduino/cuedkit-speech/cuedkit-speech.ino). They are kept identical on purpose, and
// arduino/tools/check_encoder_parity.py compares the two on every syllable.
//
// Chinese characters are turned into pinyin with pinyin-pro (js/vendor/pinyin-pro.js),
// which reads whole words, so 音乐 is "yin yue" and 萝卜 is "luo bo". Latin letters are
// treated as pinyin typed by the user.

// Handshape (1-8) for each initial consonant or medial.
const HANDSHAPE_FOR_INITIAL = {
  p: 1, d: 1, zh: 1,
  k: 2, q: 2, z: 2,
  h: 3, r: 3, s: 3,
  n: 4, b: 4, yu: 4,
  t: 5, m: 5, f: 5,
  w: 6, l: 6, x: 6,
  g: 7, ch: 7, j: 7,
  sh: 8, y: 8, c: 8,
};

// Position (1-5) for each final (v = ü).
const POSITION_FOR_FINAL = {
  an: 1, e: 1, o: 1,
  a: 2, ou: 2, er: 2, en: 2,
  i: 3, v: 3, ang: 3,
  ai: 4, u: 4, ao: 4,
  eng: 5, ong: 5, ei: 5,
};

// Cue for one pinyin syllable (no tone marks, ü written as v).
//   hand       handshape of the initial (5 for a syllable with no consonant)
//   glideHand  handshape of the medial, or 0 when there is none
//   position   position of the final
// The hand shows `hand` first, then moves to `position` while changing to `glideHand`.
function encodeSyllable(syllable) {
  const input = String(syllable).trim().toLowerCase();
  let initial = '';
  let final = '';
  let glide = '';
  let realFinal = '';
  let hand = 0;

  if (input === 'yi' || input === 'wu' || input === 'yu') {
    // Spelled with y / w but pronounced i / u / ü: no consonant, so handshape 5.
    hand = 5;
    realFinal = { yi: 'i', wu: 'u', yu: 'v' }[input];
  } else if (/^[aoeiuv]/.test(input)) {
    // No consonant (a, ai, an, e, er, o, ou ...): handshape 5.
    hand = 5;
    realFinal = input;
  } else {
    if (input.startsWith('yu')) {
      initial = 'yu';
      final = input.slice(2);
    } else if (/^(zh|ch|sh)/.test(input)) {
      initial = input.slice(0, 2);
      final = input.slice(2);
    } else {
      initial = input.slice(0, 1);
      final = input.slice(1);
    }

    // After j, q, x the letter u is really ü: ju = jv, quan = qvan, xue = xve.
    if ((initial === 'j' || initial === 'q' || initial === 'x') && final.startsWith('u')) {
      final = 'v' + final.slice(1);
    }

    realFinal = final;
    if (initial === 'yu' && final === 'n') realFinal = 'en'; // yun = ü + en (like "vn")

    if (final !== '') {
      if (final.length > 1) {
        if (final === 'ui') { glide = 'w'; realFinal = 'ei'; }
        else if (final === 'iu') { glide = 'y'; realFinal = 'ou'; }
        else if (final === 'un') { glide = 'w'; realFinal = 'en'; }
        else if (final === 'ie') { glide = 'y'; realFinal = 'e'; }
        else if (final === 've') { glide = 'yu'; realFinal = 'e'; }
        else if (final === 'in') { glide = 'y'; realFinal = 'en'; }
        else if (final === 'vn') { glide = 'yu'; realFinal = 'en'; }
        else if (final === 'ing') { glide = 'y'; realFinal = 'eng'; }
        else if (final.startsWith('i')) { glide = 'y'; realFinal = final.slice(1); }
        else if (final.startsWith('u')) { glide = 'w'; realFinal = final.slice(1); }
        else if (final.startsWith('v')) { glide = 'yu'; realFinal = final.slice(1); }
      }
      if (realFinal === '') {
        if (glide === 'y') realFinal = 'i';
        else if (glide === 'w') realFinal = 'u';
        else if (glide === 'yu') realFinal = 'v';
      }
    }
    hand = HANDSHAPE_FOR_INITIAL[initial] || 0;
  }

  // Never show the same handshape twice in a row (yin, ying: y + y).
  if (glide !== '' && HANDSHAPE_FOR_INITIAL[glide] === hand) glide = '';

  const position = POSITION_FOR_FINAL[realFinal] || 0;
  return {
    pinyin: input,
    ok: hand !== 0 && position !== 0,
    initial,
    glide,
    final: realFinal,
    hand,
    glideHand: glide !== '' ? HANDSHAPE_FOR_INITIAL[glide] : 0,
    position,
  };
}

// Pinyin (no tones, ü as v) for a run of Chinese characters, one entry per character.
// Returns empty strings if pinyin-pro is not loaded.
function chineseToPinyin(chars) {
  const lib = (typeof pinyinPro !== 'undefined') ? pinyinPro : null;
  if (!lib) return Array.from(chars, () => '');
  return lib.pinyin(chars, { toneType: 'none', type: 'array', v: true });
}

// Split typed text into syllables, in order. Each item:
//   { char, pinyin, cue }  char is '' for typed pinyin; cue is encodeSyllable()'s result,
//   cue.ok is false when the syllable cannot be cued (it is skipped when speaking).
// Chinese characters and Latin pinyin can be mixed. Spaces, digits and punctuation only
// separate words.
function textToSyllables(text) {
  const items = [];
  const tokens = String(text).matchAll(/[一-鿿]+|[A-Za-züÜ]+/g);

  for (const match of tokens) {
    const token = match[0];

    if (/^[一-鿿]/.test(token)) {
      const chars = Array.from(token);
      const readings = chineseToPinyin(token);
      chars.forEach((char, i) => {
        const pinyin = /^[a-z]+$/.test(readings[i] || '') ? readings[i] : '';
        items.push({ char, pinyin, cue: pinyin ? encodeSyllable(pinyin) : { ok: false } });
      });
    } else {
      const pinyin = token.toLowerCase().replace(/ü/g, 'v');
      items.push({ char: '', pinyin, cue: encodeSyllable(pinyin) });
    }
  }
  return items;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { encodeSyllable, textToSyllables, HANDSHAPE_FOR_INITIAL, POSITION_FOR_FINAL };
}
