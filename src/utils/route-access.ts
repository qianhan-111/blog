import { ALLOWED_ROUTE_AREAS_BY_ROLE, type RouteArea } from '@/constants/routes'
import type { AuthRole } from '@/types/auth'

export function canAccessRoleArea(role: AuthRole, area: RouteArea): boolean {
  return ALLOWED_ROUTE_AREAS_BY_ROLE[role].includes(area)
}
