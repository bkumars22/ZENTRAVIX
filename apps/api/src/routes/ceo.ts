import { Router, Response } from 'express'
import { prisma } from '../index'
import { AuthenticatedRequest } from '../middleware/auth'

const router = Router()

router.get('/dashboard', async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const [projects, releases, alerts] = await Promise.all([
      prisma.project.findMany({
        orderBy: { createdAt: 'asc' },
      }),
      prisma.release.findMany({
        include: { project: { select: { name: true } } },
        orderBy: { plannedDate: 'asc' },
      }),
      prisma.aiAlert.findMany({
        where: { targetRole: 'CEO' },
        orderBy: { createdAt: 'desc' },
      }),
    ])

    const totalTests = 328
    const avgPassRate = parseFloat(
      ((projects.reduce((sum, p) => sum + p.qaipPassRate, 0)) / Math.max(projects.length, 1)).toFixed(2)
    )
    const openP0s = projects.reduce((sum, p) => sum + p.openP0s, 0)

    const data = {
      revenue: { current: 42000000, target: 50000000, mom: 12 },
      burnRate: { monthly: 18000000, runwayMonths: 14 },
      headcount: { current: 142, planned: 150 },
      nps: { current: 67, lastMonth: 63 },
      projects,
      alerts,
      releases: releases.map((r) => ({
        ...r,
        projectName: r.project.name,
      })),
      techMetrics: {
        totalTests,
        avgPassRate,
        openP0s,
        deployments: 47,
      },
    }

    return res.json(data)
  } catch (err) {
    console.error('CEO dashboard error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
