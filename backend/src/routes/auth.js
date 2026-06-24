import express from 'express'
import { supabase } from '../supabase.js'
import { sendEmail } from '../email.js'
import {
  validatePassword, hashPassword, comparePassword,
  sixDigitCode, signToken, randomToken, requireAuth,
} from '../auth.js'




const router = express.Router()

// STEP 1 of signup: validate, email a 6-digit code (no account yet)
router.post('/signup/start', async (req, res) => {
  const { email, password } = req.body
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' })

  const { valid } = validatePassword(password)
  if (!valid) return res.status(400).json({ error: 'Password does not meet requirements' })

  // reject if email already a real user
  const { data: existing } = await supabase.from('users').select('id').eq('email', email).maybeSingle()
  if (existing) return res.status(409).json({ error: 'An account with this email already exists' })

  const code = sixDigitCode()
  const expires = new Date(Date.now() + 10 * 60 * 1000).toISOString()

  // clear old signup codes for this email, store the new one
  await supabase.from('email_codes').delete().eq('email', email).eq('purpose', 'signup')
  await supabase.from('email_codes').insert({ email, code, purpose: 'signup', expires_at: expires })

  try {
    await sendEmail(email, 'Your Digeon verification code',
      `Your verification code is ${code}. It expires in 10 minutes.`)
  } catch (e) {
    return res.status(500).json({ error: 'Could not send email: ' + e.message })
  }
  res.json({ ok: true })
})

// STEP 2 of signup: verify code, then create account (basic) or hold (admin)
router.post('/signup/verify', async (req, res) => {
  const { email, password, code, firstName, lastName, newsletter, wantsAdmin } = req.body

  const { data: row } = await supabase
    .from('email_codes')
    .select('*')
    .eq('email', email).eq('purpose', 'signup').eq('used', false)
    .order('created_at', { ascending: false })
    .limit(1).maybeSingle()

  if (!row) return res.status(400).json({ error: 'No code found, request a new one' })
  if (row.code !== code) return res.status(400).json({ error: 'Incorrect code' })
  if (new Date(row.expires_at) < new Date()) return res.status(400).json({ error: 'Code expired' })

  await supabase.from('email_codes').update({ used: true }).eq('id', row.id)

  const password_hash = await hashPassword(password)

  if (wantsAdmin) {
    const approve_token = randomToken()

    // clear any earlier pending request for this email, store the new one
    await supabase.from('pending_admins').delete().eq('email', email)
    const { error: pErr } = await supabase.from('pending_admins').insert({
      email,
      password_hash,
      first_name: firstName || null,
      last_name: lastName || null,
      newsletter: !!newsletter,
      approve_token,
    })
    if (pErr) return res.status(500).json({ error: pErr.message })

    const approveUrl = `${process.env.PUBLIC_API_URL}/api/admin/approve?token=${approve_token}`
    try {
      await sendEmail(
        process.env.SMTP_USER, // sends to you, the site owner
        'Digeon: admin access request',
        `${email} has requested admin access.\n\n` +
        `To approve and create their admin account, click:\n${approveUrl}\n\n` +
        `If you don't recognize this request, ignore this email and no account will be created.`
      )
    } catch (e) {
      return res.status(500).json({ error: 'Could not send approval email: ' + e.message })
    }

    return res.json({ pendingAdmin: true })
  }

  // basic account created immediately
  const { data: user, error } = await supabase
    .from('users')
    .insert({ email, password_hash, first_name: firstName || null,
              last_name: lastName || null, newsletter: !!newsletter, role: 'basic' })
    .select().single()
  if (error) return res.status(500).json({ error: error.message })

  await supabase.from('password_history').insert({ user_id: user.id, password_hash })

  const token = signToken(user)
  res.json({ token, user: { id: user.id, email: user.email, role: user.role, firstName: user.first_name, newsletter: user.newsletter } })
})

// LOGIN
router.post('/login', async (req, res) => {
  const { email, password } = req.body
  const { data: user } = await supabase.from('users').select('*').eq('email', email).maybeSingle()
  if (!user) return res.status(401).json({ error: 'Invalid email or password' })

  const ok = await comparePassword(password, user.password_hash)
  if (!ok) return res.status(401).json({ error: 'Invalid email or password' })

  const token = signToken(user)
  res.json({ token, user: { id: user.id, email: user.email, role: user.role, firstName: user.first_name, newsletter: user.newsletter } })
})

// FORGOT PASSWORD step 1: email a reset code (only if the account exists)
router.post('/forgot/start', async (req, res) => {
  const { email } = req.body
  if (!email) return res.status(400).json({ error: 'Email required' })

  const { data: user } = await supabase.from('users').select('id').eq('email', email).maybeSingle()

  // Always respond ok so we don't leak which emails are registered.
  if (!user) return res.json({ ok: true })

  const code = sixDigitCode()
  const expires = new Date(Date.now() + 10 * 60 * 1000).toISOString()

  await supabase.from('email_codes').delete().eq('email', email).eq('purpose', 'reset')
  await supabase.from('email_codes').insert({ email, code, purpose: 'reset', expires_at: expires })

  try {
    await sendEmail(email, 'Your Digeon password reset code',
      `Your password reset code is ${code}. It expires in 10 minutes.`)
  } catch (e) {
    return res.status(500).json({ error: 'Could not send email: ' + e.message })
  }
  res.json({ ok: true })
})

// FORGOT PASSWORD step 2: verify code + set a new password (with no-reuse check)
router.post('/forgot/reset', async (req, res) => {
  const { email, code, newPassword } = req.body
  if (!email || !code || !newPassword) return res.status(400).json({ error: 'Missing fields' })

  const { valid } = validatePassword(newPassword)
  if (!valid) return res.status(400).json({ error: 'Password does not meet requirements' })

  // check the reset code
  const { data: row } = await supabase
    .from('email_codes')
    .select('*')
    .eq('email', email).eq('purpose', 'reset').eq('used', false)
    .order('created_at', { ascending: false })
    .limit(1).maybeSingle()

  if (!row) return res.status(400).json({ error: 'No code found, request a new one' })
  if (row.code !== code) return res.status(400).json({ error: 'Incorrect code' })
  if (new Date(row.expires_at) < new Date()) return res.status(400).json({ error: 'Code expired' })

  const { data: user } = await supabase.from('users').select('id').eq('email', email).maybeSingle()
  if (!user) return res.status(400).json({ error: 'Account not found' })

  // no-reuse: compare new password against every stored hash for this user
  const { data: history } = await supabase
    .from('password_history').select('password_hash').eq('user_id', user.id)

  for (const h of history || []) {
    if (await comparePassword(newPassword, h.password_hash)) {
      return res.status(400).json({ error: 'You have used this password before. Choose a new one.' })
    }
  }

  const newHash = await hashPassword(newPassword)
  await supabase.from('users').update({ password_hash: newHash }).eq('id', user.id)
  await supabase.from('password_history').insert({ user_id: user.id, password_hash: newHash })
  await supabase.from('email_codes').update({ used: true }).eq('id', row.id)

  res.json({ ok: true })
})

// current user's profile
router.get('/me', requireAuth, async (req, res) => {
  const { data: user } = await supabase
    .from('users').select('email, first_name, last_name, newsletter, role')
    .eq('id', req.user.id).maybeSingle()
  if (!user) return res.status(404).json({ error: 'Not found' })
  res.json(user)
})

// update names + newsletter pref
router.patch('/me', requireAuth, async (req, res) => {
  const { firstName, lastName, newsletter } = req.body
  const { data: user, error } = await supabase
    .from('users')
    .update({ first_name: firstName || null, last_name: lastName || null, newsletter: !!newsletter })
    .eq('id', req.user.id)
    .select('email, first_name, last_name, newsletter, role').single()
  if (error) return res.status(500).json({ error: error.message })
  res.json(user)
})

// change password (verify current, no-reuse check, store history)
router.post('/change-password', requireAuth, async (req, res) => {
  const { currentPassword, newPassword } = req.body
  if (!currentPassword || !newPassword) return res.status(400).json({ error: 'Missing fields' })

  const { valid } = validatePassword(newPassword)
  if (!valid) return res.status(400).json({ error: 'Password does not meet requirements' })

  const { data: user } = await supabase.from('users').select('*').eq('id', req.user.id).maybeSingle()
  if (!user) return res.status(404).json({ error: 'Not found' })

  const ok = await comparePassword(currentPassword, user.password_hash)
  if (!ok) return res.status(400).json({ error: 'Current password is incorrect' })

  const { data: history } = await supabase
    .from('password_history').select('password_hash').eq('user_id', user.id)
  for (const h of history || []) {
    if (await comparePassword(newPassword, h.password_hash)) {
      return res.status(400).json({ error: 'You have used this password before. Choose a new one.' })
    }
  }

  const newHash = await hashPassword(newPassword)
  await supabase.from('users').update({ password_hash: newHash }).eq('id', user.id)
  await supabase.from('password_history').insert({ user_id: user.id, password_hash: newHash })
  res.json({ ok: true })
})

// CHANGE EMAIL step 1: send a code to the NEW email (must be logged in)
router.post('/change-email/start', requireAuth, async (req, res) => {
  const { newEmail } = req.body
  if (!newEmail) return res.status(400).json({ error: 'New email required' })

  // reject if that email is already taken
  const { data: taken } = await supabase.from('users').select('id').eq('email', newEmail).maybeSingle()
  if (taken) return res.status(409).json({ error: 'That email is already in use' })

  const code = sixDigitCode()
  const expires = new Date(Date.now() + 10 * 60 * 1000).toISOString()
  await supabase.from('email_codes').delete().eq('email', newEmail).eq('purpose', 'signup')
  await supabase.from('email_codes').insert({ email: newEmail, code, purpose: 'signup', expires_at: expires })

  try {
    await sendEmail(newEmail, 'Confirm your new Digeon email',
      `Your confirmation code is ${code}. It expires in 10 minutes.`)
  } catch (e) {
    return res.status(500).json({ error: 'Could not send email: ' + e.message })
  }
  res.json({ ok: true })
})

// CHANGE EMAIL step 2: verify the code, then update the email + issue a fresh token
router.post('/change-email/verify', requireAuth, async (req, res) => {
  const { newEmail, code } = req.body
  if (!newEmail || !code) return res.status(400).json({ error: 'Missing fields' })

  const { data: row } = await supabase
    .from('email_codes')
    .select('*')
    .eq('email', newEmail).eq('purpose', 'signup').eq('used', false)
    .order('created_at', { ascending: false }).limit(1).maybeSingle()

  if (!row) return res.status(400).json({ error: 'No code found, request a new one' })
  if (row.code !== code) return res.status(400).json({ error: 'Incorrect code' })
  if (new Date(row.expires_at) < new Date()) return res.status(400).json({ error: 'Code expired' })

  // make sure it wasn't taken in the meantime
  const { data: taken } = await supabase.from('users').select('id').eq('email', newEmail).maybeSingle()
  if (taken) return res.status(409).json({ error: 'That email is already in use' })

  await supabase.from('email_codes').update({ used: true }).eq('id', row.id)

  const { data: user, error } = await supabase
    .from('users').update({ email: newEmail }).eq('id', req.user.id)
    .select('email, role, first_name').single()
  if (error) return res.status(500).json({ error: error.message })

  // email is in the JWT, so re-issue a token with the new email
  const token = signToken({ id: req.user.id, email: user.email, role: user.role })
  res.json({ token, user: { email: user.email, role: user.role, firstName: user.first_name } })
})

export default router