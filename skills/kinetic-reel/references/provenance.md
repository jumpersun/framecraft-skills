# 来源与 Codex 迁移

来源：https://github.com/tuzhechen2005/opus-video-skills

固定提交：59744a69c7b916cfbe4c4ec84006b0c2f5e2fde1。Skill 与模板保留 MIT 许可，见 ../LICENSE 和 ../template/LICENSE；依赖及字体遵循其各自许可。

迁移版使用中文 SKILL.md 和 agents/openai.yaml，保留上游模板、参考文档和案例。上游参考资料中的 Claude、Read 工具和历史性能数字描述原制作环境；当前执行以 SKILL.md 和实际可用的 Codex 工具为准。

初始化先校验运行时与工具，要求全新目标目录，避免覆盖已有项目。渲染器新增输入签名、帧序列完整性检查、音频及帧率元数据，并检查 ffmpeg 失败结果。依赖版本与原有 lock 文件保持不变。

上游保留的创作偏好可根据用户要求调整。模板仍默认横屏、依赖网络字体，不自动完成竖屏布局或本地字体迁移。缓存签名覆盖项目内常见源码与本地视觉文件；外链字体、远程资源和手动修改 node_modules 不在签名内，发生此类变化时使用 --force 重画完整时间轴。为独立作品使用独立项目目录，避免把整个大仓库作为渲染输入。
