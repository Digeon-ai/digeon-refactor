import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../AuthContext.jsx'
import { useCart } from '../CartContext.jsx'

export default function Navbar() {
  const { user, logout } = useAuth()
  const [open, setOpen] = useState(false)
  const menuRef = useRef(null)
  const navigate = useNavigate()
  const { items } = useCart()
  const location = useLocation()
  const showCart = items.length > 0 || location.pathname === '/marketplace'

  // close dropdown when clicking outside
  useEffect(() => {
    function onClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  function handleSignOut() {
    logout()
    setOpen(false)
    navigate('/')
  }

  return (
    <header>
      <nav className="navbar bg-surface/90 backdrop-blur-md shadow-md sticky top-0 z-50 transition-all duration-300">
        <div className="container mx-auto flex items-center justify-between max-w-7xl px-6 py-3">
          <Link to="/" className="logo flex items-center space-x-2">
            <img src="/images/logo.png" alt="Digeon.ai logo" className="h-11 w-auto rounded-lg" />
          </Link>

          <div className="flex items-center gap-8">
            <ul className="nav-links flex gap-6 md:gap-8 text-[0.95rem] font-semibold">
              <li><Link to="/directory" className="hover:text-brand transition">Directory</Link></li>
              <li><Link to="/marketplace" className="hover:text-brand transition">Marketplace</Link></li>
              <li><Link to="/developer" className="hover:text-brand transition">Developer Portal</Link></li>
              <li><Link to="/blog" className="hover:text-brand transition">Blog</Link></li>
              <li><Link to="/contact" className="hover:text-brand transition">Contact Us</Link></li>
            </ul>
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

            {/* Right-side auth control */}
            {!user ? (
              <Link
                to="/login"
                className="border border-brand text-brand hover:bg-brand hover:text-white px-4 py-2 rounded-full text-sm font-semibold transition"
              >
                Log in / Sign up
              </Link>
            ) : (
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setOpen((o) => !o)}
                  className="flex items-center gap-2 text-sm font-semibold hover:text-brand transition"
                >
                  {user.role === 'admin' && (
                    <span className="text-xs px-2 py-0.5 rounded-full border border-brand text-brand">
                      Admin
                    </span>
                  )}
                  <span>{user.email}</span>
                  <span className="text-gray-400">▾</span>
                </button>

                {open && (
                  <div className="absolute right-0 mt-2 w-52 bg-surface border border-gray-700 rounded-lg shadow-xl py-1 z-50">
                    <Link
                      to="/my-agents"
                      onClick={() => setOpen(false)}
                      className="block px-4 py-2.5 text-sm hover:bg-white/5 transition"
                    >
                      Manage My Agents
                    </Link>
                    <Link
                      to="/profile"
                      onClick={() => setOpen(false)}
                      className="block px-4 py-2.5 text-sm hover:bg-white/5 transition"
                    >
                      Edit profile
                    </Link>
                    {user.role === 'admin' && (
                      <Link
                        to="/admin"
                        onClick={() => setOpen(false)}
                        className="block px-4 py-2.5 text-sm hover:bg-white/5 transition"
                      >
                        Admin portal
                      </Link>
                    )}
                    <button
                      onClick={handleSignOut}
                      className="block w-full text-left px-4 py-2.5 text-sm text-red-400 hover:bg-white/5 transition"
                    >
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </nav>
    </header>
  )
}