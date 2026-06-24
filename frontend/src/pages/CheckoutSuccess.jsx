import { useEffect, useState, useRef } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '../AuthContext.jsx'
import { useCart } from '../CartContext.jsx'

const API = import.meta.env.VITE_API_URL

export default function CheckoutSuccess() {
  const [params] = useSearchParams()
  const { token } = useAuth()
  const { clearCart } = useCart()
  const [status, setStatus] = useState('working') // working | done | error
  const ran = useRef(false)

  useEffect(() => {
    const sessionId = params.get('session_id')
    if (!sessionId || !token || ran.current) return
    ran.current = true
    fetch(`${API}/api/marketplace/grant`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ sessionId }),
    })
      .then((r) => r.json())
      .then((d) => { if (d.ok) { clearCart(); setStatus('done') } else setStatus('error') })
      .catch(() => setStatus('error'))
  }, [params, token])

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-6">
      {status === 'working' && <p className="text-gray-400">Confirming your purchase…</p>}
      {status === 'done' && (
        <>
          <h1 className="text-3xl font-bold text-brand mb-3">Purchase complete!</h1>
          <p className="text-gray-300 mb-6">Your agents are ready. Find them under "Manage My Agents."</p>
          <Link to="/marketplace" className="bg-brand hover:bg-[#138c86] text-white font-semibold rounded-lg px-6 py-3 transition">Back to Marketplace</Link>
        </>
      )}
      {status === 'error' && (
        <>
          <h1 className="text-2xl font-bold text-[#e63946] mb-3">Something went wrong</h1>
          <p className="text-gray-400 mb-6">If you were charged, contact support — your purchase will be honored.</p>
          <Link to="/cart" className="text-brand">Back to cart</Link>
        </>
      )}
    </div>
  )
}