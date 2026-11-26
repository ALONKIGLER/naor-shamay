# OpenAI Ads Measurement Pixel

The landing page uses the OpenAI browser Pixel. Vite embeds its public configuration at build time. A default build makes no request to the Pixel SDK or measurement endpoints. Measurement is also disabled for localhost and loopback hostnames, including when the environment variables are set.

## Set up a Web Pixel

1. Open Ads Manager and select the business’s ad account. In **Conversions → Data Source**, create a data source for the website and select **Web Pixel**. Reuse an existing Web Pixel for this website if appropriate.
2. Open the Web Pixel’s installation details and copy the **Pixel ID** shown in the installation snippet as `pixelId`. The API calls this value `pixel_id`. Ads Manager also has a data-source record ID used to configure conversion settings. Use the Pixel ID for this site.
3. Review the matching behavior below and obtain business approval for the privacy disclosure before enabling measurement. [Measurement Pixel](https://developers.openai.com/ads/measurement-pixel) · [Conversion Tracking](https://developers.openai.com/ads/conversion-tracking)

## Configure, rebuild and publish

On the static host, set these build environment variables. For a manually managed build, copy `.env.example` to `.env.production.local` and edit that file.

```dotenv
VITE_OPENAI_PIXEL_ID=<Pixel ID copied exactly from Ads Manager>
VITE_OPENAI_PIXEL_ENABLED=true
VITE_OPENAI_PIXEL_DEBUG=false
```

The Pixel ID is public. The integration checks the local ID shape and leaves verification of the data source to OpenAI. Configure **`npm run build`** as the build command and **`dist`** as the output directory. Publish the fresh `dist` to the approved HTTPS origin. An environment change needs a fresh build and publication. Use `VITE_OPENAI_PIXEL_ENABLED=false` and rebuild and republish to disable the integration. Debug mode can be enabled temporarily with `VITE_OPENAI_PIXEL_DEBUG=true` for diagnosis. Return it to `false` for normal use.

## Verify in Ads Manager

In **Conversions → Data Source**, open the Web Pixel’s three-dot menu and select **Test**. Enter the approved HTTPS URL with the Pixel-enabled build and select **Start testing**. Use the tab Ads Manager opens and return to its Event Stream to inspect the events marked **Test**. Labeling applies to that tab, Pixel and origin for up to 30 minutes. Test events count toward normal analytics, so prefer a separate Web Pixel and approved test origin for synthetic events. Delays and sampling can occur. [Official test procedure](https://developers.openai.com/ads/measurement-pixel#test-your-pixel-in-ads-manager)

| Event | Action and expected result |
| --- | --- |
| `page_viewed` | Load the landing page and accept measurement. Expect one standard `contents` event for `landing` per document. Same-page navigation and switching consent off and back on do not create a second view. |
| `contents_viewed` | Select **בירור על השירות** on a specific service card. Expect a standard `contents` event with the fixed service ID. Scrolling past the grid does not trigger it. |
| `form_started` | Start editing the contact form. Expect one custom event until a successful form handoff starts a new editing cycle. |
| `whatsapp_form_handoff` | With synthetic inputs and contact consent, submit the valid form. Expect one custom event after the site initiates navigation to WhatsApp. If the popup is blocked, use the link for the validated draft. Invalid submissions produce no handoff event. |
| `whatsapp_clicked` | Follow a direct WhatsApp CTA in the header, hero or mobile bar. |
| `phone_clicked` | Follow either phone link. |
| `email_clicked` | Follow the email link. |

Custom events use the wire event name `custom`, data `{ type: 'custom' }`, and the table’s event name as `custom_event_name`. In Ads Manager use **Custom** as the conversion event type and match the custom name exactly if you configure a reporting event. The five custom events reflect site interactions. A WhatsApp handoff, call-link click or email-link click does not establish that a message was sent, a call took place or a lead was created.

The five custom events are ineligible for campaign optimization. The two view events are standard events and can qualify under the published standard-event rule if Ads Manager allows creating and selecting an active conversion event setting for them. A conversion-optimized campaign requires exactly one active standard setting at campaign creation. Confirm account availability in the campaign setup. Views are traffic signals and should only be chosen when the campaign actually aims to optimize for that action. This integration sends no confirmed lead or appointment events. [Supported Events](https://developers.openai.com/ads/supported-events) · [Optimization requirements](https://developers.openai.com/ads/conversion-tracking#optimize-for-conversions)

## Consent and automatic advanced matching

- The site stores the visitor’s choice on the site origin. Before acceptance, the SDK is not fetched. When allowed, the site applies the SDK’s consent commands before and after initialization. Visitors can reopen **הגדרות מדידה** in the footer and withdraw consent. The site stops issuing measurements and drops any measurements still in its SDK bootstrap queue on withdrawal. Events from before acceptance or during denial are not replayed. Previously transmitted events cannot be recalled by the website.
- The SDK handles attribution, including the `__oppref` (30-day) and `__obref` (365-day) first-party cookies. The application does not implement these cookies. The site's consent record is separate from the form’s permission to open WhatsApp. [Measurement Pixel](https://developers.openai.com/ads/measurement-pixel)
- The application never supplies names, email addresses, phone numbers, message text, property details, or an SDK `user` object. Independently, when **Automatic advanced matching** is enabled, the SDK can recognize supported information on forms, normalize it and send SHA-256 hashes with events. Hashing does not remove the need to review the data sharing and describe it in the privacy disclosure.
- Before activation, check the Web Pixel’s **Edit pixel** settings and the ad account’s country. OpenAI documents that automatic advanced matching is enabled by default outside Japan and that the advertiser setting to enable or disable it is available for Japanese ad accounts. Confirm the actual setting and availability with the account owner. If the business cannot approve automatic matching and the control is unavailable, keep the integration disabled. The documented browser SDK has no advanced-matching disable option. [OpenAI Conversion Measurement](https://help.openai.com/en/articles/20001409-conversion-measurement)

### Hebrew disclosure draft for business approval

> אם תאשרו מדידת פרסום, האתר ישתמש בפיקסל של OpenAI כדי למדוד ביקורים ופעולות כגון צפייה בשירות, התחלת מילוי טופס ולחיצה על קישור ליצירת קשר. הפיקסל משתמש במזהי מדידה ובעוגיות צד ראשון כדי לשייך פעולות למודעות. אם התאמה אוטומטית מופעלת, הפיקסל עשוי לזהות פרטי קשר שהוזנו באתר, לעבד אותם בדפדפן באמצעות SHA‑256 ולצרף את הערכים המגובבים לאירועי המדידה. אפשר לדחות את המדידה או לבטל הסכמה בכל עת דרך ״הגדרות מדידה״ בתחתית האתר. הבחירה אינה משפיעה על האפשרות לפנות אלינו. אפשר לפנות אלינו בשאלות בנושא פרטיות בכתובת NAOR20B@GMAIL.COM.

Review this wording against the business’s actual Pixel settings and privacy policy before publishing.

## Local checks

Run `npm ci`, `npx playwright install chromium`, `npm test`, `npm run lint`, and `npm run build`. To run against installed Chrome, set `PIXEL_TEST_BROWSER=chrome` in the test shell. Browser tests use synthetic inputs, a local app, an intercepted SDK and an intercepted WhatsApp destination. They do not verify actual ingestion, attribution, or account-specific settings. Use the Ads Manager Test workflow for that verification after approval.
