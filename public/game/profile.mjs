export const DEFAULT_REGION='上海·嘉定';
export const DEFAULT_CLASS='太阳花中队';
export const AVATARS=[{id:'lion',symbol:'🦁',name:'小狮子'},{id:'panda',symbol:'🐼',name:'小熊猫'},{id:'flower',symbol:'🌷',name:'小花朵'},{id:'sun',symbol:'🌤️',name:'小太阳'},{id:'star',symbol:'🌟',name:'小星星'},{id:'rocket',symbol:'🚀',name:'小火箭'}];
export function validAvatar(value){return typeof value==='string'&&(AVATARS.some(a=>a.id===value)||(value.length<=100000&&/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+=*$/.test(value)));}
const points=value=>Number.isSafeInteger(value)&&value>=0?value:0;
export function normalizeProfile(data){
 const region=typeof data.region==='string'?data.region.trim().slice(0,12):'';
 return {profileVersion:1,region:(!region||(!data.profileVersion&&region==='上海'))?DEFAULT_REGION:region,className:typeof data.className==='string'&&data.className.trim()?data.className.trim().slice(0,20):DEFAULT_CLASS,avatar:validAvatar(data.avatar)?data.avatar:'lion',points: data.pointsVersion===1?points(data.points):(data.runs||[]).reduce((sum,r)=>Math.min(Number.MAX_SAFE_INTEGER,sum+points(r.score)),0),pointsVersion:1,pointRunIds:Array.isArray(data.pointRunIds)?data.pointRunIds.filter(id=>typeof id==='string').slice(-100):[]};
}
export function awardPoints(data,runId,score){
 if(!runId||!Number.isSafeInteger(score)||score<0||data.pointRunIds.includes(runId))return 0;
 data.points=Math.min(Number.MAX_SAFE_INTEGER,data.points+score);
 data.pointRunIds=[...data.pointRunIds,runId].slice(-100);
 return score;
}
