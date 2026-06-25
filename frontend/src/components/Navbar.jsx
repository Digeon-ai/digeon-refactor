import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../AuthContext.jsx'
import { useCart } from '../CartContext.jsx'

const NAV_LINKS = [
  { to: '/directory', label: 'Directory' },
  { to: '/marketplace', label: 'Marketplace' },
  { to: '/developer', label: 'Developer Portal' },
  { to: '/blog', label: 'Blog' },
  { to: '/contact', label: 'Contact Us' },
]

export default function Navbar() {
  const { user, logout } = useAuth()
  const [open, setOpen] = useState(false)        // account dropdown
  const [navOpen, setNavOpen] = useState(false)  // mobile nav dropdown
  const menuRef = useRef(null)
  const navMenuRef = useRef(null)
  const navigate = useNavigate()
  const { items } = useCart()
  const location = useLocation()
  const showCart = items.length > 0 || location.pathname === '/marketplace'

  useEffect(() => {
    function onClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false)
      if (navMenuRef.current && !navMenuRef.current.contains(e.target)) setNavOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  // close mobile nav whenever the route changes
  useEffect(() => { setNavOpen(false) }, [location.pathname])

  function handleSignOut() {
    logout()
    setOpen(false)
    navigate('/')
  }

  return (
    <header>
      <nav className="navbar bg-surface/90 backdrop-blur-md shadow-md sticky top-0 z-50 transition-all duration-300">
        <div className="container mx-auto flex items-center justify-between max-w-7xl px-6 py-3">
          {/* logo — always top-left */}
          <Link to="/" className="logo flex items-center space-x-2">
            <img src="/images/logo.png" alt="Digeon.ai logo" className="h-11 w-auto rounded-lg" />
          </Link>

          <div className="flex items-center gap-4 md:gap-8">
            {/* desktop links */}
            <ul className="hidden md:flex nav-links gap-6 md:gap-8 text-[0.95rem] font-semibold">
              {NAV_LINKS.map((l) => (
                <li key={l.to}><Link to={l.to} className="hover:text-brand transition">{l.label}</Link></li>
              ))}
            </ul>

            {/* cart (both layouts) */}
            {showCart && (
              <Link to="/cart" className="relative text-textlight hover:text-brand transition" title="Cart">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="9" cy="21" r="1"></circle>
                  <circle cx="20" cy="21" r="1"></circle>
                  <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
                </svg>
                {items.length > 0 && (
                  <span className="absolute -top-2 -right-2 bg-brand text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">{items.length}</span>
                )}
              </Link>
            )}

            {/* desktop auth control */}
            <div className="hidden md:block">
              {!user ? (
                <Link to="/login" className="border border-brand text-brand hover:bg-brand hover:text-white px-4 py-2 rounded-full text-sm font-semibold transition">
                  Log in / Sign up
                </Link>
              ) : (
                <div className="relative" ref={menuRef}>
                  <button onClick={() => setOpen((o) => !o)} className="flex items-center gap-2 text-sm font-semibold hover:text-brand transition">
                    {user.role === 'admin' && (
                      <span className="text-xs px-2 py-0.5 rounded-full border border-brand text-brand">Admin</span>
                    )}
                    <span className="max-w-[12rem] truncate">{user.email}</span>
                    <span className="text-gray-400">▾</span>
                  </button>
                  {open && (
                    <div className="absolute right-0 mt-2 w-52 bg-surface border border-gray-700 rounded-lg shadow-xl py-1 z-50">
                      <Link to="/my-agents" onClick={() => setOpen(false)} className="block px-4 py-2.5 text-sm hover:bg-white/5 transition">Manage My Agents</Link>
                      <Link to="/profile" onClick={() => setOpen(false)} className="block px-4 py-2.5 text-sm hover:bg-white/5 transition">Edit profile</Link>
                      {user.role === 'admin' && (
                        <Link to="/admin" onClick={() => setOpen(false)} className="block px-4 py-2.5 text-sm hover:bg-white/5 transition">Admin portal</Link>
                      )}
                      <button onClick={handleSignOut} className="block w-full text-left px-4 py-2.5 text-sm text-red-400 hover:bg-white/5 transition">Sign out</button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* mobile hamburger */}
            <div className="md:hidden relative" ref={navMenuRef}>
              <button
                onClick={() => setNavOpen((o) => !o)}
                aria-label="Menu"
                className="flex items-center justify-center w-10 h-10 rounded-lg hover:bg-white/5 transition"
              >
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="18" x2="21" y2="18" />
                </svg>
              </button>

              {navOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-surface border border-gray-700 rounded-lg shadow-xl py-1 z-50">
                  {NAV_LINKS.map((l) => (
                    <Link key={l.to} to={l.to} className="block px-4 py-3 text-sm font-semibold hover:bg-white/5 transition">{l.label}</Link>
                  ))}

                  <div className="border-t border-gray-700 my-1" />

                  {!user ? (
                    <Link to="/login" className="block px-4 py-3 text-sm font-semibold text-brand hover:bg-white/5 transition">Log in / Sign up</Link>
                  ) : (
                    <>
                      <div className="px-4 py-2 text-xs text-gray-400 truncate">
                        {user.role === 'admin' && <span className="mr-1 text-brand">[Admin]</span>}{user.email}
                      </div>
                      <Link to="/my-agents" className="block px-4 py-3 text-sm hover:bg-white/5 transition">Manage My Agents</Link>
                      <Link to="/profile" className="block px-4 py-3 text-sm hover:bg-white/5 transition">Edit profile</Link>
                      {user.role === 'admin' && (
                        <Link to="/admin" className="block px-4 py-3 text-sm hover:bg-white/5 transition">Admin portal</Link>
                      )}
                      <button onClick={handleSignOut} className="block w-full text-left px-4 py-3 text-sm text-red-400 hover:bg-white/5 transition">Sign out</button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>
    </header>
  )
}