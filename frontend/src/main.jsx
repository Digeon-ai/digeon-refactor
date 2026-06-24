import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import './index.css'
import { AuthProvider } from './AuthContext.jsx'
import { DirectoryProvider } from './DirectoryContext.jsx'
import { ToastProvider } from './ToastContext.jsx'
import { CartProvider } from './CartContext.jsx'


createRoot(document.getElementById('root')).render(
 <StrictMode>
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <CartProvider>
            <DirectoryProvider>
              <App />
           </DirectoryProvider>
          </CartProvider>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  </StrictMode>,
)