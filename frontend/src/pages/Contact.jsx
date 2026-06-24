import { useState } from 'react'

const API = import.meta.env.VITE_API_URL

export default function Contact() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [sent, setSent] = useState(false)
  const [msg, setMsg] = useState('')
  const [sending, setSending] = useState(false)

  async function submit() {
    setMsg('')
    if (!email.trim() || !message.trim()) { setMsg('Email and message are required'); return }
    setSending(true)
    try {
      const r = await fetch(`${API}/api/contact`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, message }),
      })
      const data = await r.json()
      if (!r.ok) { setMsg(data.error || 'Could not send'); return }
      setSent(true)
    } catch { setMsg('Network error') } finally { setSending(false) }
  }

  const input = "bg-[#121823] border border-[#273141] rounded-lg px-3.5 py-3 text-[#e6edf3] outline-none focus:border-brand"

  return (
    <div className="min-h-[70vh] flex flex-col items-center py-12">
      <div className="w-full max-w-[560px] bg-[#151a21] border border-[#273141] rounded-2xl px-8 py-8 shadow-2xl">
        <h1 className="text-3xl font-bold text-white text-center mb-6">Contact Us</h1>

        {sent ? (
          <p className="text-center text-brand text-lg py-10 leading-relaxed">
            Your feedback has been received — we value customer feedback a lot. Thank you!
          </p>
        ) : (
          <div className="flex flex-col gap-3.5">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name (optional)" className={input} />
            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Your email" className={input} />
            <textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Describe your issue…" className={input + " min-h-[140px]"} />
            {msg && <p className="text-[#e63946] text-sm">{msg}</p>}
            <button onClick={submit} disabled={sending} className="bg-brand hover:bg-[#138c86] text-white font-bold rounded-lg py-3 transition disabled:opacity-60">
              {sending ? 'Sending…' : 'Send Message'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}