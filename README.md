# 码农口语提升指南

无需构建的静态学习网站：从约 B1 出发，用半年练习真正会用到的工作英语。会议里说清进展与阻碍，展示时解释方案，技术分享时讲清原理，面试时讲明自己的贡献。

- **工作场景优先**：会议发言、方案展示、技术分享、项目与技术面试。总体保留 80% 工作、20% 生活的方向，生活素材不作为当前主课；不再因 B1 水平选择剧情式教学对话。
- **目前以通用美式英语为目标**：认真纠正发音，培养稳定示范和自我纠正能力；半年后再增加印度英语等口音训练。
- **按掌握程度推进**：看约 5 分钟视频 → 自评简单／适合／困难 → GPT 对话观察 → 带回反馈 → 动态调整下一课。无单独入学考试或固定分数门槛。
- 目标是向熟悉工作场景中的 B2 沟通能力迈进，不保证学时自动对应语言等级。

## 当前内容

单页阅读器式课程主页：桌面并排显示视频与完整课文，手机上下排列；英文正文保留全部段落，支持中文显隐、全文下载与直接跳转背诵。来源、目标和训练安排折叠收纳，自评放在课文之后。保留视频与课文、词汇与句型、可选练习、外教陪练、反馈与进度五个标签页；选择已发布的学习周次可复习旧课，不预生成整套课程。视觉调整不改课程正文、外教指令或正式成绩。

进度条只统计正式复核完成的周次，占 26 周计划的比例。同一周若拆为多课，须全部完成才计入一次。网页暂存反馈、视频自评及知识练习均不推进进度。带回外教报告后，由维护者复核、记录调整建议；本人确认本周完成后更新进度，并按表现选下一课。

优先使用本地托管的 Noto Sans SC 可变字体，系统字体兜底；字体按字符范围加载，保留 SIL Open Font License，不依赖外部字体服务。来源与版本见 [字体说明](assets/fonts/README.md)。

**第 0 周：VOA《The Interview》保留为已完成历史课。** 2026-11-08 经本人确认完成，复核依据为 GPT 外教文字报告与本人补充；发音与口语流畅度未评估，不追改原成绩。

**2026-11-16 选材调整：替换第 1 周未完成的《He Said – She Said》。** 学习者明确反馈剧情题材缺乏兴趣，希望练真实工作沟通。新课使用 Exponent 的 [APIs Explained (in 4 Minutes)](https://www.youtube.com/watch?v=bxuYDT-BWaI)（实际 03:57），配套会议、方案展示、技术分享和面试任务；用熟悉词汇、短句和必要提示控制难度，不把兴趣反馈换算成能力评分，也不要求先完成旧课。第 1 周继续待评估，课程 ID 改为 `02-workplace`，不沿用旧课的浏览器自评或报告。素材核实与许可限制见 [来源记录](docs/source-policy.md)。

第 0 周为 **2026-11-02—11-08**，按周一划分，26 周编号为 0—25。可以跨周补学，不按日期自动完成。

当前视觉参考 UI UX Pro Max 的 [Pet Grooming & Spa 实际演示](https://uupm.cc/demo/pet-grooming)：奶白底 `#FFF9F5`、杏橙 `#FF8C42`、薄荷绿 `#06D6A0`、莓粉 `#FF6B9D` 和深灰正文 `#2D3436`。沿用柔和圆角与轻量立体阴影，保留阅读器结构，不照搬营销区块。橙色按钮使用深色文字，链接与彩色标签使用加深后的文本色；键盘焦点及减少动态效果设置仍有效。

设计工具结合 [Anthropic frontend-design](https://github.com/anthropics/skills/tree/main/skills/frontend-design)、[Emil Kowalski 的设计工程技能](https://github.com/emilkowalski/skills/tree/main/skills/emil-design-eng) 和 [UI UX Pro Max](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill)。UI UX Pro Max 经官方 CLI `2.15.0` 安装于 `~/.agents/skills/ui-ux-pro-max/`，`~/.cursor/skills/ui-ux-pro-max` 指向同一目录，配套 Python 搜索工具已可运行。Anthropic 原版技能及 Apache 2.0 许可保留在 `~/.agents/skills/frontend-design/`，同样通过 Cursor 技能目录链接；这些均为本机开发工具，网站未新增 UI 框架、动画库或运行依赖。

## 本地运行与验证

网站由 HTML、CSS、JavaScript 和 JSON 静态文件组成，没有 Python 后端，也不需要 API 密钥。下面的 Python 3 命令仅用于本地预览；部署到 GitHub Pages 不需要安装或运行 Python。

```bash
cd /workspace/english_speaking_improve
python3 -m http.server 8000 --bind 127.0.0.1
```

通过 HTTP 访问，勿直接双击 HTML：页面使用 fetch 读取课程数据。测试需要 Node.js 18 或更新版本：

```bash
node --test tests/*.test.mjs
```

## GitHub Pages 发布

在仓库 Settings → Pages 中选择 **Deploy from a branch**，分支选择 main，目录选择 / (root)。所有资源采用相对路径，适用于仓库子路径。不自动开启部署；推送代码不代表网站已发布。

如果已经显示 main 和 / (root)，且 Save 按钮为灰色，表示设置已保存，无需再次点击。启用后，符合 GitHub Pages 构建触发条件的推送会启动部署；在 Actions 中查看 pages build and deployment 的结果。部署成功后访问 https://socoo123.github.io/english_speaking_improve/ 。

也可将静态文件交给支持静态网站的平台。ChatGPT 内发布能力以具体产品支持为准。

## 与 GPT 外教协作

1. 先完成当前课的视频观看，记录难易、卡点、实际字幕和倍速；字幕条件以各课来源说明和播放器实际状态为准。不要求先读课文，也不凭看过素材判断完成。
2. 复制本课外教指令到 GPT，会带入材料说明、当前自评和专属工作任务。先独立表达，再接受追问、最小纠正与脱稿重说；只有真实音频证据才能评发音。本站原创表达稿不冒充原视频字幕。
3. 将外教 schemaVersion 2 JSON 报告粘贴到网页校验，可暂存或下载。
4. 把反馈发回维护对话，核对证据后记录调整；本人确认本周完成再更新进度。难度不合适可先换视频，不必先通过旧课。

网页不连接 GPT，不分析音频，也不自动判定 CEFR。浏览器反馈草稿与仓库正式记录分开；换设备可粘贴备份 JSON 恢复。文字测验不能代表口语能力。

不要向公开仓库提交公司机密、真实同事姓名、个人录音或未经脱敏的原始报告。正式记录只保留脱敏摘要。

## 文档

- [目标与推进规则](docs/learning-plan.md)
- [GPT 外教规则](docs/tutor-rules.md)
- [素材选择及许可](docs/source-policy.md)

data/lessons.json 保存课程；data/progress.json 保存经复核的脱敏正式结果与历史，第 0 周已完成，第 1 周待反馈。历史课英文对话署名 VOA；当前课的原创表达稿、中文释义、例句和练习均明确标注，外部视频与原文按各自许可处理，不因字幕可下载就转载。
