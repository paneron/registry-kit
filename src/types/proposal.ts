import { Payload } from './item';
import { EditingStakeholder } from './stakeholder';


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
  proposals: ChangeProposal[]

  // Enforced by the system
  id: string
  timeStarted: Date
  timeProposed: Date
  timeDisposed?: Date
  sponsor: EditingStakeholder

  // Supplied by register manager
  status: typeof DECISION_STATUSES[number] // Default filled in by the system but changeable
  disposition?: typeof DISPOSITION_OPTIONS[number]
  controlBodyDecisionEvent?: string
  controlBodyNotes?: string
  registerManagerNotes?: string
}

interface BaseProposal {
  itemID: string
}

interface Addition extends BaseProposal {
  payload: Payload
}

interface Clarification extends BaseProposal {
  payload: Payload
}

export const AMENDMENT_TYPES = [
  'supersession',
  'retirement',
] as const;
interface BaseAmendment extends BaseProposal {
  amendmentType: typeof AMENDMENT_TYPES[number]
}
interface Retirement extends BaseAmendment {
  amendmentType: 'retirement'
}
interface Supersession extends BaseAmendment {
  amendmentType: 'supersession'
  superseding_item_id: string
}
type Amendment = Supersession | Retirement

type ChangeProposal = Amendment | Clarification | Addition
