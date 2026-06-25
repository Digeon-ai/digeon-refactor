import express from 'express'
import { supabase } from '../supabase.js'
import { requireAuth } from '../auth.js'
import dns from 'node:dns/promises'
import net from 'node:net'


// ---- SSRF guard: only https, and never an internal/private address ----
function ipIsPrivate(ip) {
  if (net.isIPv6(ip)) {
    const lo = ip.toLowerCase()
    if (lo === '::1' || lo.startsWith('fe80') || lo.startsWith('fc') || lo.startsWith('fd')) return true
    const m = lo.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/)
    return m ? ipIsPrivate(m[1]) : false
  }
  const p = ip.split('.').map(Number)
  if (p.length !== 4 || p.some(Number.isNaN)) return true
  const [a, b] = p
  if (a === 127 || a === 10 || a === 0 || a >= 224) return true
  if (a === 172 && b >= 16 && b <= 31) return true
  if (a === 192 && b === 168) return true
  if (a === 169 && b === 254) return true   // cloud metadata / link-local
  return false
}

async function assertSafeUrl(raw) {
  let u
  try { u = new URL(raw) } catch { throw new Error('Invalid endpoint URL') }
  if (u.protocol !== 'https:') throw new Error('Endpoint must use https')
  let addrs
  try { addrs = await dns.lookup(u.hostname, { all: true }) }
  catch { throw new Error('Could not resolve endpoint host') }
  for (const { address } of addrs) {
    if (ipIsPrivate(address)) throw new Error('Endpoint resolves to a disallowed address')
  }
}

// {Label} in a URL → URL-encoded value
function buildUrl(urlTemplate, params) {
  return urlTemplate.replace(/\{([^{}]+)\}/g, (_, raw) => {
    const v = params?.[raw.trim()]
    return encodeURIComponent(v == null ? '' : (typeof v === 'string' ? v : JSON.stringify(v)))
  })
}

// {Label} in a JSON body → JSON-encoded value (handles quotes/newlines safely).
// NOTE: write placeholders WITHOUT surrounding quotes, e.g. {"prompt": {Prompt}}
function buildBody(template, params) {
  return template.replace(/\{([^{}]+)\}/g, (_, raw) => JSON.stringify(params?.[raw.trim()] ?? null))
}

function getByPath(obj, path) {
  return path.split('.').reduce((acc, k) => (acc == null ? acc : acc[k]), obj)
}

// pull the meaningful text out of an arbitrary JSON response
function extractText(obj, responsePath) {
  if (responsePath) {
    const v = getByPath(obj, responsePath)
    if (v != null) return typeof v === 'string' ? v : JSON.stringify(v)
  }
  let best = ''
  const seen = new Set()
  ;(function walk(n) {
    if (n == null) return
    if (typeof n === 'string') { if (n.length > best.length) best = n; return }
    if (Array.isArray(n)) return n.forEach(walk)
    if (typeof n === 'object') {
      if (seen.has(n)) return
      seen.add(n)
      Object.values(n).forEach(walk)
    }
  })(obj)
  return best || JSON.stringify(obj)
}

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

  // 1) ownership + quota
  const { data: owned } = await supabase
    .from('user_agents').select('id, requests_left')
    .eq('user_id', req.user.id).eq('agent_id', agentId).maybeSingle()
  if (!owned) return res.status(403).json({ error: 'You do not own this agent' })
  if (owned.requests_left <= 0) return res.status(402).json({ error: 'No requests left.' })

  // 2) agent config — server-side only
  const { data: agent } = await supabase
    .from('agents')
    .select('endpoint_url, output_type, http_method, body_template, request_headers, response_path')
    .eq('id', agentId).maybeSingle()
  if (!agent?.endpoint_url) return res.status(500).json({ error: 'Agent endpoint not configured' })

  const method = (agent.http_method || 'POST').toUpperCase()
  const outputType = agent.output_type || 'text'

  // 3) build + send the request
  let apiResponse
  try {
    const url = buildUrl(agent.endpoint_url, params)
    await assertSafeUrl(url) // SSRF guard

    const headers = { ...(agent.request_headers || {}) }
    const init = { method, headers }

    if (method !== 'GET' && method !== 'HEAD') {
      // templated body if provided, else legacy: raw params as JSON
      if (agent.body_template) {
        init.body = buildBody(agent.body_template, params)
      } else {
        init.body = JSON.stringify(params || {})
      }
      if (!Object.keys(headers).some((h) => h.toLowerCase() === 'content-type')) {
        headers['Content-Type'] = 'application/json'
      }
    }

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 30000)
    init.signal = controller.signal
    const r = await fetch(url, init)
    clearTimeout(timeout)
    if (!r.ok) throw new Error(`Agent API returned ${r.status}`)

    const ct = (r.headers.get('content-type') || '').toLowerCase()

    if (outputType === 'image' || outputType === 'file') {
      if (ct.includes('application/json')) {
        apiResponse = JSON.parse(await r.text())          // API returned a JSON wrapper (e.g. a URL)
      } else {
        const buf = Buffer.from(await r.arrayBuffer())
        apiResponse = { mime: ct.split(';')[0] || 'application/octet-stream', data: buf.toString('base64') }
      }
    } else if (outputType === 'json') {
      const t = await r.text()
      apiResponse = ct.includes('application/json') ? JSON.parse(t) : t
    } else { // text
      const t = await r.text()
      if (ct.includes('application/json')) {
        let parsed = null
        try { parsed = JSON.parse(t) } catch {}
        apiResponse = parsed == null ? t : extractText(parsed, agent.response_path)
      } else {
        apiResponse = t
      }
    }
  } catch (e) {
    return res.status(502).json({ error: 'Agent failed to respond: ' + e.message }) // no decrement
  }

  // 4) success → decrement
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
  // allow dismissing any developer-deleted agent, even with requests left —
  // the endpoint may be dead, so it would otherwise sit there forever
  if (!owned.agents?.deleted) {
    return res.status(400).json({ error: 'Agent is still active' })
  }
  await supabase.from('user_agents').delete().eq('id', owned.id)
  res.json({ ok: true })
})

export default router