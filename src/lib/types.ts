export type PaymentMethod = 'cash' | 'mpesa' | 'tigopesa' | 'halopesa' | 'bank' | 'other'

export type LandlordProfile = {
  fullName: string
  phone: string
  nida: string
  location: string
}

export type Room = {
  id: string
  name: string
  rent: number
  location: string
  note: string
}

export type TenantStatus = 'current' | 'moved'

export type Tenant = {
  id: string
  fullName: string
  phone: string
  nida: string
  roomId: string | null
  moveInDate: string
  moveOutDate: string
  status: TenantStatus
  note: string
}

export type Payment = {
  id: string
  tenantId: string
  amount: number
  date: string
  method: PaymentMethod
  note: string
}

export type Contract = {
  id: string
  tenantId: string
  deposit: number
  durationMonths: number
  payEveryMonths: number
  startDate: string
  clauses: string[]
  savedAt: string
}

export type Templates = {
  receipt: string
  reminder: string
}

/** User-chosen daily rent reminder. `enabled` drives the scheduled alarm. */
export type NotificationSettings = {
  enabled: boolean
  hour: number
  minute: number
}

export type AppData = {
  version: number
  landlord: LandlordProfile
  rooms: Room[]
  tenants: Tenant[]
  payments: Payment[]
  contracts: Contract[]
  templates: Templates
  notifications: NotificationSettings
}

export const PAYMENT_METHODS: { id: PaymentMethod; label: string }[] = [
  { id: 'cash', label: 'Taslimu (Cash)' },
  { id: 'mpesa', label: 'M-Pesa' },
  { id: 'tigopesa', label: 'Tigo Pesa' },
  { id: 'halopesa', label: 'HaloPesa' },
  { id: 'bank', label: 'Benki' },
  { id: 'other', label: 'Nyingine' },
]

export const methodLabel = (id: PaymentMethod) =>
  PAYMENT_METHODS.find((m) => m.id === id)?.label ?? 'Nyingine'

export const DEFAULT_CLAUSES = [
  'Mpangaji analipa kodi kwa wakati kama ilivyokubalianwa hapo juu.',
  'Mwenye nyumba hutoa chumba cha hali ya juu na salama kwa mpangaji.',
  'Mpangaji hakiwi kubadilisha muundo wa chumba bila ruhusa ya mwenye nyumba.',
  'Dhamana (deposit) itarudishwa mwishoni mwa mkataba ikiwa hakuna uharibifu.',
  'Kukiuka masharti haya kunaweza kusababisha kumaliza mkataba kwa kutoa taarifa ya miezi 1.',
]
