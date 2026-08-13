/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'Loca8tor'
const SITE_URL = 'https://loca8tor.com'

interface Props {
  name?: string
  businessName?: string
  amountNgn?: number
  planCode?: string
  billingCycle?: string
  trialEndsAt?: string
}

const TrialEndingReminderEmail = ({
  name, businessName, amountNgn, planCode, billingCycle, trialEndsAt,
}: Props) => {
  const amountText = amountNgn ? `₦${Number(amountNgn).toLocaleString()}` : 'your renewal amount'
  const when = trialEndsAt ? new Date(trialEndsAt).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' }) : 'tomorrow'
  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>
        Your {SITE_NAME} 7-day trial for {businessName || 'your business'} ends in ~24 hours
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={brandBar}>
            <Text style={brandText}>LOCA<span style={brandAccent}>8</span>TOR</Text>
          </Section>
          <Section style={card}>
            <Heading style={h1}>Your 7-day free trial ends tomorrow</Heading>
            <Text style={text}>{name ? `Hi ${name},` : 'Hi,'}</Text>
            <Text style={text}>
              This is a friendly reminder that your free trial for
              <strong style={limeText}> {businessName || 'your business'}</strong> ends on
              <strong> {when}</strong>. Your card on file will be charged
              <strong style={limeText}> {amountText}</strong> to activate your
              {planCode ? ` ${planCode}` : ''}{billingCycle ? ` (${billingCycle})` : ''} subscription
              and keep your riders/drivers active.
            </Text>
            <Text style={text}>
              Please make sure your card has sufficient funds. If the charge fails, we'll try your business wallet
              next — if that's also empty, your account will be paused until billing is restored.
            </Text>
            <Section style={buttonWrap}>
              <Button href={`${SITE_URL}/billing`} style={button}>Manage Billing →</Button>
            </Section>
            <Text style={smallText}>
              Don't want to continue? You can cancel any time before the trial ends from your billing page — you won't be charged.
            </Text>
          </Section>
          <Text style={footer}>© {SITE_NAME} · Workerholics Solutions Ltd</Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: TrialEndingReminderEmail,
  subject: (data: Record<string, any>) =>
    `⏰ Your ${SITE_NAME} trial for ${data?.businessName || 'your business'} ends tomorrow`,
  displayName: 'Trial ending reminder (1 day)',
  previewData: {
    name: 'Jane', businessName: 'Acme Logistics', amountNgn: 30000,
    planCode: 'fleet_premium', billingCycle: 'monthly',
    trialEndsAt: new Date(Date.now() + 86400000).toISOString(),
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Outfit', Arial, sans-serif", margin: 0, padding: 0 }
const container = { maxWidth: '560px', margin: '0 auto', padding: '32px 20px' }
const brandBar = { textAlign: 'center' as const, padding: '0 0 24px' }
const brandText = { fontSize: '26px', fontWeight: 800, letterSpacing: '-0.5px', color: '#0a0a0a', margin: 0 }
const brandAccent = { color: '#a4eb1f' }
const card = { backgroundColor: '#0a0a0a', borderRadius: '16px', padding: '36px 28px', color: '#e5e5e5' }
const h1 = { color: '#ffffff', fontSize: '22px', fontWeight: 700, margin: '0 0 16px', lineHeight: 1.3 }
const text = { color: '#a3a3a3', fontSize: '15px', lineHeight: 1.6, margin: '0 0 16px' }
const smallText = { color: '#737373', fontSize: '13px', lineHeight: 1.5, margin: '16px 0 0' }
const limeText = { color: '#a4eb1f' }
const buttonWrap = { textAlign: 'center' as const, margin: '12px 0 4px' }
const button = { backgroundColor: '#a4eb1f', color: '#0a0a0a', padding: '14px 32px', borderRadius: '10px', textDecoration: 'none', fontWeight: 700, fontSize: '15px', display: 'inline-block' }
const footer = { textAlign: 'center' as const, color: '#999999', fontSize: '12px', margin: '24px 0 0' }