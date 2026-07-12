export type PwaInstallStatus = 'available' | 'installed' | 'insecure' | 'unsupported' | 'unavailable'

export interface PwaInstallEnvironment {
  showInstallPrompt: boolean
  isStandalone: boolean
  isSecureContext: boolean
  serviceWorkerSupported: boolean
}

export interface PwaInstallState {
  status: PwaInstallStatus
  canInstall: boolean
  title: string
  description: string
}

/**
 * ブラウザAPIを直接参照しない純粋関数にして、PWAを実際にインストールできないテスト環境でも
 * 表示仕様を漏れなく検証できるようにする。既にインストール済みの判定を最優先し、
 * インストール済みアプリ内で「非対応」と誤表示しない。
 */
export function resolvePwaInstallState(environment: PwaInstallEnvironment): PwaInstallState {
  if (environment.isStandalone) {
    return {
      status: 'installed',
      canInstall: false,
      title: 'インストール済みです',
      description: 'このアプリは端末にインストールされています。',
    }
  }
  if (!environment.isSecureContext) {
    return {
      status: 'insecure',
      canInstall: false,
      title: 'HTTPS接続が必要です',
      description: 'インストールするにはHTTPSでこのページを開いてください。',
    }
  }
  if (!environment.serviceWorkerSupported) {
    return {
      status: 'unsupported',
      canInstall: false,
      title: 'このブラウザでは利用できません',
      description: '最新版のChromeまたはEdgeで開いてください。',
    }
  }
  if (environment.showInstallPrompt) {
    return {
      status: 'available',
      canInstall: true,
      title: '端末にインストールできます',
      description: 'インストールすると、ホーム画面やアプリ一覧からすぐに起動できます。',
    }
  }
  return {
    status: 'unavailable',
    canInstall: false,
    title: 'ブラウザメニューからインストールできます',
    description: 'ChromeまたはEdgeのブラウザメニューから「アプリをインストール」を選択してください。',
  }
}
