# AGENTS.md

## 応答

- 利用者への回答は日本語で簡潔に行う。
- 実施結果、検証結果、未完了事項を明確に区別する。

## 開発環境

- Node.jsとpnpmは`mise.toml`のバージョンを使用する。
- コマンドは原則として`mise exec -- pnpm <command>`で実行する。
- パッケージマネージャーはpnpmのみを使用する。

## 実装方針

- Nuxtはクライアントレンダリング専用とし、利用者データをサーバーへ送信しない。
- データアクセスはPGliteの単一インスタンスとService層へ集約する。
- DB変更時はDrizzleスキーマ、SQLマイグレーション、関連テストを同時に更新する。
- 外部入力、フォーム、バックアップ復元はZodで検証する。
- MarkdownはDOMPurifyを通し、未検証HTMLを`v-html`へ渡さない。
- UIは日本語、レスポンシブ、キーボード操作、ライト・ダークテーマを維持する。
- Cloudflare設定は`wrangler.jsonc`を正本とし、D1、KV、R2へ利用者データを保存しない。
- 秘密情報、メール認証コード、API Token、Access Service Tokenをコミットしない。

## 品質

- 変更後は`pnpm typecheck`、`pnpm lint`、`pnpm format:check`、`pnpm test`を実行する。
- UI、ルーティング、PGlite永続化を変更した場合は`pnpm test:e2e`も実行する。
- Workersまたは配信設定を変更した場合は`pnpm build`と`pnpm cf:check`も実行する。
- テストコードを詳細設計として扱い、仕様、境界条件、その検証理由を日本語コメントで記述する。
- 不具合修正では再現テストを先に追加し、正常系・境界値・異常系を確認する。

## Git

- 利用者の未関連変更を削除・上書きしない。
- 生成物`.nuxt`、`.output`、`dist`、テスト結果、秘密情報をコミットしない。
- コミット前に差分と検証結果を確認する。
