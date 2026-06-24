import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../AuthContext.jsx'
import { useDirectory } from '../DirectoryContext.jsx'

const API = import.meta.env.VITE_API_URL

function Stars({ tool }) {
  const { token } = useAuth()
  const [hover, setHover] = useState(0)
  const [userVal, setUserVal] = useState(tool.user || 0)
  const [avg, setAvg] = useState(tool.avg || 0)
  const [count, setCount] = useState(tool.count || 0)

  async function rate(value) {
    if (!token) { alert('Please log in to rate.'); return }
    try {
      const r = await fetch(`${API}/api/tools/${tool.id}/rating`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ value }),
      })
      if (r.status === 401) { alert('Please log in to rate.'); return }
      const data = await r.json()
      if (!r.ok) { alert(data.error || 'Could not save rating.'); return }
      setUserVal(data.user); setAvg(data.avg); setCount(data.count)
    } catch {
      alert('Could not save rating.')
    }
  }

  return (
    <div className="flex justify-center items-center gap-1.5 mt-2.5">
      {[1, 2, 3, 4, 5].map((i) => {
        const filled = i <= (hover || userVal)
        return (
          <button
            key={i}
            type="button"
            onClick={() => rate(i)}
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(0)}
            className={`text-lg leading-none ${filled ? 'text-amber-400' : 'text-gray-500'} hover:text-amber-400 transition-colors`}
            aria-label={`${i} star`}
          >
            {filled ? '★' : '☆'}
          </button>
        )
      })}
      <span className="ml-2 text-xs text-gray-500">
        {count ? `(${avg} • ${count})` : '(no ratings yet)'}
      </span>
    </div>
  )
}

export default function Directory() {
  const [selectedCats, setSelectedCats] = useState(new Set())
  const [minRating, setMinRating] = useState(0)
  const [query, setQuery] = useState('')

  const { rows: prefetched } = useDirectory()
  const rows = prefetched || []

  // build unique category + tool lists from the flat rows
  const categories = useMemo(() => {
    const m = new Map()
    rows.forEach((r) => m.set(r.category_id, r.category))
    return [...m.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [rows])

  const tools = useMemo(() => {
    const m = new Map()
    rows.forEach((r) => {
      if (!m.has(r.id)) m.set(r.id, { ...r, _cats: new Set() })
      m.get(r.id)._cats.add(r.category_id)
    })
    return [...m.values()]
  }, [rows])

  const visible = useMemo(() => {
    let list = tools
    if (query.trim()) {
      const q = query.toLowerCase().trim()
      list = list.filter((t) => t.name.toLowerCase().startsWith(q))
    } else {
      if (selectedCats.size > 0) {
        list = list.filter((t) => [...t._cats].some((c) => selectedCats.has(c)))
      }
      if (minRating > 0) {
        list = list.filter((t) => (t.avg || 0) >= minRating)
      }
    }
    return list
  }, [tools, selectedCats, minRating, query])

  function toggleCat(id) {
    setQuery('')
    setSelectedCats((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function clearFilters() {
    setSelectedCats(new Set())
    setMinRating(0)
    setQuery('')
  }

  return (
    <main className="container mx-auto max-w-7xl px-6">
      <h1 className="text-3xl font-bold text-center mt-8 mb-2">Tools Directory</h1>

      <div className="flex flex-col md:flex-row items-start gap-8 mt-8 min-h-[80vh]">
        {/* Sidebar */}
        <nav className="w-full md:w-64 flex-shrink-0 flex flex-col gap-3">
          <h2 className="text-gray-400 text-sm tracking-wide mb-1">Categories</h2>
          <div className="flex flex-col gap-2.5">
            {categories.map((cat) => (
              <label
                key={cat.id}
                className="flex items-center gap-2.5 bg-surface/85 border border-[#2a2d34] rounded-lg px-3 py-2.5 cursor-pointer hover:bg-[#333] hover:border-[#3a3e46] transition"
              >
                <input
                  type="checkbox"
                  checked={selectedCats.has(cat.id)}
                  onChange={() => toggleCat(cat.id)}
                  className="w-4 h-4 accent-brand"
                />
                <span>{cat.name}</span>
              </label>
            ))}
          </div>
          <button
            onClick={clearFilters}
            className="mt-3 bg-brand hover:bg-[#138c86] text-white rounded-lg px-3 py-2 transition"
          >
            Clear filters
          </button>
        </nav>

        {/* Content */}
        <section className="flex-1 flex flex-col gap-6">
          <div className="flex items-center justify-between gap-3">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search..."
              className="bg-[#1a1c20] border border-[#333] rounded px-3 py-2 text-textlight outline-none focus:border-brand"
            />
            <div className="text-gray-400 text-sm">
              {visible.length} result{visible.length !== 1 ? 's' : ''}
            </div>
            <label className="text-gray-400 text-sm flex items-center gap-2">
              Min rating
              <select
                value={minRating}
                onChange={(e) => setMinRating(Number(e.target.value))}
                className="bg-[#101319] text-textlight border border-[#2a2d34] rounded-lg px-2 py-1.5"
              >
                <option value={0}>All</option>
                <option value={1}>1★+</option>
                <option value={2}>2★+</option>
                <option value={3}>3★+</option>
                <option value={4}>4★+</option>
                <option value={5}>5★</option>
              </select>
            </label>
          </div>

          <div className="grid gap-5" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}>
            {visible.map((tool) => (
              <div
                key={tool.id}
                className="bg-surface/85 border border-[#2a2d34] rounded-lg p-4 text-center shadow-lg hover:-translate-y-1 hover:shadow-2xl transition"
              >
                <h3 className="text-xl font-bold text-white mb-2">
                  <a href={tool.link} target="_blank" rel="noreferrer" className="hover:text-brand transition">
                    {tool.name}
                  </a>
                </h3>
                <p className="text-gray-300">{tool.desc}</p>
                <Stars tool={tool} />
              </div>
            ))}
            {visible.length === 0 && (
              <div className="text-gray-500 text-center text-lg col-span-full">
                No tools match those filters.
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  )
}