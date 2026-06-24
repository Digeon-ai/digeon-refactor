import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../AuthContext.jsx'
import { passwordChecks } from '../passwordRules.js'

const API = import.meta.env.VITE_API_URL

export default function Register() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [step, setStep] = useState('form')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [newsletter, setNewsletter] = useState(false)
  const [wantsAdmin, setWantsAdmin] = useState(false)
  const [code, setCode] = useState('')
  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState(false)
  const [approved, setApproved] = useState(false)

  const checks = passwordChecks(password)
  const pwValid = Object.values(checks).every(Boolean)
  const canSubmit = email && pwValid && password === confirm

  async function startSignup() {
    setMsg('')
    if (!canSubmit) { setMsg('Fix the fields above'); return }
    setLoading(true)
    try {
      const r = await fetch(`${API}/api/auth/signup/start`, {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ email, password }),
      })
      const data = await r.json()
      if (!r.ok) { setMsg(data.error || 'Could not start signup'); return }
      setStep('code')
    } catch { setMsg('Network error') } finally { setLoading(false) }
  }

  async function verifyCode() {
    setMsg(''); setLoading(true)
    try {
      const r = await fetch(`${API}/api/auth/signup/verify`, {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ email, password, code, firstName, lastName, newsletter, wantsAdmin }),
      })
      const data = await r.json()
      if (!r.ok) { setMsg(data.error || 'Verification failed'); return }
      if (data.pendingAdmin) { setStep('pending'); return }
      login(data.token, data.user)
      navigate('/')
    } catch { setMsg('Network error') } finally { setLoading(false) }
  }

  useEffect(() => {
    if (step !== 'pending') return
    const id = setInterval(async () => {
      try {
        const r = await fetch(`${API}/api/admin/pending-status?email=${encodeURIComponent(email)}`)
        const data = await r.json()
        if (data.approved) { setApproved(true); clearInterval(id) }
      } catch {}
    }, 4000)
    return () => clearInterval(id)
  }, [step, email])

  const input = "bg-[#121823] border border-[#273141] rounded-lg px-3.5 py-3 text-[#e6edf3] outline-none focus:border-[#2a4763]"
  const card = "w-full max-w-[440px] mt-16 bg-[#151a21] border border-[#273141] rounded-2xl px-7 py-9 shadow-2xl"

  if (step === 'pending') {
    return (
      <div className="min-h-[70vh] flex flex-col items-center">
        <div className={card}>
          {!approved ? (
            <>
              <h2 className="text-center text-brand text-3xl font-bold mb-4">Almost there</h2>
              <p className="text-[#9fb0c2] text-center leading-relaxed">
                Waiting for an administrator to approve your credentials. You can log in once approved — keep this page open.
              </p>
              <div className="flex justify-center mt-6">
                <div className="w-6 h-6 border-2 border-brand border-t-transparent rounded-full animate-spin" />
              </div>
            </>
          ) : (
            <>
              <h2 className="text-center text-brand text-3xl font-bold mb-4">Approved!</h2>
              <p className="text-[#9fb0c2] text-center mb-6">Your admin account has been created.</p>
              <Link to="/login" className="block text-center bg-[#0077cc] hover:brightness-110 text-white font-bold rounded-lg py-3.5 transition">Go to Login</Link>
            </>
          )}
        </div>
      </div>
    )
  }

  if (step === 'code') {
    return (
      <div className="min-h-[70vh] flex flex-col items-center">
        <div className={card}>
          <h2 className="text-center text-brand text-3xl font-bold mb-2">Verify your email</h2>
          <p className="text-[#9fb0c2] text-center text-sm mb-5">We sent a 6-digit code to {email}. It expires in 10 minutes.</p>
          <div className="flex flex-col gap-3.5">
            <input value={code} onChange={e=>setCode(e.target.value)} placeholder="6-digit code" maxLength={6}
              className={input + " text-center tracking-[0.5em] text-lg"} />
            {msg && <p className="text-[#e63946] text-sm">{msg}</p>}
            <button onClick={verifyCode} disabled={loading}
              className="bg-[#0077cc] hover:brightness-110 text-white font-bold rounded-lg py-3.5 transition disabled:opacity-60">
              {loading ? 'Verifying…' : 'Verify & Create Account'}
            </button>
            <button onClick={()=>{setStep('form'); setMsg('')}} className="text-[#9fb0c2] text-sm hover:underline">Back</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-[70vh] flex flex-col items-center">
      <div className={card}>
        <h2 className="text-center text-brand text-3xl font-bold mb-5">Create Your Account</h2>
        <div className="flex flex-col gap-3.5">
          <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email" className={input} />
          <div className="flex gap-3">
            <input value={firstName} onChange={e=>setFirstName(e.target.value)} placeholder="First name (optional)" className={input + " w-1/2"} />
            <input value={lastName} onChange={e=>setLastName(e.target.value)} placeholder="Last name (optional)" className={input + " w-1/2"} />
          </div>
          <input value={password} onChange={e=>setPassword(e.target.value)} type="password" placeholder="Password" className={input} />
          {password && (
            <ul className="text-sm flex flex-col gap-1">
              {Object.entries(checks).map(([label, ok]) => (
                <li key={label} className={ok ? 'text-brand' : 'text-[#9fb0c2]'}>{ok ? '✓' : '○'} {label}</li>
              ))}
            </ul>
          )}
          <input value={confirm} onChange={e=>setConfirm(e.target.value)} type="password" placeholder="Confirm password" className={input} />
          {confirm && confirm !== password && <p className="text-[#e63946] text-sm">Passwords do not match</p>}

          <label className="flex items-center gap-2.5 text-sm text-[#cfd3d7] cursor-pointer">
            <input type="checkbox" checked={newsletter} onChange={e=>setNewsletter(e.target.checked)} className="w-4 h-4 accent-brand" />
            Subscribe to the Digeon newsletter
          </label>
          <label className="flex items-center gap-2.5 text-sm text-[#cfd3d7] cursor-pointer">
            <input type="checkbox" checked={wantsAdmin} onChange={e=>setWantsAdmin(e.target.checked)} className="w-4 h-4 accent-brand" />
            I am an administrator for this site
          </label>

          {msg && <p className="text-[#e63946] text-sm">{msg}</p>}
          <button onClick={startSignup} disabled={loading || !canSubmit}
            className="bg-[#0077cc] hover:brightness-110 text-white font-bold rounded-lg py-3.5 mt-1.5 transition disabled:opacity-50">
            {loading ? 'Sending code…' : 'Register'}
          </button>
          <div className="flex justify-between mt-1 text-brand text-sm">
            <Link to="/login" className="hover:underline">Already have an account?</Link>
            <Link to="/forgot-password" className="hover:underline">Forgot Password?</Link>
          </div>
        </div>
      </div>
    </div>
  )
}