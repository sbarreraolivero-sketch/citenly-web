import { useAuth } from '@/contexts/AuthContext'
import { getEffectivePermissions, type ActionKey, type MemberPermissions } from '@/lib/permissions'

// Convierte "knowledge-base" → "knowledge_base", "ai-settings" → "ai_settings"
function normalizePageKey(key: string): string {
  return key.replace(/-/g, '_')
}

export function usePermissions() {
  const { member, loading } = useAuth()

  const canAccess = (page: string): boolean => {
    if (loading) return true
    const role = member?.role ?? 'professional'
    if (role === 'owner' || role === 'admin') return true
    const stored = (member as any)?.permissions as MemberPermissions | null | undefined
    const perms = getEffectivePermissions(role, stored)
    return perms.pages.includes(normalizePageKey(page) as any)
  }

  const can = (action: ActionKey): boolean => {
    if (loading) return true
    const role = member?.role ?? 'professional'
    if (role === 'owner' || role === 'admin') return true
    const stored = (member as any)?.permissions as MemberPermissions | null | undefined
    const perms = getEffectivePermissions(role, stored)
    return perms.actions.includes(action)
  }

  return { canAccess, can }
}
