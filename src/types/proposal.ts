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

export const ChangeProposalType = {
  ADDITION: 'addition',
  CLARIFICATION: 'clarification',
  AMENDMENT: 'amendment',
} as const;
export const PROPOSAL_TYPES = [
  ChangeProposalType.ADDITION,
  ChangeProposalType.CLARIFICATION,
  ChangeProposalType.AMENDMENT,
] as const;

interface BaseProposal {
  //itemID: RegisterItemID
  disposition?: 'accepted' | 'notAccepted'
  type: typeof PROPOSAL_TYPES[number]
  sources?: Citation[]
}

export interface Addition extends BaseProposal {
  type: typeof ChangeProposalType.ADDITION
  ///** New item data. */
  //payload: Payload
}

export interface Clarification extends BaseProposal {
  type: typeof ChangeProposalType.CLARIFICATION
  ///** Updated item data */
  //payload: Payload
}

export const AmendmentType = {
  SUPERSESSION: 'supersession',
  RETIREMENT: 'retirement',
  INVALIDATION: 'invalidation',
} as const;
export type AmendmentTypeType = typeof AmendmentType[keyof typeof AmendmentType];
export const AMENDMENT_TYPES = [
  AmendmentType.SUPERSESSION,
  AmendmentType.RETIREMENT,
  AmendmentType.INVALIDATION,
] as const;

interface BaseAmendment extends BaseProposal {
  type: typeof ChangeProposalType.AMENDMENT
  amendmentType: AmendmentTypeType
}
export interface Retirement extends BaseAmendment {
  amendmentType: typeof AmendmentType.RETIREMENT
}
export interface Supersession extends BaseAmendment {
  amendmentType: typeof AmendmentType.SUPERSESSION
  supersedingItemIDs: string[]
}
export interface Invalidation extends BaseAmendment {
  amendmentType: typeof AmendmentType.INVALIDATION
}
export type Amendment = Supersession | Retirement | Invalidation

export type ChangeProposal = Amendment | Clarification | Addition

export function isBaseProposal(val: any): val is BaseProposal {
  return PROPOSAL_TYPES.indexOf(val?.type) >= 0;
}
export function isProposal(val: any): val is ChangeProposal {
  return (isBaseProposal(val) && (
    isAddition(val)
    || isClarification(val)
    || isAmendment(val)));
}
export function isAddition(val: BaseProposal): val is Addition {
  return (val.type === ChangeProposalType.ADDITION);
}
export function isClarification(val: BaseProposal): val is Clarification {
  return (val.type === ChangeProposalType.CLARIFICATION);
}
export function isBaseAmendment(val: BaseProposal): val is BaseAmendment {
  return (
    val.type === ChangeProposalType.AMENDMENT
    && AMENDMENT_TYPES.indexOf((val as Amendment).amendmentType) >= 0);
}
export function isAmendment(val: any): val is Amendment {
  return (isBaseAmendment(val) && (
    isRetirement(val)
    || isSupersession(val)
    || isInvalidation(val)));
}
export function isRetirement(val: BaseAmendment): val is Retirement {
  return val.amendmentType === AmendmentType.RETIREMENT;
}
export function isSupersession(val: BaseAmendment): val is Supersession {
  return val.amendmentType === AmendmentType.SUPERSESSION;
}
export function isInvalidation(val: BaseAmendment): val is Invalidation {
  return val.amendmentType === AmendmentType.INVALIDATION;
}
