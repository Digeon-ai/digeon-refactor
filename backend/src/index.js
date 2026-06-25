import express from 'express'
import cors from 'cors'
import 'dotenv/config'
import { supabase } from './supabase.js'
import authRoutes from './routes/auth.js'
import adminRoutes from './routes/admin.js'
import { requireAuth, requireAdmin } from './auth.js'
import jwt from 'jsonwebtoken'
import mediaRoutes from './routes/media.js'
import blogRoutes from './routes/blogs.js'
import newsletterRoutes from './routes/newsletters.js'
import commentRoutes from './routes/comments.js'
import contactRoutes from './routes/contact.js'
import marketplaceRoutes from './routes/marketplace.js'
import myAgentRoutes from './routes/myagents.js'
import developerRoutes from './routes/developer.js'

// in-memory cache for the directory tool list
let directoryCache = null
let directoryCachedAt = 0
const DIRECTORY_TTL = 60 * 1000 // 60 seconds

export function clearDirectoryCache() {
  directoryCache = null
  directoryCachedAt = 0
}

const app = express()
app.use(express.json({ limit: '25mb' }))
app.use(cors({ origin: process.env.FRONTEND_ORIGIN }))
app.use('/api/auth', authRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/media', mediaRoutes)
app.use('/api/blogs', blogRoutes)
app.use('/api/newsletters', newsletterRoutes)
app.use('/api/comments', commentRoutes)
app.use('/api/contact', contactRoutes)
app.use('/api/marketplace', marketplaceRoutes)
app.use('/api/my-agents', myAgentRoutes)
app.use('/api/developer', developerRoutes)


// health check
app.get('/', (req, res) => res.json({ ok: true }))

app.get('/api/directory', async (req, res) => {
  // serve the base tool list from cache if fresh
  const now = Date.now()
  if (!directoryCache || now - directoryCachedAt > DIRECTORY_TTL) {
    const { data, error } = await supabase.from('directory_view').select('*')
    if (error) return res.status(500).json({ error: error.message })
    directoryCache = data
    directoryCachedAt = now
  }

  // copy so we never mutate the cached objects with one user's ratings
  const rows = directoryCache.map((r) => ({ ...r, user: null }))

  // layer in this user's own ratings if logged in (not cached — per user)
  const header = req.headers.authorization || ''
  if (header.startsWith('Bearer ')) {
    try {
      const email = jwt.verify(header.slice(7), process.env.JWT_SECRET).email
      const { data: mine } = await supabase.from('ratings').select('tool_id, value').eq('user_email', email)
      const map = new Map((mine || []).map((r) => [r.tool_id, r.value]))
      rows.forEach((row) => { row.user = map.get(row.id) ?? null })
    } catch {}
  }

  res.json(rows)
})
//directory ratings
app.post('/api/tools/:id/rating', requireAuth, async (req, res) => {
  const toolId = Number(req.params.id)
  const { value } = req.body
  if (!value || value < 1 || value > 5) return res.status(400).json({ error: 'Invalid value' })

  // one rating per user per tool — update if it exists, else insert
  const { error } = await supabase
    .from('ratings')
    .upsert(
      { user_email: req.user.email, tool_id: toolId, value, updated_at: new Date().toISOString() },
      { onConflict: 'user_email,tool_id' }
    )
  if (error) return res.status(500).json({ error: error.message })

  // recompute summary for this tool
  const { data: rows } = await supabase.from('ratings').select('value').eq('tool_id', toolId)
  const count = rows.length
  const avg = count ? Math.round((rows.reduce((s, r) => s + r.value, 0) / count) * 100) / 100 : 0

  res.json({ avg, count, user: value })
})

// ---- Directory admin: manage tools ----

// categories for the add-tool dropdown
app.get('/api/directory/categories', requireAuth, requireAdmin, async (req, res) => {
  const { data, error } = await supabase.from('categories').select('id, name').order('name')
  if (error) return res.status(500).json({ error: error.message })
  res.json(data || [])
})

// all tools, newest first, for the management list
app.get('/api/directory/admin/tools', requireAuth, requireAdmin, async (req, res) => {
  const { data, error } = await supabase
    .from('tools')
    .select('id, name, description, pricing, link, category_id, categories(name)')
    .order('id', { ascending: false })
  if (error) return res.status(500).json({ error: error.message })
  const shaped = (data || []).map((t) => ({
    id: t.id, name: t.name, description: t.description,
    pricing: t.pricing, link: t.link,
    category_id: t.category_id,
    category: t.categories?.name || '(uncategorized)',
  }))
  res.json(shaped)
})

// add a tool — optionally creating a new category on the fly
app.post('/api/directory/admin/tools', requireAuth, requireAdmin, async (req, res) => {
  const { name, link, description, pricing, categoryId, newCategory } = req.body
  if (!name?.trim()) return res.status(400).json({ error: 'Name is required' })
  if (!link?.trim()) return res.status(400).json({ error: 'Link is required' })

  let catId = categoryId
  const newCat = (newCategory || '').trim()
  if (newCat) {
    // unique constraint on categories.name makes this safe to upsert
    const { data: cat, error: catErr } = await supabase
      .from('categories').upsert({ name: newCat }, { onConflict: 'name' })
      .select('id').single()
    if (catErr) return res.status(500).json({ error: catErr.message })
    catId = cat.id
  }
  if (!catId) return res.status(400).json({ error: 'Pick a category or add a new one' })

  const { error } = await supabase.from('tools').insert({
    name: name.trim(),
    link: link.trim(),
    description: (description || '').trim() || null,
    pricing: pricing || null,
    category_id: catId,
  })
  if (error) return res.status(500).json({ error: error.message })
  clearDirectoryCache()       // public Directory reflects it right away
  res.json({ ok: true })
})

// edit a tool — same shape as add, optionally creating a new category
app.put('/api/directory/admin/tools/:id', requireAuth, requireAdmin, async (req, res) => {
  const { name, link, description, pricing, categoryId, newCategory } = req.body
  if (!name?.trim()) return res.status(400).json({ error: 'Name is required' })
  if (!link?.trim()) return res.status(400).json({ error: 'Link is required' })

  let catId = categoryId
  const newCat = (newCategory || '').trim()
  if (newCat) {
    const { data: cat, error: catErr } = await supabase
      .from('categories').upsert({ name: newCat }, { onConflict: 'name' })
      .select('id').single()
    if (catErr) return res.status(500).json({ error: catErr.message })
    catId = cat.id
  }
  if (!catId) return res.status(400).json({ error: 'Pick a category or add a new one' })

  const { error } = await supabase.from('tools').update({
    name: name.trim(),
    link: link.trim(),
    description: (description || '').trim() || null,
    pricing: pricing || null,
    category_id: catId,
  }).eq('id', Number(req.params.id))
  if (error) return res.status(500).json({ error: error.message })
  clearDirectoryCache()
  res.json({ ok: true })
})

// delete a tool (ratings cascade-delete via FK)
app.delete('/api/directory/admin/tools/:id', requireAuth, requireAdmin, async (req, res) => {
  const { error } = await supabase.from('tools').delete().eq('id', Number(req.params.id))
  if (error) return res.status(500).json({ error: error.message })
  clearDirectoryCache()
  res.json({ ok: true })
})

const port = process.env.PORT || 8000
app.listen(port, () => console.log(`API running on http://localhost:${port}`))