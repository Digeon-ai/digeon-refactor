import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../AuthContext.jsx'

const API = import.meta.env.VITE_API_URL

export default function BlogPost() {
  const { id } = useParams()
  const { token } = useAuth()
  const navigate = useNavigate()
  const [blog, setBlog] = useState(null)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    fetch(`${API}/api/blogs/${id}`, token ? { headers: { Authorization: `Bearer ${token}` } } : {})
      .then((r) => { if (!r.ok) throw new Error(); return r.json() })
      .then(setBlog)
      .catch(() => setNotFound(true))
  }, [id, token])

  async function toggleLike() {
    if (!token) { navigate('/login'); return }
    const r = await fetch(`${API}/api/blogs/${id}/like`, {
      method: 'POST', headers: { Authorization: `Bearer ${token}` },
    })
    const data = await r.json()
    if (r.ok) setBlog((b) => ({ ...b, liked: data.liked, likes: data.likes }))
  }

  if (notFound) return <div className="text-center py-20 text-gray-500">Blog not found. <Link to="/blog" className="text-brand">Back to blog</Link></div>
  if (!blog) return <div className="text-center py-20 text-gray-500">Loading…</div>

  return (
    <main className="container mx-auto max-w-3xl px-6 py-10">
      <Link to="/blog" className="text-brand text-sm hover:underline">← Back to blog</Link>
      <h1 className="text-4xl font-bold text-white mt-4 mb-2">{blog.title}</h1>
      <p className="text-gray-500 text-sm mb-8">{new Date(blog.created_at).toLocaleString()}</p>

      {/* rendered blog HTML */}
      <div
        className="prose prose-invert max-w-none [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:my-1 [&_pre]:bg-[#0d1117] [&_pre]:p-3 [&_pre]:rounded-lg [&_img]:rounded-lg [&_video]:rounded-lg [&_iframe]:rounded-lg [&_a]:text-brand"
        dangerouslySetInnerHTML={{ __html: blog.content }}
      />

      {/* like bar */}
      <div className="mt-10 pt-6 border-t border-[#273141]">
        <button
          onClick={toggleLike}
          className={`flex items-center gap-2 px-4 py-2 rounded-full font-semibold text-sm transition ${
            blog.liked ? 'bg-brand text-white' : 'bg-surface border border-[#273141] text-gray-300 hover:border-brand'
          }`}
        >
          {blog.liked ? '♥ Liked' : '♡ Like'} <span>{blog.likes}</span>
        </button>
        <Comments blogId={blog.id} />
      </div>
    </main>
  )
}

function Comments({ blogId }) {
  const { token } = useAuth()
  const navigate = useNavigate()
  const [comments, setComments] = useState([])
  const [text, setText] = useState('')
  const [replyTo, setReplyTo] = useState(null) // { id, author } or null

  const load = useCallback(() => {
    fetch(`${API}/api/comments/blog/${blogId}`, token ? { headers: { Authorization: `Bearer ${token}` } } : {})
      .then((r) => r.json())
      .then((d) => setComments(Array.isArray(d) ? d : []))
      .catch(() => setComments([]))
  }, [blogId, token])

  useEffect(() => { load() }, [load])

  // group: top-level comments, and replies bucketed under their TOP-level ancestor
  const topLevel = comments.filter((c) => !c.parent_id)
  const byId = Object.fromEntries(comments.map((c) => [c.id, c]))
  function topAncestor(c) {
    let cur = c
    while (cur.parent_id && byId[cur.parent_id]) cur = byId[cur.parent_id]
    return cur.id
  }
  const repliesFor = {}
  comments.filter((c) => c.parent_id).forEach((c) => {
    const root = topAncestor(c)
    ;(repliesFor[root] ||= []).push(c)
  })

  async function submit() {
    if (!token) { navigate('/login'); return }
    if (!text.trim()) return
    const r = await fetch(`${API}/api/comments/blog/${blogId}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ body: text, parentId: replyTo?.id || null }),
    })
    if (r.ok) { setText(''); setReplyTo(null); load() }
  }

  async function like(id) {
    if (!token) { navigate('/login'); return }
    const r = await fetch(`${API}/api/comments/${id}/like`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } })
    if (r.ok) load()
  }

  async function remove(id) {
    if (!confirm('Delete this comment?')) return
    const r = await fetch(`${API}/api/comments/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
    if (r.ok) load()
  }

  function CommentRow({ c, replyingToName }) {
    return (
      <div className="bg-surface/60 border border-[#273141] rounded-lg p-4">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-white font-semibold text-sm">{c.author}</span>
          {replyingToName && <span className="text-gray-500 text-xs">replied to {replyingToName}</span>}
          <span className="text-gray-600 text-xs ml-auto">{new Date(c.created_at).toLocaleString()}</span>
        </div>
        <p className="text-gray-300 text-sm mb-2 whitespace-pre-wrap">{c.body}</p>
        <div className="flex items-center gap-4 text-xs">
          <button onClick={() => like(c.id)} className={c.liked ? 'text-brand' : 'text-gray-400 hover:text-brand'}>
            {c.liked ? '♥' : '♡'} {c.likes}
          </button>
          <button onClick={() => { if (!token) { navigate('/login'); return } setReplyTo({ id: c.id, author: c.author }) }} className="text-gray-400 hover:text-brand">Reply</button>
          {c.mine && <button onClick={() => remove(c.id)} className="text-[#e63946] hover:underline">Delete</button>}
        </div>
      </div>
    )
  }

  return (
    <div className="mt-10 pt-6 border-t border-[#273141]">
      <h3 className="text-xl font-bold text-white mb-4">Comments</h3>

      {/* composer */}
      <div className="mb-6">
        {replyTo && (
          <div className="text-xs text-gray-400 mb-1">
            Replying to {replyTo.author} <button onClick={() => setReplyTo(null)} className="text-brand ml-2">cancel</button>
          </div>
        )}
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={token ? 'Write a comment…' : 'Log in to comment'}
          onFocus={() => { if (!token) navigate('/login') }}
          className="w-full bg-[#121823] border border-[#273141] rounded-lg px-3 py-2 text-textlight outline-none focus:border-brand min-h-[70px]"
        />
        <button onClick={submit} className="mt-2 bg-[#0077cc] hover:brightness-110 text-white font-semibold rounded-lg px-5 py-2 text-sm transition">
          {replyTo ? 'Reply' : 'Comment'}
        </button>
      </div>

      {/* threads */}
      <div className="flex flex-col gap-4">
        {topLevel.length === 0 && <p className="text-gray-500 text-sm">No comments yet. Be the first.</p>}
        {topLevel.map((c) => (
          <div key={c.id} className="flex flex-col gap-2">
            <CommentRow c={c} />
            {(repliesFor[c.id] || []).length > 0 && (
              <div className="ml-6 flex flex-col gap-2">
                {repliesFor[c.id].map((r) => (
                  <CommentRow key={r.id} c={r} replyingToName={byId[r.parent_id]?.author} />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}