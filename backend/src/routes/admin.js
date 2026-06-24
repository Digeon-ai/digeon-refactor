import express from 'express'
import { supabase } from '../supabase.js'

const router = express.Router()

// One-time approval link (you click this from your email)
router.get('/approve', async (req, res) => {
  const { token } = req.query
  if (!token) return res.status(400).send('Missing token.')

  const { data: pending } = await supabase
    .from('pending_admins')
    .select('*')
    .eq('approve_token', token)
    .eq('used', false)
    .maybeSingle()

  if (!pending) {
    return res.status(400).send('This approval link is invalid or has already been used.')
  }

  // make sure they didn't get created some other way in the meantime
  const { data: existing } = await supabase
    .from('users').select('id').eq('email', pending.email).maybeSingle()
  if (existing) {
    await supabase.from('pending_admins').update({ used: true }).eq('id', pending.id)
    return res.status(409).send(`An account for ${pending.email} already exists.`)
  }

  const { data: user, error } = await supabase
    .from('users')
    .insert({
      email: pending.email,
      password_hash: pending.password_hash,
      first_name: pending.first_name,
      last_name: pending.last_name,
      newsletter: pending.newsletter,
      role: 'admin',
    })
    .select().single()
  if (error) return res.status(500).send('Error creating account: ' + error.message)

  await supabase.from('password_history').insert({
    user_id: user.id, password_hash: pending.password_hash,
  })
  await supabase.from('pending_admins').update({ used: true }).eq('id', pending.id)

  res.send(`Approved — admin account created for ${pending.email}. They can now log in.`)
})

// Lets the frontend poll whether a pending admin has been approved yet
router.get('/pending-status', async (req, res) => {
  const { email } = req.query
  if (!email) return res.status(400).json({ error: 'email required' })

  const { data: user } = await supabase
    .from('users').select('id').eq('email', email).eq('role', 'admin').maybeSingle()
  if (user) return res.json({ approved: true })

  const { data: pending } = await supabase
    .from('pending_admins').select('id').eq('email', email).eq('used', false).maybeSingle()
  res.json({ approved: false, pending: !!pending })
})

// pending agents awaiting review, with developer email
router.get('/pending-agents', async (req, res) => {
  const { data, error } = await supabase
    .from('agents')
    .select('id, name, description, type, price, request_quota, output_type, input_schema, users!agents_developer_id_fkey(email)')
    .eq('status', 'pending').eq('deleted', false).order('created_at', { ascending: true })
  if (error) return res.status(500).json({ error: error.message })
  const shaped = (data || []).map((a) => ({ ...a, developer_email: a.users?.email }))
  res.json(shaped)
})

// approve → live on marketplace
router.post('/agents/:id/approve', async (req, res) => {
  const { error } = await supabase.from('agents').update({ status: 'approved' }).eq('id', req.params.id)
  if (error) return res.status(500).json({ error: error.message })
  res.json({ ok: true })
})

// reject → soft-delete (developer sees it gone; never hit marketplace)
router.post('/agents/:id/reject', async (req, res) => {
  const { error } = await supabase.from('agents').update({ deleted: true }).eq('id', req.params.id)
  if (error) return res.status(500).json({ error: error.message })
  res.json({ ok: true })
})

export default router