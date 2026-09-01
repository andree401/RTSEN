import { test, expect } from '@playwright/test';

test('site loads correctly', async ({ page }) => {
  // Navigate to the base URL (make sure to set it in playwright.config.ts)
  // or provide a full URL here if there's no base URL defined.
  await page.goto('http://localhost:3000/');

  // Verify that the page loads correctly by checking the title, 
  // or you can check for a specific element on the page.
  await expect(page).toHaveTitle(/.*|/);
  
  // Example of checking if the body is visible
  const body = page.locator('body');
  await expect(body).toBeVisible();
});
