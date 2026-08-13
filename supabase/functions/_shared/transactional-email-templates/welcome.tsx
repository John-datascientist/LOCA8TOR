/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'Loca8tor'
const SITE_URL = 'https://loca8tor.com'

interface WelcomeEmailProps {
  name?: string
  accountType?: string
}

const WelcomeEmail = ({ name, accountType }: WelcomeEmailProps) => {
  const isBusiness = accountType === 'business'
  return (
  <Html lang="en" dir="ltr">
    <Head />
      <Preview>Welcome to {SITE_NAME} — Generate. Share. Deliver.</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={brandBar}>
            <Text style={brandText}>
              LOCA<span style={brandAccent}>8</span>TOR
            </Text>
          </Section>

          <Section style={card}>
            <Heading style={h1}>
              {name ? `Welcome aboard, ${name}!` : 'Welcome aboard!'} 👋
            </Heading>
            <Text style={text}>
              Your {SITE_NAME} account is ready. You can now generate
              global-format postcodes, share precise locations instantly,
              and manage deliveries — all from one place.
            </Text>
            {isBusiness && (
              <Text style={highlight}>
                🎁 You're on a <strong style={limeText}>7-day free trial</strong> with full access to every feature.
              </Text>
            )}

            <Section style={buttonWrap}>
              <Button href={`${SITE_URL}/login`} style={button}>
                Get Started →
              </Button>
            </Section>

            <Text style={subText}>
              Need a hand getting set up? Just reply to this email — we read every message.
            </Text>
          </Section>

          <Text style={footer}>
            © {SITE_NAME} · Workerholics Solutions Ltd
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: WelcomeEmail,
  subject: (data: Record<string, any>) =>
    data?.name
      ? `Welcome to ${SITE_NAME}, ${data.name}! 🎉`
      : `Welcome to ${SITE_NAME}! 🎉`,
  displayName: 'Welcome email',
  previewData: { name: 'Jane', accountType: 'business' },
} satisfies TemplateEntry

const main = {
  backgroundColor: '#ffffff',
  fontFamily: "'Outfit', Arial, sans-serif",
  margin: 0,
  padding: 0,
}
const container = {
  maxWidth: '560px',
  margin: '0 auto',
  padding: '32px 20px',
}
const brandBar = {
  textAlign: 'center' as const,
  padding: '0 0 24px',
}
const brandText = {
  fontSize: '26px',
  fontWeight: 800,
  letterSpacing: '-0.5px',
  color: '#0a0a0a',
  margin: 0,
}
const brandAccent = {
  color: '#a4eb1f',
}
const card = {
  backgroundColor: '#0a0a0a',
  borderRadius: '16px',
  padding: '36px 28px',
  color: '#e5e5e5',
}
const h1 = {
  color: '#ffffff',
  fontSize: '24px',
  fontWeight: 700,
  margin: '0 0 16px',
  lineHeight: 1.25,
}
const text = {
  color: '#a3a3a3',
  fontSize: '15px',
  lineHeight: 1.6,
  margin: '0 0 16px',
}
const highlight = {
  color: '#d4d4d4',
  fontSize: '15px',
  lineHeight: 1.6,
  margin: '0 0 24px',
}
const limeText = {
  color: '#a4eb1f',
}
const buttonWrap = {
  textAlign: 'center' as const,
  margin: '8px 0 20px',
}
const button = {
  backgroundColor: '#a4eb1f',
  color: '#0a0a0a',
  padding: '14px 32px',
  borderRadius: '10px',
  textDecoration: 'none',
  fontWeight: 700,
  fontSize: '15px',
  display: 'inline-block',
}
const subText = {
  color: '#737373',
  fontSize: '13px',
  lineHeight: 1.6,
  margin: '20px 0 0',
}
const footer = {
  textAlign: 'center' as const,
  color: '#999999',
  fontSize: '12px',
  margin: '24px 0 0',
}