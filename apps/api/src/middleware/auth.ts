import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'

export interface AuthenticatedRequest extends Request {
  user?: { id: string; email: string; role: string; name: string }
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) return res.status(401).json({ error: 'Unauthorized' })
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET ?? 'dev-secret') as { id: string; email: string; role: string; name: string }
    req.user = payload
    next()
  } catch {
    res.status(401).json({ error: 'Invalid token' })
  }
}

export function requireRole(minLevel: number) {
  const LEVELS: Record<string, number> = {
    JUNIOR: 1,
    SENIOR: 2,
    LEAD: 3,
    MANAGER: 4,
    VP: 5,
    EXECUTIVE: 6,
    CEO: 7,
  }
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const level = LEVELS[req.user?.role ?? ''] ?? 0
    if (level < minLevel) return res.status(403).json({ error: 'Insufficient permissions' })
    next()
  }
}
