import { Resend } from 'resend'
import 'dotenv/config'

const resend = new Resend(process.env.RESEND_API_KEY)

// Resend's shared test sender — works with no domain setup.
const FROM = 'Digeon.ai <onboarding@resend.dev>'

export async function sendEmail(to, subject, content) {
  const isHtml = /<[a-z][\s\S]*>/i.test(content) // crude: looks like HTML?
  const { error } = await resend.emails.send({
    from: FROM,
    to,
    subject,
    ...(isHtml
      ? { html: content, text: content.replace(/<[^>]+>/g, ' ') }
      : { text: content }),
  })
  if (error) throw new Error(error.message || 'Email send failed')
}