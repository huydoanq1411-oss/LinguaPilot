const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const prisma = require('./db');

const app = express();

app.use(helmet());
const allowedOrigins = (process.env.CLIENT_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
app.use(cors({ origin: allowedOrigins }));
app.use(express.json({ limit: '100kb' }));

app.get('/api/health', async (req, res) => {
  await prisma.$queryRaw`SELECT 1`;
  res.json({ ok: true, db: 'up' });
});

app.use('/api/auth', require('./routes/auth'));

app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);
  console.error(err);
  res.status(err.status || 500).json({ error: err.status ? err.message : 'Lỗi máy chủ' });
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`API chạy tại http://localhost:${port}`));
