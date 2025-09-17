const prisma = require('./prismaClient');


module.exports.getGuideById = async function (id) {
  const numeric = Number(id);
  if (isNaN(numeric)) throw new Error('Invalid guide ID');

  const guide = await prisma.investmentGuide.findUnique({
    where: { id: numeric },
  });

  if (!guide) throw new Error('Guide not found');
  return guide;
};