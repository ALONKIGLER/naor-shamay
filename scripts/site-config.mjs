import { isIP } from 'node:net'

export function readSiteConfig(env) {
  const configuredUrl = env.VITE_SITE_URL?.trim()
  let siteUrl

  if (configuredUrl) {
    const url = URL.parse(configuredUrl)
    const host = url?.hostname
    if (!url || url.protocol !== 'https:' || url.pathname !== '/' || url.search || url.hash
      || url.username || url.password || url.port || !host.includes('.') || isIP(host)
      || /(?:^|\.)(?:localhost|local|test|invalid|example)$/.test(host)
      || /(?:^|\.)example\.(?:com|net|org)$/.test(host)) {
      throw new Error('VITE_SITE_URL must be the approved public HTTPS origin, without a path or query.')
    }
    siteUrl = url.href
  }

  const indexingEnabled = env.VITE_SITE_INDEXING_ENABLED === 'true'
  if (indexingEnabled && !siteUrl) throw new Error('Set VITE_SITE_URL before enabling indexing.')
  return { siteUrl, indexingEnabled }
}
