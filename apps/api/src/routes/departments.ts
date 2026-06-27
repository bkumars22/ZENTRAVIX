import { Router, Request, Response } from 'express'
import { emitToRole, emitToAll } from '../services/socket'

const router = Router()

const AI_ENGINE = process.env.AI_ENGINE_URL ?? 'http://localhost:8001'
const DEPARTMENTS = ['devops', 'security', 'finance', 'product'] as const
type Department = typeof DEPARTMENTS[number]

async function fetchFromEngine(path: string): Promise<unknown> {
  const res = await fetch(`${AI_ENGINE}${path}`, { signal: AbortSignal.timeout(30_000) })
  if (!res.ok) throw new Error(`AI engine ${path} → ${res.status}`)
  return res.json()
}

// GET /api/dept/:dept/snapshot — served from AI engine cache (fast)
router.get('/:department/snapshot', async (req: Request, res: Response) => {
  const dept = req.params.department as Department
  if (!DEPARTMENTS.includes(dept)) return res.status(400).json({ error: `Unknown department: ${dept}` })
  try {
    const data = await fetchFromEngine(`/dept/${dept}/snapshot`)
    return res.json(data)
  } catch (err) {
    return res.status(503).json({ error: String(err) })
  }
})

// POST /api/dept/:dept/refresh — trigger pipeline, broadcast result via WebSocket
router.post('/:department/refresh', async (req: Request, res: Response) => {
  const dept = req.params.department as Department
  if (!DEPARTMENTS.includes(dept)) return res.status(400).json({ error: `Unknown department: ${dept}` })
  try {
    const result = await fetchFromEngine(`/dept/${dept}/snapshot`)  // get latest after engine refreshes
    // Broadcast to role rooms
    emitToAll(`dept:${dept}:update`, result)
    return res.json({ status: 'refreshed', department: dept })
  } catch (err) {
    return res.status(503).json({ error: String(err) })
  }
})

// GET /api/dept/:dept/alerts — unresolved P0/P1 alerts
router.get('/:department/alerts', async (req: Request, res: Response) => {
  const dept = req.params.department as Department
  const severity = (req.query.severity as string) ?? 'P1'
  if (!DEPARTMENTS.includes(dept)) return res.status(400).json({ error: `Unknown department: ${dept}` })
  try {
    const data = await fetchFromEngine(`/dept/${dept}/alerts?severity=${severity}`)
    return res.json(data)
  } catch (err) {
    return res.status(503).json({ error: String(err) })
  }
})

// GET /api/dept/all/snapshots — all 4 departments in one call
router.get('/all/snapshots', async (_req: Request, res: Response) => {
  const results: Record<string, unknown> = {}
  await Promise.allSettled(
    DEPARTMENTS.map(async (dept) => {
      try {
        results[dept] = await fetchFromEngine(`/dept/${dept}/snapshot`)
      } catch {
        results[dept] = { error: 'unavailable' }
      }
    })
  )
  return res.json(results)
})

export default router
