export function invitationURL(address, key) {
  const current = new URL(address);
  if (!['https:', 'http:'].includes(current.protocol)) throw new Error('请在网页中生成邀请');
  const url = new URL(current.pathname, current.origin);
  url.searchParams.set('invite', '1');
  if (/^(u[0-9]|challenge)$/.test(key || '')) url.searchParams.set('unit', key);
  return url.href;
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const timer = setTimeout(() => { img.src = ''; reject(new Error('插画加载超时，请重试')); }, 12000);
    img.onload = () => { clearTimeout(timer); resolve(img); };
    img.onerror = () => { clearTimeout(timer); reject(new Error('插画加载失败，请重试')); };
    img.src = src;
  });
}

export async function createInvitationPoster({url, title, score, preview = false}) {
  const [{default: qrcode}, lion] = await Promise.all([
    import('./vendor/qrcode.mjs'), loadImage(new URL('./assets/lion.png', import.meta.url).href)
  ]);
  const canvas = document.createElement('canvas');
  canvas.width = 720; canvas.height = 1080;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('当前浏览器暂不支持海报，请复制链接邀请好友');
  const rounded = (x, y, w, h, r, color) => {
    ctx.beginPath(); ctx.moveTo(x+r,y); ctx.arcTo(x+w,y,x+w,y+h,r);
    ctx.arcTo(x+w,y+h,x,y+h,r); ctx.arcTo(x,y+h,x,y,r); ctx.arcTo(x,y,x+w,y,r);
    ctx.closePath(); ctx.fillStyle=color; ctx.fill();
  };
  const text = (value, x, y, size, color, weight = 700) => {
    ctx.font=`${weight} ${size}px "Microsoft YaHei", "PingFang SC", sans-serif`;
    ctx.fillStyle=color; ctx.textAlign='center'; ctx.fillText(value,x,y);
  };
  const star = (x,y,r) => {
    ctx.save(); ctx.translate(x,y); ctx.beginPath();
    for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,d=i%2?r*.48:r;ctx.lineTo(Math.cos(a)*d,Math.sin(a)*d);}
    ctx.closePath(); ctx.lineWidth=4; ctx.strokeStyle='#fffde4';ctx.fillStyle='#ffd04a';ctx.stroke();ctx.fill();ctx.restore();
  };
  const sky=ctx.createLinearGradient(0,0,0,1080);
  sky.addColorStop(0,'#6dd1df'); sky.addColorStop(.55,'#c7f3e7'); sky.addColorStop(1,'#edf8c9');
  ctx.fillStyle=sky;ctx.fillRect(0,0,720,1080);
  ctx.save();ctx.globalAlpha=.12;ctx.fillStyle='#fff';
  for(let i=0;i<8;i++){ctx.beginPath();ctx.moveTo(360,-80);ctx.lineTo(i*180-380,620);ctx.lineTo(i*180-300,620);ctx.fill();}ctx.restore();
  rounded(222,46,276,48,24,'#effff4');text('好友挑战邀请',360,79,25,'#39766a');
  ctx.font='900 68px "Microsoft YaHei", "PingFang SC", sans-serif';ctx.textAlign='center';ctx.lineJoin='round';
  ctx.lineWidth=12;ctx.strokeStyle='#fffdf2';ctx.strokeText('单词消消乐',360,185);
  ctx.fillStyle='#c88724';ctx.fillText('单词消消乐',360,191);ctx.fillStyle='#f5a923';ctx.fillText('单词消消乐',360,185);
  text('一起来配对，让进步闪闪发光',360,235,26,'#286879');
  star(112,303,25);star(600,442,23);star(565,284,17);
  ctx.fillStyle='#effff5';for(const [x,y,r] of [[35,468,60],[106,488,74],[651,478,70],[709,439,63]]){ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();}
  ctx.fillStyle='#badb78';ctx.beginPath();ctx.ellipse(90,581,275,82,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#d7ec99';ctx.beginPath();ctx.ellipse(570,582,290,94,0,0,Math.PI*2);ctx.fill();
  ctx.drawImage(lion,208,249,304,304);
  rounded(46,565,628,462,36,'#adc378');rounded(46,557,628,462,36,'#fff9df');
  rounded(64,575,592,426,25,'#fffdf0');
  text(title,360,626,34,'#476e37');
  text(Number.isFinite(score)?`我已获得 ${score} 分，等你来挑战！`:'听单词 · 找配对 · 冲刺三星',360,669,25,'#73804b');
  const qr=qrcode(0,'M');qr.addData(url,'Byte');qr.make();
  const cells=qr.getModuleCount(), cell=Math.floor(248/(cells+8)), size=(cells+8)*cell;
  const left=Math.floor((720-size)/2), top=697;
  ctx.fillStyle='#fff';ctx.fillRect(left,top,size,size);ctx.fillStyle='#183d48';
  for(let y=0;y<cells;y++)for(let x=0;x<cells;x++)if(qr.isDark(y,x))ctx.fillRect(left+(x+4)*cell,top+(y+4)*cell,cell,cell);
  text('长按识别二维码，一起拿三星',360,972,25,'#386e61');
  text(preview?'H5 预览版 · 无需登录':'打开就能玩 · 无需登录',360,1054,24,'#50783f');
  return canvas.toDataURL('image/png');
}
