# CuedKit

**English** | [中文](README.zh-CN.md)

A low-cost, open-source robotic hand and arm kit that performs Mandarin Cued Speech,
with a web course that teaches it.

CuedKit is built for education: the hand shows the handshape, the arm moves to the
position, and the course teaches the handshapes, positions and sounds step by step.
The whole website and course are available in Chinese, because the kit is made for
Mandarin-speaking learners.

## What is in this repository

| Folder | What it is | License |
|---|---|---|
| `docs/` | The website: kit page, assembly videos, and the 13-lesson course that connects to the hand over USB (Web Serial) | MIT (code), CC BY-SA 4.0 (images, videos, text) |
| `arduino/` | Arduino programs for the hand and arm, plus the tool that generates the Chinese character table | MIT |
| `hardware/arm/` | 3D models (STL) of the arm base and arm link, original designs | CC BY-SA 4.0 |

Not included: the 3D model files of the hand (the arm models are included). Its finger mechanism is adapted from
TLPOD's *Overengineered Mechanical Hand V2*, used under MakerWorld's commercial printing
license, which does not allow sharing the files. See [CREDITS.md](CREDITS.md). The kit
ships with the hand and arm already printed. The original finger mechanics are being
developed so the whole hand can be fully open source.

## The kit

Each kit includes the 3D-printed hand and arm, the servos and electronics, and a printed
face sheet. The full parts list and the video assembly guides are on the website's Kit
and Assembly pages.

Electronics: Arduino Uno, PCA9685 servo driver board, 6 × MG90S servos (hand),
3 × RDS3225 servos (arm), 5V power supply, wires.

## Use the website

Open <https://floracao111.github.io/cuedkit/index.html> in **Google Chrome or Microsoft Edge** on a desktop computer.
Connecting to the hand uses the Web Serial API, which Safari, Firefox and mobile browsers
do not support.

## Upload the Arduino program

1. Install the Arduino IDE and the **Adafruit PWM Servo Driver Library** (Library Manager).
2. Open `arduino/cuedkit-speech/cuedkit-speech.ino` and upload it to the Arduino Uno.
3. In the website's Connect page, press **Connect** and pick the Arduino's port.

Serial Monitor settings: 115200 baud, line ending "Newline". You can type Chinese
characters or pinyin (for example `ni hao`). `cuedkit-calibration`, `cuedkit-hand-test`
and `cuedkit-arm-test` help you adjust and test the servos.

## Credits

See [CREDITS.md](CREDITS.md).
