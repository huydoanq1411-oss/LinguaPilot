const fs = require('node:fs/promises');
const path = require('node:path');
const router = require('express').Router();
const prisma = require('../db');
const { requireAuth } = require('../auth');

const lessonRoot = path.join(__dirname, '../../lessons');

router.use((req, res, next) => {
  res.set('Cache-Control', 'private, no-store');
  next();
});
router.use(requireAuth);
router.get('/:page', async (req, res) => {
  if (!/^[a-z0-9-]+\.html$/.test(req.params.page)) {
    return res.status(404).json({ error: 'Không tìm thấy bài học' });
  }
  const user = await prisma.user.findUnique({ where: { id: req.user.id }, select: { id: true } });
  if (!user) return res.status(401).json({ error: 'Phiên không còn hợp lệ. Vui lòng đăng nhập lại.' });
  try {
    let html = await fs.readFile(path.join(lessonRoot, req.params.page), 'utf8');
    html = html.replace(/<head\b[^>]*>/i, (head) =>
      `${head}<script src="/learning-progress.js?v=20261119" data-user-id="${encodeURIComponent(String(user.id))}"></script>`);
    if (html.includes('<script src="quiz-bank.js"></script>')) {
      const bank = await fs.readFile(path.join(lessonRoot, 'quiz-bank.js'), 'utf8');
      html = html.replace('<script src="quiz-bank.js"></script>',
        () => `<script>${bank.replace(/<\/script/gi, '<\\/script')}</script>`);
    }
    res.json({ html });
  } catch (err) {
    if (err.code === 'ENOENT') return res.status(404).json({ error: 'Không tìm thấy bài học' });
    throw err;
  }
});

module.exports = router;
