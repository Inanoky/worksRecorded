//C:\Users\user\MVP\Buvconsult-deploy\buvconsult\tests\uploads\InvoiceUpload.test.ts


import { test, expect , request as playwrightRequest} from '@playwright/test';


test('test', async ({ page}) => {

   test.setTimeout(60000);

  await page.goto('http://localhost:3000/'); 
  await page.locator('div').filter({ hasText: /^New Test projectTest projectOpen Project$/ }).getByRole('link').click();
  await page.getByRole('link', { name: 'Settings' }).click();

  const apiContext = await playwrightRequest.newContext();


  const res = await apiContext.post('/api/tests');
  expect(res.ok()).toBeTruthy();
  



});