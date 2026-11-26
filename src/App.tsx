import { useRef, useState, useSyncExternalStore, type FormEvent, type MouseEvent } from 'react'
import { Building2, Scale, Landmark, ClipboardCheck, TrendingUp, House, ShieldCheck, Clock3, Handshake, Wallet, MessageCircle, Phone, Mail, ChevronDown, Menu, X, Check } from 'lucide-react'
import { MeasurementConsent } from './measurement/Consent'
import { customEvents, serviceIds, type CustomEventName } from './measurement/events'
import { track } from './measurement/pixel'

import { business } from './site'

const { phone, email, logo } = business
const whatsapp = (message: string) => `https://wa.me/${business.internationalPhone.slice(1)}?text=` + encodeURIComponent(message)
const inquiry = whatsapp('שלום נאור, אשמח לקבל פרטים על שירותי שמאות מקרקעין.')

function trackClick(name: CustomEventName) {
  return (event: MouseEvent<HTMLAnchorElement>) => {
    if (!event.defaultPrevented) track({ name })
  }
}

function openWhatsApp(url: string) {
  const tab = window.open('', '_blank')
  if (!tab) return false
  try {
    tab.opener = null
    const link = tab.document.createElement('a')
    link.href = url
    link.rel = 'noreferrer'
    tab.document.body.append(link)
    link.click()
    return true
  } catch {
    tab.close()
    return false
  }
}
export const services = [
  { title: 'פינוי בינוי', icon: Building2, detail: 'שמאות בפרויקטים של פינוי בינוי, לרבות בדיקת הזכויות והתמורות המוצעות לבעלי הדירות.' },
  { title: 'שומות נגדיות', icon: Scale, detail: 'בדיקת הנתונים וההנחות בשומה קיימת והכנת חוות דעת שמאית מנומקת.' },
  { title: 'שומות לבית משפט', icon: Landmark, detail: 'חוות דעת שמאיות להליכים משפטיים ולמחלוקות בענייני מקרקעין, עם פירוט הבסיס להערכה.' },
  { title: 'בדיקת התאמה להיתר', icon: ClipboardCheck, detail: 'השוואה בין מצב הנכס בפועל להיתר הבנייה ולמסמכים התכנוניים, כדי לזהות פערים שחשוב לברר.' },
  { title: 'היטל השבחה', icon: TrendingUp, detail: 'בדיקת השומה שבבסיס דרישת התשלום והכנת שומה נגדית במסגרת השגה על היטל השבחה.' },
  { title: 'הערכת שווי נכסים', icon: House, detail: 'הערכת שווי לנכסי מגורים, מסחר, תעשייה וחקלאות, כולל שמאות לפני רכישת דירה.' },
]
const benefits = [
  { title: 'מקצועיות לפני הכל', text: 'בדיקה יסודית וחוות דעת מנומקת', icon: ShieldCheck },
  { title: 'זמינות גבוהה', text: 'מענה ישיר לשאלות לאורך התהליך', icon: Clock3 },
  { title: 'ליווי אישי', text: 'הסבר ברור בכל שלב בדרך', icon: Handshake },
  { title: 'מחירים נוחים', text: 'הצעת מחיר בהתאם להיקף העבודה', icon: Wallet },
]

function ContactForm({ service, selectService, interactive }: { service: string; selectService: (value: string) => void; interactive: boolean }) {
  const [phoneError, setPhoneError] = useState(false)
  const [draft, setDraft] = useState('')
  const started = useRef(false)

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    if (!form.reportValidity()) return

    const fields = new FormData(form)
    const name = String(fields.get('name')).trim()
    const number = String(fields.get('phone')).trim().replace(/[\s()\-]/g, '').replace(/^(?:\+972|00972)/, '0')
    if (!name) {
      const input = form.elements.namedItem('name') as HTMLInputElement
      input.setCustomValidity('יש להזין שם מלא')
      input.reportValidity()
      return
    }
    if (!/^0(?:[23489]\d{7}|[57]\d{8})$/.test(number)) {
      const input = form.elements.namedItem('phone') as HTMLInputElement
      setPhoneError(true)
      input.focus()
      return
    }
    const address = String(fields.get('email')).trim()
    const subject = String(fields.get('service')).trim()
    const message = String(fields.get('message')).trim()
    const url = whatsapp([
      'שלום נאור, אשמח לקבל פרטים על שירותי שמאות מקרקעין.',
      '',
      'שם מלא: ' + name,
      'טלפון: ' + number,
      'דוא״ל: ' + (address || 'לא צוין'),
      'נושא הפנייה: ' + (subject || 'לא נבחר'),
      'הסכמה לפתיחת פנייה ב־WhatsApp: כן',
      '',
      'פרטים נוספים:',
      message || 'לא צוינו',
    ].join('\n'))
    setDraft(url)
    if (openWhatsApp(url)) {
      track({ name: customEvents.whatsappHandoff })
      started.current = false
    }
  }

  return <form className="form" onSubmit={submit} onChange={() => {
    setDraft('')
    if (!started.current) {
      started.current = true
      track({ name: customEvents.formStarted })
    }
  }}>
    <div className="form-grid">
      <label>שם מלא <span>*</span><input name="name" autoComplete="name" placeholder="השם שלכם" required onInput={(e) => e.currentTarget.setCustomValidity('')} /></label>
      <label>טלפון <span>*</span><input name="phone" type="tel" autoComplete="tel" placeholder="050-0000000" required aria-invalid={phoneError} aria-describedby={phoneError ? 'phone-error' : undefined} onInput={() => setPhoneError(false)} />
        {phoneError && <small id="phone-error" role="alert">יש להזין מספר טלפון ישראלי תקין.</small>}
      </label>
      <label>דוא״ל <span>(אופציונלי)</span><input name="email" type="email" autoComplete="email" placeholder="name@example.com" /></label>
      <label>נושא הפנייה<span className="select"><select name="service" value={service} onChange={(e) => selectService(e.target.value)}><option value="">בחירת שירות</option>{services.map(({ title }) => <option key={title}>{title}</option>)}<option>ייעוץ אחר</option></select><ChevronDown size={17} aria-hidden="true" /></span></label>
    </div>
    <label>פרטים נוספים <span>(אופציונלי)</span><textarea name="message" rows={3} placeholder="ספרו בקצרה על הנכס או על הבדיקה הדרושה" /></label>
    <label className="consent">
      <input name="whatsappConsent" type="checkbox" required />
      <span>אני מסכים/ה לפתוח פנייה ב־WhatsApp עם הפרטים שמילאתי.</span>
    </label>
    <button className="button gold" type="submit" disabled={!interactive}><MessageCircle size={20} /> המשך ל־WhatsApp</button>
    <p className="form-note">הפרטים ייפתחו כהודעה מוכנה לשליחה ב־WhatsApp.</p>
    {draft && <p className="form-note" role="status">ההודעה מוכנה. <a href={draft} target="_blank" rel="noreferrer" onClick={trackClick(customEvents.whatsappHandoff)}>פתיחה חוזרת ב־WhatsApp</a></p>}
  </form>
}

const subscribeToHydration = () => () => {}
const browserSnapshot = () => true
const prerenderSnapshot = () => false

export function App() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [service, setService] = useState('')
  const interactive = useSyncExternalStore(subscribeToHydration, browserSnapshot, prerenderSnapshot)

  return <>
    <a className="skip" href="#main">דילוג לתוכן</a>
    <header className="header"><div className="wrap header-inner">
      <a className="brand" href="#top" onClick={() => setMenuOpen(false)}><img src={logo} alt="נאור שמאות מקרקעין" width={152} height={74} /></a>
      <button className="menu-toggle" type="button" aria-label={menuOpen ? 'סגירת תפריט' : 'פתיחת תפריט'} aria-expanded={menuOpen} aria-controls="navigation" onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X /> : <Menu />}</button>
      <nav id="navigation" className={menuOpen ? 'nav open' : 'nav'} aria-label="ניווט ראשי">
        <a href="#services" onClick={() => setMenuOpen(false)}>שירותי שמאות</a>
        <a href="#about" onClick={() => setMenuOpen(false)}>אודות</a>
        <a href="#contact" onClick={() => setMenuOpen(false)}>יצירת קשר</a>
      </nav>
      <a className="button header-cta" href={inquiry} target="_blank" rel="noreferrer" onClick={trackClick(customEvents.whatsappClick)}><MessageCircle size={17} /> פנייה ב־WhatsApp</a>
    </div></header>
    <main id="main" tabIndex={-1}>
      <section id="top" className="hero">
        <div className="architecture" aria-hidden="true"><div className="facade facade-front" /><div className="facade facade-side" /><div className="facade facade-rear" /></div>
        <div className="wrap hero-inner"><div className="hero-copy">
          <p className="eyebrow">נאור ביטון · שמאי מקרקעין מוסמך וכלכלן</p>
          <h1>לדעת מה הנכס<br /><em>באמת שווה.</em></h1>
          <p className="hero-detail">שמאות מקרקעין מבוססת לקבלת החלטות בנדל״ן, עם ליווי אישי ומקצועי לאורך כל הדרך.</p>
          <div className="actions">
            <a className="button gold" href={inquiry} target="_blank" rel="noreferrer" onClick={trackClick(customEvents.whatsappClick)}><MessageCircle size={20} /> בקשת שומה ב־WhatsApp</a>
            <a className="button secondary" href="#services">לשירותי השמאות</a>
          </div>
        </div></div>
      </section>
      <section className="benefits" aria-label="היתרונות שלנו"><div className="wrap benefit-grid">
        {benefits.map(({ title, text, icon: Icon }) => <div className="benefit" key={title}><Icon size={27} strokeWidth={1.5} /><div><h2>{title}</h2><p>{text}</p></div></div>)}
      </div></section>
      <section id="services" className="section services"><div className="wrap">
        <div className="section-heading"><p className="eyebrow">תחומי התמחות</p><h2>שירותי שמאות מקרקעין</h2><p>בדיקות, הערכות שווי וחוות דעת לפי סוג הנכס ומטרת הפנייה.</p></div>
        <div className="service-grid">{services.map(({ title, detail, icon: Icon }, index) => <article className="service" key={title}>
          <div className="service-icon"><Icon size={25} strokeWidth={1.6} /></div><h3>{title}</h3><p>{detail}</p>
          <a href="#contact" onClick={() => {
            setService(title)
            track({ name: 'contents_viewed', service: serviceIds[index] })
          }} aria-label={`בירור על השירות ${title}`}>בירור על השירות</a>
        </article>)}</div>
      </div></section>
      <section id="about" className="section about"><div className="wrap about-grid">
        <div className="about-copy">
          <p className="eyebrow">אודות</p>
          <h2>נאור ביטון</h2>
          <p className="credential">שמאי מקרקעין מוסמך וכלכלן, בעל <bdi>B.A.</bdi> בכלכלה</p>
          <p className="about-description">אני מלווה לקוחות בבדיקות ובהחלטות הקשורות לנכסי מגורים, מסחר, תעשייה וחקלאות. העבודה כוללת הערכות שווי, השגות על היטלי השבחה, שומות לבנקים לפי תקן 19, ייעוץ לפני רכישת מקרקעין וייצוג מקצועי מול רשויות.</p>
          <aside className="credibility" aria-labelledby="credibility-title"><ShieldCheck size={33} strokeWidth={1.4} /><h3 id="credibility-title">מה כולל הליווי?</h3><ul><li><Check size={18} /> הבנת מטרת השומה ואיסוף המסמכים</li><li><Check size={18} /> בחינת מאפייני הנכס והזכויות הרלוונטיות</li><li><Check size={18} /> הסבר על הממצאים והמשמעות שלהם</li></ul></aside>
          <a className="button gold" href="#contact">לתיאום שיחת ייעוץ</a>
        </div>
        <picture className="about-portrait">
          <source srcSet={business.profile} type="image/webp" />
          <img src="/images/naor-profile.jpg" alt="נאור ביטון במשרדו" width={763} height={496} loading="lazy" decoding="async" />
        </picture>
      </div></section>
      <section id="contact" className="section contact"><div className="wrap contact-grid">
        <div className="contact-copy"><p className="eyebrow">יצירת קשר</p><h2>נדבר על הנכס שלכם</h2><p>ספרו לי איזו בדיקה אתם צריכים, כדי שנוכל להבין מה נדרש להמשך.</p>
          <a href={'tel:' + phone} onClick={trackClick(customEvents.phoneClick)}><Phone size={20} /><bdi>{phone}</bdi></a>
          <a href={'mailto:' + email} onClick={trackClick(customEvents.emailClick)}><Mail size={20} /><bdi>{email}</bdi></a>
        </div>
        <ContactForm service={service} selectService={setService} interactive={interactive} />
      </div></section>
    </main>
    <footer className="footer"><div className="wrap footer-inner"><img className="footer-logo" src={logo} alt="נאור שמאות מקרקעין" width={152} height={74} loading="lazy" decoding="async" /><span>נאור ביטון · שמאי מקרקעין מוסמך וכלכלן</span>{interactive && <MeasurementConsent />}</div></footer>
    <div className="mobile-cta"><a className="button gold" href={inquiry} target="_blank" rel="noreferrer" onClick={trackClick(customEvents.whatsappClick)}><MessageCircle size={19} /> פנייה ב־WhatsApp</a><a className="button secondary" href={'tel:' + phone} onClick={trackClick(customEvents.phoneClick)}><Phone size={17} /> חיוג לנאור</a></div>
  </>
}
