export type RoleLevel = 'JUNIOR' | 'SENIOR' | 'LEAD' | 'MANAGER' | 'VP' | 'EXECUTIVE' | 'CEO'

export const ROLE_LEVELS: Record<RoleLevel, number> = {
  JUNIOR: 1,
  SENIOR: 2,
  LEAD: 3,
  MANAGER: 4,
  VP: 5,
  EXECUTIVE: 6,
  CEO: 7,
}

export interface User {
  id: string
  email: string
  name: string
  role: RoleLevel
  title: string
  departmentId?: string
  managerId?: string
}

export interface Project {
  id: string
  name: string
  description: string
  repoUrl: string
  jiraKey: string
  status: string
  healthScore: number
  qaipScore: number
  qaipPassRate: number
  qaipDefects: number
  qaipP0Count: number
  qaipP1Count: number
  qaipLastRun?: string
  techStack: string
  releaseDate?: string
  sprintNumber: number
  velocity: number
  openP0s: number
}

export interface AiAlert {
  id: string
  severity: 'CRITICAL' | 'WARNING' | 'INFO'
  category: string
  message: string
  actionNeeded: string
  targetRole: RoleLevel
  isRead: boolean
  projectId?: string
  createdAt: string
}

export interface Sprint {
  id: string
  name: string
  committedPoints: number
  completedPoints: number
  velocity: number
  startDate: string
  endDate: string
  isActive: boolean
  projectId: string
}

export interface Release {
  id: string
  version: string
  plannedDate: string
  status: string
  qaipScore: number
  testCoverage: number
  p0Count: number
  p1Count: number
  projectId: string
  projectName?: string
}

export interface Budget {
  id: string
  fiscalYear: number
  fiscalQuarter: number
  allocated: number
  spent: number
  category: string
  departmentId: string
}

export interface Task {
  id: string
  title: string
  description: string
  status: string
  priority: string
  dueDate?: string
  projectKey: string
  assigneeId: string
}

export interface PullRequest {
  id: string
  title: string
  githubPrNum: number
  status: string
  linesChanged: number
  daysOpen: number
  branch: string
  authorId: string
}

export interface Timesheet {
  id: string
  weekStart: string
  totalHours: number
  submitted: boolean
}

export interface TeamMember {
  id: string
  name: string
  title: string
  tasksToday: number
  prsOpen: number
  hoursThisWeek: number
  status: string
}

export interface QaipTestRun {
  runId: string
  passRate: number
  coverage: number
  defects: number
  branch: string
  runAt: string
}

export interface Deal {
  id: string
  name: string
  stage: string
  value: number
  probability: number
  expectedClose: string
  customerName: string
}

export interface Customer {
  id: string
  name: string
  arr: number
  healthScore: number
  npsScore: number
  churnRisk: number
  renewalDate: string
}

export interface CeoDashboardData {
  revenue: { current: number; target: number; mom: number }
  burnRate: { monthly: number; runwayMonths: number }
  headcount: { current: number; planned: number }
  nps: { current: number; lastMonth: number }
  projects: Project[]
  alerts: AiAlert[]
  releases: Release[]
  techMetrics: {
    totalTests: number
    avgPassRate: number
    openP0s: number
    deployments: number
  }
}

export interface VpDashboardData {
  projects: Project[]
  budgets: Budget[]
  sprints: Sprint[]
  alerts: AiAlert[]
  teamCapacity: { available: number; committed: number }
  headcount: number
  hiringPipeline: { open: number; interviews: number; offers: number }
  releases: Release[]
}

export interface ManagerDashboardData {
  team: TeamMember[]
  tasks: Task[]
  sprint: Sprint
  alerts: AiAlert[]
  burndown: { totalPoints: number; completedPoints: number; daysRemaining: number }
}

export interface IndividualDashboardData {
  myTasks: Task[]
  myPRs: PullRequest[]
  myTestRun?: QaipTestRun
  myTimesheet?: Timesheet
}
