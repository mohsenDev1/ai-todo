import type { NextFunction, Request, Response } from 'express'
import jwt from 'jsonwebtoken'

const TOKEN_HEADER = 'authorization'

type TokenPayload = {
  sub: string
  email: string
}

function getSecret() {
  const secret = process.env.JWT_SECRET
  if (!secret) throw new Error('JWT_SECRET is missing')
  return secret
}

export function createToken(payload: TokenPayload) {
  return jwt.sign(payload, getSecret(), { expiresIn: '7d' })
}

export function authGuard(req: Request, res: Response, next: NextFunction) {
  const header = req.headers[TOKEN_HEADER]
  const raw = Array.isArray(header) ? header[0] : header
  if (!raw?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  const token = raw.slice(7)
  try {
    const decoded = jwt.verify(token, getSecret()) as TokenPayload
    req.user = { id: decoded.sub, email: decoded.email }
    next()
  } catch {
    res.status(401).json({ error: 'Invalid token' })
  }
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: {
        id: string
        email: string
      }
    }
  }
}

