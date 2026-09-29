---
sidebar_position: 5
title: 平台差异
---

# 平台差异

| 能力 | Android | iOS |
| --- | --- | --- |
| 原生 SDK | Huawei Scan Kit Plus / RemoteView | ScanKitFrameWork 1.1.2.305 |
| 本地图片公共输入 | file URI | file URI |
| MULTI_FUNCTIONAL 过滤 | 支持 | unsupported |
| torch 请求 | RemoteView 控制 | AVFoundation 尽力控制 |
| 手电 available | 硬件能力 | 硬件能力 |
| lowLight | 厂商暗光回报后提供 | 无可用报告时省略 |
| 原生平台 | 以实际 Gradle/SDK 接线为准 | 官方二进制为 iOS 真机，不包含模拟器切片 |

## 格式 {#formats}

统一 ScanFormat 描述识别结果，不表示两端支持所有输入过滤。iOS 的 ITF 映射为 ITF14；请求不支持的 MULTI_FUNCTIONAL 会明确报 unsupported，不扩成所有码制。

## 手电 {#torch}

torch prop 是请求，onTorchState.on 是实际状态。available 始终表示硬件；lowLight 单独表示环境。iOS 厂商可能占用设备配置锁，不保证请求点亮，显示必须采用实际回报。

## 权限 {#permissions}

Android 查询返回 granted/denied，请求后才可判 blocked；iOS 返回 granted/undetermined/blocked。调用异常抛 ScanError，无法解释的值为 invalid_response。

## Web

browser 条件入口隔离原生模块。组件安全加载并上报 unsupported，图片与权限 Promise 拒绝为 ScanError(reason: unsupported)。Mock 或文档页面不证明设备扫码能力。

安装、Maven、Pods 与最低平台要求见 [安装](/docs/getting-started/installation)。
