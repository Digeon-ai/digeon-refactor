import { createContext, useContext, useState, useEffect } from 'react'

const CartContext = createContext(null)

export function CartProvider({ children }) {
  const [items, setItems] = useState([]) // [{id, name, price, type}]

  // load once
  useEffect(() => {
    try {
      const saved = localStorage.getItem('cart')
      if (saved) setItems(JSON.parse(saved))
    } catch {}
  }, [])

  // persist on change
  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(items))
  }, [items])

  function addToCart(agent) {
    setItems((prev) => (prev.some((i) => i.id === agent.id) ? prev : [...prev, agent]))
  }
  function removeFromCart(id) {
    setItems((prev) => prev.filter((i) => i.id !== id))
  }
  function clearCart() { setItems([]) }
  function inCart(id) { return items.some((i) => i.id === id) }

  return (
    <CartContext.Provider value={{ items, addToCart, removeFromCart, clearCart, inCart }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() { return useContext(CartContext) }