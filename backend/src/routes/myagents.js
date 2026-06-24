import express from 'express'
import { supabase } from '../supabase.js'
import { requireAuth } from '../auth.js'

const router = express.Router()

// agents this user owns, with schema for rendering — URL never included
router.get('/', requireAuth, async (req, res) => {
  const { data, error } = await supabase
    .from('user_agents')
    .select('requests_left, agents(id, name, description, input_schema, output_type, deleted)')
    .eq('user_id', req.user.id)
    .order('updated_at', { ascending: false })
  if (error) return res.status(500).json({ error: error.message })

  const rows = data || []

  // safety cleanup: any owned agent that is deleted AND depleted → remove the row, hide it
  const toRemove = rows.filter((r) => r.agents?.deleted && r.requests_left <= 0)
  if (toRemove.length) {
    await supabase.from('user_agents').delete()
      .eq('user_id', req.user.id)
      .in('agent_id', toRemove.map((r) => r.agents.id))
  }

  const shaped = rows
    .filter((r) => !(r.agents?.deleted && r.requests_left <= 0))
    .map((r) => ({
      id: r.agents.id,
      name: r.agents.name,
      description: r.agents.description,
      input_schema: r.agents.input_schema || [],
      output_type: r.agents.output_type || 'text',
      deleted: r.agents.deleted,
      requests_left: r.requests_left,
    }))
  res.json(shaped)
})

// run an agent: backend proxies the call, decrements quota on success only
router.post('/:agentId/run', requireAuth, async (req, res) => {
  const agentId = Number(req.params.agentId)
  const { params } = req.body // object keyed by field label; files are base64 strings

  // 1) verify ownership + remaining quota
  const { data: owned } = await supabase
    .from('user_agents').select('id, requests_left')
    .eq('user_id', req.user.id).eq('agent_id', agentId).maybeSingle()
  if (!owned) return res.status(403).json({ error: 'You do not own this agent' })
  if (owned.requests_left <= 0) return res.status(402).json({ error: 'No requests left.' })

  // 2) fetch endpoint + deleted flag — server-side only, URL never sent to client
  const { data: agent } = await supabase
    .from('agents').select('endpoint_url, deleted').eq('id', agentId).maybeSingle()
  if (!agent?.endpoint_url) return res.status(500).json({ error: 'Agent endpoint not configured' })

  // 3) call the external API from the backend (single JSON POST; files are base64 in params)
  let apiResponse
  try {
    const r = await fetch(agent.endpoint_url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params || {}),
    })
    if (!r.ok) throw new Error(`Agent API returned ${r.status}`)
    apiResponse = await r.json()
  } catch (e) {
    return res.status(502).json({ error: 'Agent failed to respond: ' + e.message }) // no decrement
  }

  // 4) success → decrement (do NOT delete here, even at 0 — the user needs to see this response)
  const newLeft = owned.requests_left - 1
  await supabase.from('user_agents')
    .update({ requests_left: newLeft, updated_at: new Date().toISOString() })
    .eq('id', owned.id)

  res.json({ result: apiResponse, requests_left: newLeft })
})

// user dismisses a depleted, developer-deleted agent — removes it for good
router.delete('/:agentId/dismiss', requireAuth, async (req, res) => {
  const agentId = Number(req.params.agentId)
  const { data: owned } = await supabase
    .from('user_agents').select('id, requests_left, agents(deleted)')
    .eq('user_id', req.user.id).eq('agent_id', agentId).maybeSingle()
  if (!owned) return res.status(404).json({ error: 'Not found' })
  // only allow dismissing if it's actually depleted and deleted
  if (!(owned.agents?.deleted && owned.requests_left <= 0)) {
    return res.status(400).json({ error: 'Agent is still active' })
  }
  await supabase.from('user_agents').delete().eq('id', owned.id)
  res.json({ ok: true })
})

export default router