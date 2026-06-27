'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'

const WS_URL  = process.env.NEXT_PUBLIC_WS_URL  ?? 'http://localhost:3001'
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

function getToken() {
  return document.cookie.split('; ').find((r) => r.startsWith('ZENTRAVIX_token='))?.split('=')[1] ?? ''
}

export type DeptEvent = {
  event: string
  data:  unknown
}

export type RoleLevel = 'CEO' | 'EXECUTIVE' | 'VP' | 'MANAGER' | 'LEAD' | 'SENIOR' | 'JUNIOR'

export function useWebSocket(role: RoleLevel) {
  const socketRef  = useRef<Socket | null>(null)
  const [connected, setConnected]   = useState(false)
  const [lastEvent, setLastEvent]   = useState<DeptEvent | null>(null)
  const [criticalAlert, setCritical] = useState<DeptEvent | null>(null)

  useEffect(() => {
    if (!role) return
    socketRef.current = io(WS_URL, {
      query: { role },
      transports: ['websocket', 'polling'],
    })

    const socket = socketRef.current
    socket.on('connect',    () => setConnected(true))
    socket.on('disconnect', () => setConnected(false))

    // Legacy QAIP update
    socket.on('qaip:update', (data: unknown) => setLastEvent({ event: 'qaip:update', data }))

    // Department snapshots
    const DEPTS = ['devops', 'security', 'finance', 'product']
    DEPTS.forEach((dept) => {
      socket.on(`dept:${dept}:update`, (data: unknown) => {
        setLastEvent({ event: `dept:${dept}:update`, data })
      })
    })

    // Critical alerts (P0/P1 — pushed immediately)
    socket.on('dept:alert:critical', (data: unknown) => {
      setCritical({ event: 'dept:alert:critical', data })
    })

    return () => { socket.disconnect() }
  }, [role])

  const requestSnapshot = useCallback((dept: string) => {
    socketRef.current?.emit('request:snapshot', dept)
  }, [])

  const joinDept = useCallback((dept: string) => {
    socketRef.current?.emit('join:department', dept)
  }, [])

  return { connected, lastEvent, criticalAlert, socket: socketRef.current, requestSnapshot, joinDept }
}

// Department-specific hook — subscribes to one dept and fetches initial snapshot
export function useDeptSnapshot(dept: string, role: RoleLevel) {
  const [snapshot, setSnapshot] = useState<Record<string, unknown> | null>(null)
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState<string | null>(null)
  const { lastEvent, criticalAlert, connected, joinDept } = useWebSocket(role)

  // Fetch initial snapshot from REST API
  useEffect(() => {
    setLoading(true)
    fetch(`${API_URL}/api/dept/${dept}/snapshot`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(r.statusText)))
      .then((d) => { setSnapshot(d); setLoading(false) })
      .catch((e) => { setError(String(e)); setLoading(false) })
  }, [dept])

  // Subscribe to WebSocket dept room
  useEffect(() => {
    if (connected) joinDept(dept)
  }, [connected, dept, joinDept])

  // Apply live updates from WebSocket
  useEffect(() => {
    if (lastEvent?.event === `dept:${dept}:update`) {
      setSnapshot(lastEvent.data as Record<string, unknown>)
    }
  }, [lastEvent, dept])

  return { snapshot, loading, error, criticalAlert }
}
