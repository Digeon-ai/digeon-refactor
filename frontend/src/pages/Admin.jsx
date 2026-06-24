import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../AuthContext.jsx'
import RichEditor from '../components/RichEditor.jsx'

const API = import.meta.env.VITE_API_URL

const VIEWS = [
  { id: 'create-blog', label: 'Create Blog' },
  { id: 'manage-blogs', label: 'Manage Blogs' },
  { id: 'moderate', label: 'Moderate Comments' },
  { id: 'create-newsletter', label: 'Create Newsletter' },
  { id: 'past-newsletters', label: 'Past Newsletters' },
  { id: 'approve-agents', label: 'Approve Agents' },
]

export default function Admin() {
  const { user, token } = useAuth()
  const navigate = useNavigate()
  const [view, setView] = useState('create-blog')

  // gate: admins only
  useEffect(() => {
    if (!user) { navigate('/login'); return }
    if (user.role !== 'admin') { navigate('/'); return }
  }, [user])

  if (!user || user.role !== 'admin') return null

  return (
    <main className="container mx-auto max-w-5xl px-6 py-8">
      {/* header + toggle */}
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <h1 className="text-3xl font-bold text-brand">Admin Portal</h1>
        <div className="flex flex-wrap gap-1.5 bg-surface/70 border border-[#273141] rounded-xl p-1.5">
          {VIEWS.map((v) => (
            <button
              key={v.id}
              onClick={() => setView(v.id)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
                view === v.id ? 'bg-brand text-white' : 'text-gray-300 hover:text-white hover:bg-white/5'
              }`}
            >
              {v.label}
            </button>
          ))}
        </div>
      </div>

      {view === 'create-blog' && <CreateBlog token={token} />}
      {view === 'manage-blogs' && <ManageBlogs token={token} />}
      {view === 'create-newsletter' && <CreateNewsletter token={token} />}
      {view === 'past-newsletters' && <PastNewsletters token={token} />}
      {view === 'moderate' && <Moderate token={token} />}
      {view === 'approve-agents' && <ApproveAgents token={token} />}
    </main>
  )
}

function Stub({ label }) {
  return <div className="text-gray-500 text-center py-20">{label}</div>
}

function CreateBlog({ token }) {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [msg, setMsg] = useState('')
  const [saving, setSaving] = useState(false)

  async function publish() {
    setMsg('')
    if (!title.trim() || !content.trim() || content === '<p></p>') {
      setMsg('Title and content are required'); return
    }
    setSaving(true)
    try {
      const r = await fetch(`${API}/api/blogs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title, content }),
      })
      const data = await r.json()
      if (!r.ok) { setMsg(data.error || 'Could not publish'); return }
      setMsg('Published!')
      setTitle(''); setContent('')
    } catch { setMsg('Network error') } finally { setSaving(false) }
  }

  return (
    <div className="flex flex-col gap-4">
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Blog title"
        className="bg-[#121823] border border-[#273141] rounded-lg px-4 py-3 text-lg text-[#e6edf3] outline-none focus:border-brand"
      />
      <RichEditor value={content} onChange={setContent} />
      {msg && <p className={msg === 'Published!' ? 'text-brand' : 'text-[#e63946]'}>{msg}</p>}
      <div>
        <button
          onClick={publish}
          disabled={saving}
          className="bg-[#0077cc] hover:brightness-110 text-white font-bold rounded-lg px-6 py-3 transition disabled:opacity-60"
        >
          {saving ? 'Publishing…' : 'Publish Blog'}
        </button>
      </div>
    </div>
  )
}

function ManageBlogs({ token }) {
  const [blogs, setBlogs] = useState([])
  const [editing, setEditing] = useState(null) // null = list view; object = editing
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    try {
      const r = await fetch(`${API}/api/blogs`)
      setBlogs(await r.json())
    } catch { setBlogs([]) } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  async function startEdit(id) {
    // fetch full content for this blog
    const r = await fetch(`${API}/api/blogs/${id}`)
    const data = await r.json()
    setEditing(data)
  }

  async function remove(id) {
    if (!confirm('Delete this blog permanently?')) return
    const r = await fetch(`${API}/api/blogs/${id}`, {
      method: 'DELETE', headers: { Authorization: `Bearer ${token}` },
    })
    if (r.ok) load()
    else alert('Could not delete')
  }

  if (editing) {
    return <EditBlog blog={editing} token={token} onDone={() => { setEditing(null); load() }} />
  }

  if (loading) return <div className="text-gray-500 text-center py-12">Loading…</div>

  return (
    <div className="flex flex-col gap-3">
      {blogs.length === 0 && <div className="text-gray-500 text-center py-12">No blogs yet.</div>}
      {blogs.map((b) => (
        <div key={b.id} className="flex items-center justify-between gap-4 bg-surface/85 border border-[#273141] rounded-lg p-4">
          <div className="min-w-0">
            <h3 className="text-white font-semibold truncate">{b.title}</h3>
            <p className="text-gray-400 text-sm truncate">{b.excerpt}</p>
            <p className="text-gray-600 text-xs mt-1">{new Date(b.created_at).toLocaleString()}</p>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <button onClick={() => startEdit(b.id)} className="bg-[#0077cc] hover:brightness-110 text-white text-sm font-semibold rounded-lg px-4 py-2 transition">Edit</button>
            <button onClick={() => remove(b.id)} className="bg-[#e63946] hover:brightness-110 text-white text-sm font-semibold rounded-lg px-4 py-2 transition">Delete</button>
          </div>
        </div>
      ))}
    </div>
  )
}

function EditBlog({ blog, token, onDone }) {
  const [title, setTitle] = useState(blog.title)
  const [content, setContent] = useState(blog.content)
  const [msg, setMsg] = useState('')
  const [saving, setSaving] = useState(false)

  async function save() {
    setMsg('')
    if (!title.trim() || !content.trim() || content === '<p></p>') { setMsg('Title and content are required'); return }
    setSaving(true)
    try {
      const r = await fetch(`${API}/api/blogs/${blog.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title, content }),
      })
      if (!r.ok) { const d = await r.json(); setMsg(d.error || 'Could not save'); return }
      onDone()
    } catch { setMsg('Network error') } finally { setSaving(false) }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-brand">Editing: {blog.title}</h2>
        <button onClick={onDone} className="text-gray-400 text-sm hover:underline">← Back to list</button>
      </div>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Blog title"
        className="bg-[#121823] border border-[#273141] rounded-lg px-4 py-3 text-lg text-[#e6edf3] outline-none focus:border-brand"
      />
      <RichEditor value={content} onChange={setContent} />
      {msg && <p className="text-[#e63946]">{msg}</p>}
      <div className="flex gap-3">
        <button onClick={save} disabled={saving} className="bg-[#0077cc] hover:brightness-110 text-white font-bold rounded-lg px-6 py-3 transition disabled:opacity-60">
          {saving ? 'Saving…' : 'Save changes'}
        </button>
        <button onClick={onDone} className="text-gray-400 hover:underline">Cancel</button>
      </div>
    </div>
  )
}

function CreateNewsletter({ token }) {
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [msg, setMsg] = useState('')
  const [sending, setSending] = useState(false)

  async function send() {
    setMsg('')
    if (!subject.trim() || !body.trim() || body === '<p></p>') { setMsg('Subject and body are required'); return }
    if (!confirm('Send this newsletter to all subscribers? This cannot be undone.')) return
    setSending(true)
    try {
      const r = await fetch(`${API}/api/newsletters/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ subject, body }),
      })
      const data = await r.json()
      if (!r.ok) { setMsg(data.error || 'Could not send'); return }
      setMsg(`Sent to ${data.sent} subscriber${data.sent !== 1 ? 's' : ''}.`)
      setSubject(''); setBody('')
    } catch { setMsg('Network error') } finally { setSending(false) }
  }

  return (
    <div className="flex flex-col gap-4">
      <input
        value={subject}
        onChange={(e) => setSubject(e.target.value)}
        placeholder="Newsletter subject"
        className="bg-[#121823] border border-[#273141] rounded-lg px-4 py-3 text-lg text-[#e6edf3] outline-none focus:border-brand"
      />
      <RichEditor value={body} onChange={setBody} />
      {msg && <p className={msg.startsWith('Sent') ? 'text-brand' : 'text-[#e63946]'}>{msg}</p>}
      <div>
        <button onClick={send} disabled={sending} className="bg-[#0077cc] hover:brightness-110 text-white font-bold rounded-lg px-6 py-3 transition disabled:opacity-60">
          {sending ? 'Sending…' : 'Send Newsletter'}
        </button>
      </div>
    </div>
  )
}

function PastNewsletters({ token }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(null)

  useEffect(() => {
    fetch(`${API}/api/newsletters`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => setItems(Array.isArray(d) ? d : []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="text-gray-500 text-center py-12">Loading…</div>
  if (!items.length) return <div className="text-gray-500 text-center py-12">No newsletters sent yet.</div>

  return (
    <div className="flex flex-col gap-3">
      {items.map((n) => (
        <div key={n.id} className="bg-surface/85 border border-[#273141] rounded-lg p-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="text-white font-semibold">{n.subject}</h3>
              <p className="text-gray-600 text-xs mt-1">
                {new Date(n.sent_at).toLocaleString()} · {n.recipient_count} recipient{n.recipient_count !== 1 ? 's' : ''}
              </p>
            </div>
            <button onClick={() => setOpen(open === n.id ? null : n.id)} className="text-brand text-sm hover:underline flex-shrink-0">
              {open === n.id ? 'Hide' : 'View'}
            </button>
          </div>
          {open === n.id && (
            <div className="prose prose-invert max-w-none mt-4 pt-4 border-t border-[#273141]" dangerouslySetInnerHTML={{ __html: n.body }} />
          )}
        </div>
      ))}
    </div>
  )
}

function Moderate({ token }) {
  const [comments, setComments] = useState([])
  const [loading, setLoading] = useState(true)

  function load() {
    setLoading(true)
    fetch(`${API}/api/comments/admin/all`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => setComments(Array.isArray(d) ? d : []))
      .catch(() => setComments([]))
      .finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  async function remove(id) {
    if (!confirm('Delete this comment permanently?')) return
    const r = await fetch(`${API}/api/comments/${id}`, {
      method: 'DELETE', headers: { Authorization: `Bearer ${token}` },
    })
    if (r.ok) load()
    else alert('Could not delete')
  }

  if (loading) return <div className="text-gray-500 text-center py-12">Loading…</div>
  if (!comments.length) return <div className="text-gray-500 text-center py-12">No comments yet.</div>

  // group by blog
  const byBlog = {}
  comments.forEach((c) => { (byBlog[c.blog_title] ||= []).push(c) })

  return (
    <div className="flex flex-col gap-6">
      {Object.entries(byBlog).map(([title, list]) => (
        <div key={title}>
          <h3 className="text-brand font-bold mb-2">{title}</h3>
          <div className="flex flex-col gap-2">
            {list.map((c) => (
              <div key={c.id} className="flex items-start justify-between gap-4 bg-surface/70 border border-[#273141] rounded-lg p-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-white text-sm font-semibold">{c.author}</span>
                    {c.is_reply && <span className="text-gray-500 text-xs">(reply)</span>}
                    <span className="text-gray-600 text-xs">{new Date(c.created_at).toLocaleString()}</span>
                  </div>
                  <p className="text-gray-300 text-sm whitespace-pre-wrap break-words">{c.body}</p>
                </div>
                <button
                  onClick={() => remove(c.id)}
                  className="bg-[#e63946] hover:brightness-110 text-white text-sm font-semibold rounded-lg px-3 py-1.5 flex-shrink-0 transition"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function ApproveAgents({ token }) {
  const [agents, setAgents] = useState([])
  const [loading, setLoading] = useState(true)

  function load() {
    setLoading(true)
    fetch(`${API}/api/admin/pending-agents`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => setAgents(Array.isArray(d) ? d : []))
      .catch(() => setAgents([]))
      .finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  async function decide(id, action) {
    const r = await fetch(`${API}/api/admin/agents/${id}/${action}`, {
      method: 'POST', headers: { Authorization: `Bearer ${token}` },
    })
    if (r.ok) load()
    else alert('Action failed')
  }

  if (loading) return <div className="text-gray-500 text-center py-12">Loading…</div>
  if (!agents.length) return <div className="text-gray-500 text-center py-12">No agents awaiting review.</div>

  return (
    <div className="flex flex-col gap-4">
      {agents.map((a) => (
        <div key={a.id} className="bg-surface/70 border border-[#273141] rounded-lg p-5">
          <div className="flex items-start justify-between gap-4 mb-2">
            <div>
              <h3 className="text-white font-bold text-lg">{a.name}</h3>
              <p className="text-gray-500 text-xs">by {a.developer_email || 'unknown'} · {a.type}</p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[#3a341f] text-[#e6b800] flex-shrink-0">Pending</span>
          </div>
          <p className="text-gray-300 text-sm mb-3">{a.description}</p>
          <div className="text-sm text-gray-400 mb-1">{a.request_quota} requests · ${Number(a.price).toFixed(2)} · output: {a.output_type}</div>
          <div className="text-sm text-gray-400 mb-4">
            Inputs: {(a.input_schema || []).map((f) => `${f.label} (${f.type})`).join(', ')}
          </div>
          <div className="flex gap-3">
            <button onClick={() => decide(a.id, 'approve')} className="bg-brand hover:bg-[#138c86] text-white text-sm font-semibold rounded-lg px-4 py-2 transition">Approve</button>
            <button onClick={() => decide(a.id, 'reject')} className="bg-[#e63946] hover:brightness-110 text-white text-sm font-semibold rounded-lg px-4 py-2 transition">Reject</button>
          </div>
        </div>
      ))}
    </div>
  )
}