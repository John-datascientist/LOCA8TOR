/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'

export interface TemplateEntry {
  component: React.ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  to?: string
  displayName?: string
  previewData?: Record<string, any>
}

import { template as welcome } from './welcome.tsx'
import { template as welcomeReferral } from './welcome-referral.tsx'
import { template as welcomeInternational } from './welcome-international.tsx'
import { template as subscriptionPaused } from './subscription-paused.tsx'
import { template as subscriptionRestored } from './subscription-restored.tsx'
import { template as paymentFailed } from './payment-failed.tsx'
import { template as trialEndingReminder } from './trial-ending-reminder.tsx'

export const TEMPLATES: Record<string, TemplateEntry> = {
  'welcome': welcome,
  'welcome-referral': welcomeReferral,
  'welcome-international': welcomeInternational,
  'subscription-paused': subscriptionPaused,
  'subscription-restored': subscriptionRestored,
  'payment-failed': paymentFailed,
  'trial-ending-reminder': trialEndingReminder,
}