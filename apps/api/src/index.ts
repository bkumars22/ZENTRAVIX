import express from 'express'
import cors from 'cors'
import http from 'http'
import { Server as SocketServer } from 'socket.io'
import { PrismaClient } from '@prisma/client'
import { createClient } from 'redis'

import authRoutes from './routes/auth'
import ceoRoutes from './routes/ceo'
import vpRoutes from './routes/vp'
import managerRoutes from './routes/manager'
import individualRoutes from './routes/individual'
import projectRoutes from './routes/projects'
import qaipRoutes from './routes/qaip'
import aiRoutes from './routes/ai'
import { requireAuth } from './middleware/auth'

export const prisma = new PrismaClient()

export const redisClient = createClient({ url: process.env.REDIS_URL ?? 'redis://localhost:6379' })
redisClient.on('error', (err) => console.error('Redis error:', err))

const app = express()
const server = http.createServer(app)

export const io = new SocketServer(server, {
  cors: {
    origin: [
      'http://localhost:3000',
      'https://bkumars22.github.io',
    ],
    methods: ['GET', 'POST'],
    credentials: true,
  },
})

app.use(cors({
  origin: [
    'http://localhost:3000',
    'https://bkumars22.github.io',
  ],
  credentials: true,
}))

app.use(express.json())

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'AURANEX API', timestamp: new Date().toISOString() })
})

app.use('/api/auth', authRoutes)
app.use('/api/ceo', requireAuth, ceoRoutes)
app.use('/api/vp', requireAuth, vpRoutes)
app.use('/api/manager', requireAuth, managerRoutes)
app.use('/api/me', requireAuth, individualRoutes)
app.use('/api/projects', requireAuth, projectRoutes)
app.use('/api/qaip', qaipRoutes)
app.use('/api/ai', requireAuth, aiRoutes)

io.on('connection', (socket) => {
  const role = socket.handshake.query.role as string
  if (role) socket.join(`role:${role}`)
  socket.on('disconnect', () => {})
})

async function start() {
  await redisClient.connect()
  const PORT = process.env.PORT ?? 3001
  server.listen(PORT, () => {
    console.log(`AURANEX API running on port ${PORT}`)
  })
}

start().catch(console.error)
