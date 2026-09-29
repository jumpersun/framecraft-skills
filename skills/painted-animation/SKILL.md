---
name: painted-animation
description: 用代码制作或修改水彩墨线风格的角色动画、叙事短片与歌词 MV，包含分镜、角色表演、逐镜头渲染检查及 MP4 输出。适用于手绘二维动画，不用于动态文字主导的产品展示片。
---

# 水彩角色动画

基于 p5.js、p5.brush、Puppeteer 和 ffmpeg 制作可编辑的视频。所有路径相对于本 SKILL.md 所在目录；先解析真实 skill 目录，再执行其中脚本。支持 Codex，不依赖 Claude API 或固定模型。

## 建立项目

1. 确定主题、时长、比例、语言和音频来源。沿用用户已给的信息；可推断的细节直接决定。先检查已有项目，修改视频时继续使用该项目。
2. 新建项目先运行 `bash <skill-dir>/scripts/new_project.sh --check`。需要 Node ≥22.12、npm、rsync、Chrome、ffmpeg；歌词节拍分析另需 Python 3 和 numpy。PATH 中版本不合适时优先选用已有运行时，设置本次命令的 PATH；Chrome 可用 `CHROME_PATH` 指定。依赖缺失时准确报告，不把检查失败写成 ready。
3. 运行 `bash <skill-dir>/scripts/new_project.sh <new-project-dir>`；目标必须不存在。`--keep-demo` 保留演示镜头，`--skip-install` 只复制模板。已带锁文件的项目使用 npm ci；依赖装在作品项目里，保持 Skill 模板干净。
4. 阅读项目的 [ANIMATION_GUIDE.md](template/ANIMATION_GUIDE.md)，用 Codex 图片查看工具查看 [表情](template/docs/emotions.jpg) 和 [视角](template/docs/views.jpg)。歌词或多章节作品再读 [music-video.md](references/music-video.md)。

项目和中间文件放在用户工作区；projectless 聊天默认放 `work/`，最终 MP4、封面和交付说明放 `outputs/`。模板默认 1920×1080；竖屏要同时调整布局、相机和字幕区域，并逐镜头检查。

## 分镜与实现

先在项目写 `STORYBOARD.md`：一句话故事、角色和情绪弧线、色彩变化、逐镜头时间表，以及每一时刻观众需要理解什么。把分镜展示给用户；已有明确制作授权时继续实现，只有关键内容缺失才询问。

- `src/config.js` 设置 duration、bpm、offset、audio。一镜头一个绘制函数，章节放在 `src/scenes/`，使用 IIFE 避免 p5 全局命名冲突；用 `shots([[t0, fn], ...])` 注册并加入 studio.html。
- 默认保持水彩、纸张纹理、墨线抖动和二维角色表演。Clawd 可替换为用户角色；先统一角色模型和关键姿势，再补运动。
- 一次呈现一个信息点，动作有准备和余势，重要含义留出阅读时间。转场衔接角色动作、视线或构图。
- 每帧必须只由时间 t 决定；使用 hash、boilSeed 和确定的随机种子，避免跨帧状态。为独立背景和道具设置 boilSeed，减少无意抖动。
- 默认用动作讲故事；用户要求标题、中文标注或字幕时按要求加入，用 overlayHook 绘制清晰文字，并检查字体、遮挡和阅读时间。用户需求优先于上游指南的无文字风格偏好。
- 歌词 MV 使用用户提供的歌曲和 LRC/时间表；beat_grid.py 用于估计 BPM 与节拍相位，结果仍需核对。karaoke.js 按行时间推进高亮，不提供自动逐字识别或人声生成。
- 仅在用户授权多 Agent 时采用 music-video.md 的章节委派方法；否则顺序完成各章。

## 渲染检查与输出

在作品项目中执行：

```bash
node render.mjs --sheet=0.1,0.8,1.6,2.4 --cols=4 --w=480 --out=out/check/shot.jpg
node render.mjs --strip=2.1:2.6 --out=out/check/motion.jpg
node render.mjs --sheet=2.3 --crop=760,420,500,400 --w=500 --out=out/check/face.jpg
node render.mjs --frames --workers=4 --fps=24
node render.mjs --encode --out=out/video.mp4
```

用 `view_image` 或当前 Codex 提供的图片工具查看实际渲染图：覆盖每个镜头、关键动作、转场和承载情绪的面部。检查脚和手持物接触、表情过渡、观众阅读时间、文字与画面冲突；修正后重新渲染对应检查图。

短视频也可 `node render.mjs --clip --out=out/video.mp4`。`--frames` 将项目画面输入和帧率写入缓存签名：代码、布局或本地视觉资产变化会使已有生成帧失效；未变化可续跑。`--range=a:b` 只渲染区间，新签名后须补齐整片才能 encode；`--force` 强制重画选定区间。`--encode` 验证完整帧序列，继承渲染时的音频配置，也接受 `--audio=assets/song.mp3` 覆盖；改变帧率须重渲染。

字体当前仍从 Google Fonts 加载。网络不可用或要求可复现交付时，将所需字体及许可放到项目 assets/fonts，改为本地 @font-face 并确认字体加载后渲染；不要把 fallback 字体当成已验收。GPU 性能须实际测量，水彩填充多时先抽样再决定复杂度和并发数。

交付前用 ffprobe 检查尺寸、帧率、时长、视频/音轨，再用 ffmpeg 完整解码验证。明确区分静帧检查、连续帧检查、完整观看和试听；只报告实际完成的验证。保留源码与音频来源，需要时打包。模板回归检查：`node --test <skill-dir>/scripts/test-render.mjs`。

用户反馈歌词视频画面单一，或需要多场景案例时，阅读 [qingtian-workflow.md](references/qingtian-workflow.md)。上游来源、许可证和迁移差异见 [provenance.md](references/provenance.md)；上游案例见 [xiaozhen](examples/xiaozhen/STORYBOARD.md)。
