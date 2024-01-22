/** Change request types, states and state transitions. */

import type React from 'react';
import type { DatasetContext } from '@riboseinc/paneron-extension-kit/types/renderer';
import type { ProposalSet } from './proposal';
import { type RegisterStakeholder } from './stakeholder';
import type { RegisterItem } from './item';



export function isSubmittedBy(stakeholder: RegisterStakeholder, cr: Base): boolean {
  return (
    //isSubmitter(stakeholder) &&
    stakeholder.gitServerUsername === cr.submittingStakeholderGitServerUsername);
}


type ItemDataset = Record<string, RegisterItem<any> | null>;


// =====================
// Change request states
// =====================

/** Used in place of enum for convenience. */
export const State = {
  DRAFT: 'draft',
  PROPOSED: 'proposed',
  SUBMITTED_FOR_CONTROL_BODY_REVIEW: 'pending-control-body-review',
  RETURNED_FOR_CLARIFICATION: 'returned-for-clarification',
  WITHDRAWN: 'withdrawn',
  ACCEPTED: 'accepted',
  REJECTED: 'rejected',
  APPEALED: 'rejection-appealed-to-owner',
  ACCEPTED_ON_APPEAL: 'accepted-on-appeal',
  REJECTION_UPHELD_ON_APPEAL: 'rejection-upheld-on-appeal',
  APPEAL_WITHDRAWN: 'appeal-withdrawn',
} as const;

export type StateType = typeof State[keyof typeof State];

export function isState(val: string): val is StateType {
  return Object.values(State).indexOf(val as StateType) >= 0;
}

/** A subset of `State` that represents editable states. */
export const EditableState = [
  State.DRAFT,
  State.RETURNED_FOR_CLARIFICATION,
] as const;

export type EditableStateType = StateType & typeof EditableState[number];

export function isEditableState(state: StateType): state is EditableStateType {
  return EditableState.indexOf(state as EditableStateType) >= 0;
}



// ======================
// Change request classes
// ======================

/**
 * Base change request type.
 *
 * Note that e.g. type Base<typeof State.DRAFT> does not equal to Drafted
 * because Drafted includes additional information (namely, SubmitterInput).
 *
 * If the state of a CR matters, this type should not be used directly
 * and concrete types should be used instead.
 */
export interface Base<S extends StateType = StateType>
{
  id: string;
  // decision: typeof Decision[keyof typeof Decision]
  // disposition?: typeof Disposition[keyof typeof Disposition]
  state: S;

  /**
   * Used to match against stakeholders declared in register metadata.
   */
  submittingStakeholderGitServerUsername: string;

  items: ProposalSet;

  /**
   * Against to which register version changes were proposed.
   */
  registerVersion: string;

  /**
   * A link to external discussion.
   */
  externalDiscussionURI?: string;

  pastTransitions?: TransitionEntry[];
}


export interface TransitionEntry {
  /** Verb in past tense. */
  label: string;

  timestamp: Date;
  fromState: StateType;
  toState: StateType;
  stakeholder: RegisterStakeholder;
  input: StateInput;
}


export function isCreatedBy(stakeholder: RegisterStakeholder, cr: Base): boolean {
  return stakeholder.gitServerUsername?.trim() !== '' && stakeholder.gitServerUsername === cr.submittingStakeholderGitServerUsername;
}

/** Whether given `cr` can be edited (as in, items changed) by specified stakeholder. */
export function canBeEditedBy(stakeholder: RegisterStakeholder, cr: Base): boolean {
  return isCreatedBy(stakeholder, cr) && isEditableState(cr.state);
}

/**
 * Whether given `cr` can be deleted by given stakeholder.
 * Unlike editing, deletion is possible only if there are no items
 * and CR was never proposed.
 */
export function canBeDeletedBy(stakeholder: RegisterStakeholder, cr: Base): boolean {
  return (
    isCreatedBy(stakeholder, cr)
    && isDrafted(cr)
    //&& Object.keys(cr.items).length < 1 // Only allow deleting empty CRs
    && !hadBeenProposed(cr)  // If it had been proposed, it should be withdrawn instead.
  );
}


/** Proposal structure for single-file proposal import format. */
export interface ImportableCR {
  /** Proposal data. */
  proposalDraft: Drafted,
  /** Register item data for additions & clarifications. */
  itemPayloads: ItemDataset,
  // TODO: Rename ImportableCR.itemPayloads to newItemData
}
export function isImportableCR(val: any): val is ImportableCR {
  // TODO: More complete check
  return (
    val.proposalDraft.id
    && isDrafted(val.proposalDraft as Base)
    && Object.keys(val.itemPayloads).length > 0);
}


/**
 * A change request in any state.
 * Contains a superset of all possible properties, but all optional.
 * XXX: ^^^ This is a lie. Should be changed from | to & with Partial<>?
 */
export type SomeCR = 
  | Drafted
  | Proposed
  | Withdrawn
  | ReturnedForClarificationByManager
  | SubmittedForControlBodyReview
  | ReturnedForClarificationByControlBody
  | Accepted
  | Rejected
  | RejectionUpheld
  | AcceptedOnAppeal
  | RejectedWithAppealWithdrawn;

export type Withdrawable =
  | Proposed
  | SubmittedForControlBodyReview
  | ReturnedForClarificationByManager
  | ReturnedForClarificationByControlBody;

export type Proposable =
  | Drafted
  | ReturnedForClarificationByManager
  | ReturnedForClarificationByControlBody;

export type SomeEditable =
  | Drafted
  | ReturnedForClarificationByManager
  | ReturnedForClarificationByControlBody;

export type Disposed =
  | Withdrawn
  | Accepted
  | Rejected
  | AcceptedOnAppeal
  | RejectionUpheld;


// More specific change request types.
// TODO: Refactor to avoid confusiong between current state e.g. Proposed)
// and type (Proposed, to which all inheriting classes also conform)

export interface Drafted extends
  SubmitterInput,
  Base<typeof State.DRAFT> { timeStarted: Date, timeEdited: Date }
export function isDrafted(cr: Base): cr is Drafted {
  return isInState(cr, State.DRAFT);
}

export interface Proposed extends
  Omit<Drafted, 'state'>,
  Base<typeof State.PROPOSED> { timeProposed: Date }
export function isProposed(cr: Base): cr is Proposed {
  return isInState(cr, State.PROPOSED);
}

export interface Withdrawn extends
  Omit<Withdrawable, 'state'>,
  Base<typeof State.WITHDRAWN> { timeDisposed: Date }
export function isWithdrawn(cr: Base): cr is Withdrawn {
  return isInState(cr, State.WITHDRAWN);
}

/** CR was proposed at least once. */
export function hadBeenProposed(cr: Base): cr is Base & { timeProposed: Date } {
  return cr && cr.hasOwnProperty('timeProposed') && !!(cr as Proposed).timeProposed;
}
export function isDisposed(cr: Base): cr is Base & { timeDisposed: Date } {
  return cr && cr.hasOwnProperty('timeDisposed') && !!(cr as Disposed).timeDisposed;
  //return [
  //  State.WITHDRAWN,
  //  State.ACCEPTED,
  //  State.REJECTED,
  //  State.REJECTION_UPHELD_ON_APPEAL,
  //  State.ACCEPTED_ON_APPEAL,
  //].some(s => cr.state === s);
}

export interface SubmittedForControlBodyReview extends
  Omit<Proposed, 'state'>,
  RegisterManagerInput,
  Base<typeof State.SUBMITTED_FOR_CONTROL_BODY_REVIEW> {}

export function isSubmittedForControlBodyReview(cr: Base): cr is SubmittedForControlBodyReview {
  return isInState(cr, State.SUBMITTED_FOR_CONTROL_BODY_REVIEW)
}

export interface ReturnedForClarificationByManager extends
  Omit<Proposed, 'state'>,
  RegisterManagerInput,
  Base<typeof State.RETURNED_FOR_CLARIFICATION> {}

export interface ReturnedForClarificationByControlBody extends
  Omit<SubmittedForControlBodyReview, 'state'>,
  ControlBodyInput,
  Base<typeof State.RETURNED_FOR_CLARIFICATION> {}

export function isReturnedForClarification(cr: Base): cr is (ReturnedForClarificationByManager | ReturnedForClarificationByControlBody) {
  return isInState(cr, State.RETURNED_FOR_CLARIFICATION)
}

export interface Accepted extends
  Omit<SubmittedForControlBodyReview, 'state'>,
  ControlBodyInput,
  Base<typeof State.ACCEPTED> { timeDisposed: Date }
export function isAccepted(cr: Base): cr is Accepted {
  return isInState(cr, State.ACCEPTED);
}

export interface Rejected extends
  Omit<SubmittedForControlBodyReview, 'state'>,
  ControlBodyInput,
  Base<typeof State.REJECTED> { timeDisposed: Date }
export function isRejected(cr: Base): cr is Rejected {
  return isInState(cr, State.REJECTED);
}

export interface Appealed extends
  Omit<Rejected, 'state' | 'timeDisposed'>,
  AppealRequest,
  Base<typeof State.APPEALED> { timeDisposed: undefined }
export function isAppealed(cr: Base): cr is Appealed {
  return isInState(cr, State.APPEALED);
}

export interface RejectionUpheld extends
  Omit<Appealed, 'state' | 'timeDisposed'>,
  RegisterOwnerInput,
  Base<typeof State.REJECTION_UPHELD_ON_APPEAL> { timeDisposed: Date }
export function isRejectedOnAppeal(cr: Base): cr is RejectionUpheld {
  return isInState(cr, State.REJECTION_UPHELD_ON_APPEAL);
}

export interface AcceptedOnAppeal extends
  Omit<Appealed, 'state' | 'timeDisposed'>,
  RegisterOwnerInput,
  Base<typeof State.ACCEPTED_ON_APPEAL> { timeDisposed: Date }
export function isAcceptedOnAppeal(cr: Base): cr is AcceptedOnAppeal {
  return isInState(cr, State.ACCEPTED_ON_APPEAL);
}

export interface RejectedWithAppealWithdrawn extends
  Omit<Appealed, 'state' | 'timeDisposed'>,
  Base<typeof State.APPEAL_WITHDRAWN> { timeDisposed: Date }
export function isRejectedWithAppealWithdrawn(cr: Base): cr is RejectedWithAppealWithdrawn {
  return isInState(cr, State.APPEAL_WITHDRAWN);
}



// Input required when transitioning to different states

export interface SubmitterInput {
  justification: string;
}
export function hasSubmitterInput(val: any): val is SubmitterInput {
  return val.hasOwnProperty('justification') && typeof val.justification === 'string';
}
export interface RegisterManagerInput {
  registerManagerNotes: string;
}
export function hasRegisterManagerInput(val: any): val is RegisterManagerInput {
  return val.hasOwnProperty('registerManagerNotes') && typeof val.registerManagerNotes === 'string';
}
export interface ControlBodyInput {
  controlBodyNotes: string;
}
export function hasControlBodyInput(val: any): val is ControlBodyInput {
  return (
    val.hasOwnProperty('controlBodyNotes') && typeof val.controlBodyNotes === 'string' &&
    val.hasOwnProperty('controlBodyDecisionEvent') && typeof val.controlBodyDecisionEvent === 'string');
}
export interface AppealRequest {
  appealReason: string;
}
export function hasAppealRequest(val: any): val is AppealRequest {
  return val.hasOwnProperty('appealReason') && typeof val.appealReason === 'string';
}
export interface RegisterOwnerInput {
  registerOwnerNotes: string;
}
export function hasRegisterOwnerInput(val: any): val is RegisterOwnerInput {
  return val.hasOwnProperty('registerOwnerNotes') && typeof val.registerOwnerNotes === 'string';
}

export type StateInput =
  | SubmitterInput
  | RegisterManagerInput
  | ControlBodyInput
  | AppealRequest
  | RegisterOwnerInput;


/** 
 * CR type guard helper.
 * Normally you would not use it directly and instead use
 * more specific is[Type]() helper from this module.
 *
 * Checks CR type using the `state` property.
 * Does not validate other properties.
 *
 * Usage:
 *
 * @example
 * ```ts
 * let someCR;
 * if (isInState<Drafted>(someCR, State.DRAFT)) {
 *   // Can assume someCR is Drafted
 * }
 * ```
 *
 * It’ll try to tell you if you mismatch those.
 *
 * @example
 * Will not compile:
 * ```ts
 * let someCR;
 * if (isInState<Drafted>(someCR, State.PROPOSED)) {
 *   // Compile error
 *   // because State.PROPOSED is not a possible value of Drafted["state"]
 * }
 * ```
 *
 * @example
 * Incorrect usage (do not do this):
 * ```ts
 * let someCR;
 * if (isInState(someCR, State.DRAFT)) {
 *   // Can NOT assume someCR is Drafted
 *   // The compiler must know the expected concrete CR type
 * }
 * ```
 */
function isInState<CR extends Base>(cr: Base, s: CR["state"]): cr is CR {
  return cr.state === s;
}




// ===========
// Transitions
// ===========

/**
 * A function that transitions CR1 to CR2.
 *
 * The function is declared to return the object
 * without the `state` field, it is set
 * by common wrapper function to reduce duplication.
 */
export type Transition<
  /** From CR of this subtype */
  CR1 extends Base,
  /** To CR of this subtype */
  CR2 extends Base,
  /** Using this extra information */
  P extends Record<string, any> | null = null,
> = (cr: CR1, payload: P) => Omit<CR2, 'state'>;


export type AlterApprovedCR = (
  crID: string,
  proposals: ProposalSet,
  origItemData: ItemDataset,
  newItemData: ItemDataset,
  opts: Pick<DatasetContext, 'getMapReducedData'>,
) => Promise<{
  proposals: ProposalSet,
  origItemData: ItemDataset,
  newItemData: ItemDataset,
}>


/**
 * Describes a transition.
 *
 * @typeParam CR1: Change request source state type
 * @typeParam CR2: Change request target state type
 * @typeParam P: Extra input needed to transition, if any
 */
export interface TransitionConfig<CR1 extends Base, CR2 extends Base, P extends Record<string, any> | null = null> {
  /**
   * Function that implements the transition.
   * Takes a CR in the original state and returns CR in the new state.
   * Additionally, takes appropriate payload, if any, for the transition
   * (e.g., register manager or control body notes).
   *
   * For function implementor:
   *
   * - Function MUST NOT modify CR in place.
   * - Function should throw if submitted payload does not conform to requirements.
   */
  func: Transition<CR1, CR2, P>;

  targetState: CR2["state"];

  /** Title. Use verb. */
  title: string;

  hint?: string | JSX.Element;

  /** Widget that can be used to view or enter extra input. */
  Widget: P extends null ? null : React.FC<{ value: P, onChange?: (userInput: P) => void }>;

  /**
   * Function that returns true
   * if given stakeholder can perform this transition on given CR.
   */
  canBeTransitionedBy: (stakeholder: RegisterStakeholder, cr: CR1) => boolean;
}


// type TransitionSpec = {
//   [S1 in StateType]?: {
//     [S2 in StateType]?: Transition<Base<S1>, Base<S2>, Record<string, any>>
//   }
// }


/**
 * Source of truth for available transitions.
 * When updating change request business logic,
 * this is the type that should be modified.
 *
 * It will cause compile errors until transition implementation
 * is updated correspondingly.
 */
export type Transitions = {
  [State.DRAFT]: {
    // [State.DRAFT]:
    //   TransitionConfig<Drafted, Drafted, SubmitterInput>;
    [State.WITHDRAWN]:
      TransitionConfig<Proposed, Withdrawn>;
    [State.PROPOSED]:
      TransitionConfig<Drafted, Proposed, SubmitterInput>;
  };
  [State.PROPOSED]: {
    [State.WITHDRAWN]:
      TransitionConfig<Proposed, Withdrawn>;
    [State.SUBMITTED_FOR_CONTROL_BODY_REVIEW]:
      TransitionConfig<Proposed, SubmittedForControlBodyReview, RegisterManagerInput>;
    [State.RETURNED_FOR_CLARIFICATION]:
      TransitionConfig<Proposed, ReturnedForClarificationByManager, RegisterManagerInput>;
  };
  [State.SUBMITTED_FOR_CONTROL_BODY_REVIEW]: {
    [State.WITHDRAWN]:
      TransitionConfig<SubmittedForControlBodyReview, Withdrawn>;
    [State.RETURNED_FOR_CLARIFICATION]:
      TransitionConfig<SubmittedForControlBodyReview, ReturnedForClarificationByControlBody, ControlBodyInput>;
    [State.REJECTED]:
      TransitionConfig<SubmittedForControlBodyReview, Rejected, ControlBodyInput>;
    [State.ACCEPTED]:
      TransitionConfig<SubmittedForControlBodyReview, Accepted, ControlBodyInput>;
  };
  [State.RETURNED_FOR_CLARIFICATION]: {
    [State.PROPOSED]:
      TransitionConfig<ReturnedForClarificationByManager | ReturnedForClarificationByControlBody, Proposed, SubmitterInput>;
    [State.WITHDRAWN]:
      TransitionConfig<ReturnedForClarificationByManager | ReturnedForClarificationByControlBody, Withdrawn>;
  };
  [State.REJECTED]: {
    [State.APPEALED]:
      TransitionConfig<Rejected, Appealed, AppealRequest>;
  };
  [State.APPEALED]: {
    [State.APPEAL_WITHDRAWN]:
      TransitionConfig<Appealed, RejectedWithAppealWithdrawn>;
    [State.ACCEPTED_ON_APPEAL]:
      TransitionConfig<Appealed, AcceptedOnAppeal, RegisterOwnerInput>;
    [State.REJECTION_UPHELD_ON_APPEAL]:
      TransitionConfig<Appealed, RejectionUpheld, RegisterOwnerInput>;
  };
}
