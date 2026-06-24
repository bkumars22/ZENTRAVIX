import { Router, Request, Response } from 'express'
import { prisma } from '../index'

const router = Router()

router.get('/', async (_req: Request, res: Response) => {
  try {
    const projects = await prisma.project.findMany({
      include: {
        department: { select: { name: true } },
        sprints: { orderBy: { startDate: 'desc' }, take: 1 },
        releases: { orderBy: { plannedDate: 'asc' } },
        _count: { select: { pullRequests: true } },
      },
      orderBy: { createdAt: 'asc' },
    })
    return res.json(projects)
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error' })
  }
})

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const project = await prisma.project.findUnique({
      where: { id: req.params.id },
      include: {
        department: { select: { name: true } },
        sprints: { orderBy: { startDate: 'asc' } },
        releases: { orderBy: { plannedDate: 'asc' } },
        pullRequests: {
          include: { author: { select: { name: true } } },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        aiAlerts: { orderBy: { createdAt: 'desc' }, take: 5 },
      },
    })
    if (!project) return res.status(404).json({ error: 'Project not found' })
    return res.json(project)
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
