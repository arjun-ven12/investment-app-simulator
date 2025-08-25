const prisma = require('../../prisma/prismaClient');

///////////////////////////////////////////////////////
// CREATE A NEW GOAL
///////////////////////////////////////////////////////
module.exports.createGoal = function createGoal(title, amount, deadline) {
  return prisma.goal
    .create({
      data: {
        title,
        amount,
        deadline,
      },
    })
    .then((goal) => {
      console.log('Goal created:', goal);
      return goal;
    });
};
//////////////////////////////////////////////////////
// GET ALL GOALS
//////////////////////////////////////////////////////
module.exports.getAllGoals = function getAllGoals() {
  return prisma.goal
    .findMany()
    .then((goals) => {
      console.log('All goals:', goals);
      return goals;
    });
};

//////////////////////////////////////////////////////
// UPDATE A GOAL
//////////////////////////////////////////////////////
module.exports.updateGoal = function updateGoal(id, data) {
  return prisma.goal
    .update({
      where: { id: parseInt(id) },
      data,
    })
    .then((goal) => {
      console.log('Goal updated:', goal);
      return goal;
    });
};

//////////////////////////////////////////////////////
// DELETE A GOAL
//////////////////////////////////////////////////////
module.exports.deleteGoal = function deleteGoal(id) {
  return prisma.goal
    .delete({ where: { id: parseInt(id) } })
    .then((goal) => {
      console.log('Goal deleted:', goal);
      return goal;
    });
};

//////////////////////////////////////////////////////
// GET USER TRADES CSV
//////////////////////////////////////////////////////
module.exports.getUserTrades = function getUserTrades(userId) {
  if (!userId || isNaN(userId)) {
    throw new Error("Invalid user ID");
  }
  return prisma.trade.findMany({
    where: { userId: Number(userId) },
    include: { stock: true } // to include the stock details (such as symbol)
  }).catch((error) => {
    console.error("Error fetching trades:", error);
    throw error;
  });
};