const test = require('node:test');
const assert = require('node:assert');
process.env.JWT_SECRET = 'test-secret';
const { signVerify, signReset, signSession, readPurposeToken } = require('./tokens');

const user = { id: 'u1', email: 'a@b.c', token_version: 3 };

test('purpose tokens cannot be swapped', () => {
  assert.equal(readPurposeToken(signVerify(user), 'reset'), null);
  assert.equal(readPurposeToken(signReset(user), 'verify'), null);
  assert.equal(readPurposeToken(signSession(user, 'driver'), 'reset'), null);
  assert.equal(readPurposeToken(signVerify(user), 'verify').id, 'u1');
});

test('reset token carries token_version so a bump invalidates it', () => {
  const payload = readPurposeToken(signReset(user), 'reset');
  assert.equal(payload.tv, 3);
  assert.notEqual(payload.tv, user.token_version + 1);
});

test('garbage tokens are rejected', () => {
  assert.equal(readPurposeToken('nope', 'verify'), null);
  assert.equal(readPurposeToken(undefined, 'verify'), null);
});
