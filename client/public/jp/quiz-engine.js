(function () {
  const banks = window.JP_QUIZ_BANKS;
  if (!banks) return;

  const questionById = new Map();
  Object.values(banks).flat().forEach((question) => questionById.set(question.id, question));

  function pageLevel() {
    const page = location.pathname.split('/').pop().toLowerCase();
    const testMatch = page.match(/^test-n([1-5])\.html$/);
    if (testMatch) return testMatch[1] === '3' ? 'n3n2' : `n${testMatch[1]}`;
    return '';
  }

  function levelFromNode(node) {
    const form = node.closest('form');
    const page = pageLevel();
    if (page && form && form.id === 'singleQuiz') return page;
    if (form && form.id === 'masterQuiz') {
      const names = Array.from(node.querySelectorAll('input[type="radio"]'), (input) => input.name);
      const firstName = names[0] || '';
      if (firstName.startsWith('n5q')) return 'n5';
      if (firstName.startsWith('n4q')) return 'n4';
      if (firstName.startsWith('n32q')) return 'n3n2';
      if (firstName.startsWith('n2q')) return 'n2';
      if (firstName.startsWith('n1q')) return 'n1';
    }

    const section = node.closest('section.section');
    const lessonMatch = section?.id.match(/^bai(\d+)$/i);
    if (lessonMatch) {
      const lesson = Number(lessonMatch[1]);
      if (lesson <= 18) return 'kana';
      if (lesson <= 39) return 'n5';
      if (lesson <= 55) return 'n4';
      if (lesson <= 60) return 'n3n2';
      if (lesson <= 100) return 'n2';
      if (lesson <= 120) return 'n2';
      return 'n1';
    }

    const label = section?.querySelector('.eyebrow')?.textContent || '';
    const title = section?.querySelector('h2')?.textContent || '';
    const heading = `${label} ${title}`;
    const match = heading.match(/\bN\s*([1-5])\b/i);
    if (match) return match[1] === '3' ? 'n3n2' : `n${match[1]}`;
    return page;
  }

  function levelsFor(level) {
    if (level === 'n3n2') return ['n3n2', 'n2'];
    return [level];
  }

  function questionGroups(form) {
    const questions = Array.from(form.querySelectorAll('.quiz-q, .quiz-question'));
    const groups = new Map();
    questions.forEach((question) => {
      const section = question.closest('section.section') || form;
      if (!groups.has(section)) groups.set(section, []);
      groups.get(section).push(question);
    });
    return Array.from(groups, ([container, items]) => ({ container, items }));
  }

  function slotDetails(question) {
    const inputs = Array.from(question.querySelectorAll('input[type="radio"]'));
    const correct = inputs.find((input) => /^(c|correct|true|1)$/i.test(input.value));
    const wrong = inputs.find((input) => input !== correct);
    return {
      name: inputs[0]?.name || `retry_${Math.random().toString(36).slice(2)}`,
      correctValue: correct?.value || 'c',
      wrongValue: wrong?.value || 'w'
    };
  }

  function bankFor(level) {
    return levelsFor(level).flatMap((key) => banks[key] || [])
      .filter((question) => question.kind !== 'reading' || question.context);
  }

  function normalized(value) {
    return value.replace(/\s+/g, ' ').trim().toLowerCase();
  }

  function identifyQuestion(node, level) {
    // HTML vẫn là nội dung hiển thị; ghép câu dẫn và lựa chọn để tìm bản ghi ngân hàng.
    const prompt = normalized(node.querySelector('p')?.textContent || '')
      .replace(/^\d+[.)]?\s*/, '');
    const options = Array.from(node.querySelectorAll('.quiz-opts label'), (label) =>
      normalized(label.textContent.replace(/\s+/g, ' ')));
    if (!prompt || options.length < 2) return '';
    const match = bankFor(level).find((question) => {
      if (normalized(question.prompt).replace(/^\d+[.)]?\s*/, '') !== prompt) return false;
      const bankOptions = question.options.map((option) => normalized(option.text)).sort();
      return bankOptions.join('|') === [...options].sort().join('|');
    });
    return match?.id || '';
  }

  function shuffled(items) {
    const result = [...items];
    for (let index = result.length - 1; index > 0; index--) {
      const other = Math.floor(Math.random() * (index + 1));
      [result[index], result[other]] = [result[other], result[index]];
    }
    return result;
  }

  function setSignature(ids) {
    return [...ids].sort().join('|');
  }

  function chooseQuestions(level, count, usedIds, currentIds, currentSignature) {
    const levelBank = bankFor(level);
    // Ưu tiên câu chưa dùng; khi cạn ngân hàng thì vẫn tránh lặp nguyên bộ hiện tại.
    let candidates = levelBank.filter((question) => !usedIds.has(question.id));
    if (candidates.length < count) {
      candidates = levelBank.filter((question) => !currentIds.has(question.id));
    }
    if (candidates.length < count) return null;

    for (let attempt = 0; attempt < 40; attempt++) {
      const selected = shuffled(candidates).slice(0, count);
      if (setSignature(selected.map((question) => question.id)) !== currentSignature) return selected;
    }
    return null;
  }

  function createQuestion(question, number, slot) {
    const wrapper = document.createElement('div');
    wrapper.className = 'quiz-q';
    const prompt = document.createElement('p');
    let promptHtml = question.promptHtml || question.prompt;
    promptHtml = promptHtml.replace(/(<b\b[^>]*>)[\s\S]*?(<\/b>)/i, `$1${number}.$2`);
    prompt.innerHTML = promptHtml;
    wrapper.appendChild(prompt);

    if (question.context) {
      const details = document.createElement('details');
      details.className = 'quiz-source-context';
      const summary = document.createElement('summary');
      summary.textContent = 'Ngữ cảnh đọc';
      const context = document.createElement('p');
      context.textContent = question.context;
      details.append(summary, context);
      wrapper.appendChild(details);
    }

    const options = shuffled(question.options);
    const optionContainer = document.createElement('div');
    optionContainer.className = 'quiz-opts';
    options.forEach((option) => {
      const label = document.createElement('label');
      const input = document.createElement('input');
      input.type = 'radio';
      input.name = slot.name;
      input.value = option.correct ? slot.correctValue : slot.wrongValue;
      label.append(input, document.createTextNode(' '));
      const text = document.createElement('span');
      text.innerHTML = option.html;
      label.appendChild(text);
      optionContainer.appendChild(label);
    });
    wrapper.appendChild(optionContainer);

    const feedback = document.createElement('div');
    feedback.className = 'quiz-feedback';
    wrapper.appendChild(feedback);
    return wrapper;
  }

  function resetResults(form) {
    form.querySelectorAll('.quiz-feedback').forEach((feedback) => {
      feedback.textContent = '';
      feedback.className = 'quiz-feedback';
      feedback.style.display = 'none';
    });
    form.querySelectorAll('.quiz-result').forEach((result) => { result.textContent = ''; });
    const singleResult = document.getElementById('singleResult');
    if (singleResult && form.contains(singleResult)) singleResult.replaceChildren();
    const masterResult = document.getElementById('masterResult');
    if (masterResult && form.contains(masterResult)) masterResult.replaceChildren();
  }

  function mountRetry(form) {
    const initialUsed = new Set((form.dataset.quizUsed || '').split('|').filter(Boolean));
    questionGroups(form).forEach((group) => {
      const level = levelFromNode(group.items[0]);
      group.items.forEach((item) => {
        const id = identifyQuestion(item, level);
        if (id) {
          item.dataset.quizBankId = id;
          initialUsed.add(id);
        }
      });
    });
    form.dataset.quizUsed = Array.from(initialUsed).join('|');

    const retry = document.createElement('button');
    retry.type = 'button';
    retry.className = 'btn quiz-retry';
    retry.textContent = 'Làm lại với bộ câu mới';
    retry.hidden = true;
    retry.style.marginTop = '12px';
    form.appendChild(retry);

    retry.addEventListener('click', () => {
      const groups = questionGroups(form);
      const plans = [];
      for (const group of groups) {
        const level = levelFromNode(group.items[0]);
        const slots = group.items.map(slotDetails);
        const currentIds = new Set(group.items.map((item) =>
          item.dataset.quizBankId || identifyQuestion(item, level)).filter(Boolean));
        const usedIds = new Set((form.dataset.quizUsed || '').split('|').filter(Boolean));
        const currentSignature = setSignature(currentIds);
        const selected = chooseQuestions(level, group.items.length, usedIds, currentIds, currentSignature);
        if (!selected) {
          retry.textContent = `Chưa đủ câu khác cho ngân hàng ${level.toUpperCase()}`;
          return;
        }
        plans.push({ ...group, level, selected, slots, currentIds });
      }

      plans.forEach((plan) => {
        const first = plan.items[0];
        const parent = first.parentElement;
        const fresh = plan.selected.map((question, index) => {
          const node = createQuestion(question, index + 1, plan.slots[index]);
          node.dataset.quizBankId = question.id;
          parent.insertBefore(node, first);
          return node;
        });
        plan.items.forEach((item) => item.remove());
        const usedIds = new Set((form.dataset.quizUsed || '').split('|').filter(Boolean));
        const levelIds = new Set(bankFor(plan.level).map((question) => question.id));
        levelIds.forEach((id) => usedIds.delete(id));
        plan.currentIds.forEach((id) => usedIds.add(id));
        plan.selected.forEach((question) => usedIds.add(question.id));
        form.dataset.quizUsed = Array.from(usedIds).join('|');
      });

      resetResults(form);
      retry.hidden = true;
      retry.textContent = 'Làm lại với bộ câu mới';
      form.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    form.addEventListener('click', (event) => {
      const button = event.target.closest('button');
      if (!button || button === retry || button.type !== 'button') return;
      window.setTimeout(() => {
        const scored = form.querySelector('.quiz-feedback.correct, .quiz-feedback.wrong') ||
          Array.from(form.querySelectorAll('.quiz-result')).some((result) => result.textContent.trim());
        if (scored) retry.hidden = false;
      }, 0);
    });
  }

  function initialize() {
    document.querySelectorAll('form').forEach((form) => {
      if (!form.querySelector('.quiz-q, .quiz-question')) return;
      mountRetry(form);
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize);
  else initialize();
})();
