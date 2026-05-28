export type PageKey =
  | 'dashboard' | 'appointments' | 'patients' | 'messages' | 'crm'
  | 'campaigns' | 'reminders' | 'knowledge_base' | 'finance' | 'ai_settings'
  | 'settings' | 'loyalty' | 'templates' | 'integrations' | 'retention'

export type ActionKey =
  | 'dashboard_metrics'
  | 'patients_create' | 'patients_edit' | 'patients_delete'
  | 'appointments_create' | 'appointments_edit' | 'appointments_delete'
  | 'export_data'

export interface MemberPermissions {
  pages: PageKey[]
  actions: ActionKey[]
}

const ALL_PAGES: PageKey[] = [
  'dashboard', 'appointments', 'patients', 'messages', 'crm',
  'campaigns', 'reminders', 'knowledge_base', 'finance', 'ai_settings',
  'settings', 'loyalty', 'templates', 'integrations', 'retention',
]

const ALL_ACTIONS: ActionKey[] = [
  'dashboard_metrics',
  'patients_create', 'patients_edit', 'patients_delete',
  'appointments_create', 'appointments_edit', 'appointments_delete',
  'export_data',
]

export const FULL_PERMISSIONS: MemberPermissions = {
  pages: ALL_PAGES,
  actions: ALL_ACTIONS,
}

const ROLE_DEFAULTS: Record<string, MemberPermissions> = {
  professional: {
    pages: ['dashboard', 'messages', 'templates', 'patients', 'appointments', 'reminders', 'knowledge_base', 'ai_settings'],
    actions: ['dashboard_metrics', 'patients_create', 'patients_edit', 'appointments_create', 'appointments_edit'],
  },
  receptionist: {
    pages: ['dashboard', 'messages', 'appointments', 'patients', 'reminders', 'crm', 'templates'],
    actions: ['dashboard_metrics', 'patients_create', 'patients_edit', 'appointments_create', 'appointments_edit', 'appointments_delete'],
  },
}

export function getEffectivePermissions(
  role: string,
  storedPermissions: MemberPermissions | null | undefined
): MemberPermissions {
  if (role === 'owner' || role === 'admin') return FULL_PERMISSIONS
  if (!storedPermissions) return ROLE_DEFAULTS[role] ?? FULL_PERMISSIONS
  return storedPermissions
}

export const PAGE_SECTIONS: { label: string; pages: { key: PageKey; name: string }[] }[] = [
  {
    label: 'Principal',
    pages: [
      { key: 'dashboard', name: 'Dashboard' },
      { key: 'messages', name: 'Mensajes' },
      { key: 'templates', name: 'Plantillas' },
    ],
  },
  {
    label: 'Clínica',
    pages: [
      { key: 'patients', name: 'Contactos' },
      { key: 'crm', name: 'CRM' },
      { key: 'appointments', name: 'Citas' },
      { key: 'reminders', name: 'Recordatorios' },
      { key: 'retention', name: 'Retención' },
      { key: 'finance', name: 'Finanzas' },
    ],
  },
  {
    label: 'Marketing',
    pages: [
      { key: 'campaigns', name: 'Campañas' },
      { key: 'loyalty', name: 'Fidelización' },
    ],
  },
  {
    label: 'Agente IA',
    pages: [
      { key: 'knowledge_base', name: 'Conocimiento' },
      { key: 'integrations', name: 'Integraciones' },
      { key: 'ai_settings', name: 'Ajustes IA' },
    ],
  },
  {
    label: 'Configuración',
    pages: [
      { key: 'settings', name: 'Ajustes' },
    ],
  },
]

export const ACTION_SECTIONS: { label: string; actions: { key: ActionKey; name: string }[] }[] = [
  {
    label: 'Dashboard',
    actions: [
      { key: 'dashboard_metrics', name: 'Ver métricas' },
    ],
  },
  {
    label: 'Contactos',
    actions: [
      { key: 'patients_create', name: 'Crear contactos' },
      { key: 'patients_edit', name: 'Editar contactos' },
      { key: 'patients_delete', name: 'Eliminar contactos' },
    ],
  },
  {
    label: 'Citas',
    actions: [
      { key: 'appointments_create', name: 'Crear citas' },
      { key: 'appointments_edit', name: 'Editar citas' },
      { key: 'appointments_delete', name: 'Eliminar citas' },
    ],
  },
  {
    label: 'Datos',
    actions: [
      { key: 'export_data', name: 'Exportar datos' },
    ],
  },
]
