const jwt = require('jsonwebtoken');

const SECRET = process.env.JWT_SECRET;
if (!SECRET || SECRET.length < 16) {
  console.error('JWT_SECRET chưa được cấu hình hoặc ngắn hơn 16 ký tự.');
  process.exit(1);
}

// Token chứa user ID và có thời hạn 7 ngày.
const sign = (user) => jwt.sign({ sub: user.id }, SECRET, { expiresIn: '7d' });

// Đọc "Authorization: Bearer <token>" và gắn người dùng vào request.
function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Chưa đăng nhập' });
  try {
    req.user = { id: jwt.verify(token, SECRET).sub };
    next();
  } catch {
    res.status(401).json({ error: 'Token không hợp lệ hoặc đã hết hạn' });
  }
}

module.exports = { sign, requireAuth };
