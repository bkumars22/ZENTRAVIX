import { Router, Response } from 'express'
import { AuthenticatedRequest } from '../middleware/auth'

const router = Router()

const KNOWLEDGE_BASE: Array<{ pattern: RegExp; answer: string }> = [
  {
    pattern: /scip.*(delay|block|p0|bug|issue)/i,
    answer: 'SCIP Sprint #12 has 1 open P0 bug in the auth module — unresolved for 48 hours. Release gated until P0 resolved. Current velocity dropped from 46 to 42 this sprint. Recommended action: assign senior developer immediately and run daily standups on this item.',
  },
  {
    pattern: /aria.*(status|ready|release)/i,
    answer: 'ARIA v1.8.0 is on track for the July 1 release. Test coverage at 98.6%, pass rate 98.6%, 0 P0 issues. Socratic engine validated. Release readiness: CONFIRMED.',
  },
  {
    pattern: /sales.*(pipeline|revenue|q3)/i,
    answer: 'Current pipeline at 2.3x coverage against Q3 target of Rs.5Cr. 3 deals in final stages worth Rs.2.1Cr combined: TechCorp Enterprise (Rs.1.2Cr, 80% probability), GlobalRetail Platform (Rs.85L, 60%), MegaCorp renewal closed at Rs.2.4Cr. Pipeline below 3x threshold — at risk without new additions.',
  },
  {
    pattern: /burn.*(rate|budget|runway)/i,
    answer: 'Current monthly burn: Rs.1.8Cr. Runway: 14 months at current rate. Technology spend Rs.5.2Cr of Rs.8Cr budget (65% utilised, Q2). Cloud spend trajectory projects Q4 overage of Rs.12L — recommend review of cloud resource allocation.',
  },
  {
    pattern: /nps|customer.*(health|satisfaction)/i,
    answer: 'Organisation NPS: 67 (up from 63 last month, +4 pts). Customer portfolio health: TechCorp 85/100, GlobalRetail 72/100 (churn risk 18% — monitor closely), StartupXYZ 90/100. 1 SLA breach open at GlobalRetail.',
  },
  {
    pattern: /headcount|hiring|team/i,
    answer: 'Current headcount: 142 of 150 planned. 8 open roles, 12 candidates in interview stage, 3 offers pending acceptance. Technology department: 47 (Engineering 32, QA 8, DevOps 7). At current hiring pace, full headcount by Q3.',
  },
  {
    pattern: /velocity|sprint|scrum/i,
    answer: 'SCIP Sprint #12 velocity: 42 story points (down from 46 in Sprint #10). Sprint commitment: 50 points, completed: 32 (64%). 3 developers blocked on platform dependencies. AI prediction: 8 points will not complete this sprint — recommend scope reduction.',
  },
]

router.post('/query', (req: AuthenticatedRequest, res: Response) => {
  const { question } = req.body as { question: string }
  if (!question?.trim()) {
    return res.status(400).json({ error: 'Question is required' })
  }

  const match = KNOWLEDGE_BASE.find((kb) => kb.pattern.test(question))
  const answer = match
    ? match.answer
    : `Based on current ZENTRAVIX data: your question about "${question.slice(0, 60)}" requires analysis beyond the current knowledge base. Please contact your department head or run a full AI analysis via the VP dashboard for detailed insights.`

  return res.json({ answer, source: match ? 'knowledge_base' : 'fallback' })
})

export default router
