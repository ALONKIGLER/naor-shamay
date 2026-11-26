# נאור שמאות מקרקעין

Hebrew RTL landing page for Naor Biton, built with React, Vite, TypeScript and Lucide.

## Local development

Use Node.js 22 and npm.

```sh
npm ci
npm run dev
npm run build
npm run preview
```

For Cloudflare Pages, use `npm run build` as the build command and `dist` as the output directory. The form validates Israeli mobile and landline numbers, including +972 and 00972 formatting, then prepares a WhatsApp message for the visitor to send. Contact details are defined in `src/main.tsx`.

## Hero imagery

The hero uses a CSS architectural illustration as a placeholder. To replace it, add a licensed, optimized WebP or AVIF architectural photo to `public/images/`. Replace the decorative `.architecture` block in `src/main.tsx` with an image using that class and an empty alt attribute. In `src/styles.css`, add `height: 100%` and `object-fit: cover`, remove the unused facade styles and check the crop and headline contrast at desktop and mobile widths.

The credibility panel describes the appraisal process. Add reviews when a verifiable source is provided.
