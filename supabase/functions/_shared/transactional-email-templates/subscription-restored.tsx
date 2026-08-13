/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'Loca8tor'
const SITE_URL = 'https://loca8tor.com'

interface RestoredProps {
  name?: string
  businessName?: string
  recipientRole?: 'business' | 'rider'
}

const SubscriptionRestoredEmail = ({ name, businessName, recipientRole }: RestoredProps) => {
  const isRider = recipientRole === 'rider'
  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>Your {SITE_NAME} account is active again</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={brandBar}>
            <Text style={brandText}>LOCA<span style={brandAccent}>8</span>TOR</Text>
          </Section>
          <Section style={card}>
            <Heading style={h1}>
              {name ? `Welcome back, ${name}! 🎉` : 'Welcome back! 🎉'}
            </Heading>
            <Text style={text}>
              {isRider ? (
                <>Billing for <strong style={limeText}>{businessName || 'your business'}</strong> has
                been restored, so your rider/driver account is now active
                again. You can resume accepting deliveries right away.</>
              ) : (
                <>Your Paga Direct Debit payment was successful and your
                business account has been reactivated. All linked
                riders/drivers can resume work immediately.</>
              )}
            </Text>
            <Section style={buttonWrap}>
              <Button href={`${SITE_URL}/${isRider ? 'rider' : 'business'}`} style={button}>
                Open {isRider ? 'Rider App' : 'Business Dashboard'} →
              </Button>
            </Section>
          </Section>
          <Text style={footer}>© {SITE_NAME} · Workerholics Solutions Ltd</Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: SubscriptionRestoredEmail,
  subject: () => `✅ ${SITE_NAME} account reactivated`,
  displayName: 'Subscription restored',
  previewData: { name: 'Jane', businessName: 'Acme Logistics', recipientRole: 'business' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Outfit', Arial, sans-serif", margin: 0, padding: 0 }
const container = { maxWidth: '560px', margin: '0 auto', padding: '32px 20px' }
const brandBar = { textAlign: 'center' as const, padding: '0 0 24px' }
const brandText = { fontSize: '26px', fontWeight: 800, letterSpacing: '-0.5px', color: '#0a0a0a', margin: 0 }
const brandAccent = { color: '#a4eb1f' }
const card = { backgroundColor: '#0a0a0a', borderRadius: '16px', padding: '36px 28px', color: '#e5e5e5' }
const h1 = { color: '#ffffff', fontSize: '22px', fontWeight: 700, margin: '0 0 16px', lineHeight: 1.3 }
const text = { color: '#a3a3a3', fontSize: '15px', lineHeight: 1.6, margin: '0 0 16px' }
const limeText = { color: '#a4eb1f' }
const buttonWrap = { textAlign: 'center' as const, margin: '12px 0 4px' }
const button = { backgroundColor: '#a4eb1f', color: '#0a0a0a', padding: '14px 32px', borderRadius: '10px', textDecoration: 'none', fontWeight: 700, fontSize: '15px', display: 'inline-block' }
const footer = { textAlign: 'center' as const, color: '#999999', fontSize: '12px', margin: '24px 0 0' }