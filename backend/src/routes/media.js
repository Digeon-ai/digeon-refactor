import express from 'express'
import multer from 'multer'
import { supabase } from '../supabase.js'
import { requireAuth, requireAdmin } from '../auth.js'

const router = express.Router()
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } })

// admin uploads an image or video → returns its public URL
router.post('/upload', requireAuth, requireAdmin, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file' })

  const ext = (req.file.originalname.split('.').pop() || 'bin').toLowerCase()
  const name = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

  const { error } = await supabase.storage
    .from('blog-media')
    .upload(name, req.file.buffer, { contentType: req.file.mimetype, upsert: false })
  if (error) return res.status(500).json({ error: error.message })

  const { data } = supabase.storage.from('blog-media').getPublicUrl(name)
  res.json({ url: data.publicUrl })
})

export default router