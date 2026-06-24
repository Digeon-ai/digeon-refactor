import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../AuthContext.jsx'
import { useCart } from '../CartContext.jsx'

const API = import.meta.env.VITE_API_URL

export default function Marketplace() {
  const { token, user } = useAuth()
  const { addToCart, inCart } = useCart()
  const navigate = useNavigate()
  const [agents, setAgents] = useState([])
  const [ownedIds, setOwnedIds] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`${API}/api/marketplace/agents`)
      .then((r) => r.json())
      .then((d) => setAgents(Array.isArray(d) ? d : []))
      .catch(() => setAgents([]))
      .finally(() => setLoading(false))
  }, [])

  // owned agents (so we can show "Owned") — only if logged in
  useEffect(() => {
    if (!token) { setOwnedIds([]); return }
    fetch(`${API}/api/marketplace/my-agent-ids`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => setOwnedIds(Array.isArray(d) ? d : []))
      .catch(() => setOwnedIds([]))
  }, [token])

  function handleAdd(agent) {
    if (!token) { navigate('/login'); return }
    addToCart(agent)
  }

  if (loading) return <div className="text-gray-500 text-center py-20">Loading…</div>

  return (
    <main className="container mx-auto max-w-5xl px-6 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-white">Marketplace</h1>
      </div>

      <div className="grid gap-6" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}>
        {agents.map((a) => {
          const owned = ownedIds.includes(a.id)
          const added = inCart(a.id)
          const isMine = user?.id != null && a.developer_id != null && a.developer_id === user.id
          return (
            <div key={a.id} className="bg-surface/85 border border-[#273141] rounded-xl p-6 flex flex-col">
              <h3 className="text-xl font-bold text-white mb-2">{a.name}</h3>
              <p className="text-gray-400 text-sm mb-4 flex-1">{a.description}</p>
              <p className="text-brand text-sm font-semibold">Type: {a.type}</p>
              <p className="text-gray-300 text-sm mb-1">{a.request_quota} requests</p>
              <p className="text-white font-bold mb-4">${Number(a.price).toFixed(2)}</p>
              {isMine ? (
                <button disabled className="bg-[#273141] text-gray-500 font-semibold rounded-lg py-3 cursor-default">Your agent</button>
              ) : owned ? (
                <button disabled className="bg-[#273141] text-gray-400 font-semibold rounded-lg py-3 cursor-default">Owned</button>
              ) : added ? (
                <button disabled className="bg-[#273141] text-gray-400 font-semibold rounded-lg py-3 cursor-default">Already in Cart</button>
              ) : (
                <button onClick={() => handleAdd(a)} className="bg-brand hover:bg-[#138c86] text-white font-semibold rounded-lg py-3 transition">Add to Cart</button>
              )}     
            </div>
          )
        })}
      </div>
    </main>
  )
}