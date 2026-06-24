import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../AuthContext.jsx'
import { useCart } from '../CartContext.jsx'

const API = import.meta.env.VITE_API_URL

export default function Cart() {
  const { token } = useAuth()
  const { items, removeFromCart, clearCart } = useCart()
  const navigate = useNavigate()
  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState(false)

  const total = items.reduce((s, i) => s + Number(i.price), 0)

  async function checkout() {
    if (!token) { navigate('/login'); return }
    if (!items.length) return
    setMsg(''); setLoading(true)
    try {
      const r = await fetch(`${API}/api/marketplace/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ agentIds: items.map((i) => i.id) }),
      })
      const data = await r.json()
      if (!r.ok) { setMsg(data.error || 'Checkout failed'); return }
      window.location.href = data.url // redirect to Stripe
    } catch { setMsg('Network error') } finally { setLoading(false) }
  }

  return (
    <main className="container mx-auto max-w-5xl px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-white">Your Cart</h1>
        {items.length > 0 && (
          <button onClick={clearCart} className="text-gray-400 text-sm border border-[#273141] rounded-lg px-3 py-1.5 hover:border-brand transition">Clear Cart</button>
        )}
      </div>

      {items.length === 0 ? (
        <div className="text-gray-500 text-center py-16">
          Your cart is empty. <Link to="/marketplace" className="text-brand">Browse the marketplace</Link>
        </div>
      ) : (
        <div className="flex flex-col md:flex-row gap-6">
          <div className="flex-1 bg-surface/85 border border-[#273141] rounded-xl p-5">
            {items.map((i) => (
              <div key={i.id} className="flex items-center justify-between py-3 border-b border-[#273141] last:border-0">
                <div>
                  <p className="text-white font-semibold">{i.name}</p>
                  <p className="text-gray-500 text-sm">{i.type}</p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-white">${Number(i.price).toFixed(2)}</span>
                  <button onClick={() => removeFromCart(i.id)} className="text-[#e63946] text-sm hover:underline">Remove</button>
                </div>
              </div>
            ))}
          </div>

          <div className="md:w-72 bg-surface/85 border border-[#273141] rounded-xl p-5 h-fit">
            <h2 className="text-white font-bold text-lg mb-4">Order Summary</h2>
            <div className="flex justify-between text-gray-300 mb-2"><span>Subtotal</span><span>${total.toFixed(2)}</span></div>
            <div className="flex justify-between text-white font-bold border-t border-[#273141] pt-3 mb-4"><span>Total</span><span>${total.toFixed(2)}</span></div>
            {msg && <p className="text-[#e63946] text-sm mb-3">{msg}</p>}
            <Link to="/marketplace" className="block text-center text-gray-300 border border-[#273141] rounded-lg py-2.5 mb-3 hover:border-brand transition">Continue Shopping</Link>
            <button onClick={checkout} disabled={loading} className="w-full bg-brand hover:bg-[#138c86] text-white font-bold rounded-lg py-3 transition disabled:opacity-60">
              {loading ? 'Redirecting…' : 'Proceed to Checkout'}
            </button>
          </div>
        </div>
      )}
    </main>
  )
}