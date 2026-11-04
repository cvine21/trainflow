import { expect, test } from '@playwright/test'

test.describe('workouts', () => {
  test('creates a new workout plan from a client card', async ({ page }) => {
    const clientName = `E2E Тренировка ${Date.now()}`
    await page.goto('/clients/new')
    await page.getByLabel('Имя и фамилия').fill(clientName)
    await page.getByRole('button', { name: 'Добавить клиента' }).click()
    await expect(page.getByRole('heading', { level: 1, name: clientName })).toBeVisible({ timeout: 10_000 })

    await page.getByRole('button', { name: 'Действия' }).click()
    await page.getByRole('menuitem', { name: 'Новая тренировка' }).click()
    await expect(page).toHaveURL(/\/workouts\/[^/]+/, { timeout: 10_000 })
    await page.getByLabel('Название').fill('E2E силовая')

    await expect(page.getByRole('button', { name: 'Сохранить' })).toBeEnabled()
    await expect(page.getByLabel('Название')).toHaveValue('E2E силовая')
  })
})
