import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../AuthContext.jsx'

const API = import.meta.env.VITE_API_URL

const INPUT_TYPES = ['text', 'json', 'image', 'video', 'pdf', 'file']
const OUTPUT_TYPES = ['text', 'json', 'image', 'file']

export default function RegisterAgent() {
  const { token } = useAuth()
  const navigate = useNavigate()

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [fields, setFields] = useState([{ label: '', type: 'text' }])
  const [outputType, setOutputType] = useState('text')
  const [price, setPrice] = useState('')
  const [requestQuota, setRequestQuota] = useState('')
  const [endpointUrl, setEndpointUrl] = useState('')

  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  function updateField(i, key, val) {
    setFields((prev) => prev.map((f, idx) => (idx === i ? { ...f, [key]: val } : f)))
  }
  function addField() { setFields((prev) => [...prev, { label: '', type: 'text' }]) }
  function removeField(i) { setFields((prev) => prev.filter((_, idx) => idx !== i)) }

  async function submit() {
    setError('')
    // client-side checks (server re-validates)
    if (!name.trim() || !description.trim() || !endpointUrl.trim()) { setError('All fields are required.'); return }
    if (fields.length === 0 || fields.some((f) => !f.label.trim())) { setError('Every input field needs a label.'); return }
    if (Number(requestQuota) < 5 || !requestQuota) { setError('Requests must be at least 5.'); return }
    if (price === '' || Number(price) < 0) { setError('Enter a price (0 for free).'); return }

    setSubmitting(true)
    try {
      const r = await fetch(`${API}/api/developer/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name, description, inputSchema: fields, outputType,
          price: Number(price), requestQuota: Number(requestQuota), endpointUrl,
        }),
      })
      const data = await r.json()
      if (!r.ok) { setError(data.error || 'Registration failed'); return }
      navigate('/developer')
    } catch { setError('Network error') } finally { setSubmitting(false) }
  }

  const label = "block text-sm font-semibold text-gray-300 mb-1.5"
  const input = "w-full bg-[#121823] border border-[#273141] rounded-lg px-3.5 py-2.5 text-textlight outline-none focus:border-brand transition"

  return (
    <main className="container mx-auto max-w-2xl px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-white">Register Your Agent</h1>
        <Link to="/developer" className="text-gray-400 text-sm hover:text-white">← Back</Link>
      </div>

      <div className="bg-surface/60 border border-[#273141] rounded-2xl p-7 flex flex-col gap-5">
        <div>
          <label className={label}>Agent name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. VoiceGen Pro" className={input} />
        </div>

        <div>
          <label className={label}>Description</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What does your agent do?" className={input + ' min-h-[90px]'} />
        </div>

        {/* dynamic input fields */}
        <div>
          <label className={label}>Input fields — what your agent expects</label>
          <div className="flex flex-col gap-3">
            {fields.map((f, i) => (
              <div key={i} className="flex gap-2 items-center">
                <input
                  value={f.label}
                  onChange={(e) => updateField(i, 'label', e.target.value)}
                  placeholder="Field label (e.g. Job description)"
                  className={input}
                  style={{ flex: '1 1 0%', minWidth: 0 }}
                />
                <select value={f.type} onChange={(e) => updateField(i, 'type', e.target.value)} className={input} style={{ width: '120px', flexShrink: 0 }}>
                  {INPUT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
                {fields.length > 1 && (
                  <button onClick={() => removeField(i)} className="bg-[#e63946] text-white rounded-lg w-9 h-9 flex-shrink-0 flex items-center justify-center hover:brightness-110">×</button>
                )}
              </div>
            ))}
          </div>
          <button onClick={addField} className="mt-3 w-full border border-brand text-brand hover:bg-brand hover:text-white rounded-lg py-2.5 text-sm font-semibold transition">
            + Add Field
          </button>
        </div>

        <div>
          <label className={label}>Output type — what your agent returns</label>
          <select value={outputType} onChange={(e) => setOutputType(e.target.value)} className={input}>
            {OUTPUT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        <div className="flex gap-4">
          <div className="flex-1">
            <label className={label}>Price (USD)</label>
            <input type="number" min="0" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0.00" className={input} />
          </div>
          <div className="flex-1">
            <label className={label}>Requests per purchase (min 5)</label>
            <input type="number" min="5" value={requestQuota} onChange={(e) => setRequestQuota(e.target.value)} placeholder="20" className={input} />
          </div>
        </div>

        <div>
          <label className={label}>API endpoint</label>
          <input value={endpointUrl} onChange={(e) => setEndpointUrl(e.target.value)} placeholder="https://api.example.com/endpoint" className={input} />
          <p className="text-gray-500 text-xs mt-1.5">We'll send a test request to verify it's reachable before submitting.</p>
        </div>

        {error && <p className="text-[#e63946] text-sm">{error}</p>}

        <button onClick={submit} disabled={submitting} className="bg-brand hover:bg-[#138c86] text-white font-bold rounded-lg py-3.5 transition disabled:opacity-60">
          {submitting ? 'Verifying endpoint…' : 'Submit Agent'}
        </button>
        <p className="text-gray-500 text-xs text-center">Submitted agents are reviewed by an admin before going live on the marketplace.</p>
      </div>
    </main>
  )
}