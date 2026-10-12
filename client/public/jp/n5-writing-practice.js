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
    ctx.strokeStyle = '#345d43';
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

  function similarity(left, right) {
    const a = [...normalize(left)];
    const b = [...normalize(right)];
    if (!a.length || !b.length) return 0;
    const row = Array.from({ length: b.length + 1 }, (_, i) => i);
    for (let i = 1; i <= a.length; i++) {
      let diagonal = row[0];
      row[0] = i;
      for (let j = 1; j <= b.length; j++) {
        const above = row[j];
        row[j] = Math.min(row[j] + 1, row[j - 1] + 1, diagonal + (a[i - 1] === b[j - 1] ? 0 : 1));
        diagonal = above;
      }
    }
    return 1 - row[b.length] / Math.max(a.length, b.length);
  }

  function inkPoints(source, inkOnly = true) {
    const sourceCtx = source.getContext('2d');
    const { data, width, height } = sourceCtx.getImageData(0, 0, source.width, source.height);
    let left = width, top = height, right = -1, bottom = -1;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4;
        const visibleInk = inkOnly ? data[i + 3] > 24 && data[i] + data[i + 1] + data[i + 2] < 690 : data[i] + data[i + 1] + data[i + 2] < 510;
        if (!visibleInk) continue;
        left = Math.min(left, x); top = Math.min(top, y);
        right = Math.max(right, x); bottom = Math.max(bottom, y);
      }
    }
    if (right < left || bottom < top) return [];
    const normalized = document.createElement('canvas');
    normalized.width = normalized.height = 64;
    const nctx = normalized.getContext('2d');
    const scale = 48 / Math.max(right - left + 1, bottom - top + 1);
    const w = (right - left + 1) * scale, h = (bottom - top + 1) * scale;
    nctx.drawImage(source, left, top, right - left + 1, bottom - top + 1, (64 - w) / 2, (64 - h) / 2, w, h);
    const pixels = nctx.getImageData(0, 0, 64, 64).data;
    const points = [];
    for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) {
      const i = (y * 64 + x) * 4;
      if (pixels[i + 3] > 24 && pixels[i] + pixels[i + 1] + pixels[i + 2] < 690) points.push([x, y]);
    }
    return points;
  }

  function renderAnswer(answer) {
    const model = document.createElement('canvas');
    model.width = model.height = 256;
    const modelCtx = model.getContext('2d');
    const count = [...answer].length;
    modelCtx.fillStyle = '#111';
    modelCtx.textAlign = 'center';
    modelCtx.textBaseline = 'middle';
    modelCtx.font = `${Math.min(180, Math.floor(210 / Math.max(1, count)))}px sans-serif`;
    modelCtx.fillText(answer, 128, 128, 232);
    return inkPoints(model, true);
  }

  function shapeSimilarity(answer) {
    const drawn = inkPoints(canvas, true);
    const model = renderAnswer(answer);
    if (!drawn.length || !model.length) return 0;
    const directedDistance = (from, to) => {
      const targetPixels = new Set(to.map(([x, y]) => y * 64 + x));
      let total = 0;
      for (const [x, y] of from) {
        let nearest = 10;
        for (let dy = -10; dy <= 10; dy++) for (let dx = -10; dx <= 10; dx++) {
          const distance = Math.hypot(dx, dy);
          if (distance >= nearest) continue;
          const nx = x + dx, ny = y + dy;
          if (nx >= 0 && nx < 64 && ny >= 0 && ny < 64 && targetPixels.has(ny * 64 + nx)) nearest = distance;
        }
        total += nearest;
      }
      return total / from.length;
    };
    const distance = (directedDistance(drawn, model) + directedDistance(model, drawn)) / 2;
    return Math.max(0, 1 - distance / 10);
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
    let ocrError = '';
    try {
      feedbackEl.textContent = 'Đang nhận dạng chữ viết tay tiếng Nhật…';
      const worker = await loadOcr();
      const result = await worker.recognize(canvas);
      recognized = result.data.text.trim();
    } catch (error) {
      ocrError = error.message;
    }
    const candidates = [recognized, typed].filter(Boolean);
    const bestText = candidates.reduce((result, candidate) => {
      for (const answer of question.answers) {
        const score = similarity(candidate, answer);
        if (score > result.score) result = { score, exact: normalize(candidate) === normalize(answer) };
      }
      return result;
    }, { score: 0, exact: false });
    const bestShape = Math.max(...question.answers.map(shapeSimilarity));
    const shortestAnswer = Math.min(...question.answers.map(answer => [...normalize(answer)].length));
    const textThreshold = shortestAnswer <= 1 ? 1 : shortestAnswer <= 3 ? 0.5 : shortestAnswer <= 6 ? 0.62 : 0.7;
    const matchesText = bestText.score >= textThreshold;
    const matchesShape = bestShape >= (shortestAnswer <= 1 ? 0.42 : 0.46);
    const matches = matchesText || matchesShape;
    feedbackEl.className = `writing-feedback ${matches ? 'is-correct' : 'is-wrong'}`;
    if (matches) {
      const exact = matchesText && bestText.exact;
      const score = matchesText ? Math.max(bestText.score, bestShape) : bestShape;
      feedbackEl.textContent = `${exact ? 'Chính xác' : `Gần đúng · độ giống khoảng ${Math.round(score * 100)}%`}! Đáp án: ${question.answers.join(' / ')}${recognized ? ` · Nhận dạng: ${recognized}` : ''}`;
      progressEl.textContent = 'Đúng';
    } else {
      feedbackEl.textContent = `Chưa đủ giống. Đáp án: ${question.answers.join(' / ')}${recognized ? ` · Hệ thống nhận dạng: ${recognized}` : ocrError ? ` · ${ocrError}` : ''}`;
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
