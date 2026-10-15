export function shuffle(values, random = Math.random) {
  const result = [...values];
  for (let i = result.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [result[i], result[j]] = [result[j], result[i]]; }
  return result;
}
export function resultFor({matched, wrong, elapsed, hints, score}) {
  const accuracy = matched / Math.max(1, matched + wrong);
  const par = matched * 6;
  const stars = accuracy >= .95 && elapsed <= par && hints <= 1 ? 3 : accuracy >= .85 && elapsed <= par * 1.6 ? 2 : 1;
  return {stars, accuracy: Math.round(accuracy * 100), bonus: Math.max(0, Math.floor((par - elapsed) / 2)) * 2, score: score + Math.max(0, Math.floor((par - elapsed) / 2)) * 2};
}
export function rankRuns(runs, unit, period, now = new Date()) {
  const start = new Date(now); start.setHours(0,0,0,0); start.setDate(start.getDate() - (start.getDay() + 6) % 7);
  return runs.filter(r => r.unit === unit && (period !== 'week' || r.at >= start.getTime())).sort((a,b) => b.score-a.score || a.elapsed-b.elapsed || a.at-b.at);
}
export function parseWords(input) {
  const text=String(input).replace(/^\uFEFF/,'').trim();
  let raw=[], errors=[], duplicates=0;
  if(!text)return {words:[],errors:['还没有单词。粘贴内容或导入文件试试吧。'],duplicates};
  if(text.startsWith('[')){
    try{const data=JSON.parse(text);if(!Array.isArray(data))throw new Error();raw=data.map(w=>Array.isArray(w)?w:[w.english||w.en,w.chinese||w.zh]);}
    catch{return {words:[],errors:['JSON 格式有误，请使用 [["apple","苹果"],["book","书"]]。'],duplicates};}
  }else{
    const lines=text.split(/\r?\n/).filter(l=>l.trim());
    lines.forEach((line,i)=>{
      let cells=[];
      if(line.includes('\t'))cells=line.split('\t');
      else if(/[,，]/.test(line)){
        let quoted=false,cell='';
        for(let j=0;j<line.length;j++) {const ch=line[j];if(ch==='"'){if(quoted&&line[j+1]==='"'){cell+='"';j++;}else quoted=!quoted;}else if((ch===','||ch==='，')&&!quoted){cells.push(cell);cell='';}else cell+=ch;}
        cells.push(cell);if(quoted){errors.push(`第 ${i+1} 行的引号没有闭合`);return;}
      }else if(/\s*[=＝]\s*/.test(line))cells=line.split(/\s*[=＝]\s*/);
      else if(/\s+-\s+/.test(line))cells=line.split(/\s+-\s+/);
      else {const split=line.match(/^(.+?)\s+([\u3400-\u9fff].*)$/);cells=split?[split[1],split[2]]:[line];}
      if(i===0&&/^(english|en|英文|单词)$/i.test((cells[0]||'').trim()))return;
      if(cells.length!==2){errors.push(`第 ${i+1} 行需要两列：英文、中文`);return;}raw.push(cells);
    });
  }
  const words=[], seen=new Map();
  raw.forEach((w,i)=>{const en=String(w?.[0]??'').trim(),zh=String(w?.[1]??'').trim();
    if(!en||!zh){errors.push(`第 ${i+1} 条缺少英文或中文`);return;}
    if(en.length>80||zh.length>120){errors.push(`第 ${i+1} 条过长（英文最多 80 字符，中文最多 120 字符）`);return;}
    if(!/[a-z]/i.test(en)){errors.push(`第 ${i+1} 条的英文栏需要包含英文字母`);return;}
    const key=en.toLowerCase();if(seen.has(key)){if(seen.get(key)!==zh)errors.push(`“${en}” 有不同释义，请合并为一条`);else duplicates++;return;}
    seen.set(key,zh);words.push([en,zh]);
  });
  if(words.length>200)errors.push('每份词库最多 200 个单词，请分成多个词库');
  if(words.length<2&&!errors.length)errors.push('至少需要 2 个不同的单词才能开始配对');
  return {words,errors,duplicates};
}
