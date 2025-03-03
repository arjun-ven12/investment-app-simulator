import { test, expect } from '@playwright/test';



// Register & Login Test Cases (Success)

// Generate a unique username and email for each test
const randomNum = Math.floor(Math.random() * 100000); // Random number to ensure uniqueness
const username = `testUser${randomNum}`;
const email = `testUser${randomNum}@gmail.com`;

test.setTimeout(60000); // Extend timeout to 60 seconds

test.beforeEach(async ({ page }) => {
 await page.goto('http://localhost:3000');
});

test('User registration and login flow (bypassing CAPTCHA)', async ({ page }) => {
 // Click on "Login" and then "Register"
 await page.getByRole('link', { name: 'Login' }).click();
 await page.getByRole('link', { name: 'Register' }).click();

 // Fill in registration details
 await page.getByPlaceholder('Enter username').fill(username);
 await page.getByPlaceholder('Enter email').fill(email);
 await page.getByPlaceholder('Enter password', { exact: true }).fill('Test@123');
 await page.getByPlaceholder('Re-enter password').fill('Test@123');

 // Submit the registration form
 await page.getByRole('button', { name: 'Sign Up' }).click();

 // 🚀 **Check if registration was successful**
 const registrationSuccess = await page.locator('text=Registration successful').isVisible();
 if (!registrationSuccess) {
   console.log(`❌ Registration failed for ${username} (${email}). Capturing screenshot...`);
   await page.screenshot({ path: 'registration_failed.png', fullPage: true });
   throw new Error("Registration failed. Check registration_failed.png");
 }

 // Wait for login page to load
 await expect(page.getByRole('heading', { name: 'Login' })).toBeVisible({ timeout: 60000 });

 // Fill in login details
 await page.getByLabel('Username').fill(username);
 await page.getByLabel('Password').fill('Test@123');
 // **Bypass CAPTCHA in test mode**
 await page.evaluate(() => {
   document.querySelector('#captchaInput').value = 'TEST_BYPASS';
 });
 // Click login button
 await page.getByRole('button', { name: 'Login' }).click();
 // 🚀 **Debugging: Check for Login Success**
 const loginSuccess = await page.locator('text=Login successful').isVisible();
 if (!loginSuccess) {
   console.log(`❌ Login failed for ${username}. Capturing screenshot...`);
   await page.screenshot({ path: 'login_failed.png', fullPage: true });
   throw new Error("Login failed. Check login_failed.png");
 }

// Wait for home page after login
 await page.waitForURL('http://localhost:3000/home', { timeout: 60000 });

 // Verify logout button exists
 await expect(page.getByRole('link', { name: 'Logout' })).toBeVisible();

 // Click logout
 await page.getByRole('link', { name: 'Logout' }).click();
 // Ensure user is redirected back to login page
await page.waitForURL('http://localhost:3000/login', { timeout: 60000 });
});



// // Register & Login Test Cases (Failure)

// test('❌ Should show error on incorrect login', async ({ page }) => {
//   await page.goto('http://localhost:3000/html/login.html');

//   console.log(`🔑 Attempting to log in with incorrect credentials...`);

//   await page.getByRole('textbox', { name: 'Username' }).fill('wronguser');
//   await page.getByRole('textbox', { name: 'Password' }).fill('wrongpassword');
//   await page.getByRole('button', { name: 'Login' }).click();

//   // ✅ Wait for UI delay
//   await page.waitForTimeout(2000);

//   // ✅ Log full page text to see actual error message
//   const pageText = await page.textContent('body');
//   console.log(`📜 Page Text: ${pageText}`);

//   // ✅ More flexible check for error message
//   await expect(page.locator('body')).toContainText('Incorrect');
  
//   console.log(`✅ Error message detected successfully!`);
// });







// Financial Goals Test Case (Success)

test('Financial Goals Test - Create, Edit, Delete', async ({ page }) => {
  const baseURL = 'http://localhost:3000';

  console.log(`🌐 Navigating to: ${baseURL}`);
  await page.goto(baseURL);
  await page.waitForLoadState('networkidle'); // Ensure page fully loads

  // ✅ Log in as admin
  console.log(`🔑 Logging in as admin...`);
  await page.getByRole('link', { name: 'Login' }).click();
  await page.getByRole('textbox', { name: 'Username' }).fill('admin');
  await page.getByRole('textbox', { name: 'Password' }).fill('123');
  await page.getByRole('button', { name: 'Login' }).click();
  await page.waitForTimeout(2000); // Allow time for login redirect

  // ✅ Navigate to Financial Goals Page
  console.log(`📌 Navigating to Financial Goals page...`);
  await page.getByRole('link', { name: 'Financial Goals' }).click();
  await page.waitForTimeout(1000);

  // ✅ Create a New Financial Goal
  console.log(`📝 Creating a new goal...`);
  const goalTitle = `Earn ${Math.floor(Math.random() * 1000) + 100}K`; // Random goal
  await page.getByRole('textbox', { name: 'Goal Title' }).fill(goalTitle);
  await page.getByPlaceholder('Target Amount').fill('600000');
  await page.locator('#goal-deadline').fill('2027-12-14');
  await page.getByRole('textbox', { name: 'Description:' }).fill('Earn Enough to Buy a House/Car');
  await page.getByRole('button', { name: 'Add Goal' }).click();
  console.log(`✅ Goal created: ${goalTitle}`);

  // ✅ Verify Goal is Created
  await page.waitForSelector(`#goals-list div:has-text("${goalTitle}")`, { timeout: 5000 });
  console.log(`🟢 Goal successfully added to the list.`);

  // ✅ Edit the Goal
  console.log(`✏ Editing the goal...`);
  await page.locator(`#goals-list div:has-text("${goalTitle}")`).getByRole('button').first().click();
  await page.getByRole('textbox', { name: 'Title:' }).fill('Earn 1Million');
  await page.getByRole('spinbutton', { name: 'Amount:' }).fill('1000000');
  await page.getByRole('textbox', { name: 'Description:' }).fill('Earn Enough to Buy a House & Car (Updated)');
  await page.getByRole('textbox', { name: 'Deadline:' }).fill('2030-12-31');
  await page.getByRole('button', { name: 'Update Goal' }).click();
  console.log(`✅ Goal updated successfully.`);

  // ✅ Verify Goal is Updated
  await page.waitForTimeout(1000);
  await expect(
    page.locator(`#goals-list div:has-text("Earn 1Million Amount: $1000000")`).first()
  ).toBeVisible();
  console.log(`🟢 Goal update verified.`);

  // ✅ Delete the Goal
  console.log(`🗑 Deleting the goal...`);

  // ✅ Log API Requests & Responses
  page.on('request', request => console.log(`➡️ Request Sent: ${request.url()}`));
  page.on('response', response => console.log(`⬅️ Response Received: ${response.url()} | Status: ${response.status()}`));

  await page.locator(`#goals-list div:has-text("Earn 1Million")`).getByRole('button').nth(1).click();
  console.log(`🟢 Delete button clicked.`);

  // ✅ Instead of waiting for API response, wait for UI update
  await page.waitForSelector(`#goals-list div:has-text("Earn 1Million")`, { state: 'detached', timeout: 10000 });
  console.log(`🟢 Goal no longer visible on UI.`);

  // ✅ Refresh the Page to Confirm Deletion
  console.log(`🔄 Refreshing page to confirm goal deletion...`);
  await page.reload();
  await page.waitForLoadState('networkidle');

  // ✅ Verify Goal is Deleted After Refresh
  const goalExists = await page.locator(`#goals-list div:has-text("Earn 1Million")`).count();
  console.log(`🛠 Number of goals found after refresh: ${goalExists}`);

  // ✅ Ensure there are NO instances of the goal
  expect(goalExists).toBe(0);
  console.log(`✅ Goal is permanently deleted! 🎉`);
});











// Financial Goals Test Case (Failure)

// test('❌ Should show an error when adding a goal without a title', async ({ page }) => {
//   await page.goto('http://localhost:3000/html/goals.html');

//   console.log(`📝 Attempting to add a goal without a title...`);

//   await page.getByPlaceholder('Target Amount').fill('100000');
//   await page.locator('#goal-deadline').fill('2025-12-31');
//   await page.getByRole('textbox', { name: 'Description:' }).fill('No title given');

//   await page.getByRole('button', { name: 'Add Goal' }).click();

//   // ✅ Wait for UI to update
//   await page.waitForTimeout(1000);

//   // ✅ Log all text on the page
//   const pageText = await page.textContent('body');
//   console.log(`📜 Page Text: ${pageText}`);

//   // ✅ More flexible check for error message
//   await expect(page.locator('body')).toContainText('Title');

//   console.log(`✅ Error message detected successfully!`);
// });




// test('❌ Should show an error when adding a goal with negative amount', async ({ page }) => {
//   await page.goto('http://localhost:3000/html/goals.html');

//   console.log(`📝 Attempting to add a goal with negative amount...`);

//   await page.getByRole('textbox', { name: 'Goal Title' }).fill('Invalid Goal');
//   await page.getByPlaceholder('Target Amount').fill('-50000'); // ❌ Negative amount
//   await page.locator('#goal-deadline').fill('2025-12-31');
//   await page.getByRole('textbox', { name: 'Description:' }).fill('Invalid test case');

//   await page.getByRole('button', { name: 'Add Goal' }).click();

//   // ✅ Check for error message
//   await expect(page.getByText('Amount must be positive')).toBeVisible();
//   console.log(`✅ Error message displayed: "Amount must be positive"`);
// });




// test('❌ Should prevent editing a goal with an empty title', async ({ page }) => {
//   await page.goto('http://localhost:3000/html/goals.html');

//   console.log(`✏ Attempting to edit a goal with an empty title...`);

//   await page.locator(`#goals-list div`).first().getByRole('button').click(); // Open first goal for edit

//   await page.getByRole('textbox', { name: 'Title:' }).fill(''); // ❌ Empty Title
//   await page.getByRole('button', { name: 'Update Goal' }).click();

//   // ✅ Ensure an error message appears
//   await expect(page.getByText('Title cannot be empty')).toBeVisible();
//   console.log(`✅ Error message displayed: "Title cannot be empty"`);
// });




// test('❌ Should show error if goal deletion fails', async ({ page }) => {
//   await page.goto('http://localhost:3000/html/goals.html');

//   console.log(`🗑 Attempting to delete a goal with simulated API failure...`);

//   page.on('request', request => {
//     if (request.url().includes('/api/delete-goal')) {
//       console.log(`⚠️ Simulating API failure for delete request: ${request.url()}`);
//     }
//   });

//   await page.locator(`#goals-list div`).first().getByRole('button').nth(1).click(); // Click delete

//   // ✅ Expect failure message
//   await expect(page.getByText('Failed to delete goal')).toBeVisible();
//   console.log(`✅ Error message displayed: "Failed to delete goal"`);
// });
