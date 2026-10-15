import http from 'node:http';
import { createReadStream } from 'node:fs';
import { readFile, stat, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID, createHash } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { calculateResult } from './server/game-rules.mjs';

const root=path.dirname(fileURLToPath(import.meta.url));
const publicRoot=path.join(root,'public');
const vocabulary=JSON.parse(await readFile(path.join(root,'server/vocabulary.json'),'utf8'));
class HttpError extends Error {constructor(status,message){super(message);this.status=status;}}
const fail=(message)=>{throw new HttpError(400,message);};
const playerPattern=/^[a-zA-Z0-9-]{16,64}$/;
const unitPattern=/^(u[0-9]|challenge|custom:[a-f0-9]{64})$/;
const uuidPattern=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.wav':'audio/wav','.ico':'image/x-icon'};
function json(res,status,data){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(data));}
async function readJSON(req,limit){
  if(!/^application\/json(?:\s*;|$)/i.test(req.headers['content-type']||''))throw new HttpError(415,'请使用 JSON 提交数据');
  if(Number(req.headers['content-length'])>limit)throw new HttpError(413,'提交内容过大');
  let size=0;const chunks=[];
  for await(const chunk of req){size+=chunk.length;if(size>limit)throw new HttpError(413,'提交内容过大');chunks.push(chunk);}
  try{const body=JSON.parse(Buffer.concat(chunks).toString('utf8'));if(!body||typeof body!=='object'||Array.isArray(body))throw new Error();return body;}catch{fail('提交内容格式不正确');}
}
export function weekStart(at){const now=new Date(at+8*3600000);now.setUTCHours(0,0,0,0);now.setUTCDate(now.getUTCDate()-(now.getUTCDay()+6)%7);return now.getTime()-8*3600000;}

export async function createGameServer({dbPath=process.env.DATABASE_PATH||path.join(root,'data/game.sqlite'),now=()=>Date.now()}={}){
  if(dbPath!==':memory:')await mkdir(path.dirname(path.resolve(dbPath)),{recursive:true});
  const db=new DatabaseSync(dbPath);
  db.exec(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
    CREATE TABLE IF NOT EXISTS game_sessions (id TEXT PRIMARY KEY,player_id TEXT NOT NULL,unit TEXT NOT NULL,title TEXT NOT NULL,total INTEGER NOT NULL,created_at INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS scores (id TEXT PRIMARY KEY,player_id TEXT NOT NULL,name TEXT NOT NULL,unit TEXT NOT NULL,title TEXT NOT NULL,score INTEGER NOT NULL,elapsed INTEGER NOT NULL,accuracy INTEGER NOT NULL,stars INTEGER NOT NULL,at INTEGER NOT NULL);
    CREATE INDEX IF NOT EXISTS scores_unit_time ON scores(unit,at);
    CREATE INDEX IF NOT EXISTS sessions_player_time ON game_sessions(player_id,created_at);`);
  // Existing scores keep their records when the region field is introduced.
  if(!db.prepare('PRAGMA table_info(scores)').all().some(column=>column.name==='region'))db.exec("ALTER TABLE scores ADD COLUMN region TEXT NOT NULL DEFAULT '上海'");
  const server=http.createServer(async(req,res)=>{
    try{
      const url=new URL(req.url,'http://localhost');
      if(req.method==='GET'&&url.pathname==='/healthz'){json(res,200,{ok:true,version:'1.7.0'});return;}
      if(req.method==='POST'&&url.pathname==='/api/public/game'){
        const b=await readJSON(req,80000);
        if(typeof b.playerId!=='string'||!playerPattern.test(b.playerId))fail('玩家标识无效');
        let unit=b.unit,total=0,title='';
        if(typeof unit!=='string')fail('找不到这个单元');
        if(/^u[0-9]$/.test(unit)){total=vocabulary[Number(unit.slice(1))].words.length;title=`Unit ${Number(unit.slice(1))+1}`;}
        else if(unit==='challenge'){total=20;title='综合挑战';}
        else if(unit.startsWith('custom:')){
          if(!Array.isArray(b.words)||b.words.length<2||b.words.length>200)fail('词库需包含 2–200 个单词');
          const seen=new Set();
          const words=b.words.map(w=>{
            if(!Array.isArray(w)||w.length!==2||typeof w[0]!=='string'||typeof w[1]!=='string'||!w[0].trim()||!w[1].trim()||w[0].length>80||w[1].length>120)fail('词库格式不正确');
            const en=w[0].trim().toLowerCase();if(seen.has(en))fail('单词不可重复');seen.add(en);return [en,w[1].trim()];
          });
          total=b.count;if(!Number.isInteger(total)||total<2||total>words.length)fail('挑战词数不正确');
          const canonical=JSON.stringify(words.sort((a,b)=>a[0].localeCompare(b[0],'en')))+'|'+total;
          unit='custom:'+createHash('sha256').update(canonical).digest('hex');
          if(b.title!==undefined&&(typeof b.title!=='string'||b.title.length>24))fail('词库名称最多 24 字');
          title=(b.title||'自定义词库').trim();
        }else fail('找不到这个单元');
        const recent=db.prepare('SELECT COUNT(*) AS n FROM game_sessions WHERE player_id=? AND created_at>?').get(b.playerId,now()-60000);
        if(recent.n>=10)throw new HttpError(429,'休息一下，稍后再挑战吧');
        const id=randomUUID();db.prepare('INSERT INTO game_sessions (id,player_id,unit,title,total,created_at) VALUES (?,?,?,?,?,?)').run(id,b.playerId,unit,title,total,now());
        json(res,200,{id,unit,total});return;
      }
      if(req.method==='GET'&&url.pathname==='/api/public/rankings'){
        const unit=url.searchParams.get('unit')||'u0',period=url.searchParams.get('period')||'all';
        if(!unitPattern.test(unit))fail('请选择有效的词库');if(!['all','week'].includes(period))fail('请选择有效的排行周期');
        const start=period==='week'?weekStart(now()):0;
        const rows=db.prepare('WITH ranked AS (SELECT *,ROW_NUMBER() OVER (PARTITION BY player_id ORDER BY score DESC,elapsed ASC,at ASC) AS rn FROM scores WHERE unit=? AND at>=?) SELECT name,region,score,elapsed,accuracy,stars,at FROM ranked WHERE rn=1 ORDER BY score DESC,elapsed ASC,at ASC LIMIT 50').all(unit,start);
        const count=db.prepare('SELECT COUNT(DISTINCT player_id) AS n FROM scores WHERE unit=? AND at>=?').get(unit,start);
        json(res,200,{rows,total:count.n,updatedAt:now()});return;
      }
      if(req.method==='POST'&&url.pathname==='/api/public/rankings'){
        const b=await readJSON(req,100000);
        if(typeof b.id!=='string'||!uuidPattern.test(b.id)||typeof b.playerId!=='string'||!playerPattern.test(b.playerId))fail('挑战标识无效');
        if(typeof b.name!=='string'||!b.name.trim()||b.name.trim().length>16)fail('请填写 1–16 字的昵称');
        if(b.region!==undefined&&(typeof b.region!=='string'||b.region.trim().length>12))fail('地域最多 12 字');
        const region=b.region?.trim()||'上海';
        if(!Number.isInteger(b.elapsed)||b.elapsed<1||b.elapsed>7200)fail('挑战时间无效');
        const session=db.prepare('SELECT * FROM game_sessions WHERE id=? AND player_id=?').get(b.id,b.playerId);
        if(!session)fail('挑战记录不存在，请重新开始');
        if(now()-session.created_at>86400000)fail('挑战记录已过期，请重新挑战');
        if(b.elapsed*1000>now()-session.created_at+2500||b.elapsed<session.total*.2)fail('挑战时间无效');
        const existing=db.prepare('SELECT score,stars,accuracy FROM scores WHERE id=?').get(b.id);
        if(existing){json(res,200,{saved:true,...existing});return;}
        let result;try{result=calculateResult(b.events,session.total,b.elapsed);}catch(e){fail(e.message);}
        db.prepare('INSERT INTO scores (id,player_id,name,region,unit,title,score,elapsed,accuracy,stars,at) VALUES (?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO NOTHING').run(session.id,session.player_id,b.name.trim(),region,session.unit,session.title,result.score,b.elapsed,result.accuracy,result.stars,now());
        json(res,200,{saved:true,...result});return;
      }
      if(url.pathname.startsWith('/api/'))throw new HttpError(404,'接口不存在');
      if(!['GET','HEAD'].includes(req.method))throw new HttpError(405,'不支持的请求方式');
      if(url.pathname==='/'){res.writeHead(302,{Location:'/game/index.html'+url.search});res.end();return;}
      let pathname;try{pathname=decodeURIComponent(url.pathname);}catch{throw new HttpError(400,'地址无效');}
      if(pathname.endsWith('/'))pathname+='index.html';
      const file=path.resolve(publicRoot,'.'+pathname),relative=path.relative(publicRoot,file);
      if(relative.startsWith('..')||path.isAbsolute(relative)||relative.includes('\0'))throw new HttpError(404,'文件不存在');
      let info;try{info=await stat(file);}catch{throw new HttpError(404,'文件不存在');}if(!info.isFile())throw new HttpError(404,'文件不存在');
      res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Content-Length':info.size,'Cache-Control':'no-cache','X-Content-Type-Options':'nosniff','Referrer-Policy':'strict-origin-when-cross-origin'});
      if(req.method==='HEAD')res.end();else createReadStream(file).on('error',()=>res.destroy()).pipe(res);
    }catch(e){if(!res.headersSent)json(res,e.status||503,{error:e.status?e.message:'服务暂时不可用，请稍后重试'});else res.destroy();}
  });
  server.on('close',()=>db.close());
  return server;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const server=await createGameServer();
  const host=process.env.HOST||'127.0.0.1',port=Number(process.env.PORT||5182);
  server.listen(port,host,()=>console.log(`Word Pop Adventure: http://${host}:${server.address().port}/game/index.html`));
  for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>server.close(()=>process.exit(0)));
}
