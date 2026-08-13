/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'Loca8tor'
const SITE_URL = 'https://loca8tor.com'

interface WelcomeIntlEmailProps {
  name?: string
}

const WelcomeInternationalEmail = ({ name }: WelcomeIntlEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Welcome to {SITE_NAME} — find any address, anywhere.</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={brandBar}>
          <Text style={brandText}>
            LOCA<span style={brandAccent}>8</span>TOR
          </Text>
        </Section>

        <Section style={card}>
          <Heading style={h1}>
            {name ? `Welcome, ${name}!` : 'Welcome!'} 🌍
          </Heading>
          <Text style={text}>
            Thanks for joining {SITE_NAME} — a global location tool that
            turns any spot on earth into a precise, shareable{' '}
            <strong style={limeText}>global-format postcode</strong>.
            Whether you're in the UK, US, Canada or anywhere else, you can
            now generate, search and share locations with pinpoint accuracy.
          </Text>

          <Hr style={hr} />

          <Heading as="h2" style={h2}>What you can do on {SITE_NAME}</Heading>

          <Text style={featureText}>
            <strong style={limeText}>📍 Generate postcodes</strong> for any
            spot on earth — even places without an official address.
          </Text>
          <Text style={featureText}>
            <strong style={limeText}>🔍 Search any location</strong> by code
            or place name across Nigeria, the UK, USA and Canada.
          </Text>
          <Text style={featureText}>
            <strong style={limeText}>🔗 Share instantly</strong> with a link
            or QR code so friends, drivers and couriers find you fast.
          </Text>
          <Text style={featureText}>
            <strong style={limeText}>🗺️ See it on a map</strong> with
            street-level detail and copy/paste-friendly coordinates.
          </Text>
          <Text style={featureText}>
            <strong style={limeText}>📏 Distance &amp; routing</strong>{' '}
            between any two postcodes for transparent travel and delivery
            planning.
          </Text>
          <Text style={featureText}>
            <strong style={limeText}>🧭 Save favourites</strong> — keep your
            home, work and go-to spots one tap away.
          </Text>

          <Section style={buttonWrap}>
            <Button href={`${SITE_URL}/generate`} style={button}>
              Generate a postcode →
            </Button>
          </Section>
          <Section style={buttonWrap}>
            <Button href={`${SITE_URL}/search`} style={buttonSecondary}>
              Search a location →
            </Button>
          </Section>

          <Text style={subText}>
            You can sign in any time at{' '}
            <a href={`${SITE_URL}/login`} style={inlineLink}>{SITE_URL.replace('https://', '')}/login</a>.
            Questions or feedback? Just reply to this email — we read every
            message.
          </Text>
        </Section>

        <Text style={footer}>
          © {SITE_NAME} · Workerholics Solutions Ltd
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: WelcomeInternationalEmail,
  subject: (data: Record<string, any>) =>
    data?.name
      ? `Welcome to ${SITE_NAME}, ${data.name}! 🌍`
      : `Welcome to ${SITE_NAME}! 🌍`,
  displayName: 'Welcome email (international / non-NG)',
  previewData: { name: 'Alex' },
} satisfies TemplateEntry

const main = {
  backgroundColor: '#ffffff',
  fontFamily: "'Outfit', Arial, sans-serif",
  margin: 0,
  padding: 0,
}
const container = { maxWidth: '560px', margin: '0 auto', padding: '32px 20px' }
const brandBar = { textAlign: 'center' as const, padding: '0 0 24px' }
const brandText = {
  fontSize: '26px',
  fontWeight: 800,
  letterSpacing: '-0.5px',
  color: '#0a0a0a',
  margin: 0,
}
const brandAccent = { color: '#a4eb1f' }
const card = {
  backgroundColor: '#0a0a0a',
  borderRadius: '16px',
  padding: '36px 28px',
  color: '#e5e5e5',
}
const h1 = { color: '#ffffff', fontSize: '24px', fontWeight: 700, margin: '0 0 16px', lineHeight: 1.25 }
const h2 = { color: '#ffffff', fontSize: '17px', fontWeight: 700, margin: '0 0 16px' }
const text = { color: '#a3a3a3', fontSize: '15px', lineHeight: 1.6, margin: '0 0 16px' }
const featureText = { color: '#d4d4d4', fontSize: '14px', lineHeight: 1.6, margin: '0 0 12px' }
const limeText = { color: '#a4eb1f' }
const hr = { borderColor: '#262626', margin: '24px 0' }
const buttonWrap = { textAlign: 'center' as const, margin: '24px 0 12px' }
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
const buttonSecondary = {
  backgroundColor: 'transparent',
  color: '#a4eb1f',
  padding: '12px 28px',
  borderRadius: '10px',
  textDecoration: 'none',
  fontWeight: 700,
  fontSize: '14px',
  display: 'inline-block',
  border: '1px solid #a4eb1f',
}
const inlineLink = { color: '#a4eb1f', textDecoration: 'none', fontWeight: 600 }
const subText = { color: '#737373', fontSize: '13px', lineHeight: 1.6, margin: '20px 0 0' }
const footer = { textAlign: 'center' as const, color: '#999999', fontSize: '12px', margin: '24px 0 0' }