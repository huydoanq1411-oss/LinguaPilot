const { test } = require('node:test');
const assert = require('node:assert/strict');
const login = require('./login');

function fixture() {
  const rows = new Map();
  let comparisons = 0;
  let tail = Promise.resolve();
  const tx = {
    $queryRaw: async () => [],
    $executeRaw: async (_sql, key) => {
      if (!rows.has(key)) rows.set(key, { failures: [] });
    },
    loginThrottle: {
      findUnique: async ({ where }) => rows.get(where.key),
      update: async ({ where, data }) => rows.set(where.key, data),
    },
    user: { findUnique: async ({ where }) => where.email === 'learner@example.com'
      ? { id: 1, passwordHash: 'hash' } : null },
  };
  const prisma = {
    // Models transaction serialization; real PostgreSQL locking needs integration testing.
    $transaction: (run) => {
      const result = tail.then(() => run(tx));
      tail = result.catch(() => {});
      return result;
    },
  };
  const bcrypt = { compare: async (password) => { comparisons++; return password === 'correct'; } };
  return {
    rows,
    comparisons: () => comparisons,
    attempt: (email = 'learner@example.com', password = 'wrong') => login(prisma, bcrypt, 'dummy', email, password),
  };
}

test('ten failures allowed; eleventh is blocked before password verification', async () => {
  const f = fixture();
  for (let i = 0; i < 10; i++) assert.equal((await f.attempt()).user, null);
  const blocked = await f.attempt('learner@example.com', 'correct');
  assert.ok(blocked.retryAfter > 0 && blocked.retryAfter <= 900);
  assert.equal(f.comparisons(), 10);
  assert.equal((await f.attempt('other@example.com')).user, null);
});

test('successful login resets failures', async () => {
  const f = fixture();
  for (let i = 0; i < 9; i++) await f.attempt();
  assert.equal((await f.attempt('learner@example.com', 'correct')).user.id, 1);
  for (let i = 0; i < 10; i++) assert.equal((await f.attempt()).user, null);
  assert.ok((await f.attempt()).retryAfter);
});

test('expired failures no longer block; unknown emails are also limited', async () => {
  const f = fixture();
  for (let i = 0; i < 10; i++) await f.attempt('unknown@example.com');
  assert.ok((await f.attempt('unknown@example.com')).retryAfter);
  for (const row of f.rows.values()) row.failures = row.failures.map(() => new Date(Date.now() - 900001));
  assert.equal((await f.attempt('unknown@example.com')).user, null);
  assert.equal([...f.rows.values()][0].failures.length, 1);
});

test('concurrent attempts respect the shared failure count', async () => {
  const f = fixture();
  const results = await Promise.all(Array.from({ length: 15 }, () => f.attempt()));
  assert.equal(results.filter((result) => result.retryAfter).length, 5);
  assert.equal(f.comparisons(), 10);
});
