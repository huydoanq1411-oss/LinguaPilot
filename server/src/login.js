const { createHash } = require('node:crypto');

const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILURES = 10;

// PostgreSQL serializes attempts for the same email across API instances.
module.exports = async function login(prisma, bcrypt, dummyHash, email, password) {
  const key = createHash('sha256').update(email).digest('hex');
  return prisma.$transaction(async (tx) => {
    await tx.loginThrottle.upsert({ where: { key }, create: { key }, update: {} });
    await tx.$queryRaw`SELECT "key" FROM "LoginThrottle" WHERE "key" = ${key} FOR UPDATE`;
    const now = Date.now();
    const state = await tx.loginThrottle.findUnique({ where: { key } });
    const failures = state.failures.filter((date) => date.getTime() > now - WINDOW_MS);
    if (failures.length >= MAX_FAILURES) {
      return { retryAfter: Math.max(1, Math.ceil((failures[0].getTime() + WINDOW_MS - now) / 1000)) };
    }

    const user = await tx.user.findUnique({ where: { email } });
    const ok = await bcrypt.compare(password, user ? user.passwordHash : dummyHash);
    if (!user || !ok) {
      failures.push(new Date());
      await tx.loginThrottle.update({ where: { key }, data: { failures } });
      return { user: null };
    }
    await tx.loginThrottle.update({ where: { key }, data: { failures: [] } });
    return { user };
  }, { timeout: 15000 });
};
