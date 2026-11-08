#include <Wire.h>
#include <Adafruit_PWMServoDriver.h>

// CuedKit hand test (hand only, no arm).
// Serial Monitor: 115200 baud, line ending "Newline".
// Type a hand shape number (1-8), a consonant (p, zh, sh ...), or a pinyin
// syllable (hao, shuo, hua ...). The hand shows the shape for the initial.
// Syllables with no consonant (a, ai, an, e, er, o, ou ...) show hand shape 5.

Adafruit_PWMServoDriver pca = Adafruit_PWMServoDriver(0x40);

// ================== SERVO CHANNELS ==================
const int CH_THUMB   = 0;
const int CH_INDEX   = 1;
const int CH_MIDDLE  = 2;
const int CH_RING    = 3;
const int CH_PINKY   = 4;
const int CH_LATERAL = 5;   // index lateral turn, only used by hand shape 8

// ================== PWM VALUES (tune here) ==================
const int THUMB_OPEN  = 500;
const int THUMB_CLOSE = 300;

const int FINGER_OPEN  = 500;   // middle, ring, pinky
const int FINGER_CLOSE = 150;

const int INDEX_OPEN_IN  = 300; // index open, lateral servo in  (hand shapes 1-7)
const int INDEX_OPEN_OUT = 400; // index open, lateral servo out (hand shape 8)
const int INDEX_CLOSE    = 100;

const int LATERAL_IN  = 500;
const int LATERAL_OUT = 460;

// ================== SPEED (tune here) ==================
// Each step moves every servo up to STEP_SIZE PWM units, then waits STEP_DELAY_MS.
// Smaller STEP_SIZE / larger STEP_DELAY_MS = slower and gentler.
// Full travel (e.g. index 300 -> 100) takes about (200 / STEP_SIZE) * STEP_DELAY_MS.
const int STEP_SIZE     = 5;
const int STEP_DELAY_MS = 10;

// ================== STATE ==================
const int NUM_CH = 6;                  // channels 0-5
int currentPWM[NUM_CH];                // where each servo is now
int targetPWM[NUM_CH];                 // where each servo should go
bool lateralIsOut = false;

// Move every servo toward its target together, a few units at a time.
void moveToTargets() {
  bool moving = true;
  while (moving) {
    moving = false;
    for (int ch = 0; ch < NUM_CH; ch++) {
      if (currentPWM[ch] == targetPWM[ch]) continue;
      int diff = targetPWM[ch] - currentPWM[ch];
      if (diff > STEP_SIZE) diff = STEP_SIZE;
      if (diff < -STEP_SIZE) diff = -STEP_SIZE;
      currentPWM[ch] += diff;
      pca.setPWM(ch, 0, currentPWM[ch]);
      if (currentPWM[ch] != targetPWM[ch]) moving = true;
    }
    delay(STEP_DELAY_MS);
  }
}

// ================== FINGER CONTROL ==================
// These only set targets. showHand() then moves everything smoothly.
void openThumb()  { targetPWM[CH_THUMB] = THUMB_OPEN; }
void closeThumb() { targetPWM[CH_THUMB] = THUMB_CLOSE; }

void openFinger(int ch)  { targetPWM[ch] = FINGER_OPEN; }
void closeFinger(int ch) { targetPWM[ch] = FINGER_CLOSE; }

// Hand shapes 1-7: index open with lateral servo in.
// The lateral servo is only moved here to bring it back after hand shape 8.
void openIndex() {
  targetPWM[CH_LATERAL] = LATERAL_IN;
  lateralIsOut = false;
  targetPWM[CH_INDEX] = INDEX_OPEN_IN;
}

// Hand shape 8 only: index open and turned laterally out.
void openIndexSpread() {
  targetPWM[CH_LATERAL] = LATERAL_OUT;
  lateralIsOut = true;
  targetPWM[CH_INDEX] = INDEX_OPEN_OUT;
}

// Index closed (hand shape 3): bring lateral back in if it was out.
void closeIndexSafe() {
  targetPWM[CH_LATERAL] = LATERAL_IN;
  lateralIsOut = false;
  targetPWM[CH_INDEX] = INDEX_CLOSE;
}

// ================== HAND SHAPES ==================
void hand1() { closeThumb(); openIndex();  closeFinger(CH_MIDDLE); closeFinger(CH_RING); closeFinger(CH_PINKY); }
void hand2() { closeThumb(); openIndex();  openFinger(CH_MIDDLE);  closeFinger(CH_RING); closeFinger(CH_PINKY); }
void hand3() { closeThumb(); closeIndexSafe(); openFinger(CH_MIDDLE); openFinger(CH_RING); openFinger(CH_PINKY); }
void hand4() { closeThumb(); openIndex();  openFinger(CH_MIDDLE);  openFinger(CH_RING);  openFinger(CH_PINKY); }
void hand5() { openThumb();  openIndex();  openFinger(CH_MIDDLE);  openFinger(CH_RING);  openFinger(CH_PINKY); }
void hand6() { openThumb();  openIndex();  closeFinger(CH_MIDDLE); closeFinger(CH_RING); closeFinger(CH_PINKY); }
void hand7() { openThumb();  openIndex();  openFinger(CH_MIDDLE);  closeFinger(CH_RING); closeFinger(CH_PINKY); }
void hand8() { closeThumb(); openIndexSpread(); openFinger(CH_MIDDLE); closeFinger(CH_RING); closeFinger(CH_PINKY); }

void showHand(int id) {
  switch (id) {
    case 1: hand1(); break;
    case 2: hand2(); break;
    case 3: hand3(); break;
    case 4: hand4(); break;
    case 5: hand5(); break;
    case 6: hand6(); break;
    case 7: hand7(); break;
    case 8: hand8(); break;
  }
  moveToTargets();
}

// ================== MAPPING (same as CuedData) ==================
int getHand(String s) {
  if (s == "p" || s == "d" || s == "zh") return 1;
  if (s == "k" || s == "q" || s == "z")  return 2;
  if (s == "h" || s == "r" || s == "s")  return 3;
  if (s == "n" || s == "b" || s == "yu") return 4;
  if (s == "t" || s == "m" || s == "f")  return 5;
  if (s == "w" || s == "l" || s == "x")  return 6;
  if (s == "g" || s == "ch" || s == "j") return 7;
  if (s == "sh" || s == "y" || s == "c") return 8;
  return 0;
}

// ================== PARSER (same as CuedData, hand part only) ==================
void processInput(String input) {
  String initial = "";
  String final = "";
  String glide = "";
  String realFinal = "";

  // Empty initial (syllable starts with a vowel, e.g. a, ai, an, e, er, o, ou):
  // always hand shape 5. Written pinyin "yi", "wu", "yu" go through y / w / yu below.
  if (input.startsWith("a") || input.startsWith("o") || input.startsWith("e") ||
      input.startsWith("i") || input.startsWith("u") || input.startsWith("v")) {
    Serial.print("initial=- glide=- final=");
    Serial.print(input);
    Serial.print(" -> hand 5");
    showHand(5);
    Serial.println();
    return;
  }

  if (input == "yu") {
    initial = "y";
    realFinal = "u";
  } else {
    if (input.startsWith("yu")) {
      initial = "yu";
      final = input.substring(2);
    } else if (input.startsWith("zh") || input.startsWith("ch") || input.startsWith("sh")) {
      initial = input.substring(0, 2);
      final = input.substring(2);
    } else {
      initial = input.substring(0, 1);
      final = input.substring(1);
    }

    realFinal = final;
    if (final != "") {
      if (final.length() > 1) {
        if (final == "ui") { glide = "w"; realFinal = "ei"; }
        else if (final == "iu") { glide = "y"; realFinal = "ou"; }
        else if (final == "un") { glide = "w"; realFinal = "en"; }
        else if (final == "ie") { glide = "y"; realFinal = "e"; }
        else if (final == "ve") { glide = "yu"; realFinal = "e"; }
        else if (final == "in") { glide = "y"; realFinal = "en"; }
        else if (final == "vn") { glide = "yu"; realFinal = "en"; }
        else if (final == "ing") { glide = "y"; realFinal = "eng"; }
        else if (final.startsWith("i")) { glide = "y"; realFinal = final.substring(1); }
        else if (final.startsWith("u")) { glide = "w"; realFinal = final.substring(1); }
        else if (final.startsWith("v")) { glide = "yu"; realFinal = final.substring(1); }
      }
      if (realFinal == "") {
        if (glide == "y") realFinal = "i";
        else if (glide == "w") realFinal = "u";
        else if (glide == "yu") realFinal = "v";
      }
    }
  }

  int handID = getHand(initial);
  if (handID == 0) {
    Serial.println("Invalid input");
    return;
  }

  Serial.print("initial=");   Serial.print(initial);
  Serial.print(" glide=");    Serial.print(glide == "" ? "-" : glide);
  Serial.print(" final=");    Serial.print(realFinal == "" ? "-" : realFinal);
  Serial.print(" -> hand ");  Serial.print(handID);

  showHand(handID);

  if (glide != "") {
    int glideHand = getHand(glide);
    Serial.print(", then hand ");
    Serial.print(glideHand);
    delay(200);
    showHand(glideHand);
  }
  Serial.println();
}

// ================== SETUP / LOOP ==================
void setup() {
  pca.begin();
  pca.setPWMFreq(50);
  Serial.begin(115200);
  Serial.setTimeout(50);

  // Start pose: hand shape 5 (all open), lateral servo in. The servos do not
  // report their position, so this first write is a direct jump; after that
  // every move is smooth.
  hand5();
  for (int ch = 0; ch < NUM_CH; ch++) {
    currentPWM[ch] = targetPWM[ch];
    pca.setPWM(ch, 0, currentPWM[ch]);
  }

  Serial.println("CuedKit hand test ready.");
  Serial.println("Type 1-8, a consonant (p zh sh ...), or a pinyin syllable (hao, ai ...).");
  Serial.println("Extras: 'open' = all fingers open, 'close' = all fingers closed.");
}

void loop() {
  if (!Serial.available()) return;

  String input = Serial.readStringUntil('\n');
  input.trim();
  input.toLowerCase();
  if (input.length() == 0) return;

  if (input.length() == 1 && input[0] >= '1' && input[0] <= '8') {
    int id = input[0] - '0';
    Serial.print("hand ");
    Serial.println(id);
    showHand(id);
  } else if (input == "open") {
    showHand(5);
    Serial.println("all open");
  } else if (input == "close") {
    closeThumb();
    closeIndexSafe();
    closeFinger(CH_MIDDLE);
    closeFinger(CH_RING);
    closeFinger(CH_PINKY);
    moveToTargets();
    Serial.println("all closed");
  } else {
    processInput(input);
  }
  Serial.println("DONE");
}
