import nodemailer from 'nodemailer'
import 'dotenv/config'

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
})

export async function sendEmail(to, subject, content) {
  const isHtml = /<[a-z][\s\S]*>/i.test(content) // crude: looks like HTML?
  await transporter.sendMail({
    from: `"Digeon.ai" <${process.env.SMTP_USER}>`,
    to,
    subject,
    ...(isHtml ? { html: content, text: content.replace(/<[^>]+>/g, ' ') } : { text: content }),
  })
}