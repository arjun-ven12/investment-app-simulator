const { test, expect } = require('@playwright/test');

test.beforeEach(async ({ page }) => {
  await page.goto('http://localhost:3000');
});


// Referral system tests
test('Testing for failure: Referral link not found', async ({ page }) => {
  await page.goto('http://localhost:3000/html/login.html');

  await page.getByLabel('Username').fill('hiarjun');
  await page.getByLabel('Password').fill('123');

  page.once('dialog', async dialog => {
    dialog.dismiss().catch(() => {});
  });

  await page.getByRole('button', { name: 'Login' }).click();
  await page.waitForTimeout(1000);
  await page.getByRole('link', { name: 'Referral' }).click();

  page.once('dialog', async dialog => {
    expect(dialog.message()).toContain('Referral link not found!');
    dialog.dismiss().catch(() => {});
  });

  await page.getByRole('button', { name: 'Enter' }).click();
});

test('Testing for failure: Unable to use referral after 5 hour of account creation', async ({ page }) => {
  await page.goto('http://localhost:3000/html/login.html');
  await page.getByLabel('Username').click();
  await page.getByLabel('Username').fill('hiarjun');
  await page.getByLabel('Username').press('Tab');
  await page.getByLabel('Password').fill('123');
  page.once('dialog', dialog => {
    dialog.dismiss().catch(() => {});
  });
  await page.getByRole('button', { name: 'Login' }).click();
  await page.getByRole('link', { name: 'Referral' }).first().click();
  page.once('dialog', dialog => {
    expect(dialog.message()).toContain('Referral link copied to clipboard!');
    dialog.dismiss().catch(() => {});
  });
  await page.getByRole('button', { name: 'Copy' }).click();
  await page.locator('#receivedReferralLink').click();
  await page.locator('#receivedReferralLink').fill('https://www.fintech.com/referral/t1a19kg8b');
  page.once('dialog', dialog => {
    expect(dialog.message()).toContain('You cannot use the referral system after 5 hours of account creation!');
    dialog.dismiss().catch(() => {});
  });
  await page.getByRole('button', { name: 'Enter' }).click();
});

test('Testing for success: Referral link used by user', async ({ page }) => {
  await page.goto('http://localhost:3000/html/login.html');

  await page.getByLabel('Username').fill('ws');
  await page.getByLabel('Password').fill('123');

  page.once('dialog', async dialog => {
    dialog.dismiss().catch(() => {});
  });

  await page.getByRole('button', { name: 'Login' }).click();

  await page.getByRole('link', { name: 'Referral' }).first().click();

  await page.locator('#receivedReferralLink').fill('https://www.fintech.com/referral/t1a19kg8b');

  page.once('dialog', async dialog => {
    expect(dialog.message()).toContain('Referral link has already been used by this user!');
    dialog.dismiss().catch(() => {});
  });
  
    await page.getByRole('button', { name: 'Enter' }).click();
  });

test('Testing for success: Redeeming 5 rewards with sufficient money', async ({ page }) => {
  await page.goto('http://localhost:3000/html/login.html');

  await page.getByLabel('Username').click();
  await page.getByLabel('Username').fill('rewardtest');
  await page.getByLabel('Username').press('Tab');
  await page.getByLabel('Password').fill('321');

  page.once('dialog', dialog => {
    dialog.dismiss().catch(() => {});
  });

  await page.getByRole('button', { name: 'Login' }).click();
  await page.getByRole('link', { name: 'Rewards' }).first().click();

  page.once('dialog', dialog => {
    dialog.dismiss().catch(() => {});
  });

  await page.getByRole('button', { name: 'Redeem for $50000' }).click();

  page.once('dialog', dialog => {
    dialog.dismiss().catch(() => {});
  });

  await page.getByRole('button', { name: 'Redeem for $25000' }).click();

  page.once('dialog', dialog => {
    dialog.dismiss().catch(() => {});
  });

  await page.getByRole('button', { name: 'Redeem for $10000' }).first().click();

  page.once('dialog', dialog => {
    dialog.dismiss().catch(() => {});
  });

  await page.getByRole('button', { name: 'Redeem for $20000' }).first().click();

  page.once('dialog', dialog => {
    dialog.dismiss().catch(() => {});
  });
});

test('Testing for failure: Not enough money to redeem rewards', async ({ page }) => {
  await page.goto('http://localhost:3000/html/login.html');

  await page.getByLabel('Username').click();
  await page.getByLabel('Username').fill('nomoneytest');
  await page.getByLabel('Username').press('Tab');
  await page.getByLabel('Password').fill('321');

  page.once('dialog', dialog => {
    dialog.dismiss().catch(() => {});
  });

  await page.getByRole('button', { name: 'Login' }).click();

  await page.getByRole('link', { name: 'Rewards' }).first().click();

  page.once('dialog', dialog => {
    dialog.dismiss().catch(() => {});
  });

  await page.getByRole('button', { name: 'Redeem for $50000' }).click();

  page.once('dialog', dialog => {
    expect(dialog.message()).toContain('Unable to redeem reward, not enough money in wallet!');
    dialog.dismiss().catch(() => {});
  });

  await page.getByRole('button', { name: 'Redeem for $15000' }).first().click();

  page.once('dialog', dialog => {
    expect(dialog.message()).toContain('Unable to redeem reward, not enough money in wallet!');
    dialog.dismiss().catch(() => {});
  });

  await page.getByRole('button', { name: 'Redeem for $20000' }).nth(1).click();

  page.once('dialog', dialog => {
    expect(dialog.message()).toContain('Unable to redeem reward, not enough money in wallet!');
    dialog.dismiss().catch(() => {});
  });

  await page.getByRole('button', { name: 'View My Reward History' }).click();
  page.once('dialog', dialog => {
    expect(dialog.message()).toContain('No reward that was redeemed previously to display!');
    dialog.dismiss().catch(() => {});
  });

})

test('Testing for success: Spin the wheel and redeeming more rewards', async ({ page }) => {
  await page.goto('http://localhost:3000/html/login.html');

  await page.getByLabel('Username').click();
  await page.getByLabel('Username').fill('rewardtest');
  await page.getByLabel('Username').press('Tab');
  await page.getByLabel('Password').fill('321');

  page.once('dialog', dialog => {
    dialog.dismiss().catch(() => {});
  });

  await page.getByRole('button', { name: 'Login' }).click();

  await page.getByRole('link', { name: 'Rewards' }).first().click();

  page.once('dialog', dialog => {
    dialog.dismiss().catch(() => {});
  });

  await page.getByRole('button', { name: 'Redeem for $20000' }).nth(2).click();

  page.once('dialog', dialog => {
    dialog.dismiss().catch(() => {});
  });

  await page.getByRole('button', { name: 'Redeem for $15000' }).nth(1).click();

  page.once('dialog', dialog => {
    dialog.dismiss().catch(() => {});
  });

  await page.getByRole('button', { name: 'Redeem for $10000' }).nth(1).click();

  page.once('dialog', dialog => {
    dialog.dismiss().catch(() => {});
  });

  await page.getByRole('button', { name: 'Redeem for $20000' }).nth(1).click();

  await page.getByRole('button', { name: 'Spin for $' }).click();
});

test('Testing for failure: No money to spin the wheel and redeem reward', async ({ page }) => {
  await page.goto('http://localhost:3000/html/login.html');

  await page.getByLabel('Username').click();
  await page.getByLabel('Username').fill('nomoneytest');
  await page.getByLabel('Username').press('Tab');
  await page.getByLabel('Password').fill('321');

  page.once('dialog', dialog => {
    dialog.dismiss().catch(() => {});
  });

  await page.getByRole('button', { name: 'Login' }).click();

  await page.getByRole('link', { name: 'Rewards' }).first().click();

  page.once('dialog', dialog => {
    dialog.dismiss().catch(() => {});
  });

  await page.getByRole('button', { name: 'Redeem for $50000' }).click();

  page.once('dialog', dialog => {
    expect(dialog.message()).toContain('Unable to redeem reward, not enough money in wallet!');
    dialog.dismiss().catch(() => {});
  });

  await page.getByRole('button', { name: 'Redeem for $25000' }).click();

  page.once('dialog', dialog => {
    expect(dialog.message()).toContain('Unable to redeem reward, not enough money in wallet!');
    dialog.dismiss().catch(() => {});
  });

  await page.getByRole('button', { name: 'Spin for $' }).click();

  page.once('dialog', dialog => {
    expect(dialog.message()).toContain('Unable to redeem reward, not enough money in wallet!');
    dialog.dismiss().catch(() => {});
  });

  await page.getByRole('button', { name: 'View My Reward History' }).click();
});