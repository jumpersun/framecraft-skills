---
name: kinetic-reel
description: 用代码制作或修改动态文字主导的产品介绍、技术成果展示、作品集与片头，结合 Canvas 排版、three.js 画面、节拍配乐和 MP4 输出。适用于 kinetic typography 或 motion reel，不用于角色叙事水彩动画。
---

# 动态排版短片

以 Canvas 2D、three.js、WebGL 后期和程序合成配乐制作可编辑短片。所有路径相对于本 SKILL.md 所在目录；解析真实 skill 目录后执行脚本，不依赖 Claude API 或固定模型。

## 准备与分镜

先确认受众、主要信息、时长、比例、语言和事实来源，沿用已有输入与授权。继续修改时复用已有作品项目。

1. 运行 `bash <skill-dir>/scripts/new_project.sh --check`。需要 Node ≥22.12、npm、rsync、Chrome、ffmpeg；优先选择已有合适运行时，用本次命令的 PATH 和 CHROME_PATH 指定，不修改用户默认环境。
2. 运行 `bash <skill-dir>/scripts/new_project.sh <new-project-dir>`，目标必须不存在。`--skip-install` 仅复制模板。依赖安装在作品目录；Skill 模板不存 node_modules 或渲染输出。
3. 阅读 [style-guide.md](references/style-guide.md)；制作音频时再读 [sound.md](references/sound.md)。需要长片组织方式时参考 [work-reel-26](examples/work-reel-26/README.md)，按其说明修正示例导入路径。
4. 写项目 `STORYBOARD.md`：各章节时间预算、事实来源、贯穿装置、每个镜头的标题、视觉动作、转场和声音。先展示分镜，再按已有制作授权继续，不额外引入审批。

项目和中间结果放工作区，projectless 聊天默认用 `work/`；最终交付放 `outputs/`。默认 1920×1080，竖屏要重排 HUD、文字、场景与安全区域。

## 内容与实现

- 画面中的真实数字和成果来自提供的材料，保留适用范围；示意数据标 `SCHEMATIC`，不编造指标。
- `reel/cues.js` 维护镜头开始 S、事件 hits、章节 CH、时长 dur；画面和音效读取同一时间轴。模板按 120 BPM 编写，改节奏要同步检查 cues.js 的 B、score.mjs 的 BEAT 和细分音符，不能只改 bpm 字段。
- `reel/reel.js` 每个镜头一函数：背景 → three.js 图层 → 排版与机制图 → HUD；在 SCENES 和 TR 注册镜头与转场。
- 每帧只依赖 t，使用确定随机数，支持并行和乱序渲染。保持图形圆角、半径与合成器参数的边界保护。
- 每个镜头呈现一个具体过程，例如任务路由、状态变化或检索融合。大字给结论，动画解释过程。
- 默认保留醒目大字、黑/奶油/荧光绿配色和节拍切换；按用户品牌和语言调整。中文受众可用中文主标题，选匹配的中文字体并按实际字宽重新排版；CJK 列表须覆盖画面中文字。
- 文字避开 HUD 与底部进度条。转场从观众注视的元素出发，以缩放、虹膜、推移等保持连续。
- 配乐是程序合成电子音乐，不生成演唱或旁白。必要的旁白由用户提供或使用当前环境另有授权的音频能力。

## 检查、配乐与编码

```bash
node render.mjs --sheet=1,4,7,10,13,15.5 --cols=3 --w=640 --out=out/check/sheet.jpg
node render.mjs --stills=10.4 --out=out/stills
node render.mjs --strip=13.8:14.5 --out=out/check/transition.jpg
node music/score.mjs
ffmpeg -y -i music/score.wav -af "highpass=f=30,equalizer=f=250:t=q:w=1:g=-2,loudnorm=I=-14:TP=-1.2:LRA=8" -c:a aac -b:a 192k assets/score.m4a
node render.mjs --frames --workers=4 --fps=30
node render.mjs --encode --out=out/reel.mp4
```

使用 Codex 的 `view_image` 或可用图片工具检查每个镜头、密集文字与每类转场的渲染结果。按实际交付尺寸确认中文可读、数字不碰撞、转场不空帧，修正后再检查。

`--frames` 按源码、画面资产、渲染设置生成缓存签名；画面输入变化后旧生成帧失效，未变化可续跑。`--range=a:b` 用于区间渲染，签名变化后仍需补齐全片；`--force` 强制重画选定区间。`--encode` 检查完整序列并继承帧率与音频路径，可用 `--audio=...` 覆盖；改帧率须重新渲染。只有配乐文件变化时可直接重新 encode，不必重画。

Google Fonts 当前是网络依赖。网络受限或要求稳定交付时，将字体和许可放项目 assets/fonts、改用本地 @font-face 并核对加载结果；不要默认已离线。渲染速度以本机抽样结果为准。

交付前用 ffprobe 检查尺寸、帧率、时长与音轨，用 ffmpeg 完整解码；声音可用频谱和分段 RMS 辅助检查，不能把这些检查当成试听。注明是否完整观看和实际试听，并交付视频、必要的源码及素材来源。模板回归检查：`node --test <skill-dir>/scripts/test-render.mjs`。

仅当用户要求网页片头时阅读 [site-intro](examples/site-intro/README.md)，按需适配自动播放、跳过、静音和 HTTP Range；制作视频本身不包含发布网站。前端手测优先用 Codex 内置浏览器，遵守会话浏览器约定。上游来源与迁移差异见 [provenance.md](references/provenance.md)。
