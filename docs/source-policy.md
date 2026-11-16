# 视频与文本素材规则

优先 YouTube、自然清晰的通用美式英语和官方真实工作素材：技术讲解、demo、方案展示、技术面试。不得因 B1 选择幼稚剧情；用短分段、术语释义和句子结构支持理解与表达。初期约 5 分钟，优先 4—6 分钟，随后按学习反馈调整；内容相关性优先于机械凑时长，例外须保留准确时长并说明。可下载字幕不代表可转载。

每课记录官方页面、标题、提供者、真实媒体地址（或核实的 YouTube ID）、实际时长、字幕形式、课文/下载地址、许可范围、署名、核实日期和限制。仅核实后标 verified，且说明核实的是哪些事实，不将元数据核实扩大成播放、口音或个人难度保证。不猜视频 ID、片段时间码，不绕过访问限制。未取得公开转载权限时使用原创概述与练习，设置 source.textKind 为 original；页面、TXT 与外教指令均明确不是视频字幕、译文或讲者原话，完整原内容回到官方。虚构教学场景不冒充学员真实经历。

## 第 0 周：The Interview

核实日期：2026-11-03。

- 官方课程：<https://learningenglish.voanews.com/a/lets-learn-english-level-2-lesson-2/3960471.html>，作者 VOA Learning English，Let's Learn English Level 2 Lesson 2。
- 官方 480p 视频：<https://voa-video-ns.akamaized.net/pangeavideo/2021/02/1/17/1706ec69-afcc-40bb-a79c-4a053b5c77ad_480p.mp4>。该地址重定向到官方 voa-video.voanews.eu，核实响应 200。下载同课 240p 文件并用 ffprobe 测得 300.36 秒（显示 05:00），抽查画面确认内置英文字幕，不可关闭。未生成或宣称有人工核对的逐秒字幕。
- 官方课程 PDF：<https://docs.voanews.eu/en-US-LEARN/2021/05/12/62d48f68-0b39-437e-b2e4-b1c750a8ae30.pdf>，已下载并核对教学目标、对话及短语动词。官网完整对话另存本站 TXT，非 SRT/VTT。保留原网页措辞，包括 “I want you team up” 漏写 to；语法说明使用正确结构。
- 许可：<https://learningenglish.voanews.com/p/6021.html> 的 Copyright Statement：VOA 独立制作的文字、音频和视频为公有领域，应署名 VOA；第三方授权内容不在此范围。本课为 VOA 自制教学对话、讲解与角色演出，课文/PDF 未标第三方对话来源。本站署名转载其对话，原创中文释义与配套例句；视频通过官方文件播放，不复制新闻图片或其他第三方素材。
- 美音选材依据：VOA 美式英语教学课程、官方 en-US 语言元数据；题材为工作安排与面试。难度与学习者匹配程度尚待观看自评和实际对话，不能用选材核实替代口语评估。
- 本次 YouTube 请求仍返回 CONNECT 403，未获得可核实的对应 ID，因此先用官方 HTML5 视频；之后取得真实 YouTube 来源再替换。没有声称已验证 YouTube 播放。用户网络、浏览器或原站变化仍可能影响播放，页面提供官方原页与视频直链作为备用。

## 第 1 周当前课：APIs Explained (in 4 Minutes)

核实日期：2026-11-16。课程 ID 为 `02-workplace`，number 为 `02`、week 为 `1`；替换未完成旧课，不新增完成记录。

- 官方原视频：<https://www.youtube.com/watch?v=bxuYDT-BWaI>。读取该视频页得到标题《APIs Explained (in 4 Minutes)》、真实 ID `bxuYDT-BWaI`、作者频道 Aced (formerly Exponent)、发布日 2023-05-22、元数据时长 03:57。本站署名 Exponent（现 Aced）；它是作者面向技术学习者发布的 API 讲解，不是情景喜剧，也不是正式工作会议录像。
- 选材依据：官方简介和返回的自动字幕能支持其主题包括 API 的用途、系统之间的请求与响应、Web API 基本结构。本站只据此确定概念范围，不复制长字幕，不把原创订单查询方案及其取舍归给视频讲者。约四分钟的完整讲解直接服务技术分享、展示与面试，虽略短于 4—6 分钟优先范围，仍优于为凑长度换成无关材料；不拼接、不虚构片段时间码。
- 浏览器核实：官方页首次完整 load 超时，但标题与播放器实际已加载；点击播放后观测 `currentTime=1.038085`、`duration=236.761`、`paused=false`、`readyState=4`。同日使用 Chromium，在本站子路径页面点击 YouTube 嵌入播放器，观测 `currentTime=1.014901`、`duration=236.761`、`paused=false`、`readyState=4`，确认站内短时播放。`durationSeconds` 记录实际 236.761，`duration` 用元数据舍入显示 03:57；播放器时间文本当时为 3:56。不宣称看完、完整核听或所有网络都能播放，始终提供官方来源链接。
- 字幕：读取器返回英文自动生成字幕，有识别错误风险，未逐句核对，不另存字幕。上述浏览器检查时字幕按钮显示 unavailable，页面脚本也可能受完整 load 超时影响；不保证字幕一定可用或可关闭。以学习者实际播放器为准，记录真实字幕、倍速与自评。
- 口音与难度限制：已核实英文技术内容，未独立核听口音、完整音质或语速，不能仅凭英文文字断言美音。通用美音仍是后续选材偏好；是否清晰、适合个人需实际观看反馈，不新增语言成绩。
- 许可依据：已读取 <https://www.youtube.com/static?template=terms>，其中 Permissions and Restrictions 允许通过 YouTube 提供的嵌入播放器展示；License to Other Users 将使用限于平台功能，不授权脱离平台复制字幕或媒体。未取得本视频文本站外转载许可，不推断为公有领域或 CC 授权。仅嵌入/链接官方视频，不提供媒体镜像或字幕副本。
- 作者课程页 <https://www.tryexponent.com/courses/system-design-interviews/system-design-apis> 与作者条款页 <https://www.aced.io/tos> 直读均返回 403 / Cloudflare。搜索能找到页面但不能替代完整许可核实；未绕过限制、未依赖受限页面内容作转载授权判断。
- 本站文字范围：`source.textKind='original'`；`data/transcripts/week-01-workplace-api-original.txt` 为本站原创工作表达稿，内容与课程 text 一致。中文释义、短语例句、句型、可选题、四类工作任务与七天安排同为原创。虚构订单接口用于问题—方案—取舍—下一步表达，未经测试的好处使用条件措辞，不能当成学员真实经历或量化成果。原视频及平台可用字幕链接回官方页；TXT 不是原视频逐字稿。

## 已撤下历史：第 1 周 He Said – She Said

历史核实日期：2026-11-08。2026-11-16 学员因题材无兴趣主动换课，旧 `id02` 从未被评估或记为完成；其课程与节选 TXT 已撤下，仅保留以下来源核实历史，不再作为当前课。原安排曾按首次反馈选同系列工作沟通场景，约 5 分钟、保持原速，首遍纯听后再看字幕；这些条件不自动适用于新课。

- 官方课程与完整对话：<https://learningenglish.voanews.com/a/lets-learn-english-level-2-lesson-3/4027340.html>，作者 VOA Learning English，Let's Learn English Level 2 Lesson 3。
- 官方媒体页：<https://learningenglish.voanews.com/a/let-s-learn-english---level-2---lesson-3-he-said---she-said/5782504.html>。官网播放器显示 05:00。
- 本站使用官网列出的 240p 文件：<https://voa-video-ns.akamaized.net/pangeavideo/2021/02/e/ee/ee3e6fb5-9ea6-4f8b-88b4-c24e14fb2780_240p.mp4?cb=edc3e7884>。下载响应 200，14,251,291 字节；FFmpeg 读取时长 300.40 秒。抽查 75 秒画面，确认字幕烧录在图像中；纯听入口不显示画面，不能称为另一个“可关闭字幕版”视频。不提供未经核对的字幕时间轴，不镜像媒体文件。
- 官方 PDF 链接：<https://docs.voanews.eu/en-US-LEARN/2021/05/12/e0b2588c-bbe4-4a4e-ad46-79a95f277b63.pdf>。本次对话依据官网正文核对，未宣称独立逐句校对 PDF。
- 文本范围：本站只收录按原顺序排列的官网对话节选，省略 Bot 讲解与部分台词，明确标注为节选；TXT 同样标注范围、作者与源页。中文为本站释义，工作情景、例句、测验与七天训练为原创。完整课文链接回官网。
- 许可复核：<https://learningenglish.voanews.com/p/6021.html> 的 Copyright Statement 仍声明 VOA 独立制作文字、音频和视频为公有领域，要求署名；第三方素材除外。本次使用 VOA 自制教学对话，官网未标第三方对话来源；不复制新闻图片等素材，不宣称 VOA 全站内容均可转载。
- 美音依据为同一 VOA 美式英语教学系列及角色，实际匹配程度待学习者纯听反馈。未核实 YouTube ID；不将旧课的 YouTube 403 记录当作本次重新测试的结果。
