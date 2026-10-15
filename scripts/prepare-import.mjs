import {mkdir,copyFile} from 'node:fs/promises';
const root=new URL('../',import.meta.url);
const copy=async(from,to)=>copyFile(new URL(from,root),new URL(to,root));
await mkdir(new URL('public/game/vendor/ocr/',root),{recursive:true});
await copy('node_modules/fflate/esm/browser.js','public/game/vendor/fflate.mjs');
await copy('node_modules/fflate/LICENSE','public/game/vendor/LICENSE-fflate.txt');
for(const file of ['tesseract.min.js','worker.min.js','tesseract.min.js.LICENSE.txt','worker.min.js.LICENSE.txt'])await copy('node_modules/tesseract.js/dist/'+file,'public/game/vendor/ocr/'+file);
await copy('node_modules/tesseract.js/LICENSE.md','public/game/vendor/ocr/LICENSE-tesseract.txt');
await copy('node_modules/tesseract.js-core/LICENSE','public/game/vendor/ocr/LICENSE-core.txt');
// A portable LSTM core works on SIMD and non-SIMD mobile devices alike.
await copy('node_modules/tesseract.js-core/tesseract-core-lstm.wasm.js','public/game/vendor/ocr/tesseract-core-lstm.wasm.js');
for(const lang of ['eng','chi_sim'])await copy(`node_modules/@tesseract.js-data/${lang}/4.0.0_best_int/${lang}.traineddata.gz`,`public/game/vendor/ocr/${lang}.traineddata.gz`);
console.log('Prepared on-demand document and OCR dependencies');
