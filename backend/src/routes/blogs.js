import express from 'express'
import { supabase } from '../supabase.js'
import { requireAuth, requireAdmin } from '../auth.js'

const router = express.Router()

// strip HTML tags → short plain-text excerpt
function makeExcerpt(html) {
  const text = (html || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
  return text.slice(0, 180)
}


// list all blogs with like counts — public
router.get('/', async (req, res) => {
  const { data: blogs, error } = await supabase
    .from('blogs').select('id, title, excerpt, author_email, created_at')
    .order('created_at', { ascending: false })
  if (error) return res.status(500).json({ error: error.message })

  // like counts
  const { data: likes } = await supabase.from('blog_likes').select('blog_id')
  const counts = {}
  ;(likes || []).forEach((l) => { counts[l.blog_id] = (counts[l.blog_id] || 0) + 1 })

  // if logged in, mark which they liked
  let likedSet = new Set()
  const header = req.headers.authorization || ''
  if (header.startsWith('Bearer ')) {
    try {
      const { default: jwt } = await import('jsonwebtoken')
      const email = jwt.verify(header.slice(7), process.env.JWT_SECRET).email
      const { data: mine } = await supabase.from('blog_likes').select('blog_id').eq('user_email', email)
      likedSet = new Set((mine || []).map((m) => m.blog_id))
    } catch {}
  }

  res.json(blogs.map((b) => ({ ...b, likes: counts[b.id] || 0, liked: likedSet.has(b.id) })))
})

// single blog with full content + like info — public
router.get('/:id', async (req, res) => {
  const { data, error } = await supabase
    .from('blogs').select('*').eq('id', req.params.id).maybeSingle()
  if (error) return res.status(500).json({ error: error.message })
  if (!data) return res.status(404).json({ error: 'Not found' })

  const { count } = await supabase
    .from('blog_likes').select('*', { count: 'exact', head: true }).eq('blog_id', data.id)

  let liked = false
  const header = req.headers.authorization || ''
  if (header.startsWith('Bearer ')) {
    try {
      const { default: jwt } = await import('jsonwebtoken')
      const email = jwt.verify(header.slice(7), process.env.JWT_SECRET).email
      const { data: mine } = await supabase
        .from('blog_likes').select('id').eq('blog_id', data.id).eq('user_email', email).maybeSingle()
      liked = !!mine
    } catch {}
  }

  res.json({ ...data, likes: count || 0, liked })
})

// create — admin only
router.post('/', requireAuth, requireAdmin, async (req, res) => {
  const { title, content } = req.body
  if (!title || !content) return res.status(400).json({ error: 'Title and content required' })
  const { data, error } = await supabase
    .from('blogs')
    .insert({ title, content, excerpt: makeExcerpt(content), author_email: req.user.email })
    .select().single()
  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

// update — admin only
router.put('/:id', requireAuth, requireAdmin, async (req, res) => {
  const { title, content } = req.body
  const { data, error } = await supabase
    .from('blogs')
    .update({ title, content, excerpt: makeExcerpt(content), updated_at: new Date().toISOString() })
    .eq('id', req.params.id).select().single()
  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

// delete — admin only
router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  const { error } = await supabase.from('blogs').delete().eq('id', req.params.id)
  if (error) return res.status(500).json({ error: error.message })
  res.json({ ok: true })
})

// toggle like on a blog — logged in only
router.post('/:id/like', requireAuth, async (req, res) => {
  const blogId = Number(req.params.id)
  const email = req.user.email

  const { data: existing } = await supabase
    .from('blog_likes').select('id').eq('blog_id', blogId).eq('user_email', email).maybeSingle()

  if (existing) {
    await supabase.from('blog_likes').delete().eq('id', existing.id)
  } else {
    await supabase.from('blog_likes').insert({ blog_id: blogId, user_email: email })
  }

  const { count } = await supabase
    .from('blog_likes').select('*', { count: 'exact', head: true }).eq('blog_id', blogId)

  res.json({ liked: !existing, likes: count || 0 })
})

export default router