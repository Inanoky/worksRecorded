import { test, expect } from '@playwright/test';

test('Editing project info ', async ({ page }) => {
  await page.goto('http://localhost:3000/');
    await page.locator('div').filter({ hasText: /^New Test projectTest projectOpen Project$/ }).getByRole('link').click();
  await page.getByRole('link', { name: 'Settings' }).click();
  await page.getByRole('textbox', { name: 'Name' }).click();
  await page.getByRole('textbox', { name: 'Name' }).fill('New Test project1');
  await page.getByRole('textbox', { name: 'Description' }).click();
  await page.getByRole('textbox', { name: 'Description' }).fill('Test project1');
  await page.getByRole('textbox', { name: 'Subdirectory' }).click();
  await page.getByRole('textbox', { name: 'Subdirectory' }).click();
  await page.getByRole('textbox', { name: 'Subdirectory' }).fill('New Test proejct1');
  await page.getByRole('button', { name: 'Save Changes' }).click();
  await page.getByRole('link', { name: 'Projects' }).click();

    //Here I need to check if project name is changed to new name
await expect(page.locator('div').filter({ hasText: /^New Test project1Test project1Open Project$/ })).toBeVisible();   


  await page.locator('div').filter({ hasText: /^New Test project1Test project1Open Project$/ }).getByRole('link').click();
  await page.getByRole('link', { name: 'Settings' }).click();
  await page.getByRole('textbox', { name: 'Name' }).click();
  await page.getByRole('textbox', { name: 'Name' }).fill('New Test project');
  await page.getByRole('textbox', { name: 'Name' }).click();
  await page.getByRole('textbox', { name: 'Description' }).click();
  await page.getByRole('textbox', { name: 'Description' }).fill('Test project');
  await page.getByRole('textbox', { name: 'Description' }).click();
  await page.getByRole('textbox', { name: 'Subdirectory' }).click();
  await page.getByRole('textbox', { name: 'Subdirectory' }).fill('New Test proejct');
  await page.getByRole('button', { name: 'Save Changes' }).click();
  await page.getByRole('link', { name: 'Projects' }).click();

  //Here I need to check if project name is changed back to original
  await expect(page.locator('div').filter({ hasText: /^New Test projectTest projectOpen Project$/ })).toBeVisible();
});