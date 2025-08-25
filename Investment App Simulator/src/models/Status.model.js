const prisma = require('./prismaClient');

//////////////////////////////////////////////////////
// GET ALL STATUS
//////////////////////////////////////////////////////
module.exports.getAllStatus = function getAllStatus() {
  return prisma.status.findMany({}).then((statuses) => {
    console.log('All statuses:', statuses);
    return statuses;
  });
};
