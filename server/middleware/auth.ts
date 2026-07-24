import { Request, Response, NextFunction } from 'express'
import { query } from '../db/index.js'
import { config } from '../config.js'

export interface AuthUser {
  id: number
  feishu_id: string
  name: string
  email: string
  avatar: string
  tenant_key: string
  role: 'owner' | 'admin' | 'user'
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser
    }
  }
}

export async function authMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (config.authDebug) {
    req.user = { id: 1, feishu_id: 'debug', name: '调试用户', email: 'debug@local', avatar: '', tenant_key: 'debug', role: 'owner' }
    return next()
  }

  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Not authenticated' })
    return
  }

  const sessionId = authHeader.substring(7)

  try {
    const { rows } = await query<AuthUser & { session_id: string }>(
      `SELECT u.id, u.feishu_id, u.name, u.email, u.avatar, u.tenant_key, u.role, s.id as session_id
       FROM sessions s
       JOIN users u ON s.user_id = u.id
       WHERE s.id = $1 AND s.expires_at > NOW()`,
      [sessionId]
    )

    if (rows.length === 0) {
      res.status(401).json({ error: 'Invalid or expired session' })
      return
    }

    req.user = {
      id: rows[0].id,
      feishu_id: rows[0].feishu_id,
      name: rows[0].name,
      email: rows[0].email,
      avatar: rows[0].avatar,
      tenant_key: rows[0].tenant_key,
      role: (rows[0].role as AuthUser['role']) || 'user',
    }

    next()
  } catch (err) {
    res.status(500).json({ error: 'Authentication error' })
  }
}

export function adminMiddleware(req: Request, res: Response, next: NextFunction): void {
  const role = req.user?.role
  if (role !== 'owner' && role !== 'admin') {
    res.status(403).json({ error: 'Admin access required' })
    return
  }
  next()
}

export function ownerMiddleware(req: Request, res: Response, next: NextFunction): void {
  if (req.user?.role !== 'owner') {
    res.status(403).json({ error: 'Owner access required' })
    return
  }
  next()
}
