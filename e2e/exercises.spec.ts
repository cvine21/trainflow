import { expect, test } from '@playwright/test'

test.describe('exercises library', () => {
  test('filters the library by search query', async ({ page }) => {
    await page.goto('/exercises')
    await expect(page.getByRole('heading', { name: /Упражнения/i })).toBeVisible()
    const search = page.getByPlaceholder('Поиск упражнения')

    await search.fill('Жим лёжа')

    await expect(page.getByText('Жим лёжа').first()).toBeVisible()
  })

  test('shows empty state when nothing matches', async ({ page }) => {
    await page.goto('/exercises')
    const search = page.getByPlaceholder('Поиск упражнения')

    await search.fill('zzzz-нет-такого')

    await expect(page.getByText('Ничего не найдено')).toBeVisible()
  })
})
