import { Router, Response } from 'express'
import { prisma } from '../index'
import { AuthenticatedRequest } from '../middleware/auth'

const router = Router()

router.get('/dashboard', async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const [tasks, alerts, activeSprint] = await Promise.all([
      prisma.task.findMany({
        include: { assignee: { select: { name: true, title: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.aiAlert.findMany({
        where: { targetRole: 'MANAGER' },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.sprint.findFirst({
        where: { isActive: true },
      }),
    ])

    const team = [
      { id: 'user-senior-dev', name: 'Meera Iyer', title: 'Senior Developer', tasksToday: 3, prsOpen: 2, hoursThisWeek: 34, status: 'ON_TRACK' },
      { id: 'user-junior-qa', name: 'Arjun Patel', title: 'QA Engineer', tasksToday: 2, prsOpen: 0, hoursThisWeek: 28, status: 'BLOCKED', aiFlag: 'Arjun blocked on dependency from Platform team for 3 days' },
      { id: 'user-rahul', name: 'Rahul Shah', title: 'Developer', tasksToday: 4, prsOpen: 1, hoursThisWeek: 38, status: 'ON_TRACK' },
      { id: 'user-priya', name: 'Priya Singh', title: 'Developer', tasksToday: 1, prsOpen: 3, hoursThisWeek: 22, status: 'AT_RISK', aiFlag: 'Priya has 3 PRs open over 48hrs — needs reviewer assignment' },
    ]

    const sprint = activeSprint ?? {
      id: 'sprint-scip-12',
      name: 'Sprint 12',
      committedPoints: 50,
      completedPoints: 32,
      velocity: 42,
      startDate: new Date('2026-06-09').toISOString(),
      endDate: new Date('2026-06-22').toISOString(),
      isActive: true,
      projectId: 'project-scip',
    }

    const data = {
      team,
      tasks,
      sprint,
      alerts,
      burndown: { totalPoints: 50, completedPoints: 32, daysRemaining: 3 },
    }

    return res.json(data)
  } catch (err) {
    console.error('Manager dashboard error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
