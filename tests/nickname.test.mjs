import test from 'node:test';import assert from 'node:assert/strict';
import {validateNickname} from '../public/game/nickname.mjs';
test('nickname length supports six Han characters, twelve English characters and mixed names',()=>{
 for(const name of ['Holly LU','陆泓钰','快乐太阳花朵','abcdefghijkl','小花ABCDEFGH','刘操','Classmate'])assert.equal(validateNickname(name).ok,true,name);
 for(const name of ['快乐太阳花朵呀','abcdefghijklm','小花ABCDEFGHI','   '])assert.equal(validateNickname(name).ok,false,name);
 assert.equal(validateNickname('  Ｈｏｌｌｙ ＬＵ  ').name,'Holly LU');
});
test('common blocked nicknames reject case, spacing, punctuation and traditional variants',()=>{
 for(const name of ['傻逼','傻-逼','傻 B','他媽的','裸聊','加VX','FUCK','ＦＵＣＫ','f.u.c.k','fuck you','sh1t'])assert.match(validateNickname(name).error,/无法修改昵称/,name);
 assert.equal(validateNickname('小花\u200B').ok,false);
});
