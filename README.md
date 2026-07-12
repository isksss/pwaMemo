# pwaMemo

端末内だけでタスクとMarkdownメモを管理する、日本語対応のPWAです。データはPGliteを介してブラウザのIndexedDBへ保存され、アプリケーションサーバーやクラウドDBへ送信されません。

本番: <https://memo.isksss.dev>

## 主な機能

- タスク一覧、カンバン、月間カレンダー
- 5段階の状態、4段階の優先度、親子タスク、繰り返し、通知、タグ
- Markdownメモ、ピン留め、関連タスク、HTMLサニタイズ
- タスク・メモの横断検索
- 30日保持するゴミ箱
- バージョン付きJSONのバックアップ、全置換・統合復元
- オフライン起動、インストール、更新通知、ライト・ダークテーマ

詳細な仕様と設計図は[要件定義・基本設計](docs/requirement.md)を参照してください。

## 技術構成

- Node.js 24.18.0 / pnpm 11.11.0（miseで固定）
- Nuxt 4 / Vue 3 / Nuxt UI 4 / Tailwind CSS 4
- PGlite / Drizzle ORM / Zod
- Vite PWA / Workbox
- Cloudflare Workers Static Assets
- Vitest / Playwright / ESLint / Prettier

## 開発環境

miseをインストール後、次を実行します。

```bash
mise install
mise exec -- pnpm install --frozen-lockfile
mise exec -- pnpm dev
```

開発サーバーは通常`http://localhost:3000`で起動します。

## 検証

```bash
mise exec -- pnpm typecheck
mise exec -- pnpm lint
mise exec -- pnpm format:check
mise exec -- pnpm test
mise exec -- pnpm test:e2e
mise exec -- pnpm build
mise exec -- pnpm cf:check
```

自動整形は`mise exec -- pnpm format`で実行します。E2Eの初回実行前にPlaywrightブラウザが必要な場合は、`mise exec -- pnpm exec playwright install chromium`を実行してください。

## データとセキュリティ

- PGliteの接続先は`idb://pwa-memo`です。
- 本番は公開し、Cloudflare Access認証を要求しません。
- Preview deploymentのみAccessで保護し、許可メールはCloudflare Access側で管理します。
- PreviewではWorkerもAccess JWTの署名、Issuer、Audience、有効期限を検証します。
- `ACCESS_TEAM_DOMAIN`と`ACCESS_AUD`はCloudflare側のWorker変数として設定し、秘密情報はリポジトリへ保存しません。
- CIのCloudflare API TokenとAccess Service TokenはGitHub Environment Secretsへ保存します。

## デプロイ

ローカルから本番へデプロイする場合:

```bash
mise exec -- pnpm build
mise exec -- pnpm deploy
```

GitHub ActionsではPRをPreviewへ、`main`へのpushを本番`memo.isksss.dev`へデプロイします。設定の正本は`wrangler.jsonc`です。

## 対応環境

最新のChrome・Edge（PC、Android）を正式対応とします。ブラウザデータを削除すると保存データも消えるため、定期的なJSONバックアップを推奨します。
