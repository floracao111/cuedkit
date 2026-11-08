#!/usr/bin/env python3
"""Check that the website's encoder gives the same cue as the Arduino sketch.

Compiles the sketch's parseSyllable() on this computer (same trick as
gen_hanzi_table.py), runs the website's js/encoder.js in node, and compares the two on:
  - every syllable pinyin-pro produces for the 3755 common characters
  - a list of extra syllables, typed spellings and invalid strings

Run:  python3 arduino/tools/check_encoder_parity.py
Re-run it after changing the rules in EITHER cuedkit-speech.ino or js/encoder.js.
"""
import json
import os
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import gen_hanzi_table as g  # noqa: E402

ENCODER = os.path.abspath(os.path.expanduser("~/Desktop/cuedkit-website/js/encoder.js"))

EXTRA = [
    "yi", "wu", "yu", "yin", "ying", "you", "ya", "yan", "yue", "yun", "yuan", "yong",
    "wo", "wan", "wang", "wei", "wen", "weng",
    "ju", "qu", "xu", "jue", "que", "xue", "juan", "quan", "xuan", "jun", "qun", "xun",
    "jv", "qv", "xv", "lv", "nv", "lve", "nve", "lue", "nue",
    "a", "o", "e", "ai", "ei", "ao", "ou", "an", "en", "ang", "eng", "er",
    "hua", "shuo", "liu", "xiao", "zhuang", "chuan", "shui", "niu", "qiang", "guang",
    "zhi", "chi", "shi", "ri", "zi", "ci", "si", "ba", "ma", "fa",
    # not valid pinyin: both sides must agree they cannot be cued
    "ng", "m", "hm", "xyz", "bb", "zh", "sh", "ch", "b", "x", "qq", "yoyo", "ngg",
]

JS = r"""
const fs = require('fs');
const path = %s;
global.pinyinPro = undefined;
const enc = require(path);
const syllables = JSON.parse(fs.readFileSync(0, 'utf8'));
const out = {};
for (const s of syllables) {
  const c = enc.encodeSyllable(s);
  out[s] = [c.ok, c.hand, c.glideHand, c.position];
}
console.log(JSON.stringify(out));
""" % json.dumps(ENCODER)


def main():
    if not os.path.exists(ENCODER):
        sys.exit("encoder not found: %s" % ENCODER)

    chars = g.gb2312_level1()
    syllables = sorted(set(g.pinyin_of(chars)) | set(EXTRA))

    cpp = g.cue_for_syllables(syllables)
    js_out = subprocess.run(["node", "-e", JS], input=json.dumps(syllables),
                            capture_output=True, text=True, check=True).stdout
    js = json.loads(js_out)

    bad = []
    for s in syllables:
        c_ok, c_hand, c_glide, c_arm = cpp[s]
        j_ok, j_hand, j_glide, j_pos = js[s]
        if c_ok != j_ok or (c_ok and (c_hand, c_glide, c_arm) != (j_hand, j_glide, j_pos)):
            bad.append((s, cpp[s], js[s]))

    print("compared %d syllables (%d valid on the Arduino side)"
          % (len(syllables), sum(1 for v in cpp.values() if v[0])))
    if bad:
        print("MISMATCHES: %d" % len(bad))
        for s, c, j in bad:
            print("  %-8s arduino=%s website=%s" % (s, c, j))
        sys.exit(1)
    print("encoder.js matches the Arduino parser on all of them")


if __name__ == "__main__":
    main()
