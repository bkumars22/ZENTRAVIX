'use client'

import { useEffect, useRef, useState } from 'react'
import { io, Socket } from 'socket.io-client'

const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? 'http://localhost:3001'

export function useWebSocket(role: string) {
  const socketRef = useRef<Socket | null>(null)
  const [connected, setConnected] = useState(false)
  const [lastEvent, setLastEvent] = useState<{ event: string; data: unknown } | null>(null)

  useEffect(() => {
    if (!role) return

    socketRef.current = io(WS_URL, {
      query: { role },
      transports: ['websocket', 'polling'],
    })

    socketRef.current.on('connect', () => setConnected(true))
    socketRef.current.on('disconnect', () => setConnected(false))

    socketRef.current.on('qaip:update', (data: unknown) => {
      setLastEvent({ event: 'qaip:update', data })
    })

    return () => {
      socketRef.current?.disconnect()
    }
  }, [role])

  return { connected, lastEvent, socket: socketRef.current }
}
