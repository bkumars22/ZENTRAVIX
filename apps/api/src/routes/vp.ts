import { Router, Response } from 'express'
import { prisma } from '../index'
import { AuthenticatedRequest } from '../middleware/auth'

const router = Router()

router.get('/dashboard', async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const [projects, budgets, sprints, releases, alerts] = await Promise.all([
      prisma.project.findMany({ orderBy: { createdAt: 'asc' } }),
      prisma.budget.findMany({ where: { departmentId: 'dept-technology' }, orderBy: { category: 'asc' } }),
      prisma.sprint.findMany({
        where: { projectId: 'project-scip' },
        orderBy: { startDate: 'asc' },
        take: 8,
      }),
      prisma.release.findMany({
        include: { project: { select: { name: true } } },
        orderBy: { plannedDate: 'asc' },
      }),
      prisma.aiAlert.findMany({
        where: { targetRole: { in: ['VP', 'EXECUTIVE'] } },
        orderBy: { createdAt: 'desc' },
      }),
    ])

    const data = {
      projects,
      budgets,
      sprints,
      alerts,
      teamCapacity: { available: 1840, committed: 1520 },
      headcount: 47,
      hiringPipeline: { open: 8, interviews: 12, offers: 3 },
      releases: releases.map((r) => ({ ...r, projectName: r.project.name })),
    }

    return res.json(data)
  } catch (err) {
    console.error('VP dashboard error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
