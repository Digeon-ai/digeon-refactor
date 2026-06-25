import express from 'express'
import { supabase } from '../supabase.js'
import { requireAuth } from '../auth.js'

const router = express.Router()

const SAFE_DEV_COLS = 'id, name, description, type, price, request_quota, output_type, input_schema, status, deleted, created_at'

// agents this developer uploaded. deleted ones stay listed only while buyers still hold requests.
router.get('/my-uploads', requireAuth, async (req, res) => {
  const { data, error } = await supabase
    .from('agents').select(SAFE_DEV_COLS)
    .eq('developer_id', req.user.id).order('created_at', { ascending: false })
  if (error) return res.status(500).json({ error: error.message })

  const agents = data || []

  // for deleted agents, check if any buyer still has requests left; if none, hide it
  const deletedIds = agents.filter((a) => a.deleted).map((a) => a.id)
  let activeBuyerSet = new Set()
  if (deletedIds.length) {
    const { data: stillOwned } = await supabase
      .from('user_agents').select('agent_id')
      .in('agent_id', deletedIds).gt('requests_left', 0)
    activeBuyerSet = new Set((stillOwned || []).map((r) => r.agent_id))
  }

  // keep: all non-deleted agents, plus deleted agents that still have active buyers
  const visible = agents.filter((a) => !a.deleted || activeBuyerSet.has(a.id))
  res.json(visible)
})

// health-check an endpoint: alive = reachable and not a 5xx/connection failure
async function endpointIsAlive(url) {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 8000) // 8s timeout
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ _digeon_healthcheck: true }),
      signal: controller.signal,
    })
    clearTimeout(timeout)
    // any response that isn't a server error proves it's alive (400 = validated our dummy input, still alive)
    return r.status < 500
  } catch {
    return false // timeout, DNS fail, connection refused
  }
}

// register a new agent — runs health-check, then stores as 'pending'
router.post('/register', requireAuth, async (req, res) => {
  const { name, description, type, inputSchema, outputType, price, requestQuota, endpointUrl, httpMethod, bodyTemplate, requestHeaders, responsePath } = req.body

  // validation — all mandatory, requests >= 5
  if (!name?.trim() || !description?.trim() || !endpointUrl?.trim() || !outputType?.trim()) {
    return res.status(400).json({ error: 'All fields are required.' })
  }

  if (!Array.isArray(inputSchema) || inputSchema.length === 0) {
    return res.status(400).json({ error: 'Define at least one input field.' })
  }
  for (const f of inputSchema) {
    if (!f.label?.trim() || !f.type?.trim()) return res.status(400).json({ error: 'Every input field needs a label and type.' })
  }
  const priceNum = Number(price)
  const quotaNum = Number(requestQuota)
  if (Number.isNaN(priceNum) || priceNum < 0) return res.status(400).json({ error: 'Price must be 0 or more.' })
  if (Number.isNaN(quotaNum) || quotaNum < 5) return res.status(400).json({ error: 'Requests must be at least 5.' })

  // health-check the endpoint BEFORE accepting
  const alive = await endpointIsAlive(endpointUrl.trim())
  if (!alive) return res.status(400).json({ error: 'Endpoint did not respond. Make sure it is publicly reachable and handles POST requests.' })

  const { error } = await supabase.from('agents').insert({
    name: name.trim(), description: description.trim(), type: "Agent",
    input_schema: inputSchema, output_type: outputType.trim(),
    price: priceNum, request_quota: quotaNum, endpoint_url: endpointUrl.trim(),
    developer_id: req.user.id, status: 'pending',
    http_method: (httpMethod || 'POST').toUpperCase(),
    body_template: bodyTemplate || null,
    request_headers: requestHeaders || {},
    response_path: responsePath || null,
  })
  
  if (error) return res.status(500).json({ error: error.message })
  res.json({ ok: true })
})

// developer "deletes" their own agent — soft-delete so existing buyers keep access until depleted
router.delete('/:id', requireAuth, async (req, res) => {
  const agentId = Number(req.params.id)
  const { data: agent } = await supabase.from('agents').select('developer_id').eq('id', agentId).maybeSingle()
  if (!agent) return res.status(404).json({ error: 'Not found' })
  if (agent.developer_id !== req.user.id) return res.status(403).json({ error: 'Not your agent' })

  // soft-delete: hides from marketplace, but row stays so existing buyers can still run it
  // until their requests deplete (run-proxy removes their user_agents row at 0 — round 2)
  await supabase.from('agents').update({ deleted: true }).eq('id', agentId)
  res.json({ ok: true })
})

export default router