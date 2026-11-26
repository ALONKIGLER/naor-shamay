import { readFile, writeFile } from 'node:fs/promises'
import { chromium } from '@playwright/test'

const logo = `data:image/png;base64,${(await readFile('public/images/logo.png')).toString('base64')}`
const portrait = `data:image/webp;base64,${(await readFile('public/images/naor-profile.webp')).toString('base64')}`
const browser = await chromium.launch({ channel: process.env.PIXEL_TEST_BROWSER || undefined })

try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 } })
  await page.setContent(`<!doctype html>
    <html lang="he" dir="rtl">
    <meta charset="utf-8">
    <style>
      * { box-sizing: border-box }
      body { margin: 0; width: 1200px; height: 630px; padding: 66px; background: #14263b; color: #f5f3ef; font-family: Arial, sans-serif }
      main { height: 100%; display: grid; grid-template-columns: 1fr 510px; gap: 55px; align-items: center; border: 1px solid #c2a57470; padding: 20px }
      section { padding-inline-start: 24px }
      .logo { display: block; width: 152px; height: 74px }
      .logo-box { width: fit-content; padding: 9px 12px; border-radius: 5px; background: #fffefa }
      h1 { color: #f5f3ef; font-size: 69px; letter-spacing: -3px; line-height: 1.06; margin: 30px 0 13px }
      .subtitle { font-size: 34px; font-weight: 700; color: #e0c597; margin: 0 }
      .rule { width: 72px; height: 2px; background: #c2a574; margin-block: 24px 18px }
      .detail { font-size: 21px; line-height: 1.5; margin: 0; color: #e4e9ef }
      .portrait { width: 100%; height: auto; display: block; border: 1px solid #c2a574; padding: 6px; background: #f5f3ef; border-radius: 7px }
    </style>
    <main>
      <section>
        <div class="logo-box"><img class="logo" src="${logo}" alt=""></div>
        <h1>נאור ביטון</h1>
        <p class="subtitle">שמאי מקרקעין מוסמך</p>
        <div class="rule"></div>
        <p class="detail">הערכת שווי נכסים וחוות דעת שמאיות</p>
      </section>
      <img class="portrait" src="${portrait}" alt="נאור ביטון במשרדו" width="763" height="496">
    </main>`)
  await page.screenshot({ path: 'public/images/og-image.jpg', type: 'jpeg', quality: 90 })

  const icons = await page.evaluate(async source => {
    const logo = new Image()
    logo.src = source
    await logo.decode()
    return [16, 32, 48, 180].map(size => {
      const canvas = document.createElement('canvas')
      canvas.width = canvas.height = size
      const ctx = canvas.getContext('2d')
      ctx.fillStyle = '#14263B'
      ctx.fillRect(0, 0, size, size)
      const inset = Math.max(1, Math.round(size * 0.075))
      ctx.fillStyle = '#C2A574'
      ctx.fillRect(inset, inset, size - 2 * inset, size - 2 * inset)
      const border = Math.max(1, Math.round(size * 0.025))
      const inner = inset + border
      ctx.fillStyle = '#fffefa'
      ctx.fillRect(inner, inner, size - 2 * inner, size - 2 * inner)
      const markHeight = size < 48 ? 54 : logo.height
      const width = size - 2 * inner - Math.max(0, Math.round(size * 0.035))
      const height = width * markHeight / logo.width
      ctx.drawImage(logo, 0, 0, logo.width, markHeight, (size - width) / 2, (size - height) / 2, width, height)
      return canvas.toDataURL('image/png').split(',')[1]
    })
  }, logo)

  const [small, medium, google, apple] = icons.map(data => Buffer.from(data, 'base64'))
  const header = Buffer.alloc(38)
  header.writeUInt16LE(1, 2)
  header.writeUInt16LE(2, 4)
  let offset = header.length
  for (const [index, [size, png]] of [[16, small], [32, medium]].entries()) {
    const entry = 6 + index * 16
    header[entry] = header[entry + 1] = size
    header.writeUInt16LE(1, entry + 4)
    header.writeUInt16LE(32, entry + 6)
    header.writeUInt32LE(png.length, entry + 8)
    header.writeUInt32LE(offset, entry + 12)
    offset += png.length
  }
  await Promise.all([
    writeFile('public/favicon.ico', Buffer.concat([header, small, medium])),
    writeFile('public/favicon-48.png', google),
    writeFile('public/apple-touch-icon.png', apple),
  ])
} finally {
  await browser.close()
}
