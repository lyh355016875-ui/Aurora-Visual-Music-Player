# Aurora — Visual Music Player · 项目上下文交接文档

> 供新对话续开发使用。最后更新：v2.1（唱机登台 / 舞台中心 3D 黑胶）。

## 1. 项目目标
做一个**纯前端、零依赖、单文件 HTML** 的可视化音乐播放器：上传本地 MP3，用 Web Audio API 实时分析音频，在 Canvas 上绘制随声起舞的霓虹可视化，并支持主题切换与精致 UI。项目名 **Aurora — Visual Music Player**。

## 2. 当前目录结构
仓库根：`D:\Agents\Qoder CN\Aurora — Visual Music Player\`（路径含 em dash + 空格，shell 中务必加引号）
**v1.4 起采用技术路线 B**：多模块源码 + Vite 打包，交付物仍是单文件零依赖 HTML。
```
Aurora — Visual Music Player/
├── index.html           # Vite 入口（仅 markup，引 /src/main.js）
├── src/
│   ├── main.js          # 装配 + rAF 主循环（dt 帧率无关）
│   ├── store.js         # ~15 行 pub/sub store（唯一事实源）
│   ├── audio.js         # AudioEngine：ctx/analyser/采样
│   ├── viz.js           # Canvas 渲染器：4 模式 + 粒子，dt 缩放
│   ├── turntable.js     # 霓虹玻璃唱机：Canvas 2D 伪 3D 黑胶 + 唱臂
│   ├── ui.js            # DOM 层：列表/控制/主题/拖拽/键盘/toast
│   ├── themes.js        # THEMES + 调色板数学 + 哈希封面
│   └── styles.css       # 全部样式
├── vite.config.js       # vite-plugin-singlefile，outDir=dist
├── scripts/copy-artifact.mjs  # dist/index.html → 根 music-player.html
├── music-player.html    # **构建产物**（提交入库，双击即用）
├── package.json         # devDeps: vite + vite-plugin-singlefile
├── README.md / CONTEXT.md / .gitignore(node_modules,dist)
└── .git/                # 本地仓库，main 分支
```
Git：
- 分支 `main`，跟踪 `origin/main`
- 历史：`v2.0 架构重构` / `b5a497d v1.3` / `e52aba4 v1.1` / `dc46c0f v1.0`（**v1.2 被用户有意跳过**）
- remote `origin` = `https://github.com/lyh355016875-ui/Aurora-Visual-Music-Player`（已强制推送，远程=本地）

## 3. 已完成功能
- 拖拽 / 点击上传 MP3（多首），播放列表（增/删/选/上下首/自动下一首）
- Web Audio 实时频谱：`AudioContext → createMediaElementSource(audio)[仅一次,懒加载] → AnalyserNode(fftSize 2048, smoothing 0.82) → destination`
- 4 种可视化模式：**融合 / 环形 / 频谱 / 波形**（融合=前三叠加+中心黑胶）
- 节拍粒子、贝斯呼吸光晕、中心黑胶旋转、拖尾清屏
- 进度条（带光晕滑块，CSS 变量 `--p` 驱动）、音量、键盘快捷键（Space/←→/↑↓/N/P）
- **6 套主题**（霓虹/日落/深海/森林/糖果/极简），一键切换，`localStorage` 记忆；CSS 变量与画布调色板同步换色
- v1.3 UI：顶部品牌栏（AURORA logo + 动态均衡器）、曲名哈希生成渐变封面（换主题随之变色）、可旋转正在播放封面、模式药丸栏、面板深度高光、`body.playing` 联动微动效
- v2.1 唱机：舞台中心 Canvas 2D 伪 3D 霓虹玻璃黑胶唱机（沟槽/扫光/主题标签/霓虹盘缘/唱臂内移），播放即转 + 惯性减速 + 鼠标视差 + 点击盘面播放暂停
- 布局：grid `"head head" / "side stage" / "side ctrl"`，行 `auto/1fr/96px`，侧栏 320px，圆角 20px

## 4. 正在开发的功能
**v2.1「唱机登台」已完成**：舞台中心新增 Canvas 2D 伪 3D 霓虹玻璃黑胶唱机（`src/turntable.js`）。
- 已实现：同心沟槽 + 曲目分隔带 + `createConicGradient` 双瓣扫光 + 主题渐变中心标签 + 霓虹盘缘（随 bass）+ 玻璃底座椭圆 + 唱臂（支点底座/配重柱/唱头，随播放进度内移）；播放即转、暂停惯性减速（起转 dt*2.6 / 停转 dt*1.0）；鼠标视差倾斜（矩阵 skew + squash）；悬停盘面放大 3% 且指针变 pointer；点击盘面切播放/暂停（`Viz.attachInteraction`，避开 .mode-bar）。
- 渲染顺序：背景辉光 → bars → ring → wave → **唱机** → 粒子；ring 内半径抬到 `min*0.26` 避让盘面；粒子改从盘缘以 0.65 纵向系数喷出。
- 验证：内嵌浏览器 + dev server（`npm run dev -- --port 5183`）截图确认静态观感；**播放态（旋转/唱臂内移/节拍）待用户用真 MP3 实测**。
- 分期路线（用户已确认）：**v2.2 音画同步**（节拍驱动唱臂微跳、bass 光环呼吸、拖盘面搓碟/seek）→ **v2.3 封面入盘**（ID3 真封面贴标签 + 取色驱动主题）→ **v2.4 物件化**（黄铜喇叭/木底座/环境反射/辉光后期）。
- 风格调研仍有两个子代理在跑（产品趋势 / 开源可视化技法）；已抓 4 张参考界面截图到 `research/shots/`（GlassMusicPlayer、Apple Music Liquid Glass、网易云琉璃光波 ×2）。

## 5. 关键技术
- **单文件 HTML**，无任何外部依赖、运行时不发网络请求
- **Web Audio API**：`getByteFrequencyData` / `getByteTimeDomainData`；节拍检测 `bass - beatAvg > 0.18 && bass > 0.45`（beatAvg 为低频平滑均值）
- **Canvas 2D**：径向拖尾清屏 `bgCss(0.28)`；调色板取色 `palAt(t,a)` 在 c1→c2→c3→c4→c1 间循环插值；背景色 `bgRGB` 由主题生成
- **主题系统**：`THEMES` 对象同时驱动 CSS 变量（`--c1..c4,--bg,--bg2`）和画布 `pal=[[r,g,b]...]`；CSS 中用 `color-mix(in srgb, var(--cN) X%, transparent)` 实现主题色高亮/阴影；`applyTheme()` 内调用 `renderList()` 让封面随主题重染色
- **封面生成**：`hashStr(name)` → `coverGrad()` 用 `palAt` 产出 `linear-gradient(135deg,...)`
- **响应式**：`ResizeObserver` + DPR 缩放 canvas；`@media (max-width:820px)` 切单列布局
- **校验方式**：`node --check` 抽取的 `<script>`（临时文件写 `$env:TEMP`）+ 标签配平；无头 Chrome 截图**无法**验证动画（虚拟时间不推进 rAF/音频）

## 6. 已知问题
- **无原生视觉**：`read_image` 报 "model does not declare image input"（glm-5.2 不支持图像输入）。识别用户上传的参考图需借助 vision 技能 CLI（`C:\Users\LYH\.claude\skills\vision\cli.py`），但该 CLI 依赖 `requests`，而**捆绑 Python 运行时的 `requests` 会在会话间被重置/丢失**——每次用前需先 `pip install requests`。附件存储路径：`C:\Users\LYH\.dsh\attachments\v1\objects\<前2位>\<sha256>`（无扩展名，按内容判断 png/jpg）
- **沙箱 ACL（历史）**：v1.1 时工作区根目录缺 `WRITE_OWNER`，用过 `diagnose-windows-sandbox-acl` 修复（备份在 `.acl-recovery/`，现已被清理且已 gitignore）。当前沙箱策略为 **danger-full-access + 审批 never**，pwsh/git 直写正常；若策略切回 workspace-write，受限令牌可能无法写 `.git/index.lock`，届时对 `.git` 路径跑一次 diagnose 或改用非受限提交
- **CRLF 警告**：git 提示 `LF will be replaced by CRLF`（无害，仓库存 LF）
- **调研未完成**：见第 4 节

## 7. 下一步要干什么
1. **等用户实测 v2.1 播放态**（旋转、唱臂内移、视差、点击盘面）并按反馈微调观感。
2. **v2.2 音画同步**：节拍驱动唱臂微跳、bass 光环呼吸、拖拽盘面搓碟/seek；顺带做分析升级（`getFloatFrequencyData` + 对数分带 + spectral-flux 节拍 + 不应期）。
3. **v2.3 封面入盘**：手写 ID3v2.3/2.4 解析（帧长 synchsafe 差异、文本编码 $00/$01/$03）取 APIC 封面贴唱片标签，median-cut 提主色驱动主题（Apple / 网易云那套内容取色）。
4. 每版收尾：README 版本行 → `npm run build` → `git commit`（ASCII）→ `git push`。

## 8. 不能改动 / 需要注意的约束
- **项目目录**：`D:\Agents\Qoder CN\Aurora — Visual Music Player\`（em dash U+2014 + 空格，shell 必须加引号）
- **"单文件"约束现在是交付物级**：源码多模块（src/），`npm run build`（vite + vite-plugin-singlefile）产出根目录 `music-player.html`，仍零依赖、运行时无网络请求；node_modules/ 与 dist/ 已 gitignore，产物入库
- **构建/开发命令**：`npm run dev`（vite dev server）/ `npm run build` / `npm run preview`；esbuild 的 postinstall 被 allow-scripts 策略拦截但不影响构建（vite 走 JS API 找到平台二进制）
- **版本约定**：每版 → 改 src/ → build → README 版本历史追加一行 → `git commit` 本地存档；版本号由用户指定（v1.2 被跳过是有意的）
- **提交信息必须 ASCII**；文件内容中文无妨（UTF-8 无 BOM）
- **远程已绑定** `origin`（GitHub），提交后 `git push` 同步；不要改 remote 或强推已协作的历史
- **验证手段升级**：browser-use MCP 内嵌浏览器可打开 file:// 截图、evaluate_script 点按钮验证交互、list_console_messages 查报错；动画流畅度仍需用户肉眼确认

---

### 附：调研线索（已 web_search 得到的 8 条来源，待 fetch）
- 网易云音乐「琉璃光波」播放器（玻璃光波可视化）— http://ent.ynet.com/2025/12/12/3967774t1254.html
- GlassMusicPlayer（简约 高颜值 毛玻璃 PC&Mobile）— https://github.com/XiangZi7/GlassMusicPlayer
- vibe（桌面音频可视化 + shader 壁纸，Wayland）— https://github.com/TornaxO7/vibe
- Winamp Skins vs Modern Players（怀旧 UI）— https://nobodyposted.com/viewtopic.php?p=12801
- 【律动磁盘】v1.2（旋转磁盘可视化）— https://www.52pojie.cn/thread-2044834-1-1.html
- Music Player Premium（Framer 高级交互组件）— https://www.framer.com/community/marketplace/components/music-player-premium/
- Apple Music vs Spotify 设计对比 — https://codetrait.com/the-design-tug-of-war-between-apple-music-and-spotify-325dead9ea02/
- 网易云「琉璃光波」上线（凤凰网）— https://ent.ifeng.com/c/8p1eLPXFa8E
