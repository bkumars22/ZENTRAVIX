import { io } from '../index'
import { createClient } from 'redis'

export function emitToRole(role: string, event: string, data: unknown) {
  io.to(`role:${role}`).emit(event, data)
}

export function emitToAll(event: string, data: unknown) {
  io.emit(event, data)
}

// ---------------------------------------------------------------------------
// Redis pub/sub bridge — Python AI engine publishes dept snapshots and
// critical alerts; we forward them to the correct Socket.io rooms.
// ---------------------------------------------------------------------------

const REDIS_URL = process.env.REDIS_URL ?? 'redis://localhost:6379/0'

const DEPT_CHANNELS = [
  'zentravix:dept:devops:snapshot',
  'zentravix:dept:security:snapshot',
  'zentravix:dept:finance:snapshot',
  'zentravix:dept:product:snapshot',
  'zentravix:alert:critical',
]

export async function startRedisBridge(): Promise<void> {
  const subscriber = createClient({ url: REDIS_URL })

  subscriber.on('error', (err) => {
    console.error('[Redis bridge] error:', err)
  })

  await subscriber.connect()

  for (const channel of DEPT_CHANNELS) {
    await subscriber.subscribe(channel, (rawMessage) => {
      try {
        const { event, data } = JSON.parse(rawMessage) as { event: string; data: unknown }

        if (channel === 'zentravix:alert:critical') {
          // Critical alerts go to CEO + MANAGER rooms immediately
          emitToRole('CEO',     event, data)
          emitToRole('MANAGER', event, data)
          emitToRole('LEAD',    event, data)
          io.emit(event, data)   // also broadcast to all connected clients
        } else {
          // Regular snapshots go to all connected clients
          io.emit(event, data)
        }
      } catch (err) {
        console.error('[Redis bridge] parse error on', channel, err)
      }
    })
  }

  console.log('[Redis bridge] subscribed to', DEPT_CHANNELS.length, 'channels')
}

// Register Socket.io room join on connection
export function registerSocketRooms(): void {
  io.on('connection', (socket) => {
    const role = (socket.handshake.query.role as string)?.toUpperCase()
    if (role) {
      socket.join(`role:${role}`)
    }

    socket.on('join:department', (dept: string) => {
      socket.join(`dept:${dept}`)
    })

    socket.on('leave:department', (dept: string) => {
      socket.leave(`dept:${dept}`)
    })

    socket.on('request:snapshot', async (dept: string) => {
      try {
        const res = await fetch(`${process.env.AI_ENGINE_URL ?? 'http://localhost:8001'}/dept/${dept}/snapshot`)
        if (res.ok) {
          const data = await res.json()
          socket.emit(`dept:${dept}:update`, data)
        }
      } catch {
        socket.emit(`dept:${dept}:error`, { message: 'Snapshot unavailable' })
      }
    })
  })
}
