export default defineNuxtConfig({
  compatibilityDate: '2026-07-13',
  ssr: false,
  devtools: { enabled: true },
  modules: ['@nuxt/ui', '@vite-pwa/nuxt', '@nuxt/eslint'],
  ui: { fonts: false },
  css: ['~/assets/css/main.css'],
  app: {
    head: {
      htmlAttrs: { lang: 'ja' },
      title: 'Memo',
      meta: [
        { name: 'description', content: 'オフラインで使えるタスク・メモ管理PWA' },
        { name: 'theme-color', content: '#059669' },
      ],
    },
  },
  colorMode: { preference: 'system', fallback: 'light' },
  icon: { serverBundle: 'local', clientBundle: { scan: true, sizeLimitKb: 256 } },
  pwa: {
    strategies: 'injectManifest',
    srcDir: 'service-worker',
    filename: 'sw.ts',
    registerType: 'prompt',
    manifest: {
      name: 'Memo - タスク・メモ管理',
      short_name: 'Memo',
      description: '端末内だけで動作するタスク・メモ管理アプリ',
      theme_color: '#059669',
      background_color: '#ffffff',
      display: 'standalone',
      start_url: '/',
      scope: '/',
      lang: 'ja',
      icons: [
        { src: '/icons/icon-192.svg', sizes: '192x192', type: 'image/svg+xml' },
        { src: '/icons/icon-512.svg', sizes: '512x512', type: 'image/svg+xml', purpose: 'any maskable' },
      ],
    },
    client: { installPrompt: true, periodicSyncForUpdates: 3600 },
    injectManifest: {
      globPatterns: ['**/*.{js,css,html,svg,png,webmanifest,wasm,data}'],
      maximumFileSizeToCacheInBytes: 16 * 1024 * 1024,
    },
    devOptions: { enabled: false, type: 'module' },
  },
  typescript: { strict: true, typeCheck: true },
})
