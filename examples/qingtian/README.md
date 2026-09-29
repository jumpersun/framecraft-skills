# 《晴天》40 秒水彩歌词 MV

[![晴天预览](../../docs/assets/qingtian-preview.gif)](https://github.com/jumpersun/framecraft-skills/releases/download/v1.0.0/qingtian-40s-v2.mp4)

[下载 MP4](https://github.com/jumpersun/framecraft-skills/releases/download/v1.0.0/qingtian-40s-v2.mp4) · [下载含片段音频的完整案例工程](https://github.com/jumpersun/framecraft-skills/releases/download/v1.0.0/qingtian-example-v1.0.0.zip) · [提示词](prompts.md) · [分镜](STORYBOARD.md) · [检查记录](validation.md)

## 作品信息

| 项目 | 本次选择 |
| --- | --- |
| 歌曲 | 周杰伦《晴天》，音频与歌词由用户提供 |
| 原曲区间 | 104.590–144.590 秒，即 1:44.590–2:24.590 |
| 输出 | 40 秒，1920×1080，24 fps，960 帧，H.264 + AAC |
| 叙事 | 等待放晴 → 回忆陪伴 → 风中分别 → 短暂重逢 → 告别与放下 |
| 角色 | 橙色男孩、戴小花的粉色女孩 |
| 贯穿道具 | 纸飞机；雨滴、小花与纸张辅助呼应 |
| 技能 | `painted-animation` |
| 画面 | 代码绘制的水彩与墨线，没有使用图像/视频生成模型 |

## 为什么选这 40 秒

这段从“等到放晴”的期待转入回忆，经过距离、短暂重逢与最后告别，能形成一个完整的情绪段落。尾部保留少量尾音和间奏，用于屋顶放飞与片尾，避免在故事中间突然结束。

选段时间只对本次音源有效。不同专辑、现场版、前奏长度或文件静音可能造成偏移，应结合实际音频重新核对。

## 歌词如何变成画面

| 歌词含义 | 具体事件 | 镜头选择 |
| --- | --- | --- |
| 等待放晴、希望好一点 | 雨滴滑落、窗帘打开、独处者抬头 | 环境特写 → 室内中景 → 表情近景 |
| 长久的陪伴 | 三张照片打开、雨中撑伞 | 俯拍回忆 → 双人中景 |
| 距离被拉远 | 风中长街、巴士离开、窗外身影缩小 | 远景 → 站台 → 车内视角 |
| 短暂多爱一天 | 跑向对方、桥上重逢、河边分享饮料、落日 | 横向运动 → 暖色中景与时间变化 |
| 最终告别 | 双手分开、小花瓣落下、挥手与离开 | 道具特写 → 暮色站台 |
| 尾音与间奏 | 把纸飞机放飞 | 屋顶远近层次 → 抬镜 → 纸色片尾 |

详细起止时间、色彩和转场见 [十三镜头时间表](STORYBOARD.md)。

## 从 v1 到 v2 的迭代

用户认为初版画面单一。复查发现初版反复使用校园建筑、双人正面构图和递纸飞机动作。

| 维度 | 初版问题 | 丰富版做法 |
| --- | --- | --- |
| 地点 | 同一校园背景反复出现 | 雨窗、室内、相册、街角、长街、车站、车窗、小桥、河边、屋顶 |
| 景别 | 中远景居多 | 环境特写、人物近景、双人中景、长街远景、手部特写 |
| 视角 | 常站在两人面前看 | 俯看相册、从车内看分别、跟随纸飞机 |
| 时间 | 环境变化少 | 雨停与窗光、落日下沉、站台灯光、晴空收尾 |
| 动作 | 正面站立和递道具重复 | 抬头、靠近、撑伞、远去、跑近、分享、松手、挥别、放飞 |
| 细节 | 雨丝、水纹与栏杆部分未正常绘制 | 修复两点线段路径，补回空间细节 |

在实际抽帧检查中还修正了伞柄遮挡、车窗内人物露腿、着色器状态问题，以及松手特写中的局部跳色。最后一次将躯干移出手部特写，让双手从画面两侧进入，突出分开的过程。

## 复现成片

### 方式 A：使用完整案例包

从上方 Release 链接下载 `qingtian-example-v1.0.0.zip`。解压后进入其中的 `project/`，已带所需的 40 秒音频，直接执行下面的依赖安装与渲染步骤。完整歌曲不在包内。

### 方式 B：使用 Git 中的工程

建议复制工程到仓库之外的独立目录，以免整个仓库的其他修改影响渲染缓存：

```bash
git clone https://github.com/jumpersun/framecraft-skills.git
cd framecraft-skills
cp -R examples/qingtian/project ../qingtian-demo
cd ../qingtian-demo
```

Git 中不带音频。使用自己的音源生成片段，替换下面的文件路径：

```bash
ffmpeg -y -ss 104.590 -i '/path/to/周杰伦-晴天.flac' -t 40 \
  -map 0:a:0 -map_metadata -1 -vn \
  -af 'volume=-2dB,afade=t=in:st=0:d=0.15,afade=t=out:st=38.3:d=1.7' \
  -ar 44100 -ac 2 -c:a pcm_s24le assets/qingtian-40s.wav
```

原音源不同则先调整区间和歌词时间。上述处理不变速、不改调。

### 安装、抽帧、渲染

需要 Node.js ≥22.12、Chrome、ffmpeg 和 ffprobe。进入工程目录后：

```bash
npm ci --no-audit --no-fund

# 先查看几种景别与字幕
node render.mjs --sheet=1.2,6.2,9.1,12.1,20.5,26.1,29.8,33.5,37.6 \
  --cols=3 --w=480 --out=out/check/storyboard.jpg

# 手部关键动作：连续帧
node render.mjs --strip=29:29.5 --fps=24 --cols=5 --w=384 \
  --out=out/check/hands.jpg

# 渲染所有画面，再编码
node render.mjs --frames --workers=4 --fps=24
node render.mjs --encode --out=out/qingtian-40s-v2.mp4
```

Chrome 不在标准位置时设置 `CHROME_PATH`，或给渲染命令添加 `--chrome=浏览器可执行文件路径`。可用 `node gpu_probe.mjs` 了解当前 GPU，实际耗时以本机抽样结果为准。

每次修改代码或本地画面资产后，先重新运行 `--frames`。渲染器会使旧签名失效；不要在修改场景后直接用旧帧编码。

### 修改背景时

项目已带十张预绘制的水彩布景。仅复现成片无需重新生成它们。修改 `src/scenes/qingtian-world.js` 或背景绘画逻辑后执行：

```bash
node bake-backgrounds.mjs
node render.mjs --frames --workers=4 --fps=24
node render.mjs --encode --out=out/qingtian-40s-v2.mp4
```

背景图是在最终纸纹和字幕合成前导出的。人物、雨、道具、光线和镜头继续逐帧绘制，避免重复叠加纸纹或把人物烘焙成静止背景。

## 修改哪一个文件

| 目标 | 工程内文件 |
| --- | --- |
| 时长、节拍、音频 | `src/config.js` |
| 十三个镜头与人物动作 | `src/scenes/qingtian-rich.js` |
| 布景与图层 | `src/scenes/qingtian-world.js`、`assets/rich/` |
| 共用人物、道具 | `src/scenes/qingtian.js`、`src/clawd.js` |
| 歌词时间 | `assets/lyrics.json`、`src/lyrics-data.js`、`assets/qingtian.srt` |
| 字幕位置、片头片尾 | `src/qingtian-captions.js` |
| 字体 | `studio.html`、`assets/qingtian-brush.ttf` |
| 编码与缓存 | `render.mjs`、`render-support.mjs` |

歌词 JSON、JS 数据和 SRT 是不同用途的静态文件，修改时需要同步；没有宣称它们会自动互相生成。字体子集只覆盖本例所需字符，新增文字后必须检查缺字。

## 成片检查

```bash
ffprobe -v error -show_streams -show_format -of json out/qingtian-40s-v2.mp4

ffmpeg -hide_banner -nostats -i out/qingtian-40s-v2.mp4 \
  -filter_complex '[0:v]blackdetect=d=0.25:pix_th=0.05,freezedetect=n=-45dB:d=2[v];[0:a]ebur128=peak=true[a]' \
  -map '[v]' -map '[a]' -f null -
```

检查完整解码、轨道长度、黑场与冻结区间。这里的阈值是本片使用的检查设置，有意设计的黑场或静止镜头需要结合分镜判断，不能机械地当作错误。

本次实际结果为 40.000 秒、960 帧、AAC 44.1 kHz 双声道、综合响度 -11.9 LUFS、真峰值 -1.5 dBFS；未检测到超过上述阈值的黑场和冻结。详细边界见 [检查记录](validation.md)。不同平台重渲染的文件哈希不保证相同。

## 参考与边界

歌词时码来自本机模型对齐与文本整理，未人工逐字听校。节拍分析给出约 137.8 BPM，角色运动采用半速约 68.9 BPM；歌词镜头切点由句意和实际时间共同决定，没有强制每个镜头按同一拍数切换。

制作时的抖音参考页面无法提供可读取视频，因此不声称逐镜头复刻该视频。实际画风参考是原仓库的水彩角色示例。

本工程遵循仓库 [MIT 代码许可](../../LICENSE)，音乐、歌词和字体范围见 [NOTICE](../../NOTICE.md)。
