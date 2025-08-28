//C:\Users\user\MVP\Buvconsult-deploy\buvconsult\tests\uploads\InvoiceUpload.test.ts


import { test, expect , request as playwrightRequest} from '@playwright/test';


test('test', async ({ page}) => {

   test.setTimeout(120000);

  await page.goto('http://localhost:3000/'); 
  await page.locator('div').filter({ hasText: /^New Test projectTest projectOpen Project$/ }).getByRole('link').click();
  await page.getByRole('link', { name: 'Settings' }).click();


   // ✅ Assert upload section is visible after clicking Settings
  await expect(page.getByText('xlsx here')).toBeVisible();

  const apiContext = await playwrightRequest.newContext();


  const res = await apiContext.post('/api/tests/SchemaUploadTest');
  expect(res.ok()).toBeTruthy();

  //Here we need to refresh page

   await page.waitForTimeout(5000);

   await page.reload();

   
   await expect(page.getByText('Schema Files')).toBeVisible();

   await page.getByRole('button', { name: 'Delete', exact: true }).click();

   await expect(page.getByText('Schema Files')).not.toBeVisible();
  


});