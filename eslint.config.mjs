import withNuxt from './.nuxt/eslint.config.mjs'

export default withNuxt({
  rules: {
    '@typescript-eslint/no-explicit-any': 'off',
    // Vue SFCのvoid要素はPrettierの出力に合わせ、自己終了形式を正とする。
    'vue/html-self-closing': ['error', { html: { void: 'always' } }],
    // MarkdownはrenderMarkdownでDOMPurifyを通したHTMLだけを描画するため、該当箇所のv-htmlを許可する。
    'vue/no-v-html': 'off',
  },
})
