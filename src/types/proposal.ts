import { Payload } from './item';
import { RegisterStakeholder } from './stakeholder';


export const DECISION_STATUSES = [
  'pending',
  'tentative',
  'final',
] as const;

export const DISPOSITION_OPTIONS = [
  'withdrawn',
  'accepted',
  'notAccepted',
] as const;

export interface ChangeRequest {
  // Supplied by sponsor
  justification: string // Justification for proposal
  proposals: { [itemIDWithClass: string]: ChangeProposal }

  // Enforced by the system
  id: string
  timeStarted: Date
  timeProposed?: Date
  timeDisposed?: Date
  sponsor: RegisterStakeholder

  // Supplied by register manager
  status: typeof DECISION_STATUSES[number] // Default filled in by the system but changeable
  disposition?: typeof DISPOSITION_OPTIONS[number]
  controlBodyDecisionEvent?: string
  controlBodyNotes?: string
  registerManagerNotes?: string
}
export const PROPOSAL_TYPES = [
  'addition',
  'clarification',
  'amendment',
] as const;

interface BaseProposal {
  //itemID: RegisterItemID
  type: typeof PROPOSAL_TYPES[number]
}

interface Addition extends BaseProposal {
  type: 'addition'
  payload: Payload
}

interface Clarification extends BaseProposal {
  type: 'clarification'
  payload: Payload
}

export const AMENDMENT_TYPES = [
  'supersession',
  'retirement',
] as const;
interface BaseAmendment extends BaseProposal {
  type: 'amendment'
  amendmentType: typeof AMENDMENT_TYPES[number]
}
interface Retirement extends BaseAmendment {
  amendmentType: 'retirement'
}
interface Supersession extends BaseAmendment {
  amendmentType: 'supersession'
  supersedingItemID: string
}
type Amendment = Supersession | Retirement

export type ChangeProposal = Amendment | Clarification | Addition
