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

test('設定画面でPWAインストール導線を常時表示し、利用不可の理由を案内する', async ({ page }) => {
  // WranglerのローカルHTTP環境ではインストールプロンプトが発火しない。それでも導線を隠さず、手動操作を案内する仕様を確認する。
  await page.goto('/settings')
  await expect(page.getByRole('button', { name: 'アプリをインストール' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'アプリをインストール' })).toBeDisabled()
  await expect(page.getByTestId('pwa-install-status')).toContainText('ブラウザメニュー')
})

test('全画面でWeb App ManifestとService Workerを登録し、Chromeのインストール要件を満たす', async ({ page }) => {
  // Manifestファイルを生成するだけではChromeは検出しないため、HTML headのlink要素まで必須契約として検証する。
  const manifestLink = page.locator('link[rel="manifest"]')
  await expect(manifestLink).toHaveAttribute('href', '/manifest.webmanifest')

  const manifestResponse = await page.request.get('/manifest.webmanifest')
  expect(manifestResponse.ok()).toBe(true)
  expect(manifestResponse.headers()['content-type']).toContain('application/manifest+json')
  const manifest = await manifestResponse.json()
  expect(manifest).toMatchObject({ id: '/', start_url: '/', scope: '/', display: 'standalone' })
  expect(manifest.icons).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' }),
      expect.objectContaining({
        src: '/icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: expect.stringContaining('maskable'),
      }),
    ]),
  )

  for (const icon of ['/icons/icon-192.png', '/icons/icon-512.png']) {
    const response = await page.request.get(icon)
    expect(response.ok()).toBe(true)
    expect(response.headers()['content-type']).toBe('image/png')
  }

  // controllerは初回表示直後には未設定の場合があるため、登録済みService Workerのscopeとactiveスクリプトを確認する。
  await expect
    .poll(() =>
      page.evaluate(async () =>
        (await navigator.serviceWorker.getRegistrations()).some(
          (registration) =>
            registration.scope === `${location.origin}/` && registration.active?.scriptURL.endsWith('/sw.js'),
        ),
      ),
    )
    .toBe(true)
})

test('タスク追加ボタンの左にあるテーマ切替でライト・ダークを変更できる', async ({ page }) => {
  const themeButton = page.getByTestId('task-color-mode')
  const addButton = page.getByRole('button', { name: '新規タスク' })
  await expect(themeButton).toBeVisible()
  await expect(addButton).toBeVisible()

  // DOMの左右座標で配置要件を固定し、見た目の回帰を検出する。テーマは現在値の反対へ変わることを検証する。
  const themeBox = await themeButton.boundingBox()
  const addBox = await addButton.boundingBox()
  expect(themeBox?.x).toBeLessThan(addBox?.x ?? 0)
  const before = await page.locator('html').getAttribute('class')
  await themeButton.click()
  await expect.poll(async () => page.locator('html').getAttribute('class')).not.toBe(before)
})

test('カレンダーの日付をダブルクリックして開始時刻09:00のタスクを作成できる', async ({ page }) => {
  await page.goto('/calendar')
  const target = new Date()
  target.setDate(15)
  const label = `${target.getFullYear()}年${target.getMonth() + 1}月15日`
  const day = page.getByRole('button', { name: label, exact: true })

  // 単クリックは詳細日の選択だけを行い、既存の閲覧操作を壊さない。
  await day.click()
  await expect(page.getByRole('dialog')).toBeHidden()
  await day.dblclick()
  await expect(page.getByRole('dialog')).toBeVisible()
  await expect(page.getByLabel('開始日時')).toHaveValue(
    `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, '0')}-15T09:00`,
  )
  await expect(page.getByLabel('期限日時')).toHaveValue('')
})

test('選択日の追加ボタンから保存し、カレンダーへ即時反映する', async ({ page }) => {
  await page.goto('/calendar')
  await page.getByRole('button', { name: 'この日にタスクを追加' }).click()
  await page.getByLabel('タイトル').fill('カレンダー追加タスク')
  await page.getByRole('button', { name: '保存', exact: true }).click()

  // 保存後に同じページのDB再読込が完了し、画面遷移なしで選択日の詳細へ現れることを確認する。
  await expect(page.getByTestId('selected-day-task').getByText('カレンダー追加タスク')).toBeVisible()
})
