import test from 'node:test';import assert from 'node:assert/strict';
import {normalizeProfile,awardPoints,validAvatar} from '../public/game/profile.mjs';
test('profile migrates old defaults and recorded scores once, preserving custom choices',()=>{
 const old={region:'上海',runs:[{score:40},{score:70},{score:-5},{score:'99'}]};Object.assign(old,normalizeProfile(old));
 assert.equal(old.region,'上海·嘉定');assert.equal(old.className,'太阳花中队');assert.equal(old.points,110);
 old.region='浙江·杭州';old.className='向日葵中队';old.avatar='panda';old.runs=[];Object.assign(old,normalizeProfile(old));
 assert.equal(old.region,'浙江·杭州');assert.equal(old.className,'向日葵中队');assert.equal(old.avatar,'panda');assert.equal(old.points,110);
});
test('points survive trimmed history and repeated completion cannot award twice',()=>{
 const data=normalizeProfile({runs:[]});assert.equal(awardPoints(data,'run1',234),234);assert.equal(awardPoints(data,'run1',234),0);
 assert.equal(awardPoints(data,'bad',NaN),0);assert.equal(awardPoints(data,'bad',-10),0);assert.equal(data.points,234);
 const restored=normalizeProfile(JSON.parse(JSON.stringify(data)));assert.equal(awardPoints(restored,'run1',234),0);assert.equal(awardPoints(restored,'run2',100),100);assert.equal(restored.points,334);
});
test('avatar only accepts bundled choices or bounded raster data',()=>{
 assert.ok(validAvatar('lion'));assert.ok(validAvatar('data:image/jpeg;base64,YQ=='));assert.equal(validAvatar('https://example.com/me.png'),false);assert.equal(validAvatar('data:image/svg+xml;base64,YQ=='),false);assert.equal(validAvatar('data:image/png;base64,'+'a'.repeat(100001)),false);
});
