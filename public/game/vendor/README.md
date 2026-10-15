# 本地第三方组件

所有组件从本站或离线文件读取，运行时不引用第三方 CDN。

- qrcode：Kazuhiko Arase，MIT，许可证随 qrcode.mjs 保留。
- SheetJS CE 0.20.3：官方发行文件 xlsx.full.min.js，Apache-2.0，见 LICENSE-sheetjs.txt。
- fflate 0.8.3：MIT，npm 构建时复制 fflate.mjs 和 LICENSE-fflate.txt。
- Tesseract.js 7.0.0 及 tesseract.js-core：Apache-2.0，构建时复制引擎、worker 和各自许可证到 ocr/。
- @tesseract.js-data/chi_sim、eng 1.0.0：npm 包元数据声明 MIT，使用 4.0.0_best_int 数据文件；来源 https://github.com/naptha/tessdata。

执行 npm ci、npm run prepare:imports 即可准备开发服务的解析组件。npm run build:preview 会自动执行该准备步骤。
生成的 OCR 数据和 fflate 文件不提交 Git，由锁定版本的依赖重建。离线单文件包含解析组件，交付 ZIP 附带许可证。
