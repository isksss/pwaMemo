import { describe, expect, it } from 'vitest'
import { resolvePwaInstallState } from '~/utils/pwa-install'

/**
 * PWAインストール状態の詳細設計:
 * beforeinstallpromptはブラウザが発火条件を管理するため、Vitestから安定して発生させられない。
 * そこで環境判定を純粋関数として検証し、設定画面が全環境で必ず説明可能な状態になることを保証する。
 */
describe('resolvePwaInstallState', () => {
  const supported = { isStandalone: false, isSecureContext: true, serviceWorkerSupported: true }

  it('ブラウザがプロンプトを提供した場合だけインストール操作を許可する', () => {
    const result = resolvePwaInstallState({ ...supported, showInstallPrompt: true })
    expect(result).toMatchObject({ status: 'available', canInstall: true })
  })

  it('既にstandaloneで起動している場合は再インストールを禁止する', () => {
    const result = resolvePwaInstallState({ ...supported, isStandalone: true, showInstallPrompt: true })
    expect(result).toMatchObject({ status: 'installed', canInstall: false, title: 'インストール済みです' })
  })

  it('安全でない接続ではService Worker対応ブラウザでも禁止する', () => {
    const result = resolvePwaInstallState({ ...supported, isSecureContext: false, showInstallPrompt: true })
    expect(result).toMatchObject({ status: 'insecure', canInstall: false })
  })

  it('Service Worker非対応環境では対応ブラウザへの変更を案内する', () => {
    const result = resolvePwaInstallState({ ...supported, serviceWorkerSupported: false, showInstallPrompt: false })
    expect(result).toMatchObject({ status: 'unsupported', canInstall: false })
  })

  it('対応環境でもプロンプトがない場合は手動インストールを案内する', () => {
    const result = resolvePwaInstallState({ ...supported, showInstallPrompt: false })
    expect(result).toMatchObject({ status: 'unavailable', canInstall: false })
    expect(result.description).toContain('ブラウザメニュー')
  })
})
