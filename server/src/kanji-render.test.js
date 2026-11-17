const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const html = fs.readFileSync(path.join(__dirname, '../lessons/tra-kanji.html'), 'utf8');
const code = html.slice(html.indexOf('function showKanjiNotice'), html.indexOf('function lookupKanji'));
const payload = '<img src=x onerror="window.pwned=true">';

function fixture(fetch) {
  const htmlWrites = [];
  class Node {
    constructor() { this.children = []; this.textContent = ''; this.style = {}; }
    set innerHTML(value) {
      htmlWrites.push(value);
      this.fields = [...value.matchAll(/data-kanji-field="([^"]+)"/g)].map(match => {
        const node = new Node(); node.dataset = { kanjiField: match[1] }; return node;
      });
    }
    querySelectorAll() { return this.fields || []; }
    replaceChildren(...nodes) { this.children = nodes; }
    appendChild(node) { this.children.push(node); }
  }
  const result = new Node();
  const context = { document: { getElementById: () => result, createElement: () => new Node() }, fetch };
  vm.createContext(context);
  vm.runInContext(code, context);
  return { result, context, htmlWrites };
}

test('all external Kanji fields are written as text, never interpolated into HTML', () => {
  const f = fixture();
  f.context.renderKanji({ kanji: payload, stroke_count: payload, grade: payload, jlpt: payload,
    on_readings: [payload], kun_readings: [payload], meanings: [payload] });
  assert.equal(f.result.fields.length, 7);
  assert.ok(f.result.fields.every(node => node.textContent === payload));
  assert.ok(f.htmlWrites.every(value => !value.includes(payload)));
});

test('missing or incorrectly typed Kanji fields degrade to placeholders', () => {
  const f = fixture();
  f.context.renderKanji({ on_readings: 'not an array', meanings: [{}] });
  assert.ok(f.result.fields.every(node => node.textContent === '—'));
  assert.throws(() => f.context.renderKanji(null), /không hợp lệ/);
});

test('lookup input and fetch error messages cannot enter an HTML sink', async () => {
  const notFound = fixture(async () => ({ ok: false, status: 404 }));
  await notFound.context.fetchKanjiData(payload);
  assert.ok(notFound.result.children[0].textContent.includes(payload));
  assert.equal(notFound.htmlWrites.length, 0);
  const failed = fixture(async () => { throw new Error(payload); });
  await failed.context.fetchKanjiData('学');
  assert.ok(failed.result.children[0].children[0].textContent.includes(payload));
  assert.equal(failed.htmlWrites.length, 0);
});
