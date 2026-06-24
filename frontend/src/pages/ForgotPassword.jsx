import { useState } from 'react'
import { Link } from 'react-router-dom'
import { passwordChecks } from '../passwordRules.js'

const API = import.meta.env.VITE_API_URL

export default function ForgotPassword() {
  const [step, setStep] = useState('email')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState(false)

  const checks = passwordChecks(newPassword)
  const pwValid = Object.values(checks).every(Boolean)
  const input = "bg-[#121823] border border-[#273141] rounded-lg px-3.5 py-3 text-[#e6edf3] outline-none focus:border-[#2a4763]"
  const card = "w-full max-w-[410px] mt-16 bg-[#151a21] border border-[#273141] rounded-2xl px-7 py-9 shadow-2xl"

  async function startReset() {
    setMsg(''); setLoading(true)
    try {
      await fetch(`${API}/api/auth/forgot/start`, {
        method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ email }),
      })
      setStep('reset')
    } catch { setMsg('Network error') } finally { setLoading(false) }
  }

  async function doReset() {
    setMsg('')
    if (!pwValid) { setMsg('Password does not meet requirements'); return }
    if (newPassword !== confirm) { setMsg('Passwords do not match'); return }
    setLoading(true)
    try {
      const r = await fetch(`${API}/api/auth/forgot/reset`, {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ email, code, newPassword }),
      })
      const data = await r.json()
      if (!r.ok) { setMsg(data.error || 'Reset failed'); return }
      setStep('done')
    } catch { setMsg('Network error') } finally { setLoading(false) }
  }

  return (
    <div className="min-h-[70vh] flex flex-col items-center">
      <div className={card}>
        {step === 'email' && (
          <>
            <h2 className="text-center text-brand text-3xl font-bold mb-5">Reset Password</h2>
            <div className="flex flex-col gap-3.5">
              <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="Your account email" className={input} />
              {msg && <p className="text-[#e63946] text-sm">{msg}</p>}
              <button onClick={startReset} disabled={loading} className="bg-[#0077cc] hover:brightness-110 text-white font-bold rounded-lg py-3.5 transition disabled:opacity-60">
                {loading ? 'Sending…' : 'Send reset code'}
              </button>
              <Link to="/login" className="text-brand text-sm hover:underline">Back to login</Link>
            </div>
          </>
        )}
        {step === 'reset' && (
          <>
            <h2 className="text-center text-brand text-3xl font-bold mb-2">Enter code</h2>
            <p className="text-[#9fb0c2] text-center text-sm mb-5">If an account exists for {email}, a 6-digit code was sent. It expires in 10 minutes.</p>
            <div className="flex flex-col gap-3.5">
              <input value={code} onChange={e=>setCode(e.target.value)} placeholder="6-digit code" maxLength={6} className={input + " text-center tracking-[0.4em]"} />
              <input value={newPassword} onChange={e=>setNewPassword(e.target.value)} type="password" placeholder="New password" className={input} />
              {newPassword && (
                <ul className="text-sm flex flex-col gap-1">
                  {Object.entries(checks).map(([label, ok]) => (
                    <li key={label} className={ok ? 'text-brand' : 'text-[#9fb0c2]'}>{ok ? '✓' : '○'} {label}</li>
                  ))}
                </ul>
              )}
              <input value={confirm} onChange={e=>setConfirm(e.target.value)} type="password" placeholder="Confirm new password" className={input} />
              {msg && <p className="text-[#e63946] text-sm">{msg}</p>}
              <button onClick={doReset} disabled={loading} className="bg-[#0077cc] hover:brightness-110 text-white font-bold rounded-lg py-3.5 transition disabled:opacity-60">
                {loading ? 'Resetting…' : 'Reset password'}
              </button>
            </div>
          </>
        )}
        {step === 'done' && (
          <>
            <h2 className="text-center text-brand text-3xl font-bold mb-4">Done</h2>
            <p className="text-[#9fb0c2] text-center mb-6">Your password has been reset.</p>
            <Link to="/login" className="block text-center bg-[#0077cc] hover:brightness-110 text-white font-bold rounded-lg py-3.5 transition">Go to Login</Link>
          </>
        )}
      </div>
    </div>
  )
}