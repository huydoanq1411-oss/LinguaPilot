const { PrismaClient } = require('@prisma/client');

module.exports = new PrismaClient(); // dùng chung một kết nối cho cả app