/** Change request types and state transitions. */

import { ProposalSet } from './proposal';


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

export type StateType = typeof State[keyof typeof State]

export type Transition<
  F extends Base,
  T extends Base,
  P extends Record<string, any> = any,
> = (cr: F, payload: P) => Omit<T, 'state'>


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
    [State.DRAFT]:
      Transition<Drafted, Drafted, SubmitterInput>;
    [State.PROPOSED]:
      Transition<Drafted, Proposed>;
  };
  [State.PROPOSED]: {
    [State.WITHDRAWN]:
      Transition<Proposed, Withdrawn>;
    [State.SUBMITTED_FOR_CONTROL_BODY_REVIEW]:
      Transition<Proposed, SubmittedForControlBodyReview, RegisterManagerInput>;
    [State.RETURNED_FOR_CLARIFICATION]:
      Transition<Proposed, ReturnedForClarificationByManager, RegisterManagerInput>;
  };
  [State.SUBMITTED_FOR_CONTROL_BODY_REVIEW]: {
    [State.WITHDRAWN]:
      Transition<SubmittedForControlBodyReview, Withdrawn>;
    [State.RETURNED_FOR_CLARIFICATION]:
      Transition<SubmittedForControlBodyReview, ReturnedForClarificationByControlBody, ControlBodyInput>;
    [State.REJECTED]:
      Transition<SubmittedForControlBodyReview, Rejected, ControlBodyInput>;
    [State.ACCEPTED]:
      Transition<SubmittedForControlBodyReview, Accepted, ControlBodyInput>;
  };
  [State.RETURNED_FOR_CLARIFICATION]: {
    [State.DRAFT]:
      Transition<ReturnedForClarificationByManager | ReturnedForClarificationByControlBody, Drafted, SubmitterInput>;
    [State.WITHDRAWN]:
      Transition<ReturnedForClarificationByManager | ReturnedForClarificationByControlBody, Withdrawn>;
  };
  [State.REJECTED]: {
    [State.APPEALED]:
      Transition<Rejected, Appealed, AppealRequest>;
  };
  [State.APPEALED]: {
    [State.APPEAL_WITHDRAWN]:
      Transition<Appealed, RejectedWithAppealWithdrawn>;
    [State.ACCEPTED_ON_APPEAL]:
      Transition<Appealed, AcceptedOnAppeal, RegisterOwnerInput>;
    [State.REJECTION_UPHELD_ON_APPEAL]:
      Transition<Appealed, RejectionUpheld, RegisterOwnerInput>;
  };
}


/**
 * Base change request type.
 */
export interface Base<S extends StateType = StateType> {
  id: string
  // decision: typeof Decision[keyof typeof Decision]
  // disposition?: typeof Disposition[keyof typeof Disposition]
  state: S
}


// More specific change request types.

export interface Drafted extends
  SubmitterInput,
  Base<typeof State.DRAFT> {
}
export function isDrafted(cr: Base): cr is Drafted {
  return isInState(cr, State.DRAFT);
}

export interface Proposed extends
  SubmitterInput,
  Base<typeof State.PROPOSED> {
  timeProposed: Date
}
export function isProposed(cr: Base): cr is Proposed {
  return isInState(cr, State.PROPOSED);
}

export interface Withdrawn extends
  SubmitterInput,
  Base<typeof State.WITHDRAWN> {
  timeDisposed: Date
}
export function isWithdrawn(cr: Base): cr is Withdrawn {
  return isInState(cr, State.WITHDRAWN);
}

export interface SubmittedForControlBodyReview extends
  SubmitterInput,
  RegisterManagerInput,
  Base<typeof State.SUBMITTED_FOR_CONTROL_BODY_REVIEW> {
}

export interface ReturnedForClarificationByManager extends
  SubmitterInput,
  RegisterManagerInput,
  Base<typeof State.RETURNED_FOR_CLARIFICATION> {
}

export interface ReturnedForClarificationByControlBody extends
  SubmitterInput,
  RegisterManagerInput,
  ControlBodyInput,
  Base<typeof State.RETURNED_FOR_CLARIFICATION> {
}

export interface Accepted extends
  SubmitterInput,
  RegisterManagerInput,
  ControlBodyInput,
  Base<typeof State.ACCEPTED> {
  timeDisposed: Date
}

export interface Rejected extends
  SubmitterInput,
  RegisterManagerInput,
  ControlBodyInput,
  Base<typeof State.REJECTED> {
  timeDisposed: Date
}

export interface Appealed extends
  SubmitterInput,
  RegisterManagerInput,
  ControlBodyInput,
  AppealRequest,
  Base<typeof State.APPEALED> {
  timeDisposed: undefined
}

export interface RejectionUpheld extends
  SubmitterInput,
  RegisterManagerInput,
  ControlBodyInput,
  AppealRequest,
  RegisterOwnerInput,
  Base<typeof State.REJECTION_UPHELD_ON_APPEAL> {
  timeDisposed: Date
}

export interface AcceptedOnAppeal extends
  SubmitterInput,
  RegisterManagerInput,
  ControlBodyInput,
  AppealRequest,
  RegisterOwnerInput,
  Base<typeof State.ACCEPTED_ON_APPEAL> {
  timeDisposed: Date
}

export interface RejectedWithAppealWithdrawn extends
  SubmitterInput,
  RegisterManagerInput,
  ControlBodyInput,
  AppealRequest,
  Base<typeof State.APPEAL_WITHDRAWN> {
  timeDisposed: Date
}


// Information pertaining to different states.

export interface SubmitterInput {
  justification: string;
  proposals: ProposalSet;
}
export interface RegisterManagerInput {
  registerManagerNotes: string;
}
export interface ControlBodyInput {
  controlBodyNotes: string;
  controlBodyDecisionEvent: string;
}
export interface AppealRequest {
  appealReason: string;
}
export interface RegisterOwnerInput {
  registerOwnerNotes: string;
}


/** 
 * CR type guard helper.
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
 * @example
 * Incorrect usage:
 * ```ts
 * let someCR;
 * if (isInState(someCR, State.DRAFT)) {
 *   // Can NOT assume someCR is Drafted
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
 */
export function isInState<CR extends Base>(cr: Base, s: CR["state"]): cr is CR {
  return cr.state === s;
}
