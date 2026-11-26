import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { pixelConfig } from './config'
import { getMeasurementConsent, setMeasurementConsent, startMeasurement, subscribeMeasurementConsent } from './pixel'

export function MeasurementConsent() {
  const choice = useSyncExternalStore(subscribeMeasurementConsent, getMeasurementConsent)
  const [editing, setEditing] = useState(choice === 'unset')
  const settings = useRef<HTMLButtonElement>(null)

  useEffect(startMeasurement, [])
  if (!pixelConfig.enabled) return null

  function choose(value: 'accepted' | 'rejected') {
    setMeasurementConsent(value)
    setEditing(false)
    settings.current?.focus({ preventScroll: true })
  }

  return <div className="measurement">
    <button ref={settings} type="button" className="measurement-settings" aria-expanded={editing} aria-controls="measurement-options" onClick={() => setEditing(!editing)}>
      הגדרות מדידה
    </button>
    <section id="measurement-options" className="measurement-panel" aria-labelledby="measurement-title" hidden={!editing}>
      <h2 id="measurement-title">מדידת פרסום</h2>
      <p>באישורכם, הפיקסל של OpenAI ישתמש בעוגיות למדידת ביקורים ופעולות באתר. התאמה אוטומטית עשויה לכלול פרטי קשר שעברו גיבוב. אפשר לשנות את הבחירה בכל עת דרך הגדרות המדידה. הבחירה אינה משפיעה על האפשרות ליצור קשר.</p>
      <div className="measurement-actions">
        <button className="button gold" type="button" onClick={() => choose('accepted')}>אישור מדידה</button>
        <button className="button measurement-reject" type="button" onClick={() => choose('rejected')}>{choice === 'accepted' ? 'ביטול הסכמה' : 'דחיית מדידה'}</button>
      </div>
    </section>
  </div>
}
