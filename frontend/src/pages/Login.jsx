import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../AuthContext.jsx'
import { useToast } from '../ToastContext.jsx'

const API = import.meta.env.VITE_API_URL

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState(false)
  const { showToast } = useToast()

  async function submit() {
    setMsg(''); setLoading(true)
    try {
      const r = await fetch(`${API}/api/auth/login`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await r.json()
      if (!r.ok) { setMsg(data.error || 'Login failed'); return }
      login(data.token, data.user)
      if (!data.user.newsletter) {
        showToast('Want weekly AI updates? Subscribe to the Digeon newsletter.', {
          actionLabel: 'Subscribe', actionTo: '/profile', duration: 8000,
        })
      }
      navigate('/')
    } catch { setMsg('Network error') } finally { setLoading(false) }
  }

  const input = "bg-[#121823] border border-[#273141] rounded-lg px-3.5 py-3 text-[#e6edf3] outline-none focus:border-[#2a4763]"

  return (
    <div className="min-h-[70vh] flex flex-col items-center">
      <div className="w-full max-w-[410px] mt-16 bg-[#151a21] border border-[#273141] rounded-2xl px-7 py-9 shadow-2xl">
        <h2 className="text-center text-brand text-4xl font-bold mb-5">Sign In</h2>
        <div className="flex flex-col gap-3.5">
          <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email" className={input} />
          <input value={password} onChange={e=>setPassword(e.target.value)} type="password" placeholder="Password"
            onKeyDown={e=>e.key==='Enter'&&submit()} className={input} />
          {msg && <p className="text-[#e63946] text-sm">{msg}</p>}
          <button onClick={submit} disabled={loading}
            className="bg-[#0077cc] hover:brightness-110 text-white font-bold rounded-lg py-3.5 mt-1.5 transition disabled:opacity-60">
            {loading ? 'Signing in…' : 'Login'}
          </button>
          <div className="flex justify-between mt-2 text-brand text-sm">
            <Link to="/register" className="hover:underline">Create Account</Link>
            <Link to="/forgot-password" className="hover:underline">Forgot Password?</Link>
          </div>
        </div>
      </div>
    </div>
  )
}