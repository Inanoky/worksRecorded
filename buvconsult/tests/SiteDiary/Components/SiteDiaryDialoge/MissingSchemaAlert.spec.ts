import { test, expect } from '@playwright/test';

test('When no schema uploaded there should be an error message', async ({ page }) => { 
  await page.goto('http://localhost:3000/dashboard');
  await page.locator('div').filter({ hasText: /^New Test project1Test project1Open Project$/ }).getByRole('link').click();
  await page.getByRole('link', { name: 'Site Diary' }).click();
  await page.getByRole('link', { name: 'Site Diary' }).click();
  await page.locator('div').filter({ hasText: '15' }).nth(3).click();

  await expect(page.getByText('Please upload project schema')).toBeVisible();

});