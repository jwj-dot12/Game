import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdtemp, rm, rmdir } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { createGameServer, weekStart } from '../server.mjs';
import { calculateResult } from '../server/game-rules.mjs';

const words=[['apple','苹果'],['book','书']];
const events=[{type:'match',pair:0,t:1000},{type:'match',pair:1,t:2000}];
async function instance(t,options={}){
 let clock=Date.parse('2026-10-18T15:59:50Z');
 const server=await createGameServer({dbPath:':memory:',now:()=>clock,...options});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 t.after(()=>new Promise(resolve=>server.close(resolve)));
 const base=`http://127.0.0.1:${server.address().port}`;
 const send=async(route,body)=>{const res=await fetch(base+route,body===undefined?{}:{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});return {status:res.status,body:await res.json()};};
 return {server,base,send,advance:ms=>clock+=ms};
}
test('server recomputes score and rejects duplicate, incomplete and malformed events',()=>{
 assert.deepEqual(calculateResult(events,2,2),{score:35,stars:3,accuracy:100});
 assert.throws(()=>calculateResult([events[0],events[0]],2,2),/配对/);
 assert.throws(()=>calculateResult([events[0]],2,2),/全部配对/);
 assert.throws(()=>calculateResult([{...events[0],t:4000},events[1]],2,2),/时间/);
 assert.throws(()=>calculateResult([null],2,2),/时间/);
});
test('custom lists canonicalize safely; duplicate or malformed words are rejected',async t=>{
 const {send}=await instance(t),playerId=randomUUID();
 const a=await send('/api/public/game',{playerId,unit:'custom:new',count:2,words});
 const b=await send('/api/public/game',{playerId,unit:'custom:new',count:2,words:[['BOOK','书'],[' Apple ','苹果']]});
 assert.equal(a.status,200);assert.equal(a.body.unit,b.body.unit);assert.equal(a.body.total,2);
 assert.equal((await send('/api/public/game',{playerId,unit:'custom:new',count:2,words:[['a','甲'],['A','乙']]})).status,400);
 assert.equal((await send('/api/public/game',{playerId,unit:'custom:new',count:2,words:[['a','甲'],null]})).status,400);
 assert.equal((await send('/api/public/game',{playerId,unit:'u10'})).status,400);
});
test('scores are owned by a session, calculated, idempotent and ranked per player',async t=>{
 const {send,advance}=await instance(t),playerId=randomUUID();
 const session=(await send('/api/public/game',{playerId,unit:'custom:new',count:2,words})).body;
 advance(4000);
 const payload={id:session.id,playerId,name:'花花',region:'上海',elapsed:2,events,score:999999,stars:99};
 assert.equal((await send('/api/public/rankings',{...payload,region:'沪'.repeat(13)})).status,400);
 assert.equal((await send('/api/public/rankings',{...payload,region:{city:'上海'}})).status,400);
 assert.equal((await send('/api/public/rankings',{...payload,playerId:randomUUID()})).status,400);
 assert.equal((await send('/api/public/rankings',{...payload,events:events.slice(0,1)})).status,400);
 assert.equal((await send('/api/public/rankings',{...payload,elapsed:100})).status,400);
 const saved=await send('/api/public/rankings',payload);assert.equal(saved.status,200);assert.equal(saved.body.score,35);assert.equal(saved.body.stars,3);
 assert.deepEqual((await send('/api/public/rankings',payload)).body,saved.body);
 const second=(await send('/api/public/game',{playerId,unit:'custom:new',count:2,words})).body;advance(5000);
 await send('/api/public/rankings',{...payload,id:second.id,elapsed:4});
 const rank=(await send(`/api/public/rankings?unit=${session.unit}`)).body;
 assert.equal(rank.total,1);assert.equal(rank.rows.length,1);assert.equal(rank.rows[0].score,35);assert.equal(rank.rows[0].name,'花花');
 assert.equal(rank.rows[0].region,'上海');
 assert.equal((await send('/api/public/rankings?unit=u0')).body.rows.length,0);
 advance(20000);assert.equal((await send(`/api/public/rankings?unit=${session.unit}&period=week`)).body.rows.length,0);
 assert.equal((await send(`/api/public/rankings?unit=${session.unit}&period=all`)).body.rows.length,1);
});
test('week boundary uses Monday 00:00 Beijing time',()=>{
 assert.equal(new Date(weekStart(Date.parse('2026-10-18T15:59:59Z'))).toISOString(),'2026-10-11T16:00:00.000Z');
 assert.equal(new Date(weekStart(Date.parse('2026-10-18T16:00:00Z'))).toISOString(),'2026-10-18T16:00:00.000Z');
});
test('request validation, rate limit and static files do not expose server data',async t=>{
 const {send,base}=await instance(t),playerId=randomUUID();
 for(let i=0;i<10;i++)assert.equal((await send('/api/public/game',{playerId,unit:'u0'})).status,200);
 assert.equal((await send('/api/public/game',{playerId,unit:'u0'})).status,429);
 assert.equal((await send('/api/public/rankings?unit=u0&period=unknown')).status,400);
 assert.equal((await fetch(base+'/api/public/game',{method:'POST',headers:{'Content-Type':'text/plain'},body:'{}'})).status,415);
 assert.equal((await fetch(base+'/api/public/game',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({padding:'a'.repeat(81000)})})).status,413);
 for(const file of ['/server.mjs','/data/game.sqlite','/game/%2e%2e%2f%2e%2e%2fserver.mjs'])assert.equal((await fetch(base+file)).status,404);
 const home=await fetch(base+'/?invite=1&unit=u2');assert.match(home.url,/\/game\/index.html\?invite=1&unit=u2$/);assert.match(await home.text(),/styles\.css\?v=/);
 assert.match((await fetch(base+'/game/app.js')).headers.get('content-type'),/javascript/);
 assert.match((await fetch(base+'/game/assets/lock.svg')).headers.get('content-type'),/image\/svg/);
});
test('SQLite scores survive a server restart',async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'word-pop-')),dbPath=path.join(dir,'game.sqlite');
 let clock=Date.now(),server;
 const start=async()=>{server=await createGameServer({dbPath,now:()=>clock});await new Promise(r=>server.listen(0,'127.0.0.1',r));return `http://127.0.0.1:${server.address().port}`;};
 const stop=()=>new Promise(r=>server.close(r));
 try{
  let base=await start();const playerId=randomUUID();
  const post=async(route,b)=>{const r=await fetch(base+route,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(b)});assert.equal(r.status,200);return r.json();};
  const session=await post('/api/public/game',{playerId,unit:'custom:new',count:2,words});clock+=4000;
  await post('/api/public/rankings',{playerId,id:session.id,name:'重启验证',region:'杭州',elapsed:2,events});await stop();
  base=await start();const rankings=await (await fetch(base+`/api/public/rankings?unit=${session.unit}`)).json();assert.equal(rankings.total,1);assert.equal(rankings.rows[0].score,35);assert.equal(rankings.rows[0].region,'杭州');await stop();server=null;
 }finally{
  if(server?.listening)await stop();
  for(const suffix of ['','-shm','-wal'])await rm(dbPath+suffix,{force:true});
  await rmdir(dir);
 }
});
test('legacy scores migrate with Shanghai default and old clients can submit',async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'word-pop-migration-')),dbPath=path.join(dir,'game.sqlite');
 const legacy=new DatabaseSync(dbPath);
 legacy.exec('CREATE TABLE scores (id TEXT PRIMARY KEY,player_id TEXT NOT NULL,name TEXT NOT NULL,unit TEXT NOT NULL,title TEXT NOT NULL,score INTEGER NOT NULL,elapsed INTEGER NOT NULL,accuracy INTEGER NOT NULL,stars INTEGER NOT NULL,at INTEGER NOT NULL)');
 legacy.prepare('INSERT INTO scores VALUES (?,?,?,?,?,?,?,?,?,?)').run(randomUUID(),randomUUID(),'原有玩家','u0','Unit 1',100,60,100,3,Date.now());legacy.close();
 let server;
 try{
  server=await createGameServer({dbPath});await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const base=`http://127.0.0.1:${server.address().port}`;
  const old=(await (await fetch(base+'/api/public/rankings?unit=u0')).json()).rows[0];
  assert.equal(old.name,'原有玩家');assert.equal(old.score,100);assert.equal(old.region,'上海');
  const playerId=randomUUID(),post=async(route,body)=>{const res=await fetch(base+route,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});assert.equal(res.status,200);return res.json();};
  const session=await post('/api/public/game',{playerId,unit:'custom:new',count:2,words});
  await post('/api/public/rankings',{playerId,id:session.id,name:'旧客户端',elapsed:2,events});
  const row=(await (await fetch(base+`/api/public/rankings?unit=${session.unit}`)).json()).rows[0];assert.equal(row.region,'上海');
 }finally{
  if(server?.listening)await new Promise(r=>server.close(r));
  for(const suffix of ['','-shm','-wal'])await rm(dbPath+suffix,{force:true});await rmdir(dir);
 }
});
