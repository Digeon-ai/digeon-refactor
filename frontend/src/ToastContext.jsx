import { createContext, useContext, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'

const ToastContext = createContext(null)

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null)
  const navigate = useNavigate()

  const showToast = useCallback((message, options = {}) => {
    const { actionLabel, actionTo, duration = 5000 } = options
    setToast({ message, actionLabel, actionTo })
    if (duration) setTimeout(() => setToast(null), duration)
  }, [])

  function handleAction(to) {
    setToast(null)
    if (to) navigate(to)
  }

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toast && (
        <div className="fixed top-20 right-6 z-[100] max-w-sm bg-surface border border-brand rounded-xl shadow-2xl px-5 py-4 flex flex-col gap-3 animate-fadeIn">
          <p className="text-textlight text-sm">{toast.message}</p>
          <div className="flex items-center gap-3 justify-end">
            {toast.actionLabel && (
              <button
                onClick={() => handleAction(toast.actionTo)}
                className="bg-brand hover:bg-[#138c86] text-white text-sm font-semibold rounded-lg px-3 py-1.5 transition"
              >
                {toast.actionLabel}
              </button>
            )}
            <button onClick={() => setToast(null)} className="text-gray-400 text-sm hover:text-white">Dismiss</button>
          </div>
        </div>
      )}
    </ToastContext.Provider>
  )
}

export function useToast() {
  return useContext(ToastContext)
}