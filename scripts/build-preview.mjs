import {cp, mkdir, writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const root=new URL('../',import.meta.url),out=new URL('../dist-preview/',import.meta.url);
await mkdir(out,{recursive:true});
await cp(new URL('public/',root),out,{recursive:true});
await writeFile(new URL('game/config.js',out),'window.WORD_POP_CONFIG = {preview: true};\n');
await writeFile(new URL('index.html',out),'<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>单词消消乐</title><script>location.replace("game/index.html"+location.search)</script><a href="game/index.html">进入单词消消乐</a></html>');
await writeFile(new URL('.nojekyll',out),'');
console.log('H5 preview built: '+fileURLToPath(out));
