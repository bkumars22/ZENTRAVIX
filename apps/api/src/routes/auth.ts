import { Router, Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { prisma } from '../index'
import { requireAuth, AuthenticatedRequest } from '../middleware/auth'

const router = Router()

router.post('/login', async (req: Request, res: Response) => {
  const { email, password } = req.body
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' })
  }

  try {
    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } })
    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    const valid = await bcrypt.compare(password, user.passwordHash)
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, name: user.name, title: user.title },
      process.env.JWT_SECRET ?? 'dev-secret',
      { expiresIn: '24h' }
    )

    return res.json({
      token,
      user: { id: user.id, email: user.email, name: user.name, role: user.role, title: user.title },
    })
  } catch (err) {
    console.error('Login error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

router.get('/me', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { id: true, email: true, name: true, role: true, title: true, departmentId: true },
    })
    if (!user) return res.status(404).json({ error: 'User not found' })
    return res.json(user)
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
