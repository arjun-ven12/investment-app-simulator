// const { test, expect } = require('@playwright/test');

// test.beforeEach(async ({ page }) => {
//   await page.goto('http://localhost:3000');
// });

// test('test fintech quiz and wallet update', async ({ page }) => {
//     // Navigate to the login page
//     await page.goto('https://checkmatefinance-bpbzdsdme8eze7cs.southeastasia-01.azurewebsites.net/html/login.html');
  
//     // Fill in login credentials
//     await page.getByLabel('Username').fill('vaeyan');
//     await page.getByLabel('Password').fill('123');
    
//     // Handle login confirmation dialog
//     page.once('dialog', async dialog => {
//       console.log(`Dialog message: ${dialog.message()}`);
//       expect(dialog.message()).toContain('Login successful!');
//       await dialog.dismiss();
//     });
  
//     // Submit login form
//     await page.getByRole('button', { name: 'Login' }).click();
  
//     // Navigate to quiz page
//     await page.getByRole('link', { name: 'Quiz' }).click();
  
//     // Answer all quiz questions
//     await page.getByRole('button', { name: 'Financial technology' }).click();
//     await page.getByRole('button', { name: 'Next' }).click();
  
//     await page.getByRole('button', { name: 'Robotic surgery' }).click();
//     await page.getByRole('button', { name: 'Next' }).click();
  
//     await page.getByRole('button', { name: 'Secure, decentralized transactions' }).click();
//     await page.getByRole('button', { name: 'Next' }).click();
  
//     await page.getByRole('button', { name: 'Peer-to-peer payments' }).click();
//     await page.getByRole('button', { name: 'Next' }).click();
  
//     await page.getByRole('button', { name: 'Personalized financial advice' }).click();
//     await page.getByRole('button', { name: 'Next' }).click();
  
//     await page.getByRole('button', { name: 'Revolut' }).click();
//     await page.getByRole('button', { name: 'Next' }).click();
  
//     await page.getByRole('button', { name: 'NFC' }).click();
//     await page.getByRole('button', { name: 'Next' }).click();
  
//     await page.getByRole('button', { name: 'Apple Pay' }).click();
//     await page.getByRole('button', { name: 'Submit' }).click();
  
//     // Handle wallet update confirmation
//     page.once('dialog', async dialog => {
//       console.log(`Dialog message: ${dialog.message()}`);
//       expect(dialog.message()).toContain('You received $1000 for a perfect score!');
//       await dialog.dismiss();
//     });
  
//     // Restart quiz
//     await page.getByRole('button', { name: 'Restart Quiz' }).click();
  
//     // Navigate back to Home
//     await page.getByRole('link', { name: 'Home' }).click();
  
//     // Check wallet update
//     await page.reload();
//     const walletDisplay = await page.getByText(/\$\d+/); // Matches any currency format like $1000
//     expect(walletDisplay).not.toBeNull();
//   });