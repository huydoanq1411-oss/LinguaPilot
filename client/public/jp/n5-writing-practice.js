(() => {
  const canvas = document.getElementById('writingCanvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const promptEl = document.getElementById('writingPrompt');
  const timerEl = document.getElementById('writingTimer');
  const progressEl = document.getElementById('writingProgress');
  const feedbackEl = document.getElementById('writingFeedback');
  const modeEl = document.getElementById('writingMode');
  const typedEl = document.getElementById('writingTyped');
  const submitEl = document.getElementById('writingSubmit');
  const kana = [
    ['a','あ'],['i','い'],['u','う'],['e','え'],['o','お'],
    ['ka','か'],['ki','き'],['ku','く'],['ke','け'],['ko','こ'],
    ['sa','さ'],['shi','し'],['su','す'],['se','せ'],['so','そ'],
    ['ta','た'],['chi','ち'],['tsu','つ'],['te','て'],['to','と'],
    ['na','な'],['ni','に'],['nu','ぬ'],['ne','ね'],['no','の'],
    ['ha','は'],['hi','ひ'],['fu','ふ'],['he','へ'],['ho','ほ'],
    ['ma','ま'],['mi','み'],['mu','む'],['me','め'],['mo','も'],
    ['ya','や'],['yu','ゆ'],['yo','よ'],['ra','ら'],['ri','り'],
    ['ru','る'],['re','れ'],['ro','ろ'],['wa','わ'],['wo','を'],['n','ん']
  ].map(([sound, answer]) => ({ prompt: `Âm ${sound}`, answers: [answer] }));
  const katakana = [
    ['a','ア'],['i','イ'],['u','ウ'],['e','エ'],['o','オ'],
    ['ka','カ'],['ki','キ'],['ku','ク'],['ke','ケ'],['ko','コ'],
    ['sa','サ'],['shi','シ'],['su','ス'],['se','セ'],['so','ソ'],
    ['ta','タ'],['chi','チ'],['tsu','ツ'],['te','テ'],['to','ト'],
    ['na','ナ'],['ni','ニ'],['nu','ヌ'],['ne','ネ'],['no','ノ'],
    ['ha','ハ'],['hi','ヒ'],['fu','フ'],['he','ヘ'],['ho','ホ'],
    ['ma','マ'],['mi','ミ'],['mu','ム'],['me','メ'],['mo','モ'],
    ['ya','ヤ'],['yu','ユ'],['yo','ヨ'],['ra','ラ'],['ri','リ'],
    ['ru','ル'],['re','レ'],['ro','ロ'],['wa','ワ'],['wo','ヲ'],['n','ン']
  ].map(([sound, answer]) => ({ prompt: `Âm ${sound}`, answers: [answer] }));

  let question = null;
  let seconds = 15;
  let timer = null;
  let drawing = false;
  let workerPromise = null;
  let vocabCursor = Math.floor(Math.random() * 600);

  function fitCanvas() {
    const ratio = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const previous = document.createElement('canvas');
    previous.width = canvas.width;
    previous.height = canvas.height;
    previous.getContext('2d').drawImage(canvas, 0, 0);
    canvas.width = Math.max(1, Math.round(rect.width * ratio));
    canvas.height = Math.max(1, Math.round(rect.height * ratio));
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#172f40';
    if (previous.width && previous.height) ctx.drawImage(previous, 0, 0, previous.width, previous.height, 0, 0, rect.width, rect.height);
  }

  function clearCanvas() {
    const rect = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);
  }

  function point(event) {
    const rect = canvas.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  canvas.addEventListener('pointerdown', event => {
    if (!question) return;
    drawing = true;
    canvas.setPointerCapture(event.pointerId);
    const p = point(event);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
  });
  canvas.addEventListener('pointermove', event => {
    if (!drawing) return;
    const p = point(event);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
  });
  for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) {
    canvas.addEventListener(name, () => { drawing = false; });
  }

  let vocabPromise = null;
  async function vocabQuestions() {
    let table = document.querySelector('#kanjiVocabTable');
    if (!table) {
      if (!vocabPromise) vocabPromise = fetch('phan02.html').then(response => {
        if (!response.ok) throw new Error('Không tải được danh sách từ vựng N5.');
        return response.text();
      }).then(html => new DOMParser().parseFromString(html, 'text/html').querySelector('#kanjiVocabTable'));
      table = await vocabPromise;
    }
    if (!table) return [];
    return [...table.querySelectorAll('tbody tr')].map(row => {
      const cells = [...row.cells].map(cell => cell.textContent.trim());
      if (cells.length < 3 || !cells[2] || cells[0] === 'Kanji') return null;
      const written = cells[0];
      const reading = cells[1].split(/[,，、/]/)[0].trim();
      return { prompt: cells[2], answers: [...new Set([written, reading].filter(Boolean))] };
    }).filter(Boolean);
  }

  function levelQuestions(level) {
    const bank = window.JP_QUIZ_BANKS || {};
    const source = level === 'n3' ? (bank.n3n2 || []) : level === 'n2' ? [...(bank.n3n2 || []), ...(bank.n2 || [])] : (bank[level] || []);
    const isJapanese = value => /[\u3040-\u30ff\u3400-\u9fff]/.test(value);
    return source.map(item => {
      const prompt = item.prompt || '';
      const open = prompt.lastIndexOf('（');
      const close = prompt.lastIndexOf('）');
      const vietnamesePrompt = open >= 0 && close > open ? prompt.slice(open + 1, close).trim() : '';
      const correct = item.options?.find(option => option.correct)?.text || '';
      return vietnamesePrompt && isJapanese(correct) ? { prompt: vietnamesePrompt, answers: [correct] } : null;
    }).filter(Boolean);
  }

  async function startQuestion() {
    clearInterval(timer);
    const mode = modeEl.value;
    if (mode === 'hiragana' || mode === 'katakana') {
      const alphabet = mode === 'katakana' ? katakana : kana;
      question = alphabet[Math.floor(Math.random() * alphabet.length)];
    } else if (mode === 'n5') {
      let words;
      try { words = await vocabQuestions(); }
      catch (error) {
        progressEl.textContent = 'Không tải được';
        feedbackEl.textContent = error.message;
        return;
      }
      if (!words.length) {
        feedbackEl.textContent = 'Không tìm thấy danh sách từ vựng N5.';
        return;
      }
      question = words[vocabCursor % words.length];
      vocabCursor++;
    } else {
      const words = levelQuestions(mode);
      if (!words.length) {
        progressEl.textContent = 'Chưa có câu hỏi';
        feedbackEl.textContent = `Chưa tìm thấy đề luyện ${mode.toUpperCase()} có đáp án chữ Nhật trong ngân hàng.`;
        return;
      }
      question = words[Math.floor(Math.random() * words.length)];
    }
    promptEl.textContent = question.prompt;
    typedEl.value = '';
    clearCanvas();
    seconds = 15;
    timerEl.textContent = `${seconds} giây`;
    progressEl.textContent = 'Đang làm';
    feedbackEl.textContent = 'Viết chữ Nhật trong vùng trắng; có thể nộp sớm.';
    feedbackEl.className = 'writing-feedback';
    submitEl.disabled = false;
    timer = setInterval(() => {
      seconds--;
      timerEl.textContent = `${seconds} giây`;
      if (seconds <= 0) {
        clearInterval(timer);
        timerEl.textContent = 'Hết giờ';
        progressEl.textContent = 'Đã hết giờ';
        submitAnswer();
      }
    }, 1000);
  }

  function normalize(value) {
    return value.normalize('NFKC').toLocaleLowerCase('ja').replace(/[\s\p{P}\p{S}]/gu, '');
  }

  function loadOcr() {
    if (workerPromise) return workerPromise;
    workerPromise = new Promise((resolve, reject) => {
      const begin = () => {
        if (!window.Tesseract) return reject(new Error('Không tải được bộ nhận dạng chữ.'));
        window.Tesseract.createWorker('jpn').then(resolve, reject);
      };
      if (window.Tesseract) return begin();
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';
      script.onload = begin;
      script.onerror = () => reject(new Error('Cần Internet để tải bộ nhận dạng chữ Nhật.'));
      document.head.appendChild(script);
    });
    return workerPromise;
  }

  async function submitAnswer() {
    if (!question || submitEl.disabled) return;
    clearInterval(timer);
    submitEl.disabled = true;
    progressEl.textContent = 'Đang kiểm tra';
    feedbackEl.className = 'writing-feedback';
    const typed = typedEl.value.trim();
    let recognized = '';
    try {
      feedbackEl.textContent = 'Đang nhận dạng chữ viết tay tiếng Nhật…';
      const worker = await loadOcr();
      const result = await worker.recognize(canvas);
      recognized = result.data.text.trim();
    } catch (error) {
      if (!typed) {
        feedbackEl.textContent = `${error.message} Hãy nhập đáp án tiếng Nhật bên dưới để hệ thống đối chiếu.`;
        progressEl.textContent = 'Chưa chấm được';
        submitEl.disabled = false;
        return;
      }
    }
    const accepted = question.answers.map(normalize);
    const matches = [recognized, typed].some(value => value && accepted.includes(normalize(value)));
    feedbackEl.className = `writing-feedback ${matches ? 'is-correct' : 'is-wrong'}`;
    if (matches) {
      feedbackEl.textContent = `Chính xác! Đáp án: ${question.answers.join(' / ')}${recognized ? ` · Nhận dạng: ${recognized}` : ''}`;
      progressEl.textContent = 'Đúng';
    } else {
      feedbackEl.textContent = `Chưa khớp. Đáp án: ${question.answers.join(' / ')}${recognized ? ` · Hệ thống nhận dạng: ${recognized}` : ''}`;
      progressEl.textContent = 'Cần thử lại';
    }
  }

  document.getElementById('writingNext').addEventListener('click', startQuestion);
  document.getElementById('writingSubmit').addEventListener('click', submitAnswer);
  document.getElementById('writingClear').addEventListener('click', clearCanvas);
  modeEl.addEventListener('change', () => { question = null; clearInterval(timer); clearCanvas(); promptEl.textContent = 'Chọn “Câu mới” để bắt đầu'; timerEl.textContent = '15 giây'; progressEl.textContent = 'Sẵn sàng'; submitEl.disabled = true; });
  window.addEventListener('resize', fitCanvas);
  fitCanvas();
})();
