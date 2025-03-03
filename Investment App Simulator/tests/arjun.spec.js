
const { test, expect } = require('@playwright/test');
// const fetch = require("node-fetch");


test.beforeEach(async ({ page }) => {
  const randomNum = Math.floor(Math.random() * 100000);
  const username = `user${randomNum}`;
  const email = `${username}@example.com`;

  // Save generated credentials to an array (or you can store in a variable)
  const generatedUsers = [];
  generatedUsers.push({ username, email });

  // --- Registration Step ---
  await page.goto('http://localhost:3000/html/register.html');
  await page.getByRole('textbox', { name: 'Username' }).click();
  await page.getByRole('textbox', { name: 'Username' }).fill(username);
  await page.getByRole('textbox', { name: 'Email' }).click();
  await page.getByRole('textbox', { name: 'Email' }).fill(email);
  await page.getByRole('textbox', { name: 'Password', exact: true }).click();
  await page.getByRole('textbox', { name: 'Password', exact: true }).fill('123');
  await page.getByRole('textbox', { name: 'Confirm Password' }).click();
  await page.getByRole('textbox', { name: 'Confirm Password' }).fill('123');
  page.once('dialog', async dialog => {
    console.log(`Registration Dialog message: ${dialog.message()}`);
    await dialog.dismiss();
  });
  await page.getByRole('button', { name: 'Sign Up' }).click();

  // Optionally, wait for navigation or a success message here

  // --- Login Step ---
  // Navigate to login page (if needed)
  await page.getByRole('button', { name: 'Login' }).click();
  await page.getByRole('textbox', { name: 'Username' }).click();
  // Retrieve the username from our saved array
  await page.getByRole('textbox', { name: 'Username' }).fill(generatedUsers[0].username);
  await page.getByRole('textbox', { name: 'Password' }).click();
  await page.getByRole('textbox', { name: 'Password' }).fill('123');
  page.once('dialog', async dialog => {
    console.log(`Login Dialog message: ${dialog.message()}`);
    await dialog.dismiss();
  });
  await page.getByRole('button', { name: 'Login' }).click();
  await page.getByRole('link', { name: 'Investment' }).first().click();

});





    
//     // // /////////////////////////////////////////////////////////////////////////////////////////////
//     // // // BUY Stock: VALID Credentials
//     // // /////////////////////////////////////////////////////////////////////////////////////////////


    
  
      
    test.describe('BUY stock : Valid Credentials', () => {
      test('BUY test : Valid Credentials', async ({ page }) => {
        await page.getByRole('textbox', { name: 'Enter Stock Symbol:' }).click();
        await page.getByRole('textbox', { name: 'Enter Stock Symbol:' }).fill('AAPL');
        await page.getByRole('combobox').selectOption('monthly');
        await page.getByRole('button', { name: 'Get Stock Details' }).click();
    
        await page.getByRole('spinbutton', { name: 'Quantity' }).click();
        await page.getByRole('spinbutton', { name: 'Quantity' }).fill('10');
    
        // Dialog handling setup for multiple dialogs
        const dialogMessages = [];
        page.on('dialog', async dialog => {
          dialogMessages.push(dialog.message());
          await dialog.dismiss();
        });
        await page.waitForTimeout(1000);
    
        await page.getByRole('button', { name: 'Buy', exact: true }).click();
    
        // Navigate away and back to Investments
        await page.getByRole('link', { name: 'Home' }).click();
        await page.getByRole('link', { name: 'Investment', exact: true }).click();
    
        // Wait for the page to settle
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);
    
        // Increase the timeout for the expectation and assert the "BUY" cell is visible
        await expect(page.getByRole('cell', { name: 'BUY' })).toBeVisible({ timeout: 30000 });
      });
    });
    
    











    
    
    
    
//     // // /////////////////////////////////////////////////////////////////////////////////////////////
//     // // // SELL Stock: VALID Credentials
//     // // /////////////////////////////////////////////////////////////////////////////////////////////
    


test.describe('SELL stock : Valid Credentials', () => {
  test('SELL stock : Valid Credentials', async ({ page }) => {
    await page.getByRole('textbox', { name: 'Enter Stock Symbol:' }).click();
    await page.getByRole('textbox', { name: 'Enter Stock Symbol:' }).fill('AAPL');
    await page.getByRole('combobox').selectOption('monthly');

    await page.getByRole('button', { name: 'Get Stock Details' }).click();
    await page.getByRole('spinbutton', { name: 'Quantity' }).click();
    await page.getByRole('spinbutton', { name: 'Quantity' }).fill('10');

    await page.getByRole('button', { name: 'Buy', exact: true }).click();

    let lastDialogMessage = '';
    page.once('dialog', async dialog => {
      lastDialogMessage = dialog.message();
      console.log(`Dialog message: ${lastDialogMessage}`);
      await dialog.dismiss();
    });
    await page.waitForTimeout(1000);

    // Wait explicitly for the Quantity spinbutton to be visible
    await expect(page.getByRole('spinbutton', { name: 'Quantity', exact: true })).toBeVisible({ timeout: 30000 });
    await page.getByRole('spinbutton', { name: 'Quantity', exact: true }).click();
    await page.getByRole('spinbutton', { name: 'Quantity', exact: true }).fill('5');
    await page.waitForTimeout(2000);

    await page.getByRole('button', { name: 'Sell', exact: true }).first().click();

    // Navigate away and back to Investments
    await page.getByRole('link', { name: 'Home' }).click();
    await page.getByRole('link', { name: 'Investment', exact: true }).click();
    await page.waitForTimeout(5000); 

    // Wait until the page is fully loaded and the cell with text 'SELL' is visible
    await expect(page.getByRole('cell', { name: 'SELL' })).toBeVisible();
  });
});


    
    
    










    
    
// //     // /////////////////////////////////////////////////////////////////////////////////////////////
// //     // // BUY Stock: INVALID Credentials (not enough money)
// //     // /////////////////////////////////////////////////////////////////////////////////////////////
    


    


test.describe('Testing for failure: BUY stock : Invalid Credentials', () => {
  test('BUY stock : Invalid Credentials', async ({ page }) => {
    await page.getByRole('textbox', { name: 'Enter Stock Symbol:' }).click();
    await page.getByRole('textbox', { name: 'Enter Stock Symbol:' }).fill('AAPL');
    await page.getByRole('button', { name: 'Get Stock Details' }).click();
    await page.getByRole('spinbutton', { name: 'Quantity' }).click();
    await page.getByRole('spinbutton', { name: 'Quantity' }).fill('1000000');


    // Wait briefly before clicking the Buy button to ensure the UI is ready
    await page.waitForTimeout(1000);

    // Wait explicitly for the Buy button to be visible
    await expect(page.getByRole('button', { name: 'Buy', exact: true })).toBeVisible({ timeout: 30000 });
    await page.getByRole('button', { name: 'Buy', exact: true }).click();

    await page.waitForTimeout(1000);

    await expect(page.getByText('Failed to complete trade:')).toBeVisible();

  });
});









    
// //     // /////////////////////////////////////////////////////////////////////////////////////////////
// //     // // SELL Stock: INVALID Credentials (not enough stock)
// //     // /////////////////////////////////////////////////////////////////////////////////////////////
    




test.describe('Testing for failure: SELL stock : Invalid Credentials', () => {
  test('SELL stock : Invalid Credentials', async ({ page }) => {
    // Navigate to stock details
    await page.getByRole('textbox', { name: 'Enter Stock Symbol:' }).click();
    await page.getByRole('textbox', { name: 'Enter Stock Symbol:' }).fill('AAPL');
    await page.getByRole('button', { name: 'Get Stock Details' }).click();
    
    // Enter a small quantity and perform a Buy to simulate an order state
    await page.getByRole('spinbutton', { name: 'Quantity' }).click();
    await page.getByRole('spinbutton', { name: 'Quantity' }).fill('10');
    await page.getByRole('button', { name: 'Buy', exact: true }).click();
    
    // Navigate away and back to simulate a fresh trade
    await page.getByRole('link', { name: 'Home' }).click();
    await page.getByRole('link', { name: 'Home' }).click();
    await page.getByRole('link', { name: 'Investment', exact: true }).click();
    
    // Re-enter the stock details for Sell
    await page.getByRole('textbox', { name: 'Enter Stock Symbol:' }).click();
    await page.getByRole('textbox', { name: 'Enter Stock Symbol:' }).fill('AAPL');
    await page.getByRole('button', { name: 'Get Stock Details' }).click();
    await page.getByRole('spinbutton', { name: 'Quantity' }).click();
    await page.getByRole('spinbutton', { name: 'Quantity' }).fill('10000');


    // Click the Sell button to trigger the dialog
    await page.getByRole('button', { name: 'Sell', exact: true }).click();



    await page.waitForTimeout(1000);

// Using getByText to verify that the error has been popped up on the frontend above the buy button
    await expect(page.getByText('Failed to complete trade:')).toBeVisible(); 

  });
});





// // // /////////////////////////////////////////////////////////////////////////////////////////////
// // // // BUY Stock: Limit Order Buy --- Create limit order
// // // /////////////////////////////////////////////////////////////////////////////////////////////



test.describe('BUY Stock: Limit Order Buy', () => {
  test('BUY Stock: Limit Order Buy', async ({ page, request }) => {


          // Navigate to the investment page (adjust URL as needed)
          await page.getByRole('textbox', { name: 'Enter Stock Symbol:' }).click();
          await page.getByRole('textbox', { name: 'Enter Stock Symbol:' }).fill('AAPL');

          await page.getByRole('button', { name: 'Get Stock Details' }).click();
          await page.getByRole('spinbutton', { name: 'Quantity' }).click();
          await page.getByRole('spinbutton', { name: 'Quantity' }).fill('10');

          await page.getByRole('button', { name: 'Limit Order Buy' }).click();

          await page.getByRole('spinbutton', { name: 'Quantity' }).click();
          await page.getByRole('spinbutton', { name: 'Quantity' }).fill('5');
          await page.locator('body').click();
          await page.getByRole('spinbutton', { name: 'Price' }).click();
          await page.getByRole('spinbutton', { name: 'Price' }).fill('200');
          await page.locator('body').click();

          await page.getByRole('button', { name: 'Limit Order Buy' }).click();

    


        await page.getByRole('link', { name: 'Home' }).click();
        await page.getByRole('link', { name: 'Investment', exact: true }).click();
        await page.waitForTimeout(2000); 


      //Using getByRole to verify that the status of the limit order in the frontend is Pending (since the user is generated every test case, there will only be one limit order at a time)
        await expect(page.getByRole('cell', {name: 'PENDING'})).toBeVisible(); 




  });

})










// // /////////////////////////////////////////////////////////////////////////////////////////////
// // // SELL Stock: Limit Order Sell --- Create limit order
// // /////////////////////////////////////////////////////////////////////////////////////////////

test.describe('SELL Stock: Limit Order SELL', () => {

    test('SELL Stock: Limit Order SELL', async ({ page, request }) => {
      await page.getByRole('textbox', { name: 'Enter Stock Symbol:' }).click();
      await page.getByRole('textbox', { name: 'Enter Stock Symbol:' }).fill('AAPL');

      await page.getByRole('button', { name: 'Get Stock Details' }).click();
      await page.getByRole('spinbutton', { name: 'Quantity' }).click();
      await page.getByRole('spinbutton', { name: 'Quantity' }).fill('10');

      await page.getByRole('button', { name: 'Buy', exact: true }).click();
      await page.getByRole('spinbutton', { name: 'Quantity' }).click();
      await page.getByRole('spinbutton', { name: 'Quantity' }).fill('5');
      await page.locator('body').click();
      await page.getByRole('spinbutton', { name: 'Price' }).click();
      await page.getByRole('spinbutton', { name: 'Price' }).fill('600');
      await page.locator('body').click();

      await page.getByRole('button', { name: 'Limit Order Sell' }).click();

 
      await page.getByRole('link', { name: 'Home' }).click();
      await page.getByRole('link', { name: 'Investment', exact: true }).click();
      await page.waitForTimeout(2000); 

      //Using getByRole to verify that the status of the limit order in the frontend is Pending (since the user is generated every test case, there will only be one limit order at a time)
      await expect(page.getByRole('cell', {name: 'PENDING'})).toBeVisible();

    });

})







    
    // // /////////////////////////////////////////////////////////////////////////////////////////////
    // // // Comments
    // // /////////////////////////////////////////////////////////////////////////////////////////////




    test('Comments ADD', async ({ page }) => {
    await page.getByRole('textbox', { name: 'Stock Symbol:', exact: true }).click();
    await page.getByRole('textbox', { name: 'Stock Symbol:', exact: true }).fill('AAPL');
    await page.getByRole('textbox', { name: 'Write your comment here...' }).click();
    await page.getByRole('textbox', { name: 'Write your comment here...' }).fill('Hi');
    page.once('dialog', dialog => {
      console.log(`Dialog message: ${dialog.message()}`);
      dialog.dismiss().catch(() => {});
    });
    await page.getByRole('button', { name: 'Submit Comment' }).click();

        // Use .last() to target the last occurrence of "Hi" - which is the comment just added
    await expect(page.getByText('Hi', {exact: true}).last()).toBeVisible();


  });


  test('Testing for failure: Comments ADD: Failure', async ({ page }) => {
    // Create a promise that resolves when the dialog appears
    const dialogPromise = new Promise(resolve => {
      page.once('dialog', async dialog => {
        const message = dialog.message();
        console.log(`Dialog message: ${message}`);
        await dialog.dismiss();
        resolve(message);
      });
    });
  
    // Try submitting a comment without entering a stock symbol
    await page.getByRole('textbox', { name: 'Write your comment here...' }).click();
    await page.getByRole('textbox', { name: 'Write your comment here...' }).fill('Hi');
    await page.getByRole('button', { name: 'Submit Comment' }).click();
  
    // Wait for the dialog to appear and capture its message
    const dialogMessage = await dialogPromise;
    
    // Expect the dialog message to contain the desired text
    expect(dialogMessage).toContain('Please enter a stock symbol.');
  });



  test('Comments EDIT', async ({ page }) => {
    await page.getByRole('textbox', { name: 'Stock Symbol:', exact: true }).click();
    await page.getByRole('textbox', { name: 'Stock Symbol:', exact: true }).fill('AAPL');
    await page.getByRole('textbox', { name: 'Write your comment here...' }).click();
    await page.getByRole('textbox', { name: 'Write your comment here...' }).fill('Hi');
  
    await page.getByRole('button', { name: 'Submit Comment' }).click();
    
    // Override the prompt to return "Hi 2"
    await page.evaluate(() => {
      window.prompt = () => 'Hi 2';
    });
  
    await page.getByRole('button', { name: 'Edit' }).click();
    
    // Use .last() to target the last occurrence of "Hi 2"
    await expect(page.getByText('Hi 2', { exact: true }).last()).toBeVisible();
  });
  





    
/////////////////////////////////////////////////////////////////////////////////////////////
// Stocks API
/////////////////////////////////////////////////////////////////////////////////////////////


test('Stock API Favorite', async ({ page }) => {
  // Fill in the stock search field and click Search
  await page.getByRole('textbox', { name: 'Enter stock name or symbol' }).click();
  await page.getByRole('textbox', { name: 'Enter stock name or symbol' }).fill('AAPL');
  await page.getByRole('button', { name: 'Search' }).click();

  // Wait for 10 seconds after clicking search
  await page.waitForTimeout(10000);

  // Handle any dialog that might appear and dismiss it
  page.once('dialog', async dialog => {
    console.log(`Dialog message: ${dialog.message()}`);
    await dialog.dismiss();
  });

  // Click the favorite button for the desired list item
  await page.getByRole('listitem').filter({ hasText: 'APPLE INC (AAPL)Favorite' }).getByRole('button').first().click();

  // Navigate to Home then back to Investment
  await page.getByRole('link', { name: 'Home' }).click();
  await page.getByRole('link', { name: 'Investment', exact: true }).click();

  // Assert that the favorite stocks container contains 'AAPL'
  await expect(page.getByText('AAPLUnfavorite')).toBeVisible();
});




test('Stock API UnFavorite', async ({ page }) => {
  // Fill in the stock search field and click Search
  await page.getByRole('textbox', { name: 'Enter stock name or symbol' }).click();
  await page.getByRole('textbox', { name: 'Enter stock name or symbol' }).fill('AAPL');
  await page.getByRole('button', { name: 'Search' }).click();

  // Wait for 5 seconds after clicking search since the data is being fetched from the api (realtime from the internet)
  await page.waitForTimeout(5000);

  // Handle any dialog that might appear and dismiss it
  page.once('dialog', async dialog => {
    console.log(`Dialog message: ${dialog.message()}`);
    await dialog.dismiss();
  });

  // Click the favorite button for the desired list item
  await page.getByRole('listitem').filter({ hasText: 'APPLE INC (AAPL)Favorite' }).getByRole('button').click();

  // Navigate to Home then back to Investment to reload the page for the favorites to show up first with the unfavorite button
  await page.getByRole('link', { name: 'Home' }).click();
  await page.getByRole('link', { name: 'Investment', exact: true }).click();

  await page.getByRole('button', { name: 'Unfavorite' }).click();

  await expect(page.getByText('No favorite stocks found.')).toBeVisible();

});