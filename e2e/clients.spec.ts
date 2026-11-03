import { expect, test } from '@playwright/test'

test.describe('clients', () => {
  test('creates a client and opens the card', async ({ page }) => {
    const name = `Тест Клиент ${Date.now()}`
    await page.goto('/')
    await page
      .getByRole('link', { name: /Добавить клиента/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/clients\/new/)

    await page.getByLabel('Имя и фамилия').fill(name)
    await page.getByRole('button', { name: 'Добавить клиента' }).click()

    await expect(page.getByRole('heading', { level: 1, name })).toBeVisible({ timeout: 10_000 })
    await page.goto('/')
    await expect(page.getByRole('link', { name: new RegExp(name) })).toBeVisible()
  })

  test('fills demo data from an empty list', async ({ page }) => {
    await page.goto('/')
    const empty = page.getByText('Пока нет ни одного клиента')
    await expect(empty).toBeVisible()
    const demo = page.getByRole('button', { name: 'Заполнить примером' })

    await demo.click()

    await expect(
      page
        .getByRole('link')
        .filter({ hasText: /Ковалёва|Смирнова|Волков/ })
        .first(),
    ).toBeVisible({
      timeout: 15_000,
    })
  })
})
