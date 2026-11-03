# YouTube 连接诊断

2026-11-03 在当前云环境复测：

- 环境已运行并连接；当前网络策略为 `unrestricted`、状态 `enforced`，配置与实际版本一致。不是等待用户应用域名白名单。
- 保留平台提供的 HTTPS 代理和证书验证。访问 `https://www.youtube.com/` 及 `/results?search_query=VOA+The+Interview` 均返回 `curl: (56) CONNECT tunnel failed, response 403`，代理响应为 `HTTP/1.1 403 Forbidden`、`server: envoy`。
- 同环境、同代理访问 `https://learningenglish.voanews.com/`，CONNECT 成功，源站 HTTP 200；具体课程页也能读取。
- 环境诊断工具没有保留更详细的网络诊断记录。

已定位到 HTTPS 隧道建立阶段的出口代理拒绝；尚未取得 YouTube 页面响应，不能归因为验证码、账号、视频版权限制或字幕工具。现有证据不能进一步区分平台保护规则、上游代理策略或配置异常。需要环境平台侧查询出口拒绝日志才能确定具体规则；重复保存“允许全部网络”没有已知依据能解决这个问题。

向环境平台支持反馈时，可提供上述日期、目标网址、两次 HTTP 状态和“unrestricted/enforced 仍 CONNECT 403”的结果，要求核对 YouTube 出口规则。不要附带代理认证信息或密钥。

后续仍优先选择 YouTube 美音素材。云环境抓取、学习者浏览器嵌入播放、字幕下载与全文转载是独立环节，须分别核实。当前先使用已核实的 VOA 官方视频和可转载课文；不猜测 YouTube ID、不把未验证的链接标记为可播放，也不绕过平台出口限制。

## 具体视频与播放器实测

同日选取真实视频 [Me at the zoo — jawed](https://www.youtube.com/watch?v=jNQXAC9IVRw) 做连通性测试（19 秒，仅为网络样本，不是学习课程）：

| 环节 | 实测结果 |
| --- | --- |
| watch 视频页、oEmbed 元数据接口 | CONNECT 403 |
| www.youtube.com/api/timedtext 字幕接口 | CONNECT 403，无法据此判断该片字幕是否存在 |
| www.youtube-nocookie.com/embed/jNQXAC9IVRw | HTTP 200，能显示正确标题、作者和播放按钮 |
| 点击播放后的播放器接口 | HTTP 200，playabilityStatus 为 OK、playableInEmbed 为 true，返回标题和 19 秒时长 |
| 视频流 | rr3---sn-a5meknzl.googlevideo.com 和 rr1---sn-najern7r.googlevideo.com 均 CONNECT 403 |
| 缩略图 | i.ytimg.com CONNECT 403 |
| 实际播放状态 | 点击播放并观察后 currentTime=0、duration=19、readyState=0，没有取得可播放画面 |

因此不能概括为所有 YouTube 服务都不可访问：官方嵌入页面及播放器元数据可访问，主站、缩略图和本次播放器选择的视频分发节点被出口拒绝。平台排查应同时检查 youtube.com、ytimg.com 和 googlevideo.com 的出口规则；上述节点只是本次样本，不能用固定节点名单保证所有视频可播。

浏览器测试使用 Chromium，并将其网络请求交给保留环境代理、验证环境 CA 的 Python HTTPS 客户端后交回浏览器执行，以处理 Chromium 不识别环境 CA 的问题。没有永久修改证书信任库，没有关闭上游 TLS 验证，也没有绕过被拒绝的目标。结果描述云环境中的此次测试，不代表学习者自己的浏览器一定无法播放。
