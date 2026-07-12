import { expect, test } from '@playwright/test'

/**
 * E2E詳細設計:
 * 単体テストでは保証できない「利用者操作→PGlite保存→別画面で再読込」の境界を確認する。
 * テストごとにIndexedDBを削除し、実利用で初回起動した状態から再現可能にする。
 */
test.beforeEach(async ({ context, page }) => {
  await context.addInitScript(() => indexedDB.deleteDatabase('/pwa-memo'))
  await page.goto('/tasks')
  await expect(page.getByText('Memoを準備しています')).toBeHidden({ timeout: 20_000 })
})

test('タスクを作成し、一覧とカンバンの両方へ同じ状態を反映する', async ({ page }) => {
  await page.getByRole('button', { name: '新規タスク' }).click()
  await page.getByLabel('タイトル').fill('仕様レビュー')
  await page.getByLabel('説明').fill('要件と実装の差分を確認する')
  await page.getByRole('button', { name: '保存', exact: true }).click()
  await expect(page.getByText('仕様レビュー')).toBeVisible()
  await page.getByRole('tab', { name: 'カンバン' }).click()
  await expect(page.getByText('仕様レビュー')).toBeVisible()
})

test('空タイトルを保存せず、Zod由来の検証メッセージを通知する', async ({ page }) => {
  await page.getByRole('button', { name: '新規タスク' }).click()
  await page.getByRole('button', { name: '保存', exact: true }).click()
  await expect(page.getByText('タイトルを入力してください', { exact: true })).toBeVisible()
})

test('Markdownメモを保存し、危険なHTMLを実行せずプレビューする', async ({ page }) => {
  await page.goto('/memos/')
  await page.getByRole('link', { name: '新規メモ' }).click()
  await page.getByLabel('タイトル').fill('設計メモ')
  await page.getByPlaceholder('# メモ').fill('# 見出し\n<script>window.__xss=true</script>本文')
  await page.getByRole('button', { name: '保存' }).click()
  await expect(page.getByRole('heading', { name: '見出し' })).toBeVisible()
  expect(await page.evaluate(() => (window as any).__xss)).toBeUndefined()
})

test('削除したタスクをゴミ箱から復元できる', async ({ page }) => {
  await page.getByRole('button', { name: '新規タスク' }).click()
  await page.getByLabel('タイトル').fill('復元対象')
  await page.getByRole('button', { name: '保存', exact: true }).click()
  page.once('dialog', (dialog) => dialog.accept())
  await page.getByRole('button', { name: 'ゴミ箱へ移動' }).click()
  // 削除処理は確認ダイアログ後に非同期でDB更新する。画面遷移前に一覧再読込まで待ち、処理途中の遷移による偽陰性を防ぐ。
  await expect(page.getByText('復元対象')).toBeHidden()
  // PGliteのメモリ上の単一インスタンスを保つため、フルリロードせずNuxtLinkで遷移する。
  const sidebarButton = page.getByRole('button', { name: 'サイドバーを開く' })
  if (await sidebarButton.isVisible()) await sidebarButton.click()
  await page.getByRole('link', { name: 'ゴミ箱' }).click()
  await expect(page.getByText('復元対象')).toBeVisible()
  await page.getByRole('button', { name: '復元' }).click()
  await expect(page.getByText('復元対象')).toBeHidden()
})

test('モバイル幅でもナビゲーションを開いて主要画面へ移動できる', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  // Nuxt UIはモバイル時に専用の可視トリガーを生成するため、非表示のデスクトップ折りたたみボタンではなくアクセシブル名で操作する。
  await page.getByRole('button', { name: 'サイドバーを開く' }).click()
  await page.getByRole('link', { name: 'カレンダー' }).click()
  await expect(page.getByRole('heading', { name: 'カレンダー', exact: true })).toBeVisible()
})
