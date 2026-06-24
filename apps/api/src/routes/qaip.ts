import { Router, Request, Response } from 'express'
import { prisma, io } from '../index'
import { AlertSeverity } from '@prisma/client'

const router = Router()

interface QaipWebhookBody {
  project_id: string
  run_id: string
  coverage: number
  defects: number
  p0_count: number
  p1_count: number
  pass_rate: number
  report_url: string
}

router.post('/webhook', async (req: Request, res: Response) => {
  const secret = req.headers['x-qaip-secret']
  if (secret !== (process.env.QAIP_WEBHOOK_SECRET ?? 'ZENTRAVIX-qaip-2026')) {
    return res.status(401).json({ error: 'Invalid webhook secret' })
  }

  const body: QaipWebhookBody = req.body

  try {
    const project = await prisma.project.findFirst({
      where: {
        OR: [
          { jiraKey: { equals: body.project_id, mode: 'insensitive' } },
          { name: { equals: body.project_id, mode: 'insensitive' } },
        ],
      },
    })

    if (!project) {
      return res.status(404).json({ error: `Project not found: ${body.project_id}` })
    }

    const updatedProject = await prisma.project.update({
      where: { id: project.id },
      data: {
        qaipScore: body.pass_rate,
        qaipPassRate: body.pass_rate,
        qaipDefects: body.defects,
        qaipP0Count: body.p0_count,
        qaipP1Count: body.p1_count,
        qaipLastRun: new Date(),
        openP0s: body.p0_count,
        healthScore: body.p0_count > 0 ? Math.min(project.healthScore, 75) : project.healthScore,
      },
    })

    if (body.p0_count > 0) {
      await prisma.aiAlert.create({
        data: {
          severity: AlertSeverity.CRITICAL,
          category: 'QAIP',
          message: `${project.name} QAIP run ${body.run_id} found ${body.p0_count} P0 defect(s) — release gate blocked`,
          actionNeeded: `Fix P0 defects immediately. Report: ${body.report_url}`,
          targetRole: 'CEO',
          projectId: project.id,
        },
      })
    }

    io.to('role:CEO').emit('qaip:update', { project: updatedProject, runId: body.run_id })
    io.to('role:VP').emit('qaip:update', { project: updatedProject, runId: body.run_id })
    io.to('role:EXECUTIVE').emit('qaip:update', { project: updatedProject, runId: body.run_id })

    return res.json({ ok: true, project: updatedProject.name, passRate: body.pass_rate })
  } catch (err) {
    console.error('QAIP webhook error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
