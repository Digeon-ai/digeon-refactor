import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import 'dotenv/config'
import crypto from 'crypto'

// password rules: >=8, upper, lower, number, special
export function validatePassword(pw) {
  const checks = {
    length: pw.length >= 8,
    upper: /[A-Z]/.test(pw),
    lower: /[a-z]/.test(pw),
    number: /[0-9]/.test(pw),
    special: /[^A-Za-z0-9]/.test(pw),
  }
  const valid = Object.values(checks).every(Boolean)
  return { valid, checks }
}

export const hashPassword = (pw) => bcrypt.hash(pw, 10)
export const comparePassword = (pw, hash) => bcrypt.compare(pw, hash)

export const sixDigitCode = () =>
  String(Math.floor(100000 + Math.random() * 900000))

export const randomToken = () => crypto.randomBytes(32).toString('hex')


export const signToken = (user) =>
  jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  )

// middleware to protect routes
export function requireAuth(req, res, next) {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) return res.status(401).json({ error: 'No token' })
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET)
    next()
  } catch {
    res.status(401).json({ error: 'Invalid token' })
  }
}

export function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Admin only' })
  next()
}