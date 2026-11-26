# SEO and social sharing setup

The Vite build prerenders the Hebrew landing page into `dist/index.html` using the same React component as the browser. Crawlers can read the headings, services, links, metadata and JSON-LD from the initial response. React hydrates the page for the menu, service selection, form and measurement consent. Direct WhatsApp, phone and email links work without JavaScript.

## Connect and index the final domain

1. Add the approved domain in your static host’s custom-domain settings. Follow the host’s DNS instructions, wait for HTTPS to become active, and choose one preferred hostname. Redirect alternate public hostnames to it.
2. Set these environment variables in the production build configuration or in a local `.env.production.local` file for a manual build.

   ```dotenv
   VITE_SITE_URL=<approved HTTPS origin>
   VITE_SITE_INDEXING_ENABLED=true
   ```

   Use the root HTTPS origin. Keep the separate preview environment’s indexing flag `false` and its site URL unset, or set it to an approved HTTPS preview origin if it needs social previews.
3. Run `npm ci` and `npm run build`, then publish `dist` using the static hosting workflow. Configuration changes require a rebuild. SEO settings do not activate the OpenAI Pixel.
4. Inspect the deployed homepage source. Confirm that its canonical URL, `og:url`, absolute social image URLs and structured-data asset URLs use the preferred domain. Check that `/robots.txt` links to `/sitemap.xml`, that the sitemap contains the canonical homepage, and that the host sends no `noindex` header for production.

With indexing disabled, the build sets `noindex, follow` and omits the canonical and sitemap. Robots.txt permits crawling so crawlers can read the directive. With the site URL unset, the build also omits URL-dependent social metadata and structured-data images. The 1200×630 image is included in the build. [Google’s noindex guidance](https://developers.google.com/search/docs/crawling-indexing/block-indexing)

## Google Search Console

1. Add a **Domain** property for the final domain in Search Console. Copy the supplied verification TXT record to the domain’s DNS zone and select **Verify** after the record appears in public DNS. [Ownership verification](https://support.google.com/webmasters/answer/9008080)
2. In **Sitemaps**, submit the final `/sitemap.xml` URL and check its processing status. In **URL Inspection**, test the live homepage and request indexing after the live test confirms that Google can fetch the page. Indexing is determined by Google. [Sitemaps report](https://support.google.com/webmasters/answer/7451001)

## Facebook and WhatsApp

1. Open the final URL in the [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/). Select **Debug**, then **Scrape Again** after changing the metadata. Check the title, description and image in the preview.
2. Confirm that `/images/og-image.jpg` resolves directly over HTTPS with a successful response, `image/jpeg` and dimensions of 1200×630.
3. Paste the final homepage URL into a private WhatsApp test chat and wait for a preview. Check it on a phone. If an old preview is cached, try an uncached share URL with a temporary query string while keeping the canonical and `og:url` on the preferred URL. WhatsApp controls preview appearance and cache refresh timing.

To regenerate icons or the social image after changing the logo or portrait, run `npx playwright install chromium` once and then `node scripts/generate-brand-assets.mjs`. With a locally installed Chrome, the script also accepts `PIXEL_TEST_BROWSER=chrome`.

## Structured data

Check the public URL in the [Schema Markup Validator](https://validator.schema.org/) and use the [Google Rich Results Test](https://search.google.com/test/rich-results) to check Google eligibility. You can also paste source code for a private build. The site describes the verified business, professional and service catalog. Google requires an address for its Local Business rich-result feature. The site omits that field until the business supplies a verified address. [Google Local Business requirements](https://developers.google.com/search/docs/appearance/structured-data/local-business)
