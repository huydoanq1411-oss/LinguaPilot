const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const express = require('express');
const jwt = require('jsonwebtoken');

process.env.JWT_SECRET = 'test-only-lesson-access-secret';
const dbPath = require.resolve('./db');
const previousDb = require.cache[dbPath];
require.cache[dbPath] = { id: dbPath, filename: dbPath, loaded: true,
  exports: { user: { findUnique: async ({ where }) => where.id === 1 ? { id: 1 } : null } } };
const lessons = require('./routes/lessons');
if (previousDb) require.cache[dbPath] = previousDb;
else delete require.cache[dbPath];
let server;
let base;
before(async () => {
  const app = express();
  app.use('/api/lessons', lessons);
  app.use((err, req, res, next) => { if (res.headersSent) return next(err); res.status(500).json({ error: err.message }); });
  server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  base = `http://127.0.0.1:${server.address().port}/api/lessons/`;
});
after(() => new Promise((resolve) => server.close(resolve)));

function headers(id = 1, options = {}) {
  return { Authorization: `Bearer ${jwt.sign({ sub: id }, process.env.JWT_SECRET, { expiresIn: '1h', ...options })}` };
}

test('lesson API rejects missing, forged, expired and deleted-account tokens', async () => {
  for (const auth of [{}, { Authorization: 'Bearer fake' }, headers(1, { expiresIn: -1 }), headers(99)]) {
    const response = await fetch(`${base}phan01.html`, { headers: auth });
    assert.equal(response.status, 401);
    assert.equal(response.headers.get('cache-control'), 'private, no-store');
    assert.equal((await response.text()).includes('第1課'), false);
  }
});

test('authenticated lesson includes quiz bank; paths outside lesson HTML are refused', async () => {
  const response = await fetch(`${base}test-n5.html`, { headers: headers() });
  assert.equal(response.status, 200);
  const { html } = await response.json();
  assert.ok(html.includes('window.JP_QUIZ_BANKS ='));
  assert.ok(html.includes('function runSingleQuiz()'));
  assert.equal(html.includes('<script src="quiz-bank.js"></script>'), false);
  for (const page of ['quiz-bank.js', 'missing.html', '..%2Fpackage.json']) {
    assert.equal((await fetch(`${base}${page}`, { headers: headers() })).status, 404);
  }
});

test('all public lesson URLs contain loaders, not lesson or quiz content', () => {
  const root = path.join(__dirname, '../../client/public/jp');
  const pages = fs.readdirSync(root).filter((name) => name.endsWith('.html'));
  assert.equal(pages.length, 22);
  for (const page of pages) {
    const html = fs.readFileSync(path.join(root, page), 'utf8');
    assert.ok(html.includes('/lesson-auth.js'), page);
    assert.equal(/quiz-q|JP_QUIZ_BANKS|id="bai\d/.test(html), false, page);
    assert.ok(fs.existsSync(path.join(__dirname, '../lessons', page)), page);
  }
  assert.equal(fs.existsSync(path.join(root, 'quiz-bank.js')), false);
});

test('login destination stays within lesson URLs and retains anchors', async () => {
  const { lessonDestination } = await import('../../client/src/lesson-navigation.js');
  assert.equal(lessonDestination('?next=%2Fjp%2Fphan02.html%23bai35'), '/jp/phan02.html#bai35');
  for (const next of ['https://outside.example/jp/index.html', '//outside.example/jp/index.html', '/api/auth/me', '/jp/../index.html']) {
    assert.equal(lessonDestination(`?next=${encodeURIComponent(next)}`), '/jp/index.html');
  }
});

test('unauthenticated loader redirects before fetching any content', () => {
  let redirected;
  const code = fs.readFileSync(path.join(__dirname, '../../client/public/lesson-auth.js'), 'utf8');
  vm.runInNewContext(code, {
    localStorage: { getItem: () => null },
    location: { pathname: '/jp/phan01.html', search: '', hash: '#bai1', replace: (url) => { redirected = url; } },
    fetch: () => { throw new Error('Unauthenticated loader must not fetch'); },
  });
  assert.equal(redirected, '/?next=%2Fjp%2Fphan01.html%23bai1#account');
});
