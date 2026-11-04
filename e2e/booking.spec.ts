import { expect, test, type Page } from '@playwright/test';

const password = 'correct-horse';
const memberEmail = 'maya.chen@example.com';
const professionalEmail = 'priya.shah@example.com';

async function signIn(page: Page, email: string): Promise<void> {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();
}

test('a member books an open slot and the professional sees that session', async ({ page }) => {
  await signIn(page, memberEmail);
  await expect(page.getByRole('heading', { name: 'Professionals' })).toBeVisible();
  await expect(page.getByText(/Member · America\/New_York/)).toBeVisible();

  await page.getByLabel('Search by name').fill('Priya');
  await page.getByRole('button', { name: 'Search' }).click();
  await page.getByRole('link', { name: /Priya Shah/ }).click();
  await expect(page.getByRole('heading', { name: 'Priya Shah' })).toBeVisible();

  const times = page.getByRole('group', { name: 'Times' });
  await expect(times.getByRole('button').first()).toBeVisible();
  const dayLabel = (
    await page
      .getByRole('group', { name: 'Dates' })
      .getByRole('button', { pressed: true })
      .innerText()
  ).trim();
  const timeButton = times.getByRole('button').first();
  const timeLabel = (await timeButton.innerText()).trim();
  await timeButton.click();

  await expect(page.getByRole('heading', { name: 'Confirm your session' })).toBeVisible();
  await expect(page.getByText(timeLabel)).toBeVisible();
  await page.getByRole('button', { name: 'Book session' }).click();

  await expect(page.getByRole('heading', { name: 'Session with Priya Shah' })).toBeVisible();
  await expect(page.getByText(timeLabel)).toBeVisible();

  await page.goto('/');
  await page.getByLabel('Search by name').fill('Priya');
  await page.getByRole('button', { name: 'Search' }).click();
  await page.getByRole('link', { name: /Priya Shah/ }).click();
  const day = page.getByRole('button', { name: dayLabel, exact: true });
  if (await day.count()) {
    await day.click();
    await expect(
      page
        .getByRole('group', { name: 'Times' })
        .getByRole('button', { name: timeLabel, exact: true }),
    ).toHaveCount(0);
  } else {
    await expect(day).toHaveCount(0);
  }

  await page.getByRole('button', { name: 'Log out' }).click();
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();

  await signIn(page, professionalEmail);
  await expect(page.getByRole('heading', { name: 'Upcoming sessions' })).toBeVisible();
  await expect(page.getByRole('link', { name: /Maya Chen/ }).first()).toBeVisible();
});
