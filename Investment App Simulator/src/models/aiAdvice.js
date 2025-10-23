const prisma = require("../../prisma/prismaClient");

module.exports = {
  async getLatestAdvice(userId, category) {
    try {
      return await prisma.aIAdvice.findMany({
        where: { userId, category },
        orderBy: { createdAt: "desc" },
        take: 1,
      });
    } catch (err) {
      console.error("❌ Error fetching AI advice:", err);
      throw err;
    }
  },

  async getAllAdvice(userId) {
    try {
      return await prisma.aIAdvice.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
      });
    } catch (err) {
      console.error("❌ Error fetching all AI advice:", err);
      throw err;
    }
  },
};
