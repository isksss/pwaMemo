import { createRemoteJWKSet, jwtVerify } from 'jose'

interface Env {
  ASSETS: Fetcher
  CF_ACCESS_TEAM_DOMAIN?: string
  CF_ACCESS_AUD?: string
}

const securityHeaders: Record<string, string> = {
  // Nuxt SPAは静的HTML内の初期化スクリプトを必要とするためunsafe-inlineを許可し、それ以外の配信元をselfへ限定する。
  'Content-Security-Policy':
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' https://static.cloudflareinsights.com; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data:; font-src 'self' data:; connect-src 'self' https://cloudflareinsights.com; worker-src 'self' blob:; child-src 'self' blob:; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self';",
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
  'X-Frame-Options': 'DENY',
}

async function verifyPreview(request: Request, env: Env) {
  const token = request.headers.get('Cf-Access-Jwt-Assertion')
  if (!token || !env.CF_ACCESS_TEAM_DOMAIN || !env.CF_ACCESS_AUD) return false
  const issuer = `https://${env.CF_ACCESS_TEAM_DOMAIN}`
  const jwks = createRemoteJWKSet(new URL(`${issuer}/cdn-cgi/access/certs`))
  await jwtVerify(token, jwks, { issuer, audience: env.CF_ACCESS_AUD })
  return true
}

export default {
  async fetch(request, env): Promise<Response> {
    const url = new URL(request.url)
    const preview = url.hostname.endsWith('.workers.dev')
    if (preview) {
      try {
        if (!(await verifyPreview(request, env))) return new Response('Forbidden', { status: 403 })
      } catch {
        return new Response('Forbidden', { status: 403 })
      }
    }
    const original = await env.ASSETS.fetch(request)
    const response = new Response(original.body, original)
    for (const [key, value] of Object.entries(securityHeaders)) response.headers.set(key, value)
    if (preview) response.headers.set('X-Robots-Tag', 'noindex, nofollow')
    if (
      url.pathname === '/' ||
      url.pathname.endsWith('.html') ||
      url.pathname.endsWith('/sw.js') ||
      url.pathname.endsWith('.webmanifest')
    )
      response.headers.set('Cache-Control', 'no-cache')
    else if (url.pathname.includes('/_nuxt/'))
      response.headers.set('Cache-Control', 'public, max-age=31536000, immutable')
    return response
  },
} satisfies ExportedHandler<Env>
