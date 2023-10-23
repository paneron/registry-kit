/** @jsx jsx */
/** @jsxFrag React.Fragment */

import { jsx, css } from '@emotion/react';
import React from 'react';
import { FormGroup, Divider, Classes } from '@blueprintjs/core';
import * as CR from '../../types/cr';
import { type RegisterStakeholder } from '../../types/stakeholder';


// export type TransitionHistoryEntry = [
//   key: string,
//   details: JSX.Element | null,
//   color: typeof Colors[keyof typeof Colors] | undefined,
// ];

export type TransitionHistoryEntry = Omit<CR.TransitionEntry, 'timestamp' | 'fromState' | 'stakeholder' | 'input'> & {
  timestamp?: Date
  fromState?: CR.StateType
  stakeholder?: RegisterStakeholder
  input?: CR.StateInput
}

export function getTransitionHistory(cr: CR.Base):
TransitionHistoryEntry[] {
  const els: TransitionHistoryEntry[] = [];

  if (cr.pastTransitions && cr.pastTransitions.length > 0) {

    return [{
      label: "Create",
      toState: CR.State.DRAFT,
      timestamp: (cr as CR.Drafted).timeStarted,
    }, ...cr.pastTransitions];

  } else {

    // Backward compatibility

    if (CR.isProposed(cr)) {
      els.push({
        label: "Propose",
        toState: CR.State.PROPOSED,
        timestamp: cr.timeProposed,
        input: { justification: cr.justification },
      });
    }

    if (CR.isSubmittedForControlBodyReview(cr)) {
      els.push({
        label: "Submit for control body review",
        fromState: CR.State.PROPOSED,
        toState: CR.State.SUBMITTED_FOR_CONTROL_BODY_REVIEW,
        input: { registerManagerNotes: cr.registerManagerNotes },
      });
    }

    if (CR.isReturnedForClarification(cr)) {
      els.push({
        label: "Return for clarification",
        toState: CR.State.RETURNED_FOR_CLARIFICATION,
        input: {
          registerManagerNotes: cr.registerManagerNotes,
          controlBodyNotes: (cr as any).controlBodyNotes,
        },
      });
    }

    if (CR.isWithdrawn(cr)) {
      els.push({
        label: "Withdraw",
        toState: CR.State.WITHDRAWN,
        timestamp: cr.timeDisposed,
      });
    } else if (CR.isAccepted(cr)) {
      els.push({
        label: "Accept",
        toState: CR.State.ACCEPTED,
        timestamp: cr.timeDisposed,
        input: {
          controlBodyNotes: (cr as any).controlBodyNotes,
        },
      });
    } else if (CR.isRejected(cr)) {
      els.push({
        label: "Reject",
        toState: CR.State.REJECTED,
        timestamp: cr.timeDisposed,
        input: {
          controlBodyNotes: (cr as any).controlBodyNotes,
        },
      });
    }

    if (CR.isAppealed(cr)) {
      els.push({
        label: "Appeal",
        toState: CR.State.APPEALED,
        input: {
          appealReason: cr.appealReason,
        },
      });
    }

    if (CR.isRejectedWithAppealWithdrawn(cr)) {
      els.push({
        label: "Withdraw appeal",
        toState: CR.State.APPEAL_WITHDRAWN,
        timestamp: cr.timeDisposed,
      });
    } else if (CR.isAcceptedOnAppeal(cr)) {
      els.push({
        label: "Accept on appeal",
        toState: CR.State.ACCEPTED_ON_APPEAL,
        timestamp: cr.timeDisposed,
        input: {
          registerOwnerNotes: cr.registerOwnerNotes,
        },
      });
    } else if (CR.isRejectedOnAppeal(cr)) {
      els.push({
        label: "Uphold rejection",
        toState: CR.State.REJECTION_UPHELD_ON_APPEAL,
        timestamp: cr.timeDisposed,
        input: {
          registerOwnerNotes: cr.registerOwnerNotes,
        },
      });
    }

    if (els.length < 1) {
      els.push({
        label: "Create",
        toState: CR.State.DRAFT,
        timestamp: (cr as CR.Drafted).timeStarted,
      });
    }
  }

  return els;
}


function getNotes(cr: CR.Base): [key: string, el: JSX.Element][] {
  const els: [key: string, el: JSX.Element][] = [];
  if (CR.hasSubmitterInput(cr)) {
    els.push(['Submitter’s justification', <>{cr.justification}</>]);
  }
  if (CR.hasRegisterManagerInput(cr)) {
    els.push(['Register manager’s notes', <>{cr.registerManagerNotes}</>]);
  }
  if (CR.hasControlBodyInput(cr)) {
    els.push(['Control body decision', <>{cr.controlBodyNotes}</>]);
  }
  if (CR.hasAppealRequest(cr)) {
    els.push(['Reason for appeal', <>{cr.appealReason}</>]);
  }
  if (CR.hasRegisterOwnerInput(cr)) {
    els.push(['Register owner notes', <>{cr.registerOwnerNotes}</>]);
  }
  return els;
}


const PastTransitions: React.FC<{ cr: CR.Base }> = function ({ cr }) {
  return <>
    {getNotes(cr).map(([key, el], idx) =>
      <React.Fragment key={key}>
        {idx !== 0 ? <Divider /> : null}
        <FormGroup label={`${key}:`}>
          <div
              css={css`white-space: pre-wrap;`}
              className={Classes.RUNNING_TEXT}>
            {el}
          </div>
        </FormGroup>
      </React.Fragment>
    )}
  </>
}

export default PastTransitions;
