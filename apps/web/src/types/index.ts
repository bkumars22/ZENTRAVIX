export type RoleLevel = 'JUNIOR' | 'SENIOR' | 'LEAD' | 'MANAGER' | 'VP' | 'EXECUTIVE' | 'CEO'

export interface SessionUser {
  id: string
  email: string
  name: string
  role: RoleLevel
  title: string
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
  project?: { name: string; jiraKey: string }
}

export interface Timesheet {
  id: string
  weekStart: string
  totalHours: number
  submitted: boolean
  entries: Array<{ day: string; project: string; hours: number }>
}

export interface TeamMember {
  id: string
  name: string
  title: string
  tasksToday: number
  prsOpen: number
  hoursThisWeek: number
  status: string
  aiFlag?: string
}
