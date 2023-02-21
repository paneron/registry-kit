/** Transition runtime implementation and external API. */

import * as CR from './cr';


/**
 * Transition a change request between states.
 *
 * @example
 * Usage:
 * ```ts
 * let someCR: CR.Proposed
 * const c2 = transition(
 *   someCR,
 *   CR.State.SUBMITTED_FOR_CONTROL_BODY_REVIEW,
 *   { registerManagerNotes: 'foobar' })
 * // Type of c2 can be assumed to be CR.SubmittedForControlBodyReview
 * ```
 *
 * @example
 * Will not compile—there is no transition from
 * current state to target state:
 * ```ts
 * let someCR: CR.Proposed
 * const c2 = transition(
 *   someCR,
 *   CR.State.APPEALED,
 *   // ^ compile error here
 *   undefined)
 * ```
 *
 * @example
 * Will not compile—undefined is not accepted
 * since payload type doesn’t match
 * (submitting for control body review
 * requires register manager notes):
 * ```ts
 * let someCR: CR.Proposed
 * const c2 = transition(
 *   someCR,
 *   CR.State.SUBMITTED_FOR_CONTROL_BODY_REVIEW,
 *   undefined)
 *   // ^ compile error here
 * ```
 */
export function transition
<
  CR1 extends CR.Base,
  CR2 extends CR.Base<S2>,
  S1 extends ((keyof CR.Transitions) & CR1["state"]),
  S2 extends (CR.StateType & (keyof CR.Transitions[S1])),
  T extends CR.Transitions[S1][S2],
>(
  cr: CR1,
  s2: S2 extends keyof CR.Transitions[S1] ? S2 : never,
  p: T extends CR.Transition<CR1, CR2, infer P> ? P : never,
): T extends CR.Transition<CR1, infer N> ? N : never {
  const currentState = cr.state as S1;
  const possibleTransitions = TRANSITIONS[currentState];
  if (possibleTransitions) {
    const transitionToNextState = possibleTransitions[s2] as CR.Transition<CR1, CR2> | undefined;
    if (transitionToNextState) {
      const result = {
        ...transitionToNextState(cr, p),
        state: s2 as S2,
      };
      // TODO: result can be assumed to match the inferred N in transition above
      // but I don’t know how to achieve that, so `any` is used in meantime.
      return result as any;
    }
  }
  throw new Error("No transition");
}


// Transition runtime implementation

const draft: CR.Transition<
| CR.ReturnedForClarificationByControlBody
| CR.ReturnedForClarificationByManager
| CR.Drafted,
  CR.Drafted,
  CR.SubmitterInput> =
function (cr, { justification, proposals }) {
  return {
    ...cr,
    justification,
    proposals,
  };
}

const withdraw: CR.Transition<
  CR.Proposed
| CR.SubmittedForControlBodyReview
| CR.ReturnedForClarificationByControlBody
| CR.ReturnedForClarificationByManager,
  CR.Withdrawn> =
function withdraw (cr) {
  return {
    ...cr,
    timeDisposed: new Date(),
  };
}

const applyRegisterManagerDecision: CR.Transition<
  CR.Proposed,
  CR.SubmittedForControlBodyReview
| CR.ReturnedForClarificationByManager,
  CR.RegisterManagerInput> =
function applyRegisterManagerDecision (cr, { registerManagerNotes }) {
  return {
    ...cr,
    registerManagerNotes,
  };
}


/** Associates transition implementation with source/target states. */
const TRANSITIONS: CR.Transitions = {
  [CR.State.DRAFT]: {
    [CR.State.DRAFT]: draft,
    [CR.State.PROPOSED]: (cr) => ({
      ...cr,
      timeProposed: new Date(),
    }),
  },
  [CR.State.PROPOSED]: {
    [CR.State.WITHDRAWN]: withdraw,
    [CR.State.SUBMITTED_FOR_CONTROL_BODY_REVIEW]: applyRegisterManagerDecision,
    [CR.State.RETURNED_FOR_CLARIFICATION]: applyRegisterManagerDecision,
  },
  [CR.State.SUBMITTED_FOR_CONTROL_BODY_REVIEW]: {
    [CR.State.WITHDRAWN]: withdraw,
    [CR.State.RETURNED_FOR_CLARIFICATION]: (cr, controlBodyInput) => ({
      ...cr,
      ...controlBodyInput,
    }),
    [CR.State.ACCEPTED]: (cr, controlBodyInput) => ({
      ...cr,
      ...controlBodyInput,
      timeDisposed: new Date(),
    }),
    [CR.State.REJECTED]: (cr, controlBodyInput) => ({
      ...cr,
      ...controlBodyInput,
      timeDisposed: new Date(),
    }),
  },
  [CR.State.RETURNED_FOR_CLARIFICATION]: {
    [CR.State.DRAFT]: draft,
    [CR.State.WITHDRAWN]: withdraw,
  },
  [CR.State.REJECTED]: {
    [CR.State.APPEALED]: (cr, { appealReason }) => ({
      ...cr,
      appealReason,
      timeDisposed: undefined,
    }),
  },
  [CR.State.APPEALED]: {
    [CR.State.APPEAL_WITHDRAWN]: (cr) => ({
      ...cr,
      timeDisposed: new Date(),
    }),
    [CR.State.ACCEPTED_ON_APPEAL]: (cr, { registerOwnerNotes }) => ({
      ...cr,
      registerOwnerNotes,
      timeDisposed: new Date(),
    }),
    [CR.State.REJECTION_UPHELD_ON_APPEAL]: (cr, { registerOwnerNotes }) => ({
      ...cr,
      registerOwnerNotes,
      timeDisposed: new Date(),
    }),
  },
} as const;
