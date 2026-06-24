import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../AuthContext.jsx'
import { passwordChecks } from '../passwordRules.js'

const API = import.meta.env.VITE_API_URL

export default function Profile() {
  const { user, token, login } = useAuth()
  const navigate = useNavigate()

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [newsletter, setNewsletter] = useState(false)
  const [profileMsg, setProfileMsg] = useState('')

  // change email
  const [newEmail, setNewEmail] = useState('')
  const [emailStep, setEmailStep] = useState('idle') // idle | code
  const [emailCode, setEmailCode] = useState('')
  const [emailMsg, setEmailMsg] = useState('')

  // change password
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [pwMsg, setPwMsg] = useState('')

  const checks = passwordChecks(newPassword)
  const pwValid = Object.values(checks).every(Boolean)

  useEffect(() => {
    if (!token) { navigate('/login'); return }
    fetch(`${API}/api/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { setFirstName(d.first_name || ''); setLastName(d.last_name || ''); setNewsletter(!!d.newsletter) })
      .catch(() => {})
  }, [token])

  async function saveProfile() {
    setProfileMsg('')
    const r = await fetch(`${API}/api/auth/me`, {
      method:'PATCH', headers:{'Content-Type':'application/json', Authorization:`Bearer ${token}`},
      body: JSON.stringify({ firstName, lastName, newsletter }),
    })
    const data = await r.json()
    if (!r.ok) { setProfileMsg(data.error || 'Could not save'); return }
    login(token, { ...user, firstName: data.first_name, newsletter: data.newsletter })
    setProfileMsg('Saved.')
  }

  async function startEmailChange() {
    setEmailMsg('')
    if (!newEmail) { setEmailMsg('Enter a new email'); return }
    const r = await fetch(`${API}/api/auth/change-email/start`, {
      method:'POST', headers:{'Content-Type':'application/json', Authorization:`Bearer ${token}`},
      body: JSON.stringify({ newEmail }),
    })
    const data = await r.json()
    if (!r.ok) { setEmailMsg(data.error || 'Could not start'); return }
    setEmailStep('code')
    setEmailMsg('Code sent to ' + newEmail)
  }

  async function verifyEmailChange() {
    setEmailMsg('')
    const r = await fetch(`${API}/api/auth/change-email/verify`, {
      method:'POST', headers:{'Content-Type':'application/json', Authorization:`Bearer ${token}`},
      body: JSON.stringify({ newEmail, code: emailCode }),
    })
    const data = await r.json()
    if (!r.ok) { setEmailMsg(data.error || 'Verification failed'); return }
    login(data.token, data.user) // new token + new email
    setEmailStep('idle'); setNewEmail(''); setEmailCode('')
    setEmailMsg('Email updated.')
  }

  async function changePassword() {
    setPwMsg('')
    if (!pwValid) { setPwMsg('New password does not meet requirements'); return }
    if (newPassword !== confirm) { setPwMsg('Passwords do not match'); return }
    const r = await fetch(`${API}/api/auth/change-password`, {
      method:'POST', headers:{'Content-Type':'application/json', Authorization:`Bearer ${token}`},
      body: JSON.stringify({ currentPassword, newPassword }),
    })
    const data = await r.json()
    if (!r.ok) { setPwMsg(data.error || 'Could not change password'); return }
    setPwMsg('Password changed.')
    setCurrentPassword(''); setNewPassword(''); setConfirm('')
  }

  const input = "bg-[#121823] border border-[#273141] rounded-lg px-3.5 py-3 text-[#e6edf3] outline-none focus:border-[#2a4763]"
  const divider = "border-t border-[#273141] my-6"
  const sectionTitle = "text-brand text-lg font-bold mb-3"

  if (!user) return null

  return (
    <div className="min-h-[70vh] flex flex-col items-center py-12">
      <div className="w-full max-w-[480px] bg-[#151a21] border border-[#273141] rounded-2xl px-7 py-8 shadow-2xl">
        <h2 className="text-brand text-2xl font-bold mb-1">Edit Profile</h2>
        <p className="text-[#9fb0c2] text-sm mb-6">{user.email}</p>

        {/* Names + newsletter */}
        <div className="flex flex-col gap-3.5">
          <div className="flex gap-3">
            <input value={firstName} onChange={e=>setFirstName(e.target.value)} placeholder="First name" className={input + " w-1/2"} />
            <input value={lastName} onChange={e=>setLastName(e.target.value)} placeholder="Last name" className={input + " w-1/2"} />
          </div>
          <label className="flex items-center gap-2.5 text-sm text-[#cfd3d7] cursor-pointer">
            <input type="checkbox" checked={newsletter} onChange={e=>setNewsletter(e.target.checked)} className="w-4 h-4 accent-brand" />
            Subscribed to the Digeon newsletter
          </label>
          {profileMsg && <p className="text-brand text-sm">{profileMsg}</p>}
          <button onClick={saveProfile} className="bg-[#0077cc] hover:brightness-110 text-white font-bold rounded-lg py-3 transition">Save changes</button>
        </div>

        <div className={divider} />

        {/* Change email */}
        <h3 className={sectionTitle}>Change Email</h3>
        <div className="flex flex-col gap-3.5">
          {emailStep === 'idle' ? (
            <>
              <input value={newEmail} onChange={e=>setNewEmail(e.target.value)} placeholder="New email" className={input} />
              {emailMsg && <p className={emailMsg.includes('updated') ? 'text-brand text-sm' : 'text-[#9fb0c2] text-sm'}>{emailMsg}</p>}
              <button onClick={startEmailChange} className="bg-[#0077cc] hover:brightness-110 text-white font-bold rounded-lg py-3 transition">Send confirmation code</button>
            </>
          ) : (
            <>
              <p className="text-[#9fb0c2] text-sm">Enter the 6-digit code sent to {newEmail}.</p>
              <input value={emailCode} onChange={e=>setEmailCode(e.target.value)} placeholder="6-digit code" maxLength={6} className={input + " text-center tracking-[0.4em]"} />
              {emailMsg && <p className="text-[#e63946] text-sm">{emailMsg}</p>}
              <div className="flex gap-3">
                <button onClick={verifyEmailChange} className="flex-1 bg-[#0077cc] hover:brightness-110 text-white font-bold rounded-lg py-3 transition">Confirm new email</button>
                <button onClick={()=>{setEmailStep('idle'); setEmailMsg(''); setEmailCode('')}} className="px-4 text-[#9fb0c2] text-sm hover:underline">Cancel</button>
              </div>
            </>
          )}
        </div>

        <div className={divider} />

        {/* Change password */}
        <h3 className={sectionTitle}>Change Password</h3>
        <div className="flex flex-col gap-3.5">
          <input value={currentPassword} onChange={e=>setCurrentPassword(e.target.value)} type="password" placeholder="Current password" className={input} />
          <input value={newPassword} onChange={e=>setNewPassword(e.target.value)} type="password" placeholder="New password" className={input} />
          {newPassword && (
            <ul className="text-sm flex flex-col gap-1">
              {Object.entries(checks).map(([label, ok]) => (
                <li key={label} className={ok ? 'text-brand' : 'text-[#9fb0c2]'}>{ok ? '✓' : '○'} {label}</li>
              ))}
            </ul>
          )}
          <input value={confirm} onChange={e=>setConfirm(e.target.value)} type="password" placeholder="Confirm new password" className={input} />
          {pwMsg && <p className={pwMsg.includes('changed') ? 'text-brand text-sm' : 'text-[#e63946] text-sm'}>{pwMsg}</p>}
          <button onClick={changePassword} className="bg-[#0077cc] hover:brightness-110 text-white font-bold rounded-lg py-3 transition">Change password</button>
        </div>
      </div>
    </div>
  )
}