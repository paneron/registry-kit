// Stakeholders

export const STAKEHOLDER_ROLES = [
  'owner',
  'manager',
  'submitter',
] as const;

interface _RegisterStakeholder {
  role: typeof STAKEHOLDER_ROLES[number]
  name: string
  parties: Party[]
  gitServerUsername?: string
}
interface NonEditingStakeholder extends _RegisterStakeholder {
  role: 'owner'
}
export interface EditingStakeholder extends _RegisterStakeholder {
  role: 'manager' | 'submitter'
}

export type Individual = {
  positionName: string
  organization?: Organization
} | {
  name: string
  organization?: Organization
}
type Organization = {
  logoURL: string[]
} | {
  name: string
}
type Party = (Individual | Organization) & {
  contacts: { label: string, value: string, notes?: string }[]
}

export type RegisterStakeholder = EditingStakeholder | NonEditingStakeholder
