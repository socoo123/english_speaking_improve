# YouTube 连接诊断

2026-11-03 在当前云环境复测：

- 环境已运行并连接；当前网络策略为 `unrestricted`、状态 `enforced`，配置与实际版本一致。不是等待用户应用域名白名单。
- 保留平台提供的 HTTPS 代理和证书验证。访问 `https://www.youtube.com/` 及 `/results?search_query=VOA+The+Interview` 均返回 `curl: (56) CONNECT tunnel failed, response 403`，代理响应为 `HTTP/1.1 403 Forbidden`、`server: envoy`。
- 同环境、同代理访问 `https://learningenglish.voanews.com/`，CONNECT 成功，源站 HTTP 200；具体课程页也能读取。
- 环境诊断工具没有保留更详细的网络诊断记录。

已定位到 HTTPS 隧道建立阶段的出口代理拒绝；尚未取得 YouTube 页面响应，不能归因为验证码、账号、视频版权限制或字幕工具。现有证据不能进一步区分平台保护规则、上游代理策略或配置异常。需要环境平台侧查询出口拒绝日志才能确定具体规则；重复保存“允许全部网络”没有已知依据能解决这个问题。

向环境平台支持反馈时，可提供上述日期、目标网址、两次 HTTP 状态和“unrestricted/enforced 仍 CONNECT 403”的结果，要求核对 YouTube 出口规则。不要附带代理认证信息或密钥。

后续仍优先选择 YouTube 美音素材。云环境抓取、学习者浏览器嵌入播放、字幕下载与全文转载是独立环节，须分别核实。当前先使用已核实的 VOA 官方视频和可转载课文；不猜测 YouTube ID、不把未验证的链接标记为可播放，也不绕过平台出口限制。
