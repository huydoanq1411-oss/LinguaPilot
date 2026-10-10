const prisma = require('./db');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const app = express();

app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_ORIGIN.split(',') }));
app.use(express.json({ limit: '100kb' }));

app.get('/api/health', (req, res) => {
  res.json({ ok: true });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Lỗi máy chủ' });
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`API chạy tại http://localhost:${port}`));
app.get('/api/health', async (req, res) => {
  await prisma.$queryRaw`SELECT 1`;   // hỏi thử DB một câu đơn giản
  res.json({ ok: true, db: 'up' });
});