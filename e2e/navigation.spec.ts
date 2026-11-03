import { expect, test } from '@playwright/test'

test.describe('bottom navigation', () => {
  test('shows tab bar on root tabs', async ({ page }) => {
    await page.goto('/')
    const nav = page.getByRole('navigation')

    await nav.getByRole('link', { name: 'Тренировки' }).click()
    await expect(page).toHaveURL(/\/workouts$/)
    await nav.getByRole('link', { name: 'Упражнения' }).click()

    await expect(page).toHaveURL(/\/exercises$/)
    await expect(nav.getByRole('link', { name: 'Клиенты' })).toBeVisible()
    await expect(nav.getByRole('link', { name: 'Тренировки' })).toBeVisible()
    await expect(nav.getByRole('link', { name: 'Упражнения' })).toBeVisible()
  })

  test('hides tab bar on nested screens', async ({ page }) => {
    await page.goto('/')

    await page.goto('/clients/new')

    await expect(page.getByRole('navigation')).toHaveCount(0)
  })
})
