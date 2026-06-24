import { Router, Response } from 'express'
import { prisma } from '../index'
import { AuthenticatedRequest } from '../middleware/auth'

const router = Router()

router.get('/dashboard', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id

    const [myTasks, myPRs, myTimesheet] = await Promise.all([
      prisma.task.findMany({
        where: { assigneeId: userId },
        orderBy: [{ priority: 'asc' }, { dueDate: 'asc' }],
      }),
      prisma.pullRequest.findMany({
        where: { authorId: userId },
        include: { project: { select: { name: true, jiraKey: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.timesheet.findFirst({
        where: { userId },
        orderBy: { weekStart: 'desc' },
      }),
    ])

    const myTestRun = {
      runId: 'qaip-run-20260623-001',
      passRate: 94.2,
      coverage: 88.4,
      defects: 2,
      branch: 'feature/auth-fix',
      runAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    }

    const data = {
      myTasks,
      myPRs,
      myTestRun,
      myTimesheet,
    }

    return res.json(data)
  } catch (err) {
    console.error('Individual dashboard error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
