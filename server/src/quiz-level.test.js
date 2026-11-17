const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '../../client/public/jp/quiz-engine.js'), 'utf8');
const context = { pageLevel: () => '' };
vm.createContext(context);
vm.runInContext(source.slice(source.indexOf('  function levelFromNode'), source.indexOf('  function levelsFor')), context);
const bankContext = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../lessons/quiz-bank.js'), 'utf8'), bankContext);
const banks = bankContext.window.JP_QUIZ_BANKS;

function level(id, label, title, explicit) {
  const section = { id, dataset: { quizLevel: explicit }, querySelector: selector => ({ textContent: selector === '.eyebrow' ? label : title }) };
  return context.levelFromNode({ closest: selector => selector === 'form' ? { id: 'lessonQuiz' } : section });
}

test('supplemental quiz levels use their own headings, not large lesson numbers', () => {
  assert.equal(level('bai210', 'N4 Từ vựng', 'Công việc và trường học'), 'n4');
  assert.equal(level('bai232', 'N2 Luyện nghe', 'Hội thoại N2'), 'n2');
  assert.equal(level('bai60', 'N3', 'Thi thử N3'), 'n3n2');
  assert.equal(level('bai139', 'N1', 'Thi thử N1'), 'n1');
  assert.equal(level('bai210', '', '', 'n4'), 'n4');
  assert.equal(level('bai210', '', ''), '');
});

test('regenerated banks match every quiz section with an explicit JLPT heading', () => {
  let sections = 0;
  for (const file of fs.readdirSync(path.join(__dirname, '../lessons')).filter(name => /^phan\d+\.html$/.test(name))) {
    const html = fs.readFileSync(path.join(__dirname, '../lessons', file), 'utf8');
    let questionNumber = 0;
    for (const section of html.matchAll(/<section\b[^>]*id="(bai\d+)"[^>]*>([\s\S]*?)<\/section>/g)) {
      const body = section[2];
      const count = (body.match(/class="quiz-(?:q|question)"/g) || []).length;
      const label = (body.match(/class="eyebrow"[^>]*>([\s\S]*?)<\/div>/) || [])[1] || '';
      const title = (body.match(/<h2[^>]*>([\s\S]*?)<\/h2>/) || [])[1] || '';
      const match = `${label} ${title}`.match(/\bN\s*([1-5])\b/i);
      if (count && match) {
        const expected = match[1] === '3' ? 'n3n2' : `n${match[1]}`;
        assert.equal(level(section[1], label, title), expected, `${file} ${section[1]}`);
        for (let number = questionNumber + 1; number <= questionNumber + count; number++) {
          const id = `${file}#${number}`;
          const bankQuestion = Object.values(banks).flat().find(q => q.id === id);
          // The generator deduplicates repeated questions, so some source IDs are omitted.
          if (bankQuestion) assert.equal(bankQuestion.level, expected, id);
        }
        sections++;
      }
      questionNumber += count;
    }
  }
  assert.ok(sections >= 30);
  const questions = Object.values(banks).flat();
  assert.equal(questions.length, 605);
  assert.ok(questions.every(q => q.options.filter(option => option.correct).length === 1));
});
