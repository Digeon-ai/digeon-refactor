import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../AuthContext.jsx'

const API = import.meta.env.VITE_API_URL

export default function DeveloperPortal() {
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
    fetch(`${API}/api/developer/my-uploads`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => setAgents(Array.isArray(d) ? d : []))
      .catch(() => setAgents([]))
      .finally(() => setLoading(false))
  }

  async function remove(id) {
    if (!confirm('Delete this agent? It will be removed from the marketplace. Existing buyers keep access until their requests run out.')) return
    const r = await fetch(`${API}/api/developer/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
    if (r.ok) load()
    else alert('Could not delete')
  }

  function StatusBadge({ status, deleted }) {
    if (deleted) return <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[#3a1f24] text-[#e63946]">Deleted</span>
    if (status === 'pending') return <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[#3a341f] text-[#e6b800]">Pending review</span>
    return <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[#15333033] text-brand border border-brand">Live</span>
  }

  if (loading) return <div className="text-gray-500 text-center py-20">Loading…</div>

  return (
    <main className="container mx-auto max-w-4xl px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-white">Developer Portal</h1>
        <Link to="/developer/register" className="bg-brand hover:bg-[#138c86] text-white font-semibold rounded-lg px-5 py-2.5 transition">
          Upload Your Agent
        </Link>
      </div>

      {agents.length === 0 ? (
        <div className="text-gray-500 text-center py-16">
          You haven't uploaded any agents yet. <Link to="/developer/register" className="text-brand">Upload your first agent</Link>
        </div>
      ) : (
        <div className="grid gap-5" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}>
          {agents.map((a) => (
            <div key={a.id} className="bg-surface/85 border border-[#273141] rounded-xl p-6 flex flex-col">
              <div className="flex items-start justify-between gap-3 mb-2">
                <h3 className="text-xl font-bold text-white">{a.name}</h3>
                <StatusBadge status={a.status} deleted={a.deleted} />
              </div>
              <p className="text-gray-400 text-sm mb-4 flex-1">{a.description}</p>
              <div className="text-sm text-gray-300 mb-1">Type: <span className="text-brand">{a.type}</span></div>
              <div className="text-sm text-gray-300 mb-1">{a.request_quota} requests · ${Number(a.price).toFixed(2)}</div>
              <div className="text-sm text-gray-300 mb-4">Output: {a.output_type}</div>
              {!a.deleted && (
                <button onClick={() => remove(a.id)} className="bg-[#e63946] hover:brightness-110 text-white text-sm font-semibold rounded-lg py-2.5 transition">
                  Delete Agent
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </main>
  )
}