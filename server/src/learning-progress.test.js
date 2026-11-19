const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const code = fs.readFileSync(path.join(__dirname, '../../client/public/learning-progress.js'), 'utf8');

function storage(initial = {}) {
  const data = { ...initial };
  return new Proxy({
    getItem: key => Object.hasOwn(data, key) ? data[key] : null,
    setItem: (key, value) => { data[key] = String(value); },
  }, {
    ownKeys: () => Object.keys(data),
    getOwnPropertyDescriptor: () => ({ enumerable: true, configurable: true }),
  });
}

function account(localStorage, id = '1') {
  const window = {};
  vm.runInNewContext(code, {
    localStorage, window,
    document: { currentScript: { dataset: { userId: id } }, addEventListener() {} },
  });
  return window.LinguaPilotProgress;
}

test('lesson and chapter progress stay separate across accounts and survive returning', () => {
  const db = storage({ linguapilot_token: 'session-a' });
  const a = account(db);
  a.setItem('done_bai1', '1');
  a.setItem('ch_done_0', '1');
  a.setItem('theme', 'dark');
  db.setItem('linguapilot_token', 'session-b');
  const b = account(db, '2');
  assert.equal(b.getItem('done_bai1'), null);
  assert.equal(b.getItem('ch_done_0'), null);
  assert.equal(b.completedCount(), 0);
  assert.equal(b.getItem('theme'), 'dark');
  b.setItem('done_bai2', '1');
  b.setItem('done_bai3', '0');
  assert.equal(b.completedCount(), 1);
  db.setItem('linguapilot_token', 'session-a-new');
  const returned = account(db);
  assert.equal(returned.getItem('done_bai1'), '1');
  assert.equal(returned.getItem('ch_done_0'), '1');
  assert.equal(returned.getItem('done_bai2'), null);
  assert.equal(returned.completedCount(), 1);
});

test('old unowned progress is ignored until explicitly imported, then preserved without overwrites', () => {
  const db = storage({ linguapilot_token: 'session', done_bai1: '1', done_bai2: '1', ch_done_0: '1' });
  const a = account(db);
  assert.equal(a.completedCount(), 0);
  a.setItem('done_bai1', '0');
  assert.equal(a.importLegacy(), true);
  assert.equal(a.getItem('done_bai1'), '0');
  assert.equal(a.getItem('done_bai2'), '1');
  assert.equal(a.getItem('ch_done_0'), '1');
  assert.equal(db.getItem('done_bai1'), '1');
  assert.equal(db.getItem('done_bai2'), '1');
  assert.equal(a.completedCount(), 1);
  assert.equal(a.importLegacy(), false);
  const b = account(db, '2');
  assert.equal(b.importLegacy(), false);
  assert.equal(b.completedCount(), 0);
});

test('a stale lesson tab cannot read, write or import after the session changes', () => {
  const db = storage({ linguapilot_token: 'session-a', done_bai1: '1' });
  const a = account(db);
  db.setItem('linguapilot_token', 'session-b');
  for (const action of [() => a.getItem('done_bai1'), () => a.setItem('done_bai1', '1'), () => a.completedCount(), () => a.importLegacy()]) {
    assert.throws(action, /Phiên học đã thay đổi/);
  }
  assert.equal(db.getItem('linguapilot_progress:1:done_bai1'), null);
});

test('blocked storage does not initialize shared progress or silently report a successful write', () => {
  const blocked = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); } };
  const a = account(blocked);
  assert.throws(() => a.setItem('done_bai1', '1'), /Phiên học đã thay đổi/);
  assert.throws(() => a.completedCount(), /Phiên học đã thay đổi/);
  assert.equal(account(blocked, ''), undefined);
});
