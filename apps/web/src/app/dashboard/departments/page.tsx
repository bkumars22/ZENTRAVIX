'use client'

import { useRole }           from '@/hooks/useRole'
import DepartmentLayout, { type DeptTab } from '@/components/departments/DepartmentLayout'
import DevOpsDashboard       from '@/components/departments/DevOpsDashboard'
import SecurityDashboard     from '@/components/departments/SecurityDashboard'
import FinanceDashboard      from '@/components/departments/FinanceDashboard'
import ProductDashboard      from '@/components/departments/ProductDashboard'
import type { RoleLevel }    from '@/hooks/useWebSocket'

export default function DepartmentsPage() {
  const { user } = useRole()
  const role = (user?.role ?? 'JUNIOR') as RoleLevel

  return (
    <DepartmentLayout role={role}>
      {(dept: DeptTab, activeRole: RoleLevel) => {
        if (dept === 'devops')   return <DevOpsDashboard   role={activeRole} />
        if (dept === 'security') return <SecurityDashboard role={activeRole} />
        if (dept === 'finance')  return <FinanceDashboard  role={activeRole} />
        if (dept === 'product')  return <ProductDashboard  role={activeRole} />
        return null
      }}
    </DepartmentLayout>
  )
}
