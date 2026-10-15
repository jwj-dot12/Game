# 单词消消乐 · 词汇探险岛

独立源码版 **1.6.0 / ui6**，直接维护本仓库，不依赖 Lovable 或 ChatGPT 登录。

## 最新功能

- 探索单元展示 10 张单元卡；综合挑战有独立准备页，混合抽取 20 词，分 4 个阶段完成。
- 通关弹窗自动展示本关排行榜；右上角排行榜默认打开综合挑战榜。
- 排行榜取消分数前的星星，总分列居中；保留单元卡和通关结果的星级。
- 点击“邀请好友挑战”打开弹窗，选择生成二维码海报或复制挑战链接，保留当前单元。
- 海报由设备本地生成；自定义词库的邀请只分享游戏入口，不分享私人词表。
- 保留词表导入编辑、阶段目标、成就、英文喝彩、设备朗读、引导、加载及空状态。

## 本地完整版本

安装 Node.js 24 或更高版本，运行 `npm start`，打开 <http://127.0.0.1:5182/game/index.html>。无需安装 npm 依赖。
Node.js 服务与 SQLite 提供真实联网排行榜，数据库默认为 `data/game.sqlite`。

运行 `npm test` 验证。7 项自动测试覆盖计分、会话归属、重复提交、词库隔离、北京时间周榜、输入校验、限流、持久化和邀请隐私。
`verification/ui6-report.json` 记录浏览器通关、海报二维码解码和五种屏宽验证。截图使用独立测试数据库。

## 免费 H5 预览

运行 `node scripts/build-preview.mjs`，将 `dist-preview/` 部署到静态托管。
仓库已提供 `.github/workflows/preview.yml`：main 更新后自动测试、构建和发布。

首次在仓库 **Settings → Pages → Build and deployment → Source** 选择 **GitHub Actions**。
随后在 Actions 中运行 **Publish H5 preview**，以成功部署显示的地址为准。
预期地址为 `https://jwj-dot12.github.io/Game/`；启用 Pages 且工作流成功前，不代表该链接已可用。

预览版无需托管后端，支持游戏、词库、成就、海报与邀请链接；明确显示“本机预览榜”，只读当前浏览器的真实成绩。
完整服务默认保持联网模式。微信 H5 不是已经上架的原生小程序，仍需公网发布后的微信真机验收。

详见 [微信 H5 预览与小程序上架说明](docs/微信H5预览与小程序上架.md)。

## 完整公网服务

在支持 Node.js 24 的服务器执行 `npm start`，或使用 Dockerfile / Compose。
配置 HTTPS，让页面与 `/api/public/*` 同源；数据库放在持久磁盘中。

| 变量 | 默认值 | 用途 |
| --- | --- | --- |
| HOST | 127.0.0.1 | 容器内设为 0.0.0.0 |
| PORT | 5182 | 服务端口 |
| DATABASE_PATH | data/game.sqlite | 持久数据库路径 |

`docker compose up -d --build` 把服务绑定到本机 8080，以 `game-data` 卷保存成绩。
HTTPS 反向代理指向 `127.0.0.1:8080`。更新时保留数据卷，不用 `docker compose down -v` 清空数据。
本环境已验证 Node.js 运行，尚未构建 Docker 镜像。

API：`POST /api/public/game` 创建挑战，`GET /api/public/rankings` 查询榜单，`POST /api/public/rankings` 提交通关事件，`GET /healthz` 检查服务。
服务端重新计算分数，检查归属、时长、配对及重复提交；本项目是免登录休闲游戏，不是竞技级反作弊服务。

## 数据和许可证

个人进度、成就、设置及词表保存在当前浏览器，不能自动跨设备/域名同步，词表可导出再导入。
旧站真实数据库没有删除，也没有自动迁入本项目；正式切换时需安排成绩迁移，不要用测试数据库覆盖生产库。

二维码模块来自 Kazuhiko Arase 的 MIT 开源项目，代码和许可证在 `public/game/vendor/`，运行时不依赖第三方 CDN。
