# CuedKit

[English](README.md) | **中文**

CuedKit 是一套低成本的开源机械手和机械臂套件，可以打出**普通话线索语**（Mandarin Cued Speech），
并配有网络课程，教你学会它。

CuedKit 专为教育而做：机械手做出手型，机械臂移动到相应的位置，课程则一步一步地教你手型、位置和发音。
整个网站和课程都提供中文界面，面向说普通话的学习者。

## 贡献

- **面向机器人的开放普通话线索语编码。** 代码把汉字或拼音转换成线索：每个音节对应
  8 种手型之一和 5 个位置之一。相同的规则同时运行在浏览器（`docs/js/encoder.js`）
  和 Arduino（`arduino/cuedkit-speech/`）中，并有脚本对 3,755 个常用字的每个音节
  检查两者结果是否一致。
- **能打出线索的手和手臂。** 原创的手掌容纳五根手指和六个舵机，食指还能向侧面移动；
  三个舵机的手臂把手移动到脸周围的五个位置。一块 Arduino Uno 和一块舵机驱动板即可驱动全部。
- **用机器人来教学的课程。** 十三节课在浏览器中运行，并通过 USB 驱动机械手，
  学习者边学边看到每个手型和位置。
- **别人也能搭建和复用的套件。** 零件清单、组装视频、固件和手臂模型都已公开，
  套件按材料成本出售。

## 本仓库包含什么

| 文件夹 | 内容 | 许可 |
|---|---|---|
| `docs/` | 网站：套件页面、组装视频，以及 13 节课程（通过 USB 的 Web Serial 连接机械手） | MIT（代码），CC BY-SA 4.0（图片、视频、文字） |
| `arduino/` | 机械手和手臂的 Arduino 程序，以及生成汉字对照表的工具 | MIT |
| `hardware/arm/` | 手臂底座和手臂连杆的 3D 模型（STL），原创设计 | CC BY-SA 4.0 |

**不包含**：机械手的 3D 模型文件（手臂的模型包含在内）。手指机构改编自 TLPOD 的
*Overengineered Mechanical Hand V2*，在 MakerWorld 商业打印授权下使用，
该授权不允许分享原文件及其衍生文件，详见 [CREDITS.md](CREDITS.md)。
套件寄出时，手和手臂已经打印好。我们正在开发原创的手指机构，让整只手可以完全开源。

## 套件

每套套件包含 3D 打印的手和手臂、舵机和电子元件，以及一张打印好的脸部图。
完整的零件清单和视频组装指南见网站的“套件”和“组装”页面。

电子元件：Arduino Uno、PCA9685 舵机驱动板、6 个 MG90S 舵机（手）、
3 个 RDS3225 舵机（手臂）、5V 电源、导线。

## 使用网站

在电脑上用 **Google Chrome 或 Microsoft Edge** 打开 <https://floracao111.github.io/cuedkit/index.html>。
连接机械手使用的是 Web Serial API，Safari、Firefox 和手机浏览器都不支持。

## 上传 Arduino 程序

1. 安装 Arduino IDE，并在“库管理器”中安装 **Adafruit PWM Servo Driver Library**。
2. 打开 `arduino/cuedkit-speech/cuedkit-speech.ino`，上传到 Arduino Uno。
3. 在网站的“连接”页面点击“连接”，选择 Arduino 的端口。

串口监视器设置：波特率 115200，行结束符选“换行（Newline）”。你可以输入汉字或拼音
（例如 `ni hao`）。`cuedkit-calibration`（校准）、`cuedkit-hand-test`（手部测试）和
`cuedkit-arm-test`（手臂测试）可以帮你调整和测试舵机。

## 致谢

见 [CREDITS.md](CREDITS.md)。
