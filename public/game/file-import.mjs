import {unzipSync,strFromU8} from './vendor/fflate.mjs';
const limit=10*1024*1024;
const abortError=()=>new DOMException('已取消导入','AbortError');
const check=signal=>{if(signal?.aborted)throw abortError();};
const resource=name=>new URL('vendor/'+name,document.baseURI).href;
async function loadScript(name,globalName,signal){
  check(signal);if(window[globalName])return window[globalName];
  await new Promise((resolve,reject)=>{
    const script=document.createElement('script');let settled=false;
    const finish=error=>{if(settled)return;settled=true;clearTimeout(timer);signal?.removeEventListener('abort',cancel);if(error){script.remove();reject(error);}else resolve();};
    const cancel=()=>finish(abortError()),timer=setTimeout(()=>finish(Error('导入组件加载较慢，请稍后重试')),45000);
    signal?.addEventListener('abort',cancel,{once:true});script.onload=()=>finish();script.onerror=()=>finish(Error('导入组件未能加载，请检查网络后重试'));script.src=resource(name);document.head.appendChild(script);
  });check(signal);return window[globalName];
}
function textContent(node){return Array.from(node.getElementsByTagNameNS('*','t')).map(t=>t.textContent).join('');}
function wordText(bytes){
  let tooLarge=false;
  const files=unzipSync(bytes,{filter:file=>{if(file.name!=='word/document.xml')return false;if(file.originalSize>8*1024*1024){tooLarge=true;return false;}return true;}});
  if(tooLarge)throw Error('Word 文档内容过多，请只保留单词表后导入');
  if(!files['word/document.xml'])throw Error('无法读取 Word 文件，请使用未加密的 .docx 文档');
  const xml=new DOMParser().parseFromString(strFromU8(files['word/document.xml']),'application/xml');
  if(xml.getElementsByTagName('parsererror').length)throw Error('Word 文档已损坏，请重新保存后导入');
  const body=xml.getElementsByTagNameNS('*','body')[0];if(!body)throw Error('Word 文档中没有正文');
  const lines=[];
  for(const child of body.children){
    if(child.localName==='tbl')for(const row of child.getElementsByTagNameNS('*','tr'))lines.push(Array.from(row.children).filter(c=>c.localName==='tc').map(textContent).join('\t'));
    else if(child.localName==='p')lines.push(Array.from(child.getElementsByTagNameNS('*','r')).map(r=>Array.from(r.children).map(n=>n.localName==='t'?n.textContent:n.localName==='tab'?'\t':'').join('')).join(''));
  }
  return lines.filter(s=>s.trim()).join('\n');
}
export function normalizeRecognizedText(text){
  const lines=String(text).split(/\r?\n/).map(s=>s.trim().replace(/^\d+[.、)）]\s*/,'').replace(/ {3,}/g,'\t').replace(/([a-z])\s*[:：]\s*(?=[\u3400-\u9fff])/ig,'$1\t').replace(/([\u3400-\u9fff]) +(?=[\u3400-\u9fff])/g,'$1')).filter(Boolean);
  const result=[];
  for(let i=0;i<lines.length;i++){
    if(/^[a-z][a-z\s'’.-]*$/i.test(lines[i])&&/^[\u3400-\u9fff]/.test(lines[i+1]||''))result.push(lines[i]+'\t'+lines[++i]);else result.push(lines[i]);
  }
  return result.join('\n');
}
async function imageText(file,onProgress,signal){
  const offline=window.WORD_POP_OCR;
  if(location.protocol==='file:'&&!offline)throw Error('请使用完整离线包打开图片识别功能');
  onProgress(offline?'正在启动离线图片识别…':'正在加载图片识别工具，首次使用需要下载中英文识别数据…');
  const engine=await loadScript('ocr/tesseract.min.js','Tesseract',signal);check(signal);
  let worker,stopped=false,rejectStop;
  const stopPromise=new Promise((_,reject)=>rejectStop=reject);
  const stop=error=>{if(stopped)return;stopped=true;worker?.terminate();rejectStop(error);};
  const cancel=()=>stop(abortError());signal?.addEventListener('abort',cancel,{once:true});
  const timer=setTimeout(()=>stop(Error('图片识别超时，请检查网络、裁剪清晰词表后重试')),120000);
  const bytes=base64=>Uint8Array.from(atob(base64),c=>c.charCodeAt(0));
  // Feed language bytes through a worker-local fetch adapter. This avoids file://
  // requests and the upstream object-language initialization bug in Tesseract 7.
  const offlineAdapter=offline?`const localLanguageData=${JSON.stringify(offline.languages)};const originalFetch=self.fetch.bind(self);self.fetch=(input,init)=>{const url=typeof input==='string'?input:input.url;const match=url.match(/(eng|chi_sim)\\.traineddata(?:\\.gz)?$/);if(match&&localLanguageData[match[1]])return Promise.resolve(new Response(Uint8Array.from(atob(localLanguageData[match[1]]),c=>c.charCodeAt(0))));return originalFetch(input,init);};`:'';
  const workerURL=offline?URL.createObjectURL(new Blob([offlineAdapter,bytes(offline.worker)],{type:'text/javascript'})):resource('ocr/worker.min.js');
  const languages='chi_sim';
  const creation=engine.createWorker(languages,1,{workerPath:workerURL,corePath:offline?'data:text/javascript;base64,'+offline.core+'#core.js':resource('ocr/tesseract-core-lstm.wasm.js'),langPath:resource('ocr'),...(offline?{cacheMethod:'none'}:{}),workerBlobURL:false,logger:m=>{if(stopped)return;if(m.status==='recognizing text')onProgress('正在识别图片 '+Math.round(m.progress*100)+'%');else if(m.status==='loading language traineddata')onProgress('正在加载中英文识别数据 '+Math.round(m.progress*100)+'%');},errorHandler:()=>stop(Error(offline?'图片识别未完成，请换一张清晰词表重试':'图片识别组件加载失败，请检查网络后重试'))});
  creation.then(w=>{worker=w;if(stopped)w.terminate();},()=>{});
  try{
    worker=await Promise.race([creation,stopPromise]);check(signal);
    await worker.setParameters({preserve_interword_spaces:'1',tessedit_pageseg_mode:'6'});
    const result=await Promise.race([worker.recognize(file),stopPromise]);
    if(!result.data.text.trim())throw Error('图片中没有识别到文字，请选择清晰的英汉对照词表');
    return normalizeRecognizedText(result.data.text);
  }finally{clearTimeout(timer);signal?.removeEventListener('abort',cancel);await worker?.terminate();if(offline)URL.revokeObjectURL(workerURL);}
}
export async function readWordFile(file,{onProgress=()=>{},signal}={}){
  check(signal);if(file.size>limit)throw Error('文件超过 10 MB，请拆分词表或缩小图片后导入');
  const ext=file.name.split('.').pop().toLowerCase();
  if(ext==='doc')throw Error('旧版 .doc 暂不支持，请在 Word 中另存为 .docx 后导入');
  if(['png','jpg','jpeg'].includes(ext))return {text:await imageText(file,onProgress,signal),image:true};
  onProgress('正在读取文件…');
  if(ext==='docx'){const bytes=new Uint8Array(await file.arrayBuffer());check(signal);return {text:wordText(bytes)};}
  if(['xlsx','xls'].includes(ext)){
    const XLSX=await loadScript('xlsx.full.min.js','XLSX',signal),bytes=await file.arrayBuffer();check(signal);
    let book;try{book=XLSX.read(bytes,{type:'array',sheetRows:205});}catch{throw Error('无法读取 Excel，请使用未加密的 .xlsx 或 .xls 文件');}
    for(const name of book.SheetNames){
      const rows=XLSX.utils.sheet_to_json(book.Sheets[name],{header:1,raw:false,defval:''}).filter(r=>r.some(c=>String(c).trim()));
      if(rows.length)return {text:rows.map(r=>r.map(c=>String(c).trim()).join('\t')).join('\n'),sheet:name};
    }
    throw Error('Excel 中没有找到单词，请使用两列：英文、中文');
  }
  if(!['txt','csv','tsv','json'].includes(ext))throw Error('请选择 Word（.docx）、Excel（.xlsx/.xls）、PNG、JPG 或 TXT');
  const bytes=await file.arrayBuffer();check(signal);let text=new TextDecoder('utf-8').decode(bytes);
  if(text.includes('\uFFFD'))text=new TextDecoder('gb18030').decode(bytes);
  return {text};
}
