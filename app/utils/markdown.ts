import DOMPurify from 'dompurify'
import { marked } from 'marked'

export const renderMarkdown = (source: string) => {
  // raw HTMLをMarkdownへ渡す前にも除去する。DOMPurify非対応環境でもscriptを文字列として残さない多層防御である。
  const withoutExecutableHtml = source
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/\son\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
  return DOMPurify.sanitize(marked.parse(withoutExecutableHtml, { async: false }) as string, {
    USE_PROFILES: { html: true },
  })
}
