import express from 'express'
import { supabase } from '../supabase.js'
import { requireAuth, requireAdmin } from '../auth.js'


const router = express.Router()

// stable display name: real name if they have one, else Guest-<id>
function displayName(user) {
  const name = [user.first_name, user.last_name].filter(Boolean).join(' ').trim()
  return name || `Guest-${user.id}`
}

router.get('/admin/all', requireAuth, requireAdmin, async (req, res) => {
  const { data, error } = await supabase
    .from('comments')
    .select('id, blog_id, parent_id, body, created_at, users(id, first_name, last_name), blogs(title)')
    .order('created_at', { ascending: false })
  if (error) return res.status(500).json({ error: error.message })

  const shaped = (data || []).map((c) => {
    const u = c.users || {}
    const name = [u.first_name, u.last_name].filter(Boolean).join(' ').trim()
    return {
      id: c.id,
      blog_id: c.blog_id,
      blog_title: c.blogs?.title || '(deleted blog)',
      body: c.body,
      created_at: c.created_at,
      author: name || `Guest-${u.id}`,
      is_reply: !!c.parent_id,
    }
  })
  res.json(shaped)
})

// get all comments for a blog (flat list; frontend groups them)
router.get('/blog/:blogId', async (req, res) => {
  const blogId = Number(req.params.blogId)

  const { data: comments, error } = await supabase
    .from('comments')
    .select('id, blog_id, user_id, parent_id, body, created_at, users(id, first_name, last_name)')
    .eq('blog_id', blogId)
    .order('created_at', { ascending: true })
  if (error) return res.status(500).json({ error: error.message })

  // like counts per comment
  const { data: likes } = await supabase.from('comment_likes').select('comment_id')
  const counts = {}
  ;(likes || []).forEach((l) => { counts[l.comment_id] = (counts[l.comment_id] || 0) + 1 })

  // which the caller liked + who the caller is
  let likedSet = new Set()
  let meId = null
  const header = req.headers.authorization || ''
  if (header.startsWith('Bearer ')) {
    try {
      const { default: jwt } = await import('jsonwebtoken')
      const payload = jwt.verify(header.slice(7), process.env.JWT_SECRET)
      meId = payload.id
      const { data: mine } = await supabase.from('comment_likes').select('comment_id').eq('user_email', payload.email)
      likedSet = new Set((mine || []).map((m) => m.comment_id))
    } catch {}
  }

  const shaped = comments.map((c) => ({
    id: c.id,
    parent_id: c.parent_id,
    body: c.body,
    created_at: c.created_at,
    author: displayName(c.users),
    author_id: c.user_id,
    likes: counts[c.id] || 0,
    liked: likedSet.has(c.id),
    mine: meId === c.user_id,
  }))

  res.json(shaped)
})

// post a comment or reply — logged in only
router.post('/blog/:blogId', requireAuth, async (req, res) => {
  const blogId = Number(req.params.blogId)
  const { body, parentId } = req.body
  if (!body || !body.trim()) return res.status(400).json({ error: 'Comment cannot be empty' })

  const { data, error } = await supabase
    .from('comments')
    .insert({ blog_id: blogId, user_id: req.user.id, parent_id: parentId || null, body: body.trim() })
    .select().single()
  if (error) return res.status(500).json({ error: error.message })
  res.json({ ok: true, id: data.id })
})

// delete own comment — admins can delete any (handled in round 3)
router.delete('/:id', requireAuth, async (req, res) => {
  const { data: c } = await supabase.from('comments').select('user_id').eq('id', req.params.id).maybeSingle()
  if (!c) return res.status(404).json({ error: 'Not found' })
  if (c.user_id !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Not allowed' })
  }
  await supabase.from('comments').delete().eq('id', req.params.id)
  res.json({ ok: true })
})

// toggle like on a comment — logged in only
router.post('/:id/like', requireAuth, async (req, res) => {
  const commentId = Number(req.params.id)
  const email = req.user.email
  const { data: existing } = await supabase
    .from('comment_likes').select('id').eq('comment_id', commentId).eq('user_email', email).maybeSingle()
  if (existing) await supabase.from('comment_likes').delete().eq('id', existing.id)
  else await supabase.from('comment_likes').insert({ comment_id: commentId, user_email: email })

  const { count } = await supabase
    .from('comment_likes').select('*', { count: 'exact', head: true }).eq('comment_id', commentId)
  res.json({ liked: !existing, likes: count || 0 })
})

export default router