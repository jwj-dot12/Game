// Shared by both profile forms and the ranking API. Keep the vocabulary local:
// nickname validation must work offline and must not send drafts to a service.
const blockedChinese=['傻逼','傻比','煞笔','傻b','傻β','操你','操他','草你妈','艹你','你妈逼','他妈的','妈的','妈逼','狗日的','狗娘养','滚你妈','婊子','贱人','鸡巴','几把','屌丝','色情','黄片','黄网','裸聊','裸照','约炮','卖淫','嫖娼','强奸','迷奸','援交','赌博','博彩','六合彩','杀全家','弄死你','去死吧','刷单','代刷','加微信','加我微信','加vx','加v信'];
const traditional={'媽':'妈','雞':'鸡','賤':'贱','婊':'婊','幹':'干','殺':'杀','賭':'赌','黃':'黄','網':'网','約':'约','賣':'卖','強':'强','姦':'奸','絲':'丝'};
const fold=value=>value.normalize('NFKC').toLowerCase().replace(/[媽雞賤婊幹殺賭黃網約賣強姦絲]/g,c=>traditional[c]).replace(/[\p{P}\p{Z}\p{M}\p{Cf}]/gu,'');
const blockedEnglish=['fuck','fucking','fucker','shit','bitch','asshole','porn','nigger','nigga'];
export function nicknameWidth(name){return Array.from(name).reduce((n,c)=>n+(c.codePointAt(0)<=127?1:2),0);}
export function validateNickname(value){
 const name=typeof value==='string'?value.normalize('NFKC').trim():'';
 if(!name)return {ok:false,name,error:'请输入玩家昵称'};
 if(/[\p{Cc}\p{Cf}]/u.test(name))return {ok:false,name,error:'昵称包含不支持的字符，请重新输入'};
 const normalized=fold(name),words=name.toLowerCase().match(/[a-z]+/g)||[];
 if(blockedChinese.some(word=>normalized.includes(word))||blockedEnglish.some(word=>words.includes(word)||normalized===word)||/^(f[uv]ck|sh[i1]t|b[i1]tch)(er|ing|s)?$/.test(normalized))return {ok:false,name,error:'昵称包含不适宜内容，无法修改昵称，请换一个'};
 if(nicknameWidth(name)>12)return {ok:false,name,error:'昵称最多 6 个汉字或 12 个英文字符（混合输入按长度折算）'};
 return {ok:true,name,error:''};
}
