# 划词快译 (quick-translate-universal)

一个极简的浏览器划词翻译扩展：**选中任意文字，按一下 `L` 键，立刻在页面上弹出翻译**，不用再右键 → 翻译成中文。

本版本采用 [WebExtensions](https://developer.mozilla.org/zh-CN/docs/Mozilla/Add-ons/WebExtensions) 标准 + `webextension-polyfill`，**同一套代码可运行在 Chrome、Edge、Firefox、360 / QQ 等 Chromium 内核浏览器，以及鸿蒙 5.0+ 华为浏览器**。

## 功能
- 选中单词或一段文字后，**单独按 `L`**（不带 Ctrl/Alt/⌘/Shift）即可翻译
- 翻译结果以浮层形式出现在选区旁边，点别处或按 `Esc` 关闭
- 备用快捷键：`Ctrl + Shift + L`（Mac 为 `⌘ + Shift + L`）
- 可选目标语言：简/繁中文、英、日、韩、法、德、俄、西等
- 双翻译引擎：默认 **MyMemory**（国内可直连、无需 key），可在弹窗切换为 **Google 翻译**（质量更好，国内需代理）；主引擎失败自动尝试备用
- 在输入框内按 `L` 不会误触发，不影响正常输入

## 支持的浏览器
| 浏览器 | 内核 / 方案 | 加载方式 |
| --- | --- | --- |
| Chrome / Edge / 360 / QQ 等 | Chromium | 开发者模式 → 加载解压版 |
| Firefox（桌面 + Android） | Gecko（MV3） | `about:debugging` 临时加载 |
| 鸿蒙 5.0+ 华为浏览器 | Chromium | `chrome://extensions` 加载解压版 |
| Safari（macOS / iOS） | 需 Xcode 转换 | `xcrun safari-web-extension-converter` 转工程后加载 |

> **边界说明**：iOS 上的浏览器（含 Safari iOS）、以及任何不实现 WebExtensions 标准的浏览器，都无法加载此类扩展，这是平台限制，非代码能解决。Safari 需要一台装有 Xcode 的 Mac 做一次转换（见下方）。

## 安装（开发者模式加载解压版）

### Chrome / Edge / 360 / QQ 等 Chromium 内核
1. 打开 `chrome://extensions`（Edge 为 `edge://extensions`）
2. 右上角开启 **开发者模式**
3. 点击 **加载已解压的扩展程序**，选择本仓库根目录（含 `manifest.json` 的文件夹）
4. 选中网页文字，按 `L` 试试

### Firefox（桌面 / Android）
1. 打开 `about:debugging#/runtime/this-firefox`
2. 点击 **临时载入附加组件**，选择本仓库里的 `manifest.json`
3. 选中网页文字，按 `L` 试试（临时加载重启浏览器后失效，正式分发需上架 AMO）

### 鸿蒙 5.0+ 华为浏览器
1. 打开 `chrome://extensions`
2. 开启 **开发者模式**
3. 加载解压版，选择本仓库根目录

### Safari（macOS，需 Xcode）
1. 打开终端，进入本仓库目录，运行：
   ```bash
   xcrun safari-web-extension-converter .
   ```
2. 按提示生成并打开 Xcode 工程，编译运行后，在 Safari 的「扩展」设置里启用
3. 选中网页文字，按 `L` 试试

> ⚠️ **重要**：扩展脚本只在「安装之后刷新过 / 新打开」的页面里生效。若在装扩展前就打开的标签页上测试，按 `L` 会毫无反应——先**刷新一下那个标签页**再试。
>
> 修改代码后，回到扩展管理页点击该扩展卡片上的刷新图标重新加载即可生效。

## 修改快捷键
- Chromium / 鸿蒙：打开 `chrome://extensions/shortcuts` 可修改备用快捷键 `Ctrl + Shift + L`。
- Firefox：打开 `about:addons` → 齿轮 → 管理扩展快捷键。

（Chrome / Firefox 都不允许把快捷键设为单独字母键，所以"按 L"是通过页面内键盘监听实现的，仅限网页内生效。）

## 文件结构
| 文件 | 作用 |
| --- | --- |
| `manifest.json` | 扩展配置与命令定义（含 Firefox 专属 `browser_specific_settings`） |
| `browser-polyfill.min.js` | Mozilla 官方 polyfill，统一各浏览器 `browser.*` API |
| `background.js` | 监听快捷键 / 页面请求，调用翻译接口 |
| `content.js` | 获取选区、页面内 `L` 键监听、显示翻译浮层 |
| `popup.html` / `popup.js` | 设置弹窗（目标语言、翻译引擎） |

## 隐私
扩展仅在网页上注入脚本并访问两个翻译接口域名（`translate.googleapis.com`、`api.mymemory.translated.net`），不收集、不上传任何其他数据。
