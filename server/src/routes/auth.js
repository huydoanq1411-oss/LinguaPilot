const router = require('express').Router();
const bcrypt = require('bcryptjs');
const prisma = require('../db');
const { sign, requireAuth } = require('../auth');

// Luôn so sánh mật khẩu để giảm khác biệt thời gian giữa email tồn tại và không tồn tại.
const DUMMY_HASH = bcrypt.hashSync('dummy', 12);
const emailOk = (s) => typeof s === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
const publicUser = (u) => ({ id: u.id, email: u.email, displayName: u.displayName });

router.post('/register', async (req, res) => {
  const { email, password, displayName = '' } = req.body || {};
  if (!emailOk(email)) return res.status(400).json({ error: 'Email không hợp lệ' });
  if (typeof password !== 'string' || password.length < 8)
    return res.status(400).json({ error: 'Mật khẩu cần có ít nhất 8 ký tự' });
  if (displayName !== undefined && typeof displayName !== 'string')
    return res.status(400).json({ error: 'Tên hiển thị không hợp lệ' });

  const passwordHash = await bcrypt.hash(password, 12);
  try {
    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        passwordHash,
        displayName: String(displayName).slice(0, 60),
      },
    });
    res.status(201).json({ token: sign(user), user: publicUser(user) });
  } catch (e) {
    if (e.code === 'P2002') return res.status(409).json({ error: 'Email đã được đăng ký' });
    throw e;
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body || {};
  const user = await prisma.user.findUnique({
    where: { email: String(email || '').toLowerCase() },
  });
  const ok = await bcrypt.compare(String(password || ''), user ? user.passwordHash : DUMMY_HASH);
  if (!user || !ok) return res.status(401).json({ error: 'Email hoặc mật khẩu không chính xác' });
  res.json({ token: sign(user), user: publicUser(user) });
});

router.get('/me', requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  if (!user) return res.status(404).json({ error: 'Không tìm thấy user' });
  res.json(publicUser(user));
});

module.exports = router;
