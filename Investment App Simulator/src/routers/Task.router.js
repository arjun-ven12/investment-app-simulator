const express = require('express');
const router = express.Router();
const {
  createTask,
  getAllTasks,
  getTasksByStatus,
  updateTask,
  deleteTask,
  deleteTaskAssignment,
} = require('../models/Task.model');

// Create a new task
router.post('/', (req, res, next) => {
  const { name, statusId, assignedPersonId } = req.body;
  createTask(name, statusId, assignedPersonId)
    .then((task) => res.status(201).json(task))
    .catch(next);
});

// Retrieve all tasks
router.get('/', (req, res, next) => {
  getAllTasks()
    .then((tasks) => res.status(200).json(tasks))
    .catch(next);
});

// Retrieve tasks by status
router.get('/status/:statusId', (req, res, next) => {
  const { statusId } = req.params;
  getTasksByStatus(parseInt(statusId))
    .then((tasks) => res.status(200).json(tasks))
    .catch(next);
});

// Update a task
router.put('/:id', (req, res, next) => {
  const { id } = req.params;
  const data = req.body;
  updateTask(parseInt(id), data)
    .then((task) => res.status(200).json(task))
    .catch(next);
});

// Delete a task
router.delete('/:id', (req, res, next) => {
  const { id } = req.params;
  deleteTask(parseInt(id))
    .then((task) => res.status(200).json(task))
    .catch(next);
});

router.delete('/:taskId/assignee/:personId', (req, res, next) => {
  const { taskId, personId } = req.params;
  deleteTaskAssignment(+taskId, +personId)
    .then((taskAssignment) => res.status(200).json(taskAssignment))
    .catch(next);
});

module.exports = router;
