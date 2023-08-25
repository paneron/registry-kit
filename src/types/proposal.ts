import type { RegisterStakeholder } from './stakeholder';
import type { Citation } from './util';


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

/**
 * Item paths in proposal set must start with a slash
 * and will be treated relative to dataset root.
 * Object paths should conform to registry item path shape
 * of `/<classID>/<itemID>.yaml`.
 * (the `[/subregisterID]/<classID>/<itemID>.yaml` is acceptable
 * but deprecated, as subregisters are deprecated).
 */
export type ProposalSet = {
  [objectPath: string]: ChangeProposal
}

/**
 * A change request, per ISO 19135-1 model.
 *
 * @deprecated use cr.Base (or a more specific type) instead
 */
export interface ChangeRequest {
  // Supplied by sponsor
  /** Justification for the change */
  justification: string

  proposals: ProposalSet

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


/**
 * Change request properties for the purposes of drafting.
 * (`controlBodyNotes` is in question.)
 */
export type DraftChangeRequest =
  Pick<ChangeRequest, 'proposals' | 'justification' | 'controlBodyNotes' | 'sponsor'>;

export const PROPOSAL_TYPES = [
  'addition',
  'clarification',
  'amendment',
] as const;

interface BaseProposal {
  //itemID: RegisterItemID
  disposition?: 'accepted' | 'notAccepted'
  type: typeof PROPOSAL_TYPES[number]
  sources?: Citation[]
}

export interface Addition extends BaseProposal {
  type: 'addition'
  ///** New item data. */
  //payload: Payload
}

export interface Clarification extends BaseProposal {
  type: 'clarification'
  ///** Updated item data */
  //payload: Payload
}

export const AMENDMENT_TYPES = [
  'supersession',
  'retirement',
  'invalidation',
] as const;
interface BaseAmendment extends BaseProposal {
  type: 'amendment'
  amendmentType: typeof AMENDMENT_TYPES[number]
}
export interface Retirement extends BaseAmendment {
  amendmentType: 'retirement'
}
export interface Supersession extends BaseAmendment {
  amendmentType: 'supersession'
  supersedingItemIDs: string[]
}
export interface Invalidation extends BaseAmendment {
  amendmentType: 'invalidation'
}
export type Amendment = Supersession | Retirement | Invalidation

export type ChangeProposal = Amendment | Clarification | Addition
