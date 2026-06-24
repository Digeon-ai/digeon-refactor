import express from 'express'
import { supabase } from '../supabase.js'
import { sendEmail } from '../email.js'
import { requireAuth, requireAdmin } from '../auth.js'
import { wrapNewsletter } from '../emailTemplate.js'


const router = express.Router()

// history (newest first) — admin only
router.get('/', requireAuth, requireAdmin, async (req, res) => {
  const { data, error } = await supabase
    .from('newsletters').select('*').order('sent_at', { ascending: false })
  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

// compose + send to all subscribers — admin only
router.post('/send', requireAuth, requireAdmin, async (req, res) => {
  const { subject, body } = req.body
  if (!subject || !body) return res.status(400).json({ error: 'Subject and body required' })

  // everyone who opted in
  const { data: subs, error: subErr } = await supabase
    .from('users').select('email').eq('newsletter', true)
  if (subErr) return res.status(500).json({ error: subErr.message })

  if (!subs.length) return res.status(400).json({ error: 'No subscribers to send to' })

  // send individually so addresses aren't exposed to each other
  let sent = 0
  for (const s of subs) {
    try {
      await sendEmail(s.email, subject, wrapNewsletter(subject, body))
      sent++
    } catch { /* skip failures, keep going */ }
  }

  // log it
  const { error: logErr } = await supabase.from('newsletters').insert({
    subject, body, sent_by: req.user.email, recipient_count: sent,
  })
  if (logErr) return res.status(500).json({ error: logErr.message })

  res.json({ ok: true, sent, total: subs.length })
})

export default router