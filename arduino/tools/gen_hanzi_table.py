#!/usr/bin/env python3
"""Generate arduino/cuedkit-speech/hanzi_table.h

Maps common Chinese characters (GB2312 level 1, 3755 characters) to the cue the hand
and arm should show. Pipeline:

  1. list the characters
  2. get each one's toneless pinyin from pinyin-pro (same library the website uses)
  3. run every distinct syllable through the parser that is IN THE SKETCH (the block
     between the BEGIN/END HOST-TESTABLE markers, compiled on this computer), so the
     table can never disagree with what typing the pinyin would do
  4. write the table, then compile a second test that checks every lookup

Run from anywhere:  python3 arduino/tools/gen_hanzi_table.py
Needs: node, g++, and `npm install` done in mouth-shape-display (for pinyin-pro).
"""
import json
import os
import re
import subprocess
import sys
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
SKETCH_DIR = os.path.join(HERE, "..", "cuedkit-speech")
SKETCH = os.path.join(SKETCH_DIR, "cuedkit-speech.ino")
HEADER = os.path.join(SKETCH_DIR, "hanzi_table.h")
PINYIN_PRO = os.path.abspath(
    os.path.join(HERE, "..", "..", "mouth-shape-display", "node_modules", "pinyin-pro"))


def gb2312_level1():
    chars = []
    for hi in range(0xB0, 0xD8):
        for lo in range(0xA1, 0xFF):
            try:
                chars.append(bytes([hi, lo]).decode("gb2312"))
            except UnicodeDecodeError:
                pass
    return chars


def pinyin_of(chars):
    js = (
        "const {pinyin}=require(%s);"
        "const chars=JSON.parse(require('fs').readFileSync(0,'utf8'));"
        "console.log(JSON.stringify(chars.map(c=>pinyin(c,{toneType:'none',type:'array',v:true})[0])));"
    ) % json.dumps(PINYIN_PRO)
    out = subprocess.run(["node", "-e", js], input=json.dumps(chars),
                         capture_output=True, text=True, check=True).stdout
    return json.loads(out)


# One reading per character, so polyphonic characters need a pick. pinyin-pro's default
# is right for nearly all common ones; add exceptions here (then re-run this script).
OVERRIDES = {
    "了": "le",   # pinyin-pro default is "liao"; the particle 了 is far more common
}


def sketch_block(name):
    text = open(SKETCH, encoding="utf-8").read()
    m = re.search(r"// ===== BEGIN HOST-TESTABLE %s.*?\n(.*?)// ===== END HOST-TESTABLE %s"
                  % (name, name), text, re.S)
    if not m:
        sys.exit("marker block %s not found in sketch" % name)
    return m.group(1)


SHIM = r"""
#include <string>
#include <cstdint>
#include <cstdio>
#include <iostream>
#include <vector>
#define PROGMEM
#define pgm_read_word(p) (*(p))
#define pgm_read_byte(p) (*(p))
struct String {
  std::string s;
  String() {}
  String(const char* c) : s(c) {}
  String(const std::string& c) : s(c) {}
  bool startsWith(const char* p) const { return s.rfind(p, 0) == 0; }
  String substring(unsigned a) const { return String(s.substr(a)); }
  String substring(unsigned a, unsigned b) const { return String(s.substr(a, b - a)); }
  unsigned length() const { return s.size(); }
  bool operator==(const char* c) const { return s == c; }
  bool operator!=(const char* c) const { return s != c; }
};
String operator+(const char* a, const String& b) { return String(std::string(a) + b.s); }
"""


def build(source, exe):
    with tempfile.TemporaryDirectory() as d:
        cpp = os.path.join(d, "t.cpp")
        open(cpp, "w", encoding="utf-8").write(source)
        subprocess.run(["g++", "-std=c++17", "-O1", "-I", SKETCH_DIR, cpp, "-o", exe], check=True)


def cue_for_syllables(syllables):
    src = SHIM + sketch_block("TYPES") + sketch_block("PARSER") + r"""
int main() {
  std::string line;
  while (std::getline(std::cin, line)) {
    Syllable s;
    bool ok = parseSyllable(String(line), s);
    printf("%s %d %d %d %d\n", line.c_str(), ok ? 1 : 0, s.hand, s.glideHand, s.arm);
  }
}
"""
    with tempfile.TemporaryDirectory() as d:
        exe = os.path.join(d, "parse")
        build(src, exe)
        out = subprocess.run([exe], input="\n".join(syllables) + "\n",
                             capture_output=True, text=True, check=True).stdout
    result = {}
    for row in out.strip().split("\n"):
        syl, ok, hand, glide, arm = row.split()
        result[syl] = (ok == "1", int(hand), int(glide), int(arm))
    return result


def main():
    chars = gb2312_level1()
    pinyins = [OVERRIDES.get(c, p) for c, p in zip(chars, pinyin_of(chars))]
    syllables = sorted(set(pinyins))
    cues = cue_for_syllables(syllables)

    entries = []        # (codepoint, cue_word)
    skipped = {}        # syllable -> chars that cannot be cued
    for ch, syl in zip(chars, pinyins):
        ok, hand, glide, arm = cues[syl]
        if not ok:
            skipped.setdefault(syl, []).append(ch)
            continue
        entries.append((ord(ch), hand | (glide << 4) | (arm << 8)))
    entries.sort()

    cue_words = sorted(set(w for _, w in entries))
    assert len(cue_words) < 256
    cue_index = {w: i for i, w in enumerate(cue_words)}

    def rows(values, per_line, fmt):
        lines = []
        for i in range(0, len(values), per_line):
            lines.append("  " + ", ".join(fmt % v for v in values[i:i + per_line]))
        return ",\n".join(lines)

    with open(HEADER, "w", encoding="utf-8") as f:
        f.write("// GENERATED by arduino/tools/gen_hanzi_table.py. Do not edit by hand.\n")
        f.write("// %d characters (GB2312 level 1) -> cue. Cue word = hand | glideHand<<4 | arm<<8.\n"
                % len(entries))
        f.write("#pragma once\n#include <stdint.h>\n#include <avr/pgmspace.h>\n\n")
        f.write("const uint16_t HANZI_COUNT = %d;\n\n" % len(entries))
        f.write("// distinct cues\nconst uint16_t CUE_TABLE[%d] PROGMEM = {\n%s\n};\n\n"
                % (len(cue_words), rows(cue_words, 12, "0x%03X")))
        f.write("// Unicode code points, sorted\nconst uint16_t HANZI_CODE[%d] PROGMEM = {\n%s\n};\n\n"
                % (len(entries), rows([c for c, _ in entries], 12, "0x%04X")))
        f.write("// index into CUE_TABLE for each character above\nconst uint8_t HANZI_CUE[%d] PROGMEM = {\n%s\n};\n"
                % (len(entries), rows([cue_index[w] for _, w in entries], 24, "%d")))

    # Second test: compile the sketch's real lookup against the generated header and
    # check every character returns exactly the cue the parser gave.
    expected = {cp: w for cp, w in entries}
    src = SHIM + '#include "hanzi_table.h"\n' + sketch_block("HANZI LOOKUP") + r"""
int main() {
  unsigned cp, word;
  int bad = 0, n = 0;
  while (scanf("%u %u", &cp, &word) == 2) {
    int h, g, a;
    bool ok = lookupHanzi((uint16_t)cp, h, g, a);
    n++;
    if (!ok || (unsigned)(h | (g << 4) | (a << 8)) != word) { bad++; printf("BAD %04X\n", cp); }
  }
  // characters that must NOT be found
  int h, g, a;
  if (lookupHanzi(0x0041, h, g, a) || lookupHanzi(0x4E00 - 1, h, g, a) || lookupHanzi(0xFFFF, h, g, a)) { bad++; puts("BAD negative"); }
  printf("checked %d, bad %d\n", n, bad);
  return bad != 0;
}
"""
    # PROGMEM data is only available when the header is included before the macros are used
    src = src.replace("#include <avr/pgmspace.h>", "")
    with tempfile.TemporaryDirectory() as d:
        exe = os.path.join(d, "lookup")
        # header includes <avr/pgmspace.h>, give g++ an empty stand-in
        os.makedirs(os.path.join(d, "avr"))
        open(os.path.join(d, "avr", "pgmspace.h"), "w").write("")
        cpp = os.path.join(d, "t.cpp")
        open(cpp, "w", encoding="utf-8").write(src)
        subprocess.run(["g++", "-std=c++17", "-O1", "-I", d, "-I", SKETCH_DIR, cpp, "-o", exe], check=True)
        inp = "\n".join("%d %d" % (cp, w) for cp, w in entries) + "\n"
        res = subprocess.run([exe], input=inp, capture_output=True, text=True)
        print(res.stdout.strip())
        if res.returncode != 0:
            sys.exit("lookup self-test FAILED")

    print("characters in table: %d of %d" % (len(entries), len(chars)))
    print("distinct cues: %d" % len(cue_words))
    if skipped:
        print("\nsyllables the parser cannot cue (their characters are left out):")
        for syl, cs in sorted(skipped.items()):
            print("  %-6s %s" % (syl, "".join(cs[:12]) + ("..." if len(cs) > 12 else "")))


if __name__ == "__main__":
    main()
