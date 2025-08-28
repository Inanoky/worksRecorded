//C:\Users\user\MVP\Buvconsult-deploy\buvconsult\tests\uploads\InvoiceUpload.test.ts


import { test, expect , request as playwrightRequest} from '@playwright/test';


test('test', async ({ page}) => {

   test.setTimeout(120000);

  await page.goto('http://localhost:3000/'); 
  await page.locator('div').filter({ hasText: /^New Test projectTest projectOpen Project$/ }).getByRole('link').click();
  await page.getByRole('link', { name: 'Settings' }).click();


   // ✅ Assert upload section is visible after clicking Settings
  await expect(page.getByText('Upload invoices here')).toBeVisible();

  const apiContext = await playwrightRequest.newContext();


  const res = await apiContext.post('/api/tests/InvoiceUploadTest');
  expect(res.ok()).toBeTruthy();


  await page.getByRole('link', { name: 'Projects' }).click();
  await page.locator('div').filter({ hasText: /^New Test projectTest projectOpen Project$/ }).getByRole('link').click();
  await page.getByRole('row', { name: 'Select row 2024-11-11 2024-12' }).getByLabel('Select row').click();
  await page.getByRole('row', { name: 'Select row 2024-11-11 2024-12' }).getByRole('button').nth(1).click();
  await page.getByRole('menuitem', { name: 'Delete' }).click();
  
   await expect(page.getByRole('cell', { name: 'No invoices found.' })).toBeVisible();



});