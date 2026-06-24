import express from 'express'
import { sendEmail } from '../email.js'

const router = express.Router()

const LOGO_URL = 'https://bmalxlitzngsnhrocaem.supabase.co/storage/v1/object/public/blog-media/1782274874758-zeqhfdny0d.png' // same one from emailTemplate.js

router.post('/', async (req, res) => {
  const { name, email, message } = req.body
  if (!email || !message || !message.trim()) {
    return res.status(400).json({ error: 'Email and message are required' })
  }

  const who = name?.trim() ? name.trim() : 'Anonymous'

  // 1) email to YOU — white bg + logo header, no other formatting
  const adminHtml = `
    <div style="font-family:Arial,sans-serif; color:#111;">
      <img src="${LOGO_URL}" alt="Digeon.ai" width="140" style="display:block; margin-bottom:16px;">
      <p><strong>From:</strong> ${who} (${email})</p>
      <p><strong>Message:</strong></p>
      <p>${message.replace(/</g, '&lt;').replace(/\n/g, '<br>')}</p>
    </div>`

  try {
    await sendEmail(process.env.SMTP_USER, 'URGENT: Customer feedback', adminHtml)

    // 2) confirmation to the CUSTOMER
    const userHtml = `
      <div style="font-family:Arial,sans-serif; color:#111;">
        <img src="${LOGO_URL}" alt="Digeon.ai" width="140" style="display:block; margin-bottom:16px;">
        <p>Hi ${who},</p>
        <p>Thanks for reaching out — we've received your message and value your feedback. Our team will get back to you if a response is needed.</p>
        <p>— The Digeon AI team</p>
      </div>`
    await sendEmail(email, 'We received your feedback — Digeon AI', userHtml)
  } catch (e) {
    return res.status(500).json({ error: 'Could not send: ' + e.message })
  }

  res.json({ ok: true })
})

export default router