import { Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar.jsx'
import Footer from './components/Footer.jsx'
import Home from './pages/Home.jsx'
import Directory from './pages/Directory.jsx'
import Login from './pages/Login.jsx'
import Register from './pages/Register.jsx'
import ForgotPassword from './pages/ForgotPassword.jsx'
import Profile from './pages/Profile.jsx'
import PageTransition from './components/PageTransition.jsx'
import Admin from './pages/Admin.jsx'
import Blog from './pages/Blog.jsx'
import BlogPost from './pages/BlogPost.jsx'
import Contact from './pages/Contact.jsx'
import Marketplace from './pages/Marketplace.jsx'
import Cart from './pages/Cart.jsx'
import CheckoutSuccess from './pages/CheckoutSuccess.jsx'
import MyAgents from './pages/MyAgents.jsx'
import DeveloperPortal from './pages/DeveloperPortal.jsx'
import RegisterAgent from './pages/RegisterAgent.jsx'
import AdminUser from './pages/AdminUser.jsx'


function Placeholder({ name }) {
  return (
    <div className="min-h-[60vh] flex items-center justify-center text-center px-6">
      <p className="text-gray-400 text-lg">
        <span className="text-brand font-semibold">{name}</span> page — coming soon.
      </p>
    </div>
  )
}

export default function App() {
  return (
    <>
      <Navbar />
      <PageTransition>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/directory" element={<Directory />} />
          <Route path="/marketplace" element={<Marketplace />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/checkout-success" element={<CheckoutSuccess />} />
          <Route path="/blog" element={<Blog />} />
          <Route path="/blog/:id" element={<BlogPost />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/admin/users/:id" element={<AdminUser />} />
          <Route path="/my-agents" element={<MyAgents />} />
          <Route path="/developer" element={<DeveloperPortal />} />
          <Route path="/developer/register" element={<RegisterAgent />} />
        </Routes>
      </PageTransition>
      <Footer />
    </>
  )
}