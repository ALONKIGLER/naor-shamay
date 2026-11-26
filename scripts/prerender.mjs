import { readFile, rm, writeFile } from 'node:fs/promises'
import { createElement } from 'react'
import { renderToString } from 'react-dom/server'
import { createServer, loadEnv } from 'vite'
import { readSiteConfig } from './site-config.mjs'

const { siteUrl, indexingEnabled } = readSiteConfig(loadEnv('production', process.cwd()))
const server = await createServer({
  mode: 'production',
  appType: 'custom',
  server: { middlewareMode: true, watch: null, ws: false },
})

function escapeMarkup(value) {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;').replaceAll('"', '&quot;')
}

try {
  const { App, services } = await server.ssrLoadModule('/src/App.tsx')
  const { business, siteMetadata: seo } = await server.ssrLoadModule('/src/site.ts')
  const absolute = path => siteUrl ? new URL(path, siteUrl).href : undefined
  const ogImage = absolute(seo.socialImage)
  const businessId = absolute('#business') ?? '#business'

  const structuredData = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'LocalBusiness',
        '@id': businessId,
        name: business.name,
        url: siteUrl,
        telephone: business.internationalPhone,
        email: business.email,
        logo: absolute(business.logo),
        image: absolute(business.profile),
        hasOfferCatalog: {
          '@type': 'OfferCatalog',
          name: 'שירותי שמאות מקרקעין',
          itemListElement: services.map(({ title, detail }) => ({
            '@type': 'Offer',
            itemOffered: { '@type': 'Service', name: title, description: detail, provider: { '@id': businessId } },
          })),
        },
      },
      {
        '@type': 'Person',
        '@id': absolute('#naor-biton') ?? '#naor-biton',
        name: business.professional,
        jobTitle: 'שמאי מקרקעין מוסמך',
        image: absolute(business.profile),
        worksFor: { '@id': businessId },
      },
    ],
  }
  const meta = (key, value) => {
    const attribute = key.startsWith('og:') ? 'property' : 'name'
    return `<meta ${attribute}="${key}" content="${escapeMarkup(value)}" />`
  }
  const tags = [
    meta('description', seo.description),
    meta('og:title', seo.title),
    meta('og:description', seo.description),
    meta('og:type', 'website'),
    meta('og:locale', 'he_IL'),
    meta('og:site_name', business.name),
    meta('twitter:card', 'summary_large_image'),
    meta('twitter:title', seo.title),
    meta('twitter:description', seo.description),
  ]
  if (ogImage) {
    tags.push(
      meta('og:url', siteUrl),
      meta('og:image', ogImage),
      meta('og:image:width', '1200'),
      meta('og:image:height', '630'),
      meta('og:image:alt', seo.socialImageAlt),
      meta('twitter:image', ogImage),
      meta('twitter:image:alt', seo.socialImageAlt),
    )
  }
  if (indexingEnabled) tags.push(`<link rel="canonical" href="${escapeMarkup(siteUrl)}" />`)
  tags.push(`<script type="application/ld+json">${JSON.stringify(structuredData).replaceAll('<', '\\u003c')}</script>`)

  const path = 'dist/index.html'
  const template = await readFile(path, 'utf8')
  const root = '<div id="root"></div>'
  const metadata = '<!-- site-metadata -->'
  if (!template.includes(root) || !template.includes(metadata)) {
    throw new Error('Prerender could not locate the root and metadata markers in the built HTML.')
  }
  const html = template
    .replace(metadata, () => tags.join('\n    '))
    .replace(/<title>.*?<\/title>/, () => `<title>${escapeMarkup(seo.title)}</title>`)
    .replace(root, () => `<div id="root">${renderToString(createElement(App))}</div>`)
    .replace('content="noindex, follow"', indexingEnabled ? 'content="index, follow"' : 'content="noindex, follow"')
  await writeFile(path, html)
  const sitemap = 'dist/sitemap.xml'
  if (indexingEnabled) {
    await writeFile(sitemap, `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url><loc>${escapeMarkup(siteUrl)}</loc></url>\n</urlset>\n`)
  } else {
    await rm(sitemap, { force: true })
  }
  await writeFile('dist/robots.txt', `User-agent: *\nAllow: /\n${indexingEnabled ? `\nSitemap: ${absolute('/sitemap.xml')}\n` : ''}`)
  console.log(`Prerendered dist/index.html (indexing ${indexingEnabled ? 'enabled' : 'disabled'})`)
} finally {
  await server.close()
}
