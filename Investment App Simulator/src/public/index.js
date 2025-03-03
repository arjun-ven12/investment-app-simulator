const apiUrl = '.'; // Adjust this URL if your API is hosted elsewhere

// Function to populate the status options
function populateStatusOptions() {
  fetch(`${apiUrl}/statuses`)
    .then((response) => response.json())
    .then((statuses) => {
      const taskStatus = document.getElementById('taskStatus');
      statuses.forEach((status) => {
        const option = document.createElement('option');
        option.value = status.id;
        option.textContent = status.text;
        taskStatus.appendChild(option);
      });
    })
    .catch((error) => console.error('Error fetching statuses:', error));
}

// Function to populate the assignees options
function populateAssigneesOptions() {
  fetch(`${apiUrl}/persons`)
    .then((response) => response.json())
    .then((statuses) => {
      const assignee = document.getElementById('assignees');
      statuses.forEach((status) => {
        const option = document.createElement('option');
        option.value = status.id;
        option.textContent = status.name;
        assignee.appendChild(option);
      });
    })
    .catch((error) => console.error('Error fetching assignees:', error));
}

// Function to populate the tasks table
function populateTasksTable() {
  fetch(`${apiUrl}/tasks`)
    .then((response) => response.json())
    .then((tasks) => {
      const tasksTableBody = document.getElementById('tasksTableBody');
      const rowTemplate = document.getElementById('taskRowTemplate').content;
      const assigneeLiTemplate =
        document.getElementById('assigneeLiTemplate').content;
      tasksTableBody.innerHTML = ''; // Clear existing rows

      tasks.forEach((task) => {
        const row = document.importNode(rowTemplate, true);
        row.querySelector('.task-id').textContent = task.id;
        row.querySelector('.task-name').textContent = task.name;
        row.querySelector('.task-status').textContent = task.status.text;
        row.querySelector('.delete-button').onclick = function () {
          deleteTask(task.id);
        };

        const assigneeUl = row.querySelector('.task-assignees');
        task.persons.forEach((person) => {
          const assigneeLi = createAssigneeLi(assigneeLiTemplate, task, person);
          assigneeUl.appendChild(assigneeLi);
        });

        tasksTableBody.appendChild(row);
      });
    })
    .catch((error) => console.error('Error fetching tasks:', error));
}

function createAssigneeLi(assigneeLiTemplate, task, assignment) {
  const assigneeLi = document.importNode(assigneeLiTemplate, true);
  assigneeLi.querySelector('.assigneeName').textContent =
    assignment.person.name;
  assigneeLi.querySelector('.unassignButton').onclick = function () {
    fetch(`${apiUrl}/tasks/${task.id}/assignee/${assignment.person.id}`, {
      method: 'DELETE',
    }).then(populateTasksTable);
  };
  return assigneeLi;
}

// Function to add a new task
function addTask(event) {
  event.preventDefault();
  const taskName = document.getElementById('taskName').value;
  const taskStatus = document.getElementById('taskStatus').value;
  const selectedAssigneesOptions = document.querySelectorAll(
    '#assignees option:checked',
  );
  const selectedAssigneeIds = Array.from(selectedAssigneesOptions).map(
    (option) => +option.value,
  );

  fetch(`${apiUrl}/tasks`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: taskName,
      statusId: +taskStatus,
      assignedPersonId: selectedAssigneeIds,
    }),
  })
    .then((response) => response.json())
    .then(() => {
      populateTasksTable(); // Refresh the table
      document.getElementById('taskForm').reset(); // Reset the form
    })
    .catch((error) => console.error('Error adding task:', error));
}

// Function to delete a task
function deleteTask(id) {
  fetch(`${apiUrl}/tasks/${id}`, {
    method: 'DELETE',
  })
    .then(() => {
      populateTasksTable(); // Refresh the table
    })
    .catch((error) => console.error('Error deleting task:', error));
}

document.addEventListener('DOMContentLoaded', () => {
  // Populate the status options on page load
  populateStatusOptions();

  // Populate the assignees options on page load
  populateAssigneesOptions();

  // Event listener for form submission
  document.getElementById('taskForm').addEventListener('submit', addTask);

  // Populate the tasks table on page load
  populateTasksTable();
});
