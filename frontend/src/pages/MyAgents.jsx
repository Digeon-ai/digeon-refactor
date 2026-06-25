import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../AuthContext.jsx'

const API = import.meta.env.VITE_API_URL

export default function MyAgents() {
  const { token } = useAuth()
  const navigate = useNavigate()
  const [agents, setAgents] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!token) { navigate('/login'); return }
    load()
  }, [token])

  function load() {
    setLoading(true)
    fetch(`${API}/api/my-agents`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => setAgents(Array.isArray(d) ? d : []))
      .catch(() => setAgents([]))
      .finally(() => setLoading(false))
  }

  function onRan(agentId, requestsLeft) {
    setAgents((prev) => prev.map((a) => (a.id === agentId ? { ...a, requests_left: requestsLeft } : a)))
  }

  function onDismiss(agentId) {
    setAgents((prev) => prev.filter((a) => a.id !== agentId))
  }

  if (loading) return <div className="text-gray-500 text-center py-20">Loading…</div>

  return (
    <main className="container mx-auto max-w-4xl px-6 py-8">
      <h1 className="text-3xl font-bold text-white mb-6">My Agents</h1>
      {agents.length === 0 ? (
        <div className="text-gray-500 text-center py-16">
          You don't own any agents yet. <Link to="/marketplace" className="text-brand">Browse the marketplace</Link>
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {agents.map((a) => <AgentRunner key={a.id} agent={a} token={token} onRan={onRan} onDismiss={onDismiss} />)}
        </div>
      )}
    </main>
  )
}

// read a File as a base64 string (without the data: prefix)
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result.split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function AgentRunner({ agent, token, onRan, onDismiss }) {
  const schema = agent.input_schema || []
  const [values, setValues] = useState({})   // label -> string (text/json) or File
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [running, setRunning] = useState(false)
  const out = agent.requests_left <= 0

  function setVal(label, val) { setValues((p) => ({ ...p, [label]: val })) }

  const isFileType = (t) => ['image', 'video', 'pdf', 'file'].includes(t)

  async function run() {
    setError(''); setResult(null)
    if (out) return

    // build params keyed by field label
    const params = {}
    try {
      for (const f of schema) {
        const v = values[f.label]
        if (f.type === 'json') {
          if (!v) throw new Error(`${f.label}: JSON required`)
          params[f.label] = JSON.parse(v) // validate JSON
        } else if (isFileType(f.type)) {
          if (!v) throw new Error(`${f.label}: file required`)
          params[f.label] = await fileToBase64(v) // base64 string
        } else {
          params[f.label] = v || ''
        }
      }
    } catch (e) {
      setError(e.message.includes('JSON') ? `Invalid JSON in a field.` : e.message)
      return
    }

    setRunning(true)
    try {
      const r = await fetch(`${API}/api/my-agents/${agent.id}/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ params }),
      })
      const data = await r.json()
      if (!r.ok) { setError(data.error || 'Run failed'); return }
      setResult(data.result)
      onRan(agent.id, data.requests_left)
    } catch { setError('Network error') } finally { setRunning(false) }
  }

  async function dismiss() {
    if (!confirm(`Remove "${agent.name}" permanently? You still have ${agent.requests_left} request${agent.requests_left === 1 ? '' : 's'} left, and this can't be undone.`)) return
    const r = await fetch(`${API}/api/my-agents/${agent.id}/dismiss`, {
      method: 'DELETE', headers: { Authorization: `Bearer ${token}` },
    })
    if (r.ok) onDismiss(agent.id)
    else alert('Could not remove agent')
  }

  const inputCls = "w-full bg-[#121823] border border-[#273141] rounded-lg px-3 py-2 text-textlight outline-none focus:border-brand"

  return (
    <div className="bg-surface/85 border border-[#273141] rounded-xl p-6">
      <div className="flex items-start justify-between gap-4 mb-1">
        <div>
          <h3 className="text-xl font-bold text-white">{agent.name}</h3>
          <p className="text-gray-400 text-sm">{agent.description}</p>
          {agent.deleted && <p className="text-[#e6b800] text-xs mt-1">This agent was removed by its developer — usable until your requests run out.</p>}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className={`text-sm font-semibold px-3 py-1 rounded-full ${out ? 'bg-[#3a1f24] text-[#e63946]' : 'bg-[#15333033] text-brand border border-brand'}`}>
            {agent.requests_left} left
          </span>
          {agent.deleted && (
            <button onClick={dismiss} title="Remove this agent permanently" className="bg-[#e63946] hover:brightness-110 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm font-bold">×</button>
          )}
        </div>
      </div>

      {/* dynamic input fields from schema */}
      <div className="flex flex-col gap-3 mt-4">
        {schema.map((f) => (
          <div key={f.label}>
            <label className="block text-sm text-gray-400 mb-1">{f.label} <span className="text-gray-600">({f.type})</span></label>
            {f.type === 'json' ? (
              <textarea disabled={out} value={values[f.label] || ''} onChange={(e) => setVal(f.label, e.target.value)} placeholder='{"key": "value"}' className={inputCls + ' min-h-[80px] font-mono text-sm'} />
            ) : isFileType(f.type) ? (
              <input disabled={out} type="file" onChange={(e) => setVal(f.label, e.target.files[0])} className={inputCls + ' file:mr-3 file:rounded file:border-0 file:bg-brand file:text-white file:px-3 file:py-1 file:text-sm'} />
            ) : (
              <textarea disabled={out} value={values[f.label] || ''} onChange={(e) => setVal(f.label, e.target.value)} placeholder={`Enter ${f.label}`} className={inputCls + ' min-h-[60px]'} />
            )}
          </div>
        ))}
      </div>

      {error && <p className="text-[#e63946] text-sm mt-3">{error}</p>}

      <div className="mt-4">
        {out ? (
          agent.deleted ? (
            <span className="text-gray-500 text-sm">Out of requests. This agent is no longer available.</span>
          ) : (
            <Link to="/marketplace" className="bg-brand hover:bg-[#138c86] text-white font-semibold rounded-lg px-5 py-2.5 text-sm transition">Out of requests — buy more</Link>
          )
        ) : (
          <button onClick={run} disabled={running} className="bg-[#0077cc] hover:brightness-110 text-white font-semibold rounded-lg px-5 py-2.5 text-sm transition disabled:opacity-60">
            {running ? 'Running…' : 'Send Request'}
          </button>
        )}
      </div>

      {result !== null && <OutputView result={result} outputType={agent.output_type} />}
    </div>
  )
}

// render the response according to the agent's declared output type
function OutputView({ result, outputType }) {
  // try to find a renderable string (URL or base64) for image/file outputs
  function extractPayload(r) {
    if (typeof r === 'string') return r
    if (r && typeof r === 'object') return r.output || r.url || r.image || r.file || r.data || null
    return null
  }

  let body
  if (outputType === 'image') {
    const p = extractPayload(result)
    body = p
      ? <img src={p.startsWith('http') || p.startsWith('data:') ? p : `data:image/*;base64,${p}`} alt="agent output" className="rounded-lg max-w-full max-h-96" />
      : <p className="text-gray-500 text-sm">No image found in the response.</p>
  } else if (outputType === 'file') {
    const p = extractPayload(result)
    body = p
      ? <a href={p.startsWith('http') || p.startsWith('data:') ? p : `data:application/octet-stream;base64,${p}`} download className="text-brand underline text-sm">Download file</a>
      : <p className="text-gray-500 text-sm">No file found in the response.</p>
  } else if (outputType === 'text') {
    const p = extractPayload(result)
    body = <p className="text-gray-300 text-sm whitespace-pre-wrap">{typeof p === 'string' ? p : JSON.stringify(result, null, 2)}</p>
  } else { // json
    body = <pre className="bg-[#0d1117] rounded-lg p-3 text-xs text-gray-300 overflow-auto max-h-80 whitespace-pre-wrap">{JSON.stringify(result, null, 2)}</pre>
  }

  return (
    <div className="mt-4 pt-4 border-t border-[#273141]">
      <p className="text-brand text-sm font-semibold mb-2">Response</p>
      {body}
    </div>
  )
}