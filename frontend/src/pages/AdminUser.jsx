import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../AuthContext.jsx'

const API = import.meta.env.VITE_API_URL

export default function AdminUser() {
  const { id } = useParams()
  const { user, token } = useAuth()
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const [deleting, setDeleting] = useState(false)


  // admin gate
  useEffect(() => {
    if (!user) { navigate('/login'); return }
    if (user.role !== 'admin') { navigate('/'); return }
  }, [user])

  useEffect(() => {
    fetch(`${API}/api/admin/users/${id}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(async (r) => { if (!r.ok) throw new Error((await r.json()).error || 'Failed to load'); return r.json() })
      .then(setData)
      .catch((e) => setErr(e.message))
      .finally(() => setLoading(false))
  }, [id])

  async function handleDelete() {
    const email = data?.user?.email || 'this user'
    if (!confirm(`Permanently delete ${email} and all their data? This cannot be undone.`)) return
    setDeleting(true)
    try {
      const r = await fetch(`${API}/api/admin/users/${id}`, {
        method: 'DELETE', headers: { Authorization: `Bearer ${token}` },
      })
      const d = await r.json()
      if (!r.ok) { alert(d.error || 'Could not delete'); setDeleting(false); return }
      navigate('/admin')
    } catch { alert('Network error'); setDeleting(false) }
  }

  if (!user || user.role !== 'admin') return null

  const wrap = (inner) => <main className="container mx-auto max-w-4xl px-6 py-8">{inner}</main>
  if (loading) return wrap(<div className="text-gray-500 text-center py-20">Loading…</div>)
  if (err) return wrap(<div className="text-[#e63946] text-center py-20">{err}</div>)

  const { user: u, uploads, purchases, comments } = data
  const name = [u.first_name, u.last_name].filter(Boolean).join(' ').trim()

  return wrap(
    <>
      <Link to="/admin" className="text-gray-400 text-sm hover:underline">← Back to Admin Portal</Link>

      <div className="flex items-center gap-3 mt-3 mb-1 flex-wrap">
        <h1 className="text-3xl font-bold text-brand">{name || '(no name)'}</h1>
        <span className={`text-xs px-2.5 py-1 rounded-full ${u.role === 'admin' ? 'bg-brand/20 text-brand' : 'bg-white/5 text-gray-400'}`}>{u.role}</span>
      </div>
        <p className="text-gray-400 mb-4">{u.email}</p>
        {u.id !== user.id && (
            <button
            onClick={handleDelete}
            disabled={deleting}
            className="bg-[#e63946] hover:brightness-110 text-white text-sm font-semibold rounded-lg px-4 py-2 transition disabled:opacity-60 mb-8"
            >
            {deleting ? 'Deleting…' : 'Delete Account'}
            </button>
        )}
      <Section title={`Uploaded Agents (${uploads.length})`}>
        {uploads.length === 0 ? <Empty>No agents uploaded.</Empty> : uploads.map((a) => (
          <Row key={a.id}>
            <div className="min-w-0">
              <span className="text-white font-semibold">{a.name}</span>
              <div className="text-xs text-gray-500 mt-0.5">
                {a.deleted ? 'deleted' : a.status} · ${Number(a.price).toFixed(2)} · {a.request_quota} requests
              </div>
            </div>
          </Row>
        ))}
      </Section>

      <Section title={`Purchased Agents (${purchases.length})`}>
        {purchases.length === 0 ? <Empty>No purchases.</Empty> : purchases.map((p, i) => (
          <Row key={i}>
            <span className="text-white font-semibold truncate">{p.name}</span>
            <span className="text-sm text-gray-300 flex-shrink-0">{p.requests_left} requests left</span>
          </Row>
        ))}
      </Section>

      <Section title={`Comments (${comments.length})`}>
        {comments.length === 0 ? <Empty>No comments.</Empty> : comments.map((c) => (
          <Row key={c.id}>
            <div className="min-w-0">
              <p className="text-gray-300 text-sm whitespace-pre-wrap break-words">{c.body}</p>
              <div className="text-xs text-gray-500 mt-1">
                on <span className="text-gray-400">{c.blog_title}</span>{c.is_reply ? ' · reply' : ''} · {new Date(c.created_at).toLocaleString()}
              </div>
            </div>
          </Row>
        ))}
      </Section>
    </>
  )
}

function Section({ title, children }) {
  return (
    <section className="mb-8">
      <h2 className="text-xl font-bold text-brand mb-3">{title}</h2>
      <div className="flex flex-col gap-2">{children}</div>
    </section>
  )
}
function Row({ children }) {
  return <div className="flex items-start justify-between gap-4 bg-surface/70 border border-[#273141] rounded-lg p-3">{children}</div>
}
function Empty({ children }) {
  return <div className="text-gray-500 text-sm">{children}</div>
}