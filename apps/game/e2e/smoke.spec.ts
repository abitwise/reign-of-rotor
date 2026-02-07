import { test, expect } from '@playwright/test';

test('boots the game and starts a mission', async ({ page }) => {
  const errors: string[] = [];

  page.on('pageerror', (error) => {
    errors.push(error.message);
  });

  page.on('console', (message) => {
    if (message.type() === 'error') {
      errors.push(message.text());
    }
  });

  await page.goto('/');
  await expect(page.locator('.render-canvas')).toBeVisible();

  const instructions = page.locator('.instructions-overlay');
  await expect(instructions).toBeVisible();
  await page.locator('.instructions-close').click();
  await expect(instructions).toHaveClass(/hidden/);

  const missionHud = page.locator('.mission-hud');
  await expect(missionHud).not.toHaveClass(/hidden/);

  expect(errors).toEqual([]);
});
