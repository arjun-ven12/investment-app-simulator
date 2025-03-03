const prisma = require('./prismaClient');

module.exports.createTask = function createTask(name, statusId, assignedPersonId = []) {
  // Reference: https://www.prisma.io/docs/orm/prisma-schema/data-model/relations/many-to-many-relations#explicit-many-to-many-relations
  return prisma.task
    .create({
      data: {
        name,
        statusId,
        persons: {
          create: assignedPersonId.map((personId) => ({
            person: { connect: { id: personId } },
          })),
        },
      },
    })
    .then((task) => {
      console.log('Task created:', task);
      return task;
    });
};

module.exports.getAllTasks = function getAllTasks() {
  return prisma.task
    .findMany({
      include: {
        status: true,
        persons: {
          include: {
            person: true,
          },
        },
      },
    })
    .then((tasks) => {
      console.log('All tasks:', tasks);
      return tasks;
    });
};

module.exports.getTasksByStatus = function getTasksByStatus(statusId) {
  return prisma.task
    .findMany({
      where: { statusId },
      include: {
        status: true,
        persons: {
          include: {
            person: true,
          },
        },
      },
    })
    .then((tasks) => {
      console.log(`Tasks with status ID ${statusId}:`, tasks);
      return tasks;
    });
};

module.exports.updateTask = function updateTask(id, data) {
  return prisma.task
    .update({
      where: { id },
      data,
    })
    .then((task) => {
      console.log('Task updated:', task);
      return task;
    });
};

module.exports.deleteTask = function deleteTask(id) {
  return prisma.task
    .delete({
      where: { id },
    })
    .then((task) => {
      console.log('Task deleted:', task);
      return task;
    });
};

module.exports.deleteTaskAssignment = function deleteTaskAssignment(taskId, personId) {
  return prisma.taskAssignment
    .delete({
      where: {
        // Reference: https://www.prisma.io/docs/orm/prisma-client/special-fields-and-types/working-with-composite-ids-and-constraints
        assignmentId: { taskId: taskId, personId: personId },
      },
    })
    .then((assignment) => {
      console.log('Assignment deleted:', assignment);
      return assignment;
    });
};
