#include <Wire.h>
#include <Adafruit_PWMServoDriver.h>

// CuedKit arm position tester (arm only, PWM values only, no degrees).
// Serial Monitor: 115200 baud, line ending "Newline".
//
// Nudge a motor:   7 +10   8 -5   9 +1      (7 = base, 8 = middle, 9 = top)
//                  7 +     7 -              (nudge by 5)
//                  8 =480                   (go to an exact PWM value)
// Look:            p        print current PWM of all three motors
//                  list     print the five saved positions
// Save / go:       s1..s5   save the current pose as position 1..5
//                  g1..g5   move to saved position 1..5
//                  start    move back to the start pose
// Every move is gradual. Saving prints a line you can paste into this file.

Adafruit_PWMServoDriver pca = Adafruit_PWMServoDriver(0x40);

// ================== CHANNELS ==================
const int NUM_MOTORS = 3;
const int ARM_CH[NUM_MOTORS] = {7, 8, 9};
const char* MOTOR_NAME[NUM_MOTORS] = {"base", "mid", "top"};

// ================== START POSE (arm's current real position) ==================
const int START_POS[NUM_MOTORS] = {525, 475, 325};

// ================== SAFETY (tune here) ==================
// Hard limits per motor. Any move is clamped to these. Tighten them as you find
// the real limits of each joint.
int minPWM[NUM_MOTORS] = {150, 150, 150};
int maxPWM[NUM_MOTORS] = {600, 600, 600};

// One typed nudge / '=' move may not travel more than this many ticks.
const int MAX_MOVE = 100;
const int DEFAULT_NUDGE = 5;     // used for "7 +" and "7 -"

// ================== SPEED (tune here) ==================
// Each step moves every motor 1 tick, then waits ARM_STEP_DELAY_MS.
// 15 ms = about 66 ticks per second. Larger = slower.
const int ARM_STEP_DELAY_MS = 15;

// ================== SAVED POSITIONS ==================
// Starting values are the CuedData positions converted from degrees to PWM
// (old arm angles, not yet tested with the CuedKit hand). Overwrite with s1..s5.
const int NUM_POS = 5;
int savedPos[NUM_POS][NUM_MOTORS] = {
  {520, 457, 325},   // position 1
  {575, 530, 287},   // position 2
  {550, 567, 242},   // position 3
  {537, 575, 242},   // position 4
  {587, 587, 300}    // position 5
};

// ================== STATE ==================
int currentPWM[NUM_MOTORS];

int clampMotor(int m, int value) {
  if (value < minPWM[m]) return minPWM[m];
  if (value > maxPWM[m]) return maxPWM[m];
  return value;
}

void printCurrent() {
  for (int m = 0; m < NUM_MOTORS; m++) {
    Serial.print(ARM_CH[m]);
    Serial.print(" ");
    Serial.print(MOTOR_NAME[m]);
    Serial.print("=");
    Serial.print(currentPWM[m]);
    Serial.print(m < NUM_MOTORS - 1 ? "   " : "\n");
  }
}

// Move all three motors toward target together, 1 tick per step.
void moveTo(const int target[NUM_MOTORS]) {
  int goal[NUM_MOTORS];
  for (int m = 0; m < NUM_MOTORS; m++) goal[m] = clampMotor(m, target[m]);

  bool moving = true;
  while (moving) {
    moving = false;
    for (int m = 0; m < NUM_MOTORS; m++) {
      if (currentPWM[m] < goal[m]) currentPWM[m]++;
      else if (currentPWM[m] > goal[m]) currentPWM[m]--;
      else continue;
      pca.setPWM(ARM_CH[m], 0, currentPWM[m]);
      if (currentPWM[m] != goal[m]) moving = true;
    }
    delay(ARM_STEP_DELAY_MS);
  }
}

// Move one motor to a new absolute value (checks size, clamps to limits).
void moveMotor(int m, int newValue) {
  int diff = newValue - currentPWM[m];
  if (abs(diff) > MAX_MOVE) {
    Serial.print("Too big: ");
    Serial.print(abs(diff));
    Serial.print(" ticks (max ");
    Serial.print(MAX_MOVE);
    Serial.println("). Nothing moved.");
    return;
  }

  int clamped = clampMotor(m, newValue);
  if (clamped != newValue) {
    Serial.print("Limit reached, stopping at ");
    Serial.println(clamped);
  }

  int target[NUM_MOTORS];
  for (int i = 0; i < NUM_MOTORS; i++) target[i] = currentPWM[i];
  target[m] = clamped;
  moveTo(target);
}

void printSaveLine(int n) {
  Serial.print("int pos");
  Serial.print(n + 1);
  Serial.print("[3] = {");
  for (int m = 0; m < NUM_MOTORS; m++) {
    Serial.print(savedPos[n][m]);
    if (m < NUM_MOTORS - 1) Serial.print(", ");
  }
  Serial.println("};");
}

void printHelp() {
  Serial.println("7 +10 / 8 -5 / 9 +1 : nudge base / mid / top.  '7 +' or '7 -' = 5 ticks");
  Serial.println("8 =480              : go to exact PWM");
  Serial.println("p / list            : print current pose / saved positions");
  Serial.println("s1..s5 / g1..g5     : save current pose / go to saved position");
  Serial.println("start               : back to start pose");
}

// ================== COMMANDS ==================
void handleMotorCommand(String input) {
  int m = input[0] - '7';              // '7','8','9' -> 0,1,2
  String rest = input.substring(1);
  rest.trim();

  if (rest.length() == 0) {
    Serial.println("Need + / - / =, e.g. 7 +10");
    return;
  }

  char op = rest[0];
  String num = rest.substring(1);
  num.trim();

  if (op == '+' || op == '-') {
    int amount = (num.length() == 0) ? DEFAULT_NUDGE : num.toInt();
    moveMotor(m, currentPWM[m] + (op == '+' ? amount : -amount));
  } else if (op == '=') {
    if (num.length() == 0) {
      Serial.println("Need a value, e.g. 8 =480");
      return;
    }
    moveMotor(m, num.toInt());
  } else {
    Serial.println("Need + / - / =, e.g. 7 +10");
    return;
  }
  printCurrent();
}

void handleInput(String input) {
  if (input == "p") {
    printCurrent();
  } else if (input == "list") {
    for (int n = 0; n < NUM_POS; n++) printSaveLine(n);
  } else if (input == "start") {
    moveTo(START_POS);
    printCurrent();
  } else if (input == "help" || input == "?") {
    printHelp();
  } else if (input.length() == 2 && (input[0] == 's' || input[0] == 'g') &&
             input[1] >= '1' && input[1] <= '5') {
    int n = input[1] - '1';
    if (input[0] == 's') {
      for (int m = 0; m < NUM_MOTORS; m++) savedPos[n][m] = currentPWM[m];
      Serial.print("Saved position ");
      Serial.println(n + 1);
      printSaveLine(n);
    } else {
      Serial.print("Going to position ");
      Serial.println(n + 1);
      moveTo(savedPos[n]);
      printCurrent();
    }
  } else if (input.length() >= 1 && input[0] >= '7' && input[0] <= '9') {
    handleMotorCommand(input);
  } else {
    Serial.println("Unknown command. Type ? for help.");
  }
}

// ================== SETUP / LOOP ==================
void setup() {
  pca.begin();
  pca.setPWMFreq(50);
  Serial.begin(115200);
  Serial.setTimeout(50);

  // The servos do not report their position, so this first write assumes the arm
  // is already at the start pose. Make sure it is before you power on / upload.
  for (int m = 0; m < NUM_MOTORS; m++) {
    currentPWM[m] = START_POS[m];
    pca.setPWM(ARM_CH[m], 0, currentPWM[m]);
  }

  Serial.println("CuedKit arm test ready. Type ? for help.");
  printCurrent();
}

void loop() {
  if (!Serial.available()) return;

  String input = Serial.readStringUntil('\n');
  input.trim();
  input.toLowerCase();
  if (input.length() == 0) return;

  handleInput(input);
  Serial.println("DONE");
}
