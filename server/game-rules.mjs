// Recalculate scores on the server; never accept client-provided scores or stars.
export function calculateResult(events, total, elapsed) {
  if (!Number.isInteger(total) || total < 2 || total > 200 || !Number.isInteger(elapsed) || elapsed < 1 || elapsed > 7200 || !Array.isArray(events) || events.length > 1500) throw new Error('挑战数据不完整');
  const matched = new Set();
  let score=0, wrong=0, hints=0, combo=0, lastMatch=-Infinity, lastTime=-1;
  for (const e of events) {
    if (!e || !Number.isInteger(e.t) || e.t < lastTime || e.t > elapsed * 1000 + 1000 || e.t < 0) throw new Error('时间记录不正确');
    lastTime=e.t;
    if(e.type==='match') {
      if(!Number.isInteger(e.pair)||e.pair<0||e.pair>=total||matched.has(e.pair)) throw new Error('配对记录不正确');
      matched.add(e.pair); combo=e.t-lastMatch<5000?combo+1:1; lastMatch=e.t; score+=10+(combo-1)*5;
    } else if(e.type==='wrong'){wrong++;combo=0;lastMatch=-Infinity;score=Math.max(0,score-2);}
    else if(e.type==='hint'){hints++;score=Math.max(0,score-5);}
    else throw new Error('不支持的挑战记录');
  }
  if(matched.size!==total) throw new Error('请完成全部配对后提交');
  const acc=total/(total+wrong), par=total*6;
  const stars=acc>=.95&&elapsed<=par&&hints<=1?3:acc>=.85&&elapsed<=par*1.6?2:1;
  score+=Math.max(0,Math.floor((par-elapsed)/2))*2;
  return {score,stars,accuracy:Math.round(acc*100)};
}
