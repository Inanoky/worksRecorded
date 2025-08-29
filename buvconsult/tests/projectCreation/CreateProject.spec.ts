import { test, expect } from '@playwright/test';

test('Creating and deleting new Project', async ({ page }) => {
  await page.goto('http://localhost:3000/'); 
  await page.getByRole('link', { name: 'Create Project' }).click();
  await page.getByRole('textbox', { name: 'Project name' }).click();
  await page.getByRole('textbox', { name: 'Project name' }).press('CapsLock');
  await page.getByRole('textbox', { name: 'Project name' }).fill('PL');
  await page.getByRole('textbox', { name: 'Project name' }).press('CapsLock');
  await page.getByRole('textbox', { name: 'Project name' }).fill('Playwright');
  await page.getByRole('textbox', { name: 'Project name' }).click();
  await page.getByRole('textbox', { name: 'Adress' }).click();
  await page.getByRole('textbox', { name: 'Adress' }).press('CapsLock');
  await page.getByRole('textbox', { name: 'Adress' }).fill('PL');
  await page.getByRole('textbox', { name: 'Adress' }).press('CapsLock');
  await page.getByRole('textbox', { name: 'Adress' }).fill('Playwright');
  await page.getByRole('textbox', { name: 'Small Description for your' }).click();
  await page.getByRole('textbox', { name: 'Small Description for your' }).press('CapsLock');
  await page.getByRole('textbox', { name: 'Small Description for your' }).fill('T');
  await page.getByRole('textbox', { name: 'Small Description for your' }).press('CapsLock');
  await page.getByRole('textbox', { name: 'Small Description for your' }).fill('Test');
  await page.getByRole('button', { name: 'Create Project' }).click();
  await page.locator('div').filter({ hasText: /^PlaywrightTestOpen Project$/ }).getByRole('link').click();
  await page.getByRole('link', { name: 'Settings' }).click();
    // 🔹 wait for redirect after Delete Everything
  await Promise.all([
    page.waitForURL('**/dashboard/sites'),
    page.getByRole('button', { name: 'Delete Everything' }).click(),
  ]);

    await expect(page.getByText('New Test project')).toBeVisible();
    await expect(page.getByText('1000 DPA - Dzelzevas iela')).toBeVisible();
    await expect(page.getByText('1065DPA - Strelnieku')).toBeVisible();

});