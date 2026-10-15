import test from 'node:test';
import assert from 'node:assert/strict';
import {invitationURL} from '../public/game/invitation.mjs';
test('invites preserve deployment subpath and only share an allowed unit', () => {
  const source='https://example.com/Game/game/index.html?token=secret&unit=u1#private';
  assert.equal(invitationURL(source,'u3'),'https://example.com/Game/game/index.html?invite=1&unit=u3');
  assert.equal(invitationURL(source,'challenge'),'https://example.com/Game/game/index.html?invite=1&unit=challenge');
  for(const key of ['list:private-name','u99','javascript:alert(1)',null])
    assert.equal(invitationURL(source,key),'https://example.com/Game/game/index.html?invite=1');
  assert.throws(()=>invitationURL('file:///private/index.html','u0'));
});
