#include <Wire.h>
#include <Adafruit_PWMServoDriver.h>

// CuedKit calibration: moves every finger servo to the same starting position
// (all fingers open) so you can attach the servo horns the right way round.
// Upload it once, leave the hand powered, and attach the horns as the guide says.
//
// Servo driver pins: 0 thumb, 1 index, 2 middle, 3 ring, 4 pinky, 5 index sideways turn.

Adafruit_PWMServoDriver pca = Adafruit_PWMServoDriver(0x40);

void setup() {
  pca.begin();
  pca.setPWMFreq(50);

  pca.setPWM(0, 0, 500);  // thumb, open
  pca.setPWM(1, 0, 300);  // index, open
  pca.setPWM(2, 0, 500);  // middle, open
  pca.setPWM(3, 0, 500);  // ring, open
  pca.setPWM(4, 0, 500);  // pinky, open
  pca.setPWM(5, 0, 500);  // index sideways turn, in
}

void loop() {}
