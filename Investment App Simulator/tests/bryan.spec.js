
const { test, expect } = require('@playwright/test');

test.beforeEach(async ({ page }) => {
  await page.goto('http://localhost:3000');
});
// Drag and drop tests
test('Bryan: Drag and Drop: Invalid Category', async ({ page }) => {
    await page.goto('http://localhost:3000/html/login.html');
    await page.getByLabel('Username').fill('hiarjun');
    await page.getByLabel('Password').fill('123');
    await page.getByRole('button', { name: 'Login' }).click();
    const draggableTask = page.locator('div.task[draggable="true"][data-id="1"]');
    const targetList = page.locator('div.task-list#featured-list');
  
    await draggableTask.dragTo(targetList);
});

test('Bryan: Drag and Drop: Valid Category', async ({ page }) => {
  await page.goto('http://localhost:3000/html/login.html');
  await page.getByLabel('Username').fill('hiarjun');
  await page.getByLabel('Password').fill('123');

  page.once('dialog', async dialog => {
    console.log(`Dialog message: ${dialog.message()}`);
    dialog.dismiss().catch(() => {});
  });

  await page.getByRole('button', { name: 'Login' }).click();

  const draggableTask = page.locator('div.task[draggable="true"][data-id="1"]');
  const targetList1 = page.locator('div.task-list#bookmarks-list');
  await draggableTask.dragTo(targetList1);

  const targetList2 = page.locator('div.task-list#hotAndTrending-list');
  await draggableTask.dragTo(targetList2);
});

test('Bryan: Adding a Post in the Blog', async ({ page }) => {
  await page.goto('http://localhost:3000/html/login.html');
  await page.getByLabel('Username').click();
  await page.getByLabel('Username').fill('hiarjun');
  await page.getByLabel('Username').press('Tab');
  await page.getByLabel('Password').fill('123');
  page.once('dialog', dialog => {
    console.log(`Dialog message: ${dialog.message()}`);
    dialog.dismiss().catch(() => {});
  });
  await page.getByRole('button', { name: 'Login' }).click();
  await page.getByRole('link', { name: 'Blog' }).click();
  await page.getByPlaceholder('Post Title').click();
  await page.getByPlaceholder('Post Title').fill('This is a test by Playwright');
  await page.getByPlaceholder('Write your post here...').click();
  await page.getByPlaceholder('Write your post here...').fill('Life');
  await page.getByRole('button', { name: 'Post' }).click();
  page.once('dialog', dialog => {
    console.log(`Dialog message: ${dialog.message()}`);
    dialog.dismiss().catch(() => {});
  });
});

test('Bryan: Adding a Comment on the Post', async ({ page }) => {
  await page.goto('http://localhost:3000/html/login.html');
  await page.getByLabel('Username').click();
  await page.getByLabel('Username').fill('hiarjun');
  await page.getByLabel('Username').press('Tab');
  await page.getByLabel('Password').fill('123');
  page.once('dialog', dialog => {
    console.log(`Dialog message: ${dialog.message()}`);
    dialog.dismiss().catch(() => {});
  });
  await page.getByRole('button', { name: 'Login' }).click();
  await page.getByRole('link', { name: 'Blog' }).click();
  await page.getByRole('button', { name: 'Comments' }).first().click();
  await page.getByRole('textbox', { name: 'Your comment' }).click();
  await page.getByRole('textbox', { name: 'Your comment' }).fill('This is a Test.');
  await page.getByRole('button', { name: 'Add Comment' }).click();
});

test('Bryan: Editing the Title and Content on Post', async ({ page }) => {
  await page.goto('http://localhost:3000/html/login.html');
  await page.getByLabel('Username').click();
  await page.getByLabel('Username').fill('hiarjun');
  await page.getByLabel('Username').press('Tab');
  await page.getByLabel('Password').fill('123');
  page.once('dialog', dialog => {
    console.log(`Dialog message: ${dialog.message()}`);
    dialog.dismiss().catch(() => {});
  });
  await page.getByRole('button', { name: 'Login' }).click();
  await page.getByRole('link', { name: 'Blog' }).click();
  await page.getByRole('button', { name: 'Edit' }).click();
  await page.locator('#posts-container input[type="text"]').click();
  await page.locator('#posts-container input[type="text"]').fill('This is a test by Playwright, trialed again');
  await page.getByText('Life').click();
  await page.getByText('Life').fill('Life is great');
  page.once('dialog', dialog => {
    console.log(`Dialog message: ${dialog.message()}`);
    dialog.dismiss().catch(() => {});
  });
  await page.getByRole('button', { name: 'Save' }).click();
});

test('Bryan: Editing a Comment on the Blog', async ({ page }) => {
  await page.goto('http://localhost:3000/html/login.html');
  await page.getByLabel('Username').click();
  await page.getByLabel('Username').fill('hiarjun');
  await page.getByLabel('Username').press('Tab');
  await page.getByLabel('Password').fill('123');
  page.once('dialog', dialog => {
    console.log(`Dialog message: ${dialog.message()}`);
    dialog.dismiss().catch(() => {});
  });
  await page.getByRole('button', { name: 'Login' }).click();
  await page.getByRole('link', { name: 'Blog' }).click();
  await page.getByRole('button', { name: 'Comments' }).click();
  await page.getByRole('button', { name: 'Edit' }).nth(1).click();
  await page.getByRole('textbox').nth(2).click();
  await page.getByRole('textbox').nth(2).fill('This is a Test. is it working?');
  page.once('dialog', dialog => {
    console.log(`Dialog message: ${dialog.message()}`);
    dialog.dismiss().catch(() => {});
  });
  await page.getByRole('button', { name: 'Save' }).click();
});

test('Bryan: Deleting a Comment on the Blog', async ({ page }) => {
  await page.goto('http://localhost:3000/html/login.html');
  await page.getByLabel('Username').click();
  await page.getByLabel('Username').fill('hiarjun');
  await page.getByLabel('Username').press('Tab');
  await page.getByLabel('Password').fill('123');
  page.once('dialog', dialog => {
    console.log(`Dialog message: ${dialog.message()}`);
    dialog.dismiss().catch(() => {});
  });
  await page.getByRole('button', { name: 'Login' }).click();
  await page.getByRole('link', { name: 'Blog' }).click();
  await page.getByRole('button', { name: 'Comments' }).click();
  page.once('dialog', dialog => {
    console.log(`Dialog message: ${dialog.message()}`);
    dialog.dismiss().catch(() => {});
  });
  await page.getByRole('button', { name: 'Delete' }).nth(1).click();
});

test('Bryan: Deleting a Post on the Blog', async ({ page }) => {
  await page.goto('http://localhost:3000/html/login.html');
  await page.getByLabel('Username').click();
  await page.getByLabel('Username').fill('hiarjun');
  await page.getByLabel('Username').press('Tab');
  await page.getByLabel('Password').fill('123');
  page.once('dialog', dialog => {
    console.log(`Dialog message: ${dialog.message()}`);
    dialog.dismiss().catch(() => {});
  });
  await page.getByRole('button', { name: 'Login' }).click();
  await page.getByRole('link', { name: 'Blog' }).click();
  page.once('dialog', dialog => {
    console.log(`Dialog message: ${dialog.message()}`);
    dialog.dismiss().catch(() => {});
  });
  await page.getByRole('button', { name: 'Delete' }).click();
});
