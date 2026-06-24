import { useLocation } from 'react-router-dom'

export default function PageTransition({ children }) {
  const location = useLocation()
  // keying on the path makes React remount on every route change,
  // which replays the fade-in animation each time
  return (
    <div key={location.pathname} className="animate-fadeIn">
      {children}
    </div>
  )
}