const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const bcrypt = require('bcryptjs');

process.env.JWT_SECRET = 'test-only-password-policy-secret';
let dbCalls = 0;
let loginCalls = 0;
const savedPasswords = [];
const dbPath = require.resolve('./db');
const loginPath = require.resolve('./login');
const previousDb = require.cache[dbPath];
const previousLogin = require.cache[loginPath];
require.cache[dbPath] = { id: dbPath, filename: dbPath, loaded: true, exports: {
  user: { create: async ({ data }) => {
    dbCalls++;
    savedPasswords.push(data.passwordHash);
    return { id: 1, ...data };
  } },
} };
require.cache[loginPath] = { id: loginPath, filename: loginPath, loaded: true,
  exports: async (_prisma, _bcrypt, _dummy, _email, password) => {
    loginCalls++;
    return { user: await bcrypt.compare(password, savedPasswords.at(-1))
      ? { id: 1, email: 'fixture@example.invalid', displayName: '' } : null };
  },
};
const auth = require('./routes/auth');
if (previousDb) require.cache[dbPath] = previousDb;
else delete require.cache[dbPath];
if (previousLogin) require.cache[loginPath] = previousLogin;
else delete require.cache[loginPath];

let server;
let base;
before(async () => {
  const app = express();
  app.use(express.json());
  app.use('/auth', auth);
  server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  base = `http://127.0.0.1:${server.address().port}/auth`;
});
after(() => new Promise((resolve) => server.close(resolve)));
function request(route, password) {
  return fetch(`${base}/${route}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'fixture@example.invalid', password }),
  });
}

test('registration and login reject overlong ASCII and Unicode before DB or comparison', async () => {
  const originalDbCalls = dbCalls;
  const originalLoginCalls = loginCalls;
  for (const password of ['a'.repeat(73), 'あ'.repeat(25), '😀'.repeat(19), 'a'.repeat(72) + 'different-suffix']) {
    for (const route of ['register', 'login']) {
      const response = await request(route, password);
      assert.equal(response.status, 400);
      assert.match((await response.json()).error, /72 byte UTF-8/);
    }
  }
  assert.equal(dbCalls, originalDbCalls);
  assert.equal(loginCalls, originalLoginCalls);
});

test('exactly 72 bytes and ordinary passwords still register and log in with real bcrypt', async () => {
  for (const password of ['normal-password', 'a'.repeat(72), 'あ'.repeat(24), '😀'.repeat(18)]) {
    assert.equal((await request('register', password)).status, 201);
    assert.equal((await request('login', password)).status, 200);
  }
});

test('registration minimum and password type validation remain enforced', async () => {
  assert.equal((await request('register', 'short')).status, 400);
  for (const password of [null, 12345678, {}, []]) {
    for (const route of ['register', 'login']) assert.equal((await request(route, password)).status, 400);
  }
});
