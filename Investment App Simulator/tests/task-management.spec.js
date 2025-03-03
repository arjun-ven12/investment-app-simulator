// // // const { test, expect } = require('@playwright/test');

// test.beforeEach(async ({ page }) => {
//   await page.goto('http://localhost:3001');
// });

// const NEW_TASKS = ['buy some cheese', 'feed the cat', 'delete me'];

// const ASSIGNEES = [
//   [0, 1],
//   [1, 2],
//   [1, 2],
// ];

// async function addTask(page, taskIndex) {
//   const taskNameInput = page.getByLabel('Task Name');
//   await taskNameInput.fill(NEW_TASKS[taskIndex]);

//   const statusInput = page.getByLabel('Status');
//   await statusInput.selectOption({ label: 'Pending' });

//   const assigneesInput = page.getByLabel('Assign To');
//   await assigneesInput.selectOption([
//     { index: ASSIGNEES[taskIndex][0] },
//     { index: ASSIGNEES[taskIndex][1] },
//   ]);

//   await page.getByRole('button', { name: 'Add Task' }).click();

//   await expect(page.locator('#tasksTableBody')).toContainText(
//     NEW_TASKS[taskIndex],
//   );
// }

// test.describe('New Task', () => {
//   test('Should allow me to add pending task with assignees', async ({
//     page,
//   }) => {
//     await addTask(page, 0);
//   });

//   test('Should not allow me to add without assignee', async ({ page }) => {
//     const taskNameInput = page.getByLabel('Task Name');
//     await taskNameInput.fill(NEW_TASKS[0]);

//     const statusInput = page.getByLabel('Status');
//     await statusInput.selectOption({ label: 'In Progress' });

//     await page.getByRole('button', { name: 'Add Task' }).click();

//     // First required field not filled will be focused
//     await expect(page.getByLabel('Assign To')).toBeFocused();
//   });

//   // Feature suggestion: More fields such as "Start/End time", hours estimated, priority, etc...
// });

// test.describe('Load Tasks', () => {
//   test('Should load tasks', async ({ page }) => {
//     const rows = page.locator('#tasksTableBody').getByRole('row');
//     await rows.first().waitFor();
//     await expect(await rows.count()).toBeGreaterThan(0);
//   });

//   // Feature suggestion: Pagination
// });

// test.describe('Update Task', () => {
//   test('Should allow me to remove assignee', async ({ page }) => {
//     await addTask(page, 1);

//     const rows = page.locator('#tasksTableBody').getByRole('row');
//     const newlyAddedRow = rows.filter({ hasText: NEW_TASKS[1] });
//     await newlyAddedRow.getByRole('button', { name: '❌' }).first().click();

//     await expect(newlyAddedRow.getByRole('button', { name: '❌' })).toHaveCount(
//       1,
//     );
//   });

//   // Feature suggestion: Should prevent removal if it is the last assignee
// });

// test.describe('Delete Task', () => {
//   test('Should allow me to remove task', async ({ page }) => {
//     await addTask(page, 2);

//     const rows = page.locator('#tasksTableBody').getByRole('row');

//     const newlyAddedRow = rows.filter({ hasText: NEW_TASKS[2] });
//     await newlyAddedRow.getByRole('button', { name: 'Delete' }).click();

//     await expect(page.locator('#tasksTableBody')).not.toContainText(
//       NEW_TASKS[2],
//     );
//   });

// <<<<<<< HEAD
//   // Feature suggestion: Add a new state "Cancelled" and prevent deletion unless it is "Cancelled" or "Completed"
// =======
// //   // Navigate to the profile page
// //   await page.getByRole('link', { name: 'Home' }).click();
// //   await page.getByRole('link', { name: 'View Profile' }).click();

// //   // Click to delete the account
// //   await page.locator('#delete-password').click();
// //   await page.locator('#delete-password').fill('123');

// //   // Handle the delete account dialog
// //   page.once('dialog', async dialog => {
// //     const message = dialog.message(); // Get the dialog message
// //     console.log(`Dialog message: ${message}`);
    
// //     // Assert the dialog message contains the expected text
// //     expect(message).toContain('Account successfully deleted!');
    
// //     // Dismiss the dialog
// //     await dialog.dismiss();
// //   });

// //   // Submit the delete account form
// //   await page.getByRole('button', { name: 'Delete Account' }).click();

// //   // Assert redirection to login page
// //   await expect(page).toHaveURL('http://localhost:3000/html/login.html');
// // });



// test('test delete account', async ({ page }) => {
//   // Generate unique username and email
//   const uniqueUsername = `user_${Date.now()}`;
//   const uniqueEmail = `user_${Date.now()}@example.com`;

//   // Navigate to the registration page
//   await page.goto('http://localhost:3000/html/login.html');
//   await page.locator('li').filter({ hasText: 'Register' }).click();

//   // Fill the registration form
//   await page.getByPlaceholder('Enter username').fill(uniqueUsername);
//   await page.getByPlaceholder('Enter email').fill(uniqueEmail);
//   await page.getByPlaceholder('Enter password', { exact: true }).fill('123');
//   await page.getByPlaceholder('Re-enter password').fill('123');

//   // Handle the registration dialog
//   page.once('dialog', async dialog => {
//     const message = dialog.message(); // Get the dialog message
//     console.log(`Dialog message: ${message}`);
    
//     // Assert the dialog message contains the expected text
//     expect(message).toContain('Registration successful!');
    
//     // Dismiss the dialog
//     await dialog.dismiss();
//   });

//   // Submit the registration form
//   await page.getByRole('button', { name: 'Sign Up' }).click();

//   // Assert redirection to login page
//   await expect(page).toHaveURL('http://localhost:3000/html/login.html');

//   // Log in with the registered user
//   await page.getByPlaceholder('Enter username').fill(uniqueUsername);
//   await page.getByPlaceholder('Enter password', { exact: true }).fill('123');

//   // Handle the login dialog
//   page.once('dialog', async dialog => {
//     const message = dialog.message(); // Get the dialog message
//     console.log(`Dialog message: ${message}`);
    
//     // Assert the dialog message contains the expected text
//     expect(message).toContain('Login successful!');
    
//     // Dismiss the dialog
//     await dialog.dismiss();
//   });

//   // Submit the login form
//   await page.getByRole('button', { name: 'Login' }).click();

//   // Navigate to the profile page
//   await page.getByRole('link', { name: 'Home' }).click();
//   await page.getByRole('link', { name: 'View Profile' }).click();

//   // Click to delete the account
//   await page.locator('#delete-password').click();
//   await page.locator('#delete-password').fill('123');

//   // Handle the delete account dialog
//   page.once('dialog', async dialog => {
//     const message = dialog.message(); // Get the dialog message
//     console.log(`Dialog message: ${message}`);
    
//     // Assert the dialog message contains the expected text

    
//     // Dismiss the dialog
//     await dialog.dismiss();
//   });

//   // Submit the delete account form
//   await page.getByRole('button', { name: 'Delete Account' }).click();

  
// >>>>>>> quiz
// });
