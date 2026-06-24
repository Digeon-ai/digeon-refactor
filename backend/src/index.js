import express from 'express'
import cors from 'cors'
import 'dotenv/config'
import { supabase } from './supabase.js'
import authRoutes from './routes/auth.js'
import adminRoutes from './routes/admin.js'
import { requireAuth } from './auth.js'
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

const port = process.env.PORT || 8000
app.listen(port, () => console.log(`API running on http://localhost:${port}`))