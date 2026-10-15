import {cp, mkdir, writeFile, readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const root=new URL('../',import.meta.url),out=new URL('../dist-preview/',import.meta.url);
await mkdir(out,{recursive:true});
await cp(new URL('public/',root),out,{recursive:true});
// Bundle the three critical illustrations in HTML. Weak mobile networks should
// not render empty icons just because independent image requests stall.
const assets={};
for(const name of ['lion','icons-a','icons-b'])assets[name]='data:image/webp;base64,'+(await readFile(new URL(`game/assets/${name}.webp`,out))).toString('base64');
let html=await readFile(new URL('game/index.html',out),'utf8');
const bootstrap=`<script>window.WORD_POP_ASSETS=${JSON.stringify(assets)};for(const [key,name] of [['a','icons-a'],['b','icons-b']])document.documentElement.style.setProperty('--toy-atlas-'+key,'url("'+window.WORD_POP_ASSETS[name]+'")');</script>`;
html=html.replace('</head>',bootstrap+'</head>').replaceAll('src="assets/lion.webp"','src="data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs="');
html=html.replace('href="assets/lion.webp"','href="data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs="');
const applyImages='<script>document.querySelectorAll(\'img[data-asset="lion"]\').forEach(img=>img.src=window.WORD_POP_ASSETS.lion);document.querySelector(\'link[rel="icon"]\').href=window.WORD_POP_ASSETS.lion;</script>';
html=html.replace('<script src="config.js',applyImages+'<script src="config.js');
await writeFile(new URL('game/index.html',out),html);
await writeFile(new URL('game/config.js',out),'window.WORD_POP_CONFIG = {preview: true};\n');
await writeFile(new URL('index.html',out),'<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>单词消消乐</title><script>location.replace("game/index.html"+location.search)</script><a href="game/index.html">进入单词消消乐</a></html>');
await writeFile(new URL('.nojekyll',out),'');
console.log('H5 preview built: '+fileURLToPath(out));
