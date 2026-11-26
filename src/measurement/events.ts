export const customEvents = {
  formStarted: 'form_started',
  whatsappHandoff: 'whatsapp_form_handoff',
  whatsappClick: 'whatsapp_clicked',
  phoneClick: 'phone_clicked',
  emailClick: 'email_clicked',
} as const

export const serviceIds = [
  'urban-renewal', 'counter-appraisal', 'court-appraisal',
  'permit-compliance', 'betterment-levy', 'property-valuation',
] as const

export type CustomEventName = typeof customEvents[keyof typeof customEvents]
export type ServiceId = typeof serviceIds[number]
export type MeasurementEvent =
  | { name: 'page_viewed' }
  | { name: 'contents_viewed'; service: ServiceId }
  | { name: CustomEventName }

type Contents = { type: 'contents'; contents: { id: string; content_type: 'page' | 'service' }[] }
export type MeasureCommand =
  | ['measure', 'page_viewed' | 'contents_viewed', Contents]
  | ['measure', 'custom', { type: 'custom' }, { custom_event_name: CustomEventName }]

export function toMeasureCommand(event: MeasurementEvent): MeasureCommand {
  if (event.name === 'page_viewed') {
    return ['measure', event.name, { type: 'contents', contents: [{ id: 'landing', content_type: 'page' }] }]
  }
  if (event.name === 'contents_viewed') {
    return ['measure', event.name, { type: 'contents', contents: [{ id: event.service, content_type: 'service' }] }]
  }
  return ['measure', 'custom', { type: 'custom' }, { custom_event_name: event.name }]
}
