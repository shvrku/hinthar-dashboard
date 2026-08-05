import type { User } from "@/lib/types"

export type Role = User["role"]

/** Highest privilege first. pending = signed up, awaiting admin approval. */
export const ROLE_RANK: Record<Role, number> = {
  pending: 0,
  student: 1,
  teacher: 2,
  terminal: 3,
  staff: 4,
  admin: 5,
}

export function roleRank(role: Role | null | undefined): number {
  if (!role) return -1
  return ROLE_RANK[role] ?? -1
}

export function isAdmin(role: Role | null | undefined): boolean {
  return roleRank(role) >= ROLE_RANK.admin
}

export function isStaffOrAbove(role: Role | null | undefined): boolean {
  return roleRank(role) >= ROLE_RANK.staff
}

export function isTerminalOrAbove(role: Role | null | undefined): boolean {
  return roleRank(role) >= ROLE_RANK.terminal
}

export function isAtLeast(role: Role | null | undefined, minimum: Role): boolean {
  return roleRank(role) >= ROLE_RANK[minimum]
}

export function canCheckIn(role: Role | null | undefined): boolean {
  return role === "admin" || role === "staff" || role === "terminal"
}

export const ASSIGNABLE_ROLES: Role[] = [
  "pending",
  "student",
  "teacher",
  "terminal",
  "staff",
  "admin",
]
