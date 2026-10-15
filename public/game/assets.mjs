const names=['lion','icons-a','icons-b'];
export function assetURL(name){return window.WORD_POP_ASSETS?.[name]||new URL(`./assets/${name}.webp`,import.meta.url).href;}
function load(src){return new Promise((resolve,reject)=>{const image=new Image(),timeout=setTimeout(()=>{image.src='';reject(Error('timeout'));},9000);image.onload=()=>{clearTimeout(timeout);resolve(src);};image.onerror=()=>{clearTimeout(timeout);reject(Error('image load failed'));};image.src=src;});}
let busy=false;
export async function ensureVisualAssets(){
  if(busy)return;busy=true;
  let notice=document.getElementById('visualAssetNotice');
  if(!notice){notice=document.createElement('div');notice.id='visualAssetNotice';notice.className='asset-notice';notice.hidden=true;notice.setAttribute('role','status');document.body.appendChild(notice);}
  notice.textContent='插画正在加载…';
  const delayed=setTimeout(()=>notice.hidden=false,4000);
  const results=await Promise.all(names.map(async name=>{
    let src=assetURL(name);
    try{await load(src);}catch{
      src=new URL(`./assets/${name}.png?retry=${Date.now()}`,import.meta.url).href;
      await load(src);
    }
    if(name==='lion'){
      window.WORD_POP_ASSETS??={};window.WORD_POP_ASSETS.lion=src;
      document.querySelectorAll('img[data-asset="lion"]').forEach(img=>{if(img.src!==src)img.src=src;});
    }else document.documentElement.style.setProperty('--toy-atlas-'+name.slice(-1),`url("${src}")`);
    return src;
  }).map(p=>p.then(()=>true,()=>false)));
  clearTimeout(delayed);busy=false;
  if(results.every(Boolean)){notice.hidden=true;document.documentElement.classList.add('visual-assets-ready');}
  else{notice.hidden=false;notice.innerHTML='<span>部分插画未加载完成</span><button type="button">重试加载</button>';notice.querySelector('button').onclick=ensureVisualAssets;}
}
