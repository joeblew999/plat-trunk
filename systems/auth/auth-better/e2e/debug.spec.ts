import { test } from '@playwright/test';

test('debug form fields', async ({ page }) => {
  await page.goto('/auth/sign-up');
  await page.waitForTimeout(500);

  const inputs = await page.locator('input').all();
  const fields: any[] = [];
  for (const input of inputs) {
    fields.push({
      type: await input.getAttribute('type'),
      name: await input.getAttribute('name'),
      placeholder: await input.getAttribute('placeholder'),
    });
  }
  console.log('INPUTS on /auth/sign-up:', JSON.stringify(fields, null, 2));
});
