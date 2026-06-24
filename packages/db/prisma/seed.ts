import { PrismaClient, RoleLevel, DepartmentType, ProjectStatus, AlertSeverity, DealStage } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding ZENTRAVIX database...')

  const PASSWORD_HASH = await bcrypt.hash('Zentravix@2026', 12)

  // Departments
  const techDept = await prisma.department.upsert({
    where: { id: 'dept-technology' },
    update: {},
    create: {
      id: 'dept-technology',
      name: 'Technology',
      type: DepartmentType.TECHNOLOGY,
      budgetAllocated: 80000000,
      budgetSpent: 52000000,
      headCount: 47,
    },
  })

  const financeDept = await prisma.department.upsert({
    where: { id: 'dept-finance' },
    update: {},
    create: {
      id: 'dept-finance',
      name: 'Finance',
      type: DepartmentType.FINANCE,
      budgetAllocated: 20000000,
      budgetSpent: 11000000,
      headCount: 12,
    },
  })

  const hrDept = await prisma.department.upsert({
    where: { id: 'dept-hr' },
    update: {},
    create: {
      id: 'dept-hr',
      name: 'HR',
      type: DepartmentType.HR,
      budgetAllocated: 15000000,
      budgetSpent: 8000000,
      headCount: 8,
    },
  })

  const salesDept = await prisma.department.upsert({
    where: { id: 'dept-sales' },
    update: {},
    create: {
      id: 'dept-sales',
      name: 'Sales',
      type: DepartmentType.SALES,
      budgetAllocated: 30000000,
      budgetSpent: 21000000,
      headCount: 18,
    },
  })

  const customerDept = await prisma.department.upsert({
    where: { id: 'dept-customer' },
    update: {},
    create: {
      id: 'dept-customer',
      name: 'Customer Success',
      type: DepartmentType.CUSTOMER,
      budgetAllocated: 10000000,
      budgetSpent: 6000000,
      headCount: 10,
    },
  })

  // Users
  const ceo = await prisma.user.upsert({
    where: { email: 'ceo@zentravix.io' },
    update: {},
    create: {
      id: 'user-ceo',
      email: 'ceo@zentravix.io',
      name: 'Anjali Sharma',
      passwordHash: PASSWORD_HASH,
      role: RoleLevel.CEO,
      title: 'CEO',
      departmentId: techDept.id,
    },
  })

  const cto = await prisma.user.upsert({
    where: { email: 'cto@zentravix.io' },
    update: {},
    create: {
      id: 'user-cto',
      email: 'cto@zentravix.io',
      name: 'Kiran Nair',
      passwordHash: PASSWORD_HASH,
      role: RoleLevel.EXECUTIVE,
      title: 'CTO',
      departmentId: techDept.id,
      managerId: ceo.id,
    },
  })

  await prisma.user.upsert({
    where: { email: 'cfo@zentravix.io' },
    update: {},
    create: {
      id: 'user-cfo',
      email: 'cfo@zentravix.io',
      name: 'Pradeep Rao',
      passwordHash: PASSWORD_HASH,
      role: RoleLevel.EXECUTIVE,
      title: 'CFO',
      departmentId: financeDept.id,
      managerId: ceo.id,
    },
  })

  const vpEng = await prisma.user.upsert({
    where: { email: 'vp.eng@zentravix.io' },
    update: {},
    create: {
      id: 'user-vp-eng',
      email: 'vp.eng@zentravix.io',
      name: 'Divya Menon',
      passwordHash: PASSWORD_HASH,
      role: RoleLevel.VP,
      title: 'VP Engineering',
      departmentId: techDept.id,
      managerId: cto.id,
    },
  })

  const manager = await prisma.user.upsert({
    where: { email: 'manager@zentravix.io' },
    update: {},
    create: {
      id: 'user-manager',
      email: 'manager@zentravix.io',
      name: 'Suresh Kumar',
      passwordHash: PASSWORD_HASH,
      role: RoleLevel.MANAGER,
      title: 'Engineering Manager',
      departmentId: techDept.id,
      managerId: vpEng.id,
    },
  })

  const seniorDev = await prisma.user.upsert({
    where: { email: 'senior.dev@zentravix.io' },
    update: {},
    create: {
      id: 'user-senior-dev',
      email: 'senior.dev@zentravix.io',
      name: 'Meera Iyer',
      passwordHash: PASSWORD_HASH,
      role: RoleLevel.SENIOR,
      title: 'Senior Developer',
      departmentId: techDept.id,
      managerId: manager.id,
    },
  })

  const juniorQa = await prisma.user.upsert({
    where: { email: 'junior.qa@zentravix.io' },
    update: {},
    create: {
      id: 'user-junior-qa',
      email: 'junior.qa@zentravix.io',
      name: 'Arjun Patel',
      passwordHash: PASSWORD_HASH,
      role: RoleLevel.JUNIOR,
      title: 'QA Engineer',
      departmentId: techDept.id,
      managerId: manager.id,
    },
  })

  // Projects
  const scipProject = await prisma.project.upsert({
    where: { id: 'project-scip' },
    update: {},
    create: {
      id: 'project-scip',
      name: 'SCIP',
      description: 'Supply Chain Intelligence Platform',
      repoUrl: 'https://github.com/bkumars22/SupplyChainPlatformProject',
      jiraKey: 'SCIP',
      status: ProjectStatus.ACTIVE,
      healthScore: 87,
      qaipScore: 95.7,
      qaipPassRate: 95.7,
      qaipDefects: 3,
      qaipP0Count: 1,
      qaipP1Count: 2,
      qaipLastRun: new Date('2026-06-23T10:00:00Z'),
      techStack: 'Java 17 + Spring Boot 3 + React 18 + Python FastAPI + IsolationForest + LangGraph + PostgreSQL',
      releaseDate: new Date('2026-07-15'),
      sprintNumber: 12,
      velocity: 42,
      openP0s: 1,
      departmentId: techDept.id,
    },
  })

  const ariaProject = await prisma.project.upsert({
    where: { id: 'project-aria' },
    update: {},
    create: {
      id: 'project-aria',
      name: 'ARIA',
      description: 'Adaptive Real-time Intelligence for Anyone',
      repoUrl: 'https://github.com/bkumars22/ARIA',
      jiraKey: 'ARIA',
      status: ProjectStatus.ACTIVE,
      healthScore: 94,
      qaipScore: 98.6,
      qaipPassRate: 98.6,
      qaipDefects: 1,
      qaipP0Count: 0,
      qaipP1Count: 1,
      qaipLastRun: new Date('2026-06-23T14:00:00Z'),
      techStack: 'Claude AI + LangGraph + React 18 + Spring Boot + Python FastAPI + Whisper STT + PostgreSQL',
      releaseDate: new Date('2026-07-01'),
      sprintNumber: 8,
      velocity: 38,
      openP0s: 0,
      departmentId: techDept.id,
    },
  })

  // Sprints for SCIP
  const sprintData = [
    { name: 'Sprint 5', committed: 45, completed: 38, velocity: 38, start: '2026-01-06', end: '2026-01-19' },
    { name: 'Sprint 6', committed: 48, completed: 44, velocity: 44, start: '2026-01-20', end: '2026-02-02' },
    { name: 'Sprint 7', committed: 44, completed: 40, velocity: 40, start: '2026-02-03', end: '2026-02-16' },
    { name: 'Sprint 8', committed: 50, completed: 48, velocity: 48, start: '2026-02-17', end: '2026-03-02' },
    { name: 'Sprint 9', committed: 46, completed: 45, velocity: 45, start: '2026-03-03', end: '2026-03-16' },
    { name: 'Sprint 10', committed: 52, completed: 46, velocity: 46, start: '2026-03-17', end: '2026-03-30' },
    { name: 'Sprint 11', committed: 48, completed: 44, velocity: 44, start: '2026-03-31', end: '2026-04-13' },
    { name: 'Sprint 12', committed: 50, completed: 42, velocity: 42, start: '2026-06-09', end: '2026-06-22' },
  ]

  for (let i = 0; i < sprintData.length; i++) {
    const s = sprintData[i]
    await prisma.sprint.upsert({
      where: { id: `sprint-scip-${i + 5}` },
      update: {},
      create: {
        id: `sprint-scip-${i + 5}`,
        name: s.name,
        committedPoints: s.committed,
        completedPoints: s.completed,
        velocity: s.velocity,
        startDate: new Date(s.start),
        endDate: new Date(s.end),
        isActive: s.name === 'Sprint 12',
        projectId: scipProject.id,
      },
    })
  }

  // Releases
  await prisma.release.upsert({
    where: { id: 'release-scip-240' },
    update: {},
    create: {
      id: 'release-scip-240',
      version: 'v2.4.0',
      plannedDate: new Date('2026-07-15'),
      status: 'IN_PROGRESS',
      qaipScore: 87,
      testCoverage: 95.7,
      p0Count: 1,
      p1Count: 2,
      projectId: scipProject.id,
    },
  })

  await prisma.release.upsert({
    where: { id: 'release-scip-250' },
    update: {},
    create: {
      id: 'release-scip-250',
      version: 'v2.5.0',
      plannedDate: new Date('2026-08-30'),
      status: 'PLANNED',
      qaipScore: 0,
      testCoverage: 0,
      p0Count: 0,
      p1Count: 0,
      projectId: scipProject.id,
    },
  })

  await prisma.release.upsert({
    where: { id: 'release-aria-180' },
    update: {},
    create: {
      id: 'release-aria-180',
      version: 'v1.8.0',
      plannedDate: new Date('2026-07-01'),
      status: 'IN_PROGRESS',
      qaipScore: 94,
      testCoverage: 98.6,
      p0Count: 0,
      p1Count: 1,
      projectId: ariaProject.id,
    },
  })

  await prisma.release.upsert({
    where: { id: 'release-aria-200' },
    update: {},
    create: {
      id: 'release-aria-200',
      version: 'v2.0.0',
      plannedDate: new Date('2026-09-15'),
      status: 'PLANNED',
      qaipScore: 0,
      testCoverage: 0,
      p0Count: 0,
      p1Count: 0,
      projectId: ariaProject.id,
    },
  })

  // AI Alerts
  await prisma.aiAlert.upsert({
    where: { id: 'alert-ceo-critical-scip' },
    update: {},
    create: {
      id: 'alert-ceo-critical-scip',
      severity: AlertSeverity.CRITICAL,
      category: 'Release',
      message: 'SCIP release blocked — P0 authentication bug open for 48 hours without fix',
      actionNeeded: 'Escalate to CTO, assign senior developer within 2 hours',
      targetRole: RoleLevel.CEO,
      projectId: scipProject.id,
    },
  })

  await prisma.aiAlert.upsert({
    where: { id: 'alert-vp-warning-sales' },
    update: {},
    create: {
      id: 'alert-vp-warning-sales',
      severity: AlertSeverity.WARNING,
      category: 'Sales',
      message: 'Sales pipeline below 3x coverage — Q3 revenue target at risk',
      actionNeeded: 'Review pipeline with Sales VP, accelerate late-stage deals',
      targetRole: RoleLevel.VP,
    },
  })

  await prisma.aiAlert.upsert({
    where: { id: 'alert-vp-info-aria' },
    update: {},
    create: {
      id: 'alert-vp-info-aria',
      severity: AlertSeverity.INFO,
      category: 'Release',
      message: 'ARIA test coverage 98.6% — release readiness confirmed for July 1',
      actionNeeded: '',
      targetRole: RoleLevel.VP,
      projectId: ariaProject.id,
    },
  })

  await prisma.aiAlert.upsert({
    where: { id: 'alert-manager-warning-sprint' },
    update: {},
    create: {
      id: 'alert-manager-warning-sprint',
      severity: AlertSeverity.WARNING,
      category: 'Sprint',
      message: 'Sprint velocity dropped 23% this week — 3 developers blocked on dependencies',
      actionNeeded: 'Run unblocking session, escalate dependency to Platform team',
      targetRole: RoleLevel.MANAGER,
    },
  })

  await prisma.aiAlert.upsert({
    where: { id: 'alert-junior-info-qaip' },
    update: {},
    create: {
      id: 'alert-junior-info-qaip',
      severity: AlertSeverity.INFO,
      category: 'QAIP',
      message: 'Your QAIP test run for branch feature/auth-fix passed 94.2% — 2 P2 defects found',
      actionNeeded: '',
      targetRole: RoleLevel.JUNIOR,
      projectId: scipProject.id,
      userId: juniorQa.id,
    },
  })

  // Deals
  await prisma.deal.upsert({
    where: { id: 'deal-techcorp' },
    update: {},
    create: {
      id: 'deal-techcorp',
      name: 'TechCorp Enterprise Contract',
      stage: DealStage.NEGOTIATION,
      value: 12000000,
      probability: 80,
      expectedClose: new Date('2026-07-31'),
      customerName: 'TechCorp Ltd',
      arr: 12000000,
    },
  })

  await prisma.deal.upsert({
    where: { id: 'deal-globalretail' },
    update: {},
    create: {
      id: 'deal-globalretail',
      name: 'GlobalRetail Platform',
      stage: DealStage.PROPOSAL,
      value: 8500000,
      probability: 60,
      expectedClose: new Date('2026-08-15'),
      customerName: 'GlobalRetail Inc',
      arr: 8500000,
    },
  })

  await prisma.deal.upsert({
    where: { id: 'deal-startupxyz' },
    update: {},
    create: {
      id: 'deal-startupxyz',
      name: 'StartupXYZ Growth',
      stage: DealStage.QUALIFICATION,
      value: 2400000,
      probability: 40,
      expectedClose: new Date('2026-09-30'),
      customerName: 'StartupXYZ',
      arr: 2400000,
    },
  })

  await prisma.deal.upsert({
    where: { id: 'deal-megacorp' },
    update: {},
    create: {
      id: 'deal-megacorp',
      name: 'MegaCorp Renewal',
      stage: DealStage.CLOSED_WON,
      value: 24000000,
      probability: 100,
      expectedClose: new Date('2026-06-01'),
      customerName: 'MegaCorp Group',
      arr: 24000000,
    },
  })

  // Customers
  const techcorpCustomer = await prisma.customer.upsert({
    where: { id: 'customer-techcorp' },
    update: {},
    create: {
      id: 'customer-techcorp',
      name: 'TechCorp Ltd',
      arr: 24000000,
      healthScore: 85,
      npsScore: 72,
      churnRisk: 0.08,
      renewalDate: new Date('2027-01-15'),
    },
  })

  const globalretailCustomer = await prisma.customer.upsert({
    where: { id: 'customer-globalretail' },
    update: {},
    create: {
      id: 'customer-globalretail',
      name: 'GlobalRetail Inc',
      arr: 18000000,
      healthScore: 72,
      npsScore: 58,
      churnRisk: 0.18,
      renewalDate: new Date('2026-09-01'),
    },
  })

  await prisma.customer.upsert({
    where: { id: 'customer-startupxyz' },
    update: {},
    create: {
      id: 'customer-startupxyz',
      name: 'StartupXYZ',
      arr: 4500000,
      healthScore: 90,
      npsScore: 81,
      churnRisk: 0.05,
      renewalDate: new Date('2027-03-15'),
    },
  })

  // Tickets
  await prisma.ticket.upsert({
    where: { id: 'ticket-001' },
    update: {},
    create: {
      id: 'ticket-001',
      title: 'API timeout on bulk order import',
      priority: 'P1',
      status: 'OPEN',
      slaBreach: false,
      customerId: techcorpCustomer.id,
    },
  })

  await prisma.ticket.upsert({
    where: { id: 'ticket-002' },
    update: {},
    create: {
      id: 'ticket-002',
      title: 'Dashboard not loading for enterprise admin',
      priority: 'P0',
      status: 'OPEN',
      slaBreach: true,
      customerId: globalretailCustomer.id,
    },
  })

  // Budget entries for Technology dept
  const budgetCategories = [
    { category: 'People', allocated: 38000000, spent: 38000000 },
    { category: 'Cloud', allocated: 18000000, spent: 6000000 },
    { category: 'Tools', allocated: 12000000, spent: 4000000 },
    { category: 'Training', allocated: 6000000, spent: 2000000 },
    { category: 'Other', allocated: 6000000, spent: 2000000 },
  ]

  for (let i = 0; i < budgetCategories.length; i++) {
    const b = budgetCategories[i]
    await prisma.budget.upsert({
      where: { id: `budget-tech-${i}` },
      update: {},
      create: {
        id: `budget-tech-${i}`,
        fiscalYear: 2026,
        fiscalQuarter: 2,
        allocated: b.allocated,
        spent: b.spent,
        category: b.category,
        departmentId: techDept.id,
      },
    })
  }

  // Tasks for junior QA
  const today = new Date()
  today.setHours(23, 59, 59, 0)

  await prisma.task.upsert({
    where: { id: 'task-001' },
    update: {},
    create: {
      id: 'task-001',
      title: 'Fix P0 auth bypass in SCIP',
      description: 'Critical P0 authentication bypass vulnerability identified in SCIP v2.4 auth module',
      status: 'TODO',
      priority: 'HIGH',
      dueDate: today,
      projectKey: 'SCIP',
      assigneeId: juniorQa.id,
    },
  })

  const jun26 = new Date('2026-06-26T23:59:59Z')
  await prisma.task.upsert({
    where: { id: 'task-002' },
    update: {},
    create: {
      id: 'task-002',
      title: 'Write test cases for SCIP v2.4 auth module',
      description: 'Comprehensive test coverage for the auth module ahead of v2.4.0 release',
      status: 'IN_PROGRESS',
      priority: 'MEDIUM',
      dueDate: jun26,
      projectKey: 'SCIP',
      assigneeId: juniorQa.id,
    },
  })

  const jun28 = new Date('2026-06-28T23:59:59Z')
  await prisma.task.upsert({
    where: { id: 'task-003' },
    update: {},
    create: {
      id: 'task-003',
      title: 'Review ARIA Socratic engine drift test results',
      description: 'Validate that Socratic engine drift tests are within acceptable bounds',
      status: 'TODO',
      priority: 'LOW',
      dueDate: jun28,
      projectKey: 'ARIA',
      assigneeId: juniorQa.id,
    },
  })

  // Timesheet for junior QA
  const weekStart = new Date('2026-06-16T00:00:00Z')
  await prisma.timesheet.upsert({
    where: { id: 'timesheet-junior-qa-week1' },
    update: {},
    create: {
      id: 'timesheet-junior-qa-week1',
      weekStart,
      totalHours: 32,
      submitted: false,
      entries: [
        { day: 'Monday', project: 'SCIP', hours: 8 },
        { day: 'Tuesday', project: 'SCIP', hours: 8 },
        { day: 'Wednesday', project: 'SCIP', hours: 6 },
        { day: 'Thursday', project: 'SCIP', hours: 6 },
        { day: 'Friday', project: 'ARIA Review', hours: 4 },
      ],
      userId: juniorQa.id,
    },
  })

  // Pull Request for senior dev
  await prisma.pullRequest.upsert({
    where: { id: 'pr-001' },
    update: {},
    create: {
      id: 'pr-001',
      title: 'JWT refresh token flow implementation',
      githubPrNum: 127,
      status: 'OPEN',
      linesChanged: 342,
      daysOpen: 3,
      branch: 'feature/jwt-refresh',
      projectId: scipProject.id,
      authorId: seniorDev.id,
    },
  })

  console.log('ZENTRAVIX seed completed successfully.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
