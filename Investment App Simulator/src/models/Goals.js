const prisma = require('../../prisma/prismaClient');

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

module.exports.getAllGoals = function getAllGoals() {
  return prisma.goal
    .findMany()
    .then((goals) => {
      console.log('All goals:', goals);
      return goals;
    });
};

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

module.exports.deleteGoal = function deleteGoal(id) {
  return prisma.goal
    .delete({ where: { id: parseInt(id) } })
    .then((goal) => {
      console.log('Goal deleted:', goal);
      return goal;
    });
};

// export to csv

exports.getUserTrades = function getUserTrades(userId) {
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