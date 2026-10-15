# 发布状态 · ui7

2026-10-15：仓库所有者 jwj-dot12 的读写权限已确认，用户选择先准备免费 H5 预览，不创建付费资源。

GitHub Pages 已启用，ui6 首次部署成功，用户确认微信可以打开 https://jwj-dot12.github.io/Game/ 。

ui7 修复手机插画缺失，添加微信分享入口、默认昵称 Holly LU、地域上海及制作人信息。8 项自动测试通过，浏览器验证了图片请求阻断后的素材显示、真实通关、地域排版、分享回退及海报二维码。记录在 verification/ui7-report.json、verification/ui7-full-report.json。

提交到 main 自动触发构建和部署，工作流新增对已发布 HTML 内嵌图片及关键脚本的检查。部署是否成功，以该提交对应 Actions 的 build、deploy 及 Verify published page and bundled illustrations 步骤为准。

静态预览明确显示本机榜，真正联网排行仍需后端托管。本轮不调用 Lovable，不覆盖旧站真实成绩。
原生微信小游戏/小程序尚未开发或提交审核；本次交付为 H5。微信分享使用右上角菜单引导及普通链接、二维码，未接入公众号 JS-SDK。自动化浏览器验证不能代替微信真机复核。
