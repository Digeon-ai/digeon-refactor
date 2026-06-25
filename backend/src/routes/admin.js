import express from 'express'
import { supabase } from '../supabase.js'
import { requireAuth, requireAdmin } from '../auth.js'

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

// search users by name or email (admin)
router.get('/users', requireAuth, requireAdmin, async (req, res) => {
  const q = (req.query.q || '').trim()
  let query = supabase
    .from('users')
    .select('id, email, first_name, last_name, role, newsletter')
    .order('id', { ascending: true })

  if (q) {
    const safe = q.replace(/[%,()]/g, ' ').trim()  // strip chars that break the or-filter
    if (safe) query = query.or(`email.ilike.%${safe}%,first_name.ilike.%${safe}%,last_name.ilike.%${safe}%`)
  }
  const { data, error } = await query
  if (error) return res.status(500).json({ error: error.message })
  res.json(data || [])
})

// full profile for one user: uploads, purchases (w/ requests left), comments
router.get('/users/:id', requireAuth, requireAdmin, async (req, res) => {
  const id = Number(req.params.id)

  const { data: user } = await supabase
    .from('users').select('id, email, first_name, last_name, role, newsletter')
    .eq('id', id).maybeSingle()
  if (!user) return res.status(404).json({ error: 'User not found' })

  // agents they uploaded (include pending/deleted so admin sees all)
  const { data: uploads } = await supabase
    .from('agents')
    .select('id, name, status, deleted, price, request_quota, created_at')
    .eq('developer_id', id).order('created_at', { ascending: false })

  // agents they own + remaining requests
  const { data: owned } = await supabase
    .from('user_agents')
    .select('requests_left, updated_at, agents(id, name)')
    .eq('user_id', id).order('updated_at', { ascending: false })
  const purchases = (owned || []).map((r) => ({
    agent_id: r.agents?.id,
    name: r.agents?.name || '(removed agent)',
    requests_left: r.requests_left,
    updated_at: r.updated_at,
  }))

  // comments they made, with blog title
  const { data: comments } = await supabase
    .from('comments')
    .select('id, body, parent_id, created_at, blogs(title)')
    .eq('user_id', id).order('created_at', { ascending: false })
  const shapedComments = (comments || []).map((c) => ({
    id: c.id, body: c.body, created_at: c.created_at,
    is_reply: !!c.parent_id, blog_title: c.blogs?.title || '(deleted blog)',
  }))

  res.json({ user, uploads: uploads || [], purchases, comments: shapedComments })
})

// delete a user account + all their data (admin)
router.delete('/users/:id', requireAuth, requireAdmin, async (req, res) => {
  const id = Number(req.params.id)
  if (id === req.user.id) return res.status(400).json({ error: "You can't delete your own account here." })

  const { data: target } = await supabase.from('users').select('id, email').eq('id', id).maybeSingle()
  if (!target) return res.status(404).json({ error: 'User not found' })
  const email = target.email

  // 1) soft-delete agents they uploaded — existing buyers keep access until depleted
  await supabase.from('agents').update({ deleted: true }).eq('developer_id', id)

  // 2) their comments: preserve replies written by OTHER users, then remove likes + comments
  const { data: theirComments } = await supabase.from('comments').select('id').eq('user_id', id)
  const commentIds = (theirComments || []).map((c) => c.id)
  if (commentIds.length) {
    await supabase.from('comments').update({ parent_id: null }).in('parent_id', commentIds) // promote others' replies
    await supabase.from('comment_likes').delete().in('comment_id', commentIds)               // likes on their comments
    await supabase.from('comments').delete().eq('user_id', id)
  }

  // 3) email-keyed rows they created
  await supabase.from('comment_likes').delete().eq('user_email', email)
  await supabase.from('blog_likes').delete().eq('user_email', email)
  await supabase.from('ratings').delete().eq('user_email', email)

  // 4) user_id-keyed rows
  await supabase.from('user_agents').delete().eq('user_id', id)
  await supabase.from('purchases').delete().eq('user_id', id)
  await supabase.from('password_history').delete().eq('user_id', id)

  // 5) auth/email artifacts
  await supabase.from('email_codes').delete().eq('email', email)
  await supabase.from('pending_admins').delete().eq('email', email)

  // 6) finally the user row (agents.developer_id auto-nulls via its FK)
  const { error } = await supabase.from('users').delete().eq('id', id)
  if (error) return res.status(500).json({ error: error.message })

  res.json({ ok: true })
})

// live marketplace agents (approved, not deleted) with developer email
router.get('/agents', requireAuth, requireAdmin, async (req, res) => {
  const { data, error } = await supabase
    .from('agents')
    .select('id, name, description, type, price, request_quota, output_type, created_at, users!agents_developer_id_fkey(email)')
    .eq('status', 'approved').eq('deleted', false)
    .order('created_at', { ascending: false })
  if (error) return res.status(500).json({ error: error.message })
  const shaped = (data || []).map((a) => ({
    id: a.id, name: a.name, description: a.description, type: a.type,
    price: a.price, request_quota: a.request_quota, output_type: a.output_type,
    created_at: a.created_at, developer_email: a.users?.email || '(no owner)',
  }))
  res.json(shaped)
})

// admin soft-delete an agent — same flag developers set, so the dev portal
// shows "Deleted" and buyers keep access until their requests deplete
router.delete('/agents/:id', requireAuth, requireAdmin, async (req, res) => {
  const { error } = await supabase.from('agents').update({ deleted: true }).eq('id', Number(req.params.id))
  if (error) return res.status(500).json({ error: error.message })
  res.json({ ok: true })
})

export default router