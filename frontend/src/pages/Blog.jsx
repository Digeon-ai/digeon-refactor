import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../AuthContext.jsx'

const API = import.meta.env.VITE_API_URL

export default function Blog() {
  const { token } = useAuth()
  const [blogs, setBlogs] = useState([])
  const [loading, setLoading] = useState(true)

  const [query, setQuery] = useState('')
  const [sort, setSort] = useState('newest')
  const [after, setAfter] = useState('')
  const [before, setBefore] = useState('')
  const [minLikes, setMinLikes] = useState(0)

  useEffect(() => {
    fetch(`${API}/api/blogs`, token ? { headers: { Authorization: `Bearer ${token}` } } : {})
      .then((r) => r.json())
      .then((d) => setBlogs(Array.isArray(d) ? d : []))
      .catch(() => setBlogs([]))
      .finally(() => setLoading(false))
  }, [token])

  const visible = useMemo(() => {
    let list = [...blogs]
    if (query.trim()) {
      const q = query.toLowerCase().trim()
      list = list.filter((b) => b.title.toLowerCase().includes(q))
    }
    if (after) list = list.filter((b) => new Date(b.created_at) >= new Date(after))
    if (before) list = list.filter((b) => new Date(b.created_at) <= new Date(before + 'T23:59:59'))
    if (minLikes > 0) list = list.filter((b) => (b.likes || 0) >= minLikes)
    list.sort((a, b) =>
      sort === 'newest'
        ? new Date(b.created_at) - new Date(a.created_at)
        : new Date(a.created_at) - new Date(b.created_at)
    )
    return list
  }, [blogs, query, sort, after, before, minLikes])

  const inputCls = "bg-[#1a1c20] border border-[#333] rounded-lg px-3 py-2 text-textlight outline-none focus:border-brand"

  return (
    <main className="container mx-auto max-w-4xl px-6 py-10">
      <h1 className="text-4xl font-bold text-center mb-2">Bytes from Digeon</h1>
      <p className="text-gray-400 text-center mb-8">Short thoughts, longer ideas.</p>

      {/* controls */}
      <div className="flex flex-wrap items-end gap-3 mb-8 bg-surface/60 border border-[#273141] rounded-xl p-4">
        <div className="flex flex-col gap-1 flex-1 min-w-[180px]">
          <label className="text-gray-500 text-xs">Search by title</label>
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search…" className={inputCls} />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-gray-500 text-xs">Sort</label>
          <select value={sort} onChange={(e) => setSort(e.target.value)} className={inputCls}>
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-gray-500 text-xs">After</label>
          <input type="date" value={after} onChange={(e) => setAfter(e.target.value)} className={inputCls} />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-gray-500 text-xs">Before</label>
          <input type="date" value={before} onChange={(e) => setBefore(e.target.value)} className={inputCls} />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-gray-500 text-xs">Min likes</label>
          <input type="number" min={0} value={minLikes} onChange={(e) => setMinLikes(Number(e.target.value))} className={inputCls + " w-24"} />
        </div>
      </div>

      {loading ? (
        <div className="text-gray-500 text-center py-12">Loading…</div>
      ) : visible.length === 0 ? (
        <div className="text-gray-500 text-center py-12">No blogs match.</div>
      ) : (
        <div className="flex flex-col gap-5">
          {visible.map((b) => (
            <Link
              key={b.id}
              to={`/blog/${b.id}`}
              className="block bg-surface/85 border border-[#273141] rounded-xl p-6 hover:border-brand transition"
            >
              <h2 className="text-xl font-bold text-white mb-1">{b.title}</h2>
              <p className="text-gray-500 text-xs mb-3">{new Date(b.created_at).toLocaleString()}</p>
              <p className="text-gray-300 mb-4">{b.excerpt}…</p>
              <div className="flex items-center justify-between">
                <span className="text-brand text-sm font-semibold">Read More →</span>
                <span className="text-gray-400 text-sm">♥ {b.likes || 0}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  )
}