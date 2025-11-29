/** @jsx jsx */
/** @jsxFrag React.Fragment */

import styled from '@emotion/styled';
import { jsx, css } from '@emotion/react';
import React from 'react';
import { Icon, Colors } from '@blueprintjs/core';

import { normalizeObjectRecursively } from '@riboseinc/paneron-extension-kit/util';
import HelpTooltip from '@riboseinc/paneron-extension-kit/widgets/HelpTooltip';

import { Val } from '../views/diffing/InlineDiff';
import { Datestamp } from '../views/util';
import { registerStakeholderPlain } from '../views/RegisterStakeholder';
import { type RegisterStakeholder } from '../types/stakeholder';

import * as CR from './types';
import { STATE_COLOR } from './TransitionOptions';


/**
 * Transition history entry is mostly like `CR.TransitionEntry`,
 * except it has optional fields and can be `undefined` to represent
 * missing parts of history.
 */
export type TransitionHistoryEntry = Omit<CR.TransitionEntry, 'timestamp' | 'fromState' | 'stakeholder' | 'input'> & {
  timestamp?: Date
  fromState?: CR.StateType
  stakeholder?: RegisterStakeholder
  input?: CR.StateInput
} | undefined;


/**
 * Outputs transition history,
 * back-filling it from state and timestamps if `pastTransitions` is not present.
 */
export function getTransitionHistory(cr: CR.Base): TransitionHistoryEntry[] {
  if (cr.pastTransitions && cr.pastTransitions.length > 0) {
    return [{
      label: "Create",
      toState: CR.State.DRAFT,
      timestamp: (cr as CR.Drafted).timeStarted,
    }, ...cr.pastTransitions];

  } else {
    const els: TransitionHistoryEntry[] = [];

    els.push({
      label: "Create",
      toState: CR.State.DRAFT,
      timestamp: (cr as CR.Drafted).timeStarted,
    });

    if (!CR.isDrafted(cr)) {
      els.push(undefined);
    }

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
          //controlBodyNotes: (cr as any).controlBodyNotes,
          controlBodyDecisionEvent: (cr as any).controlBodyDecisionEvent,
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
          //controlBodyNotes: (cr as any).controlBodyNotes,
          controlBodyDecisionEvent: (cr as any).controlBodyDecisionEvent,
        },
      });
    } else if (CR.isRejected(cr)) {
      els.push({
        label: "Reject",
        toState: CR.State.REJECTED,
        timestamp: cr.timeDisposed,
        input: {
          //controlBodyNotes: (cr as any).controlBodyNotes,
          controlBodyDecisionEvent: (cr as any).controlBodyDecisionEvent,
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
    return els;
  }
}


/**
 * Lists transitions between states,
 * emphasizing the end (current as of now) state.
 */
export const TransitionsAndStatus: React.VoidFunctionComponent<{
  pastTransitions: TransitionHistoryEntry[]
  isFinal?: boolean
  detailed?: boolean
}> = function ({ pastTransitions, isFinal, detailed }) {
  return (
    <>
      {pastTransitions.map((entry, idx) => {
        if (entry) {
          const { label, stakeholder, fromState, toState, input, timestamp } = entry;
          const details = input || timestamp || stakeholder
            ? <>
                {input
                  ? <div css={css`margin: .25em 0;`}>
                      <Val val={normalizeObjectRecursively(input)} />
                    </div>
                  : null}
                <small css={css`display: block;`}>
                  {stakeholder
                      ? <span>{registerStakeholderPlain(stakeholder)}</span>
                      : 'unknown stakeholder'}
                  <br />
                  at {timestamp
                    ? <Datestamp useUTC showTime date={timestamp} />
                    : "unknown time"}
                </small>
              </>
            : null;
          return <TransitionEntryWrapper
              title={`Transition ${fromState ? `from ${fromState} ` : ''}to ${toState}`}
              css={css`
                background: linear-gradient(
                  345deg,
                  ${STATE_COLOR[toState] ?? Colors.GRAY1}aa,
                  ${STATE_COLOR[toState] ?? Colors.GRAY1} 50%);
                position: sticky;
                top: ${idx * 3}px;
                z-index: 1;
                ${idx === pastTransitions.length - 1
                  ? `
                      ${!detailed ? 'font-weight: bold;' : ''}
                      ${isFinal
                        ? `
                            &::before {
                              ${transitionEntryDecorativeMarkerFinal}
                            }
                          `
                        : ''}
                    `
                  : ''}
                  ${idx === 0
                    ? `
                        &::before {
                          ${transitionEntryDecorativeMarkerInitial}
                        }
                      `
                    : ''}
              `}
              key={idx}>
            {label}
            {detailed && details ? details : null}
            {!detailed && details
              ? <>&nbsp;<HelpTooltip icon="info-sign" content={<div css={css`display: flex; flex-flow: column nowrap;`}>{details}</div>} />
                </>
              : null}
          </TransitionEntryWrapper>
        } else {
          if (idx > 0 && pastTransitions[idx - 1] !== undefined) {
            return <MissingTransitionEntries />;
          } else {
            // Don’t output multiple missing steps in a row.
            return null;
          }
        }
      })}
    </>
  );
};


/** Shown in place of transition entries, if some are missing. */
const MissingTransitionEntries: React.VoidFunctionComponent<Record<never, never>> = function () {
  return (
    <div title="No detailed state transitions available">
      <Icon
        icon="more"
        css={css`
          position: relative;
          left: ${TRANSITION_ENTRY_MARKER_SIDE_OFFSET_PX}px;
          transform: translateX(-50%);
        `}
      />
    </div>
  );
};


const TRANSITION_ENTRY_MARKER_SIDE_OFFSET_PX = 22;

/**
 * Style rules for pseudo-element that contains decorative marker line with a circle.
 */
const transitionEntryDecorativeMarker = `
  content: " ";
  background: white;
  display: block;
  overflow: hidden;
  z-index: 1;
  position: absolute;
  left: ${TRANSITION_ENTRY_MARKER_SIDE_OFFSET_PX}px;

  transform: translateX(-50%);
  top: 0;
  width: 2px;
  bottom: 0;
`;

/**
 * Style rules for pseudo-element that contains decorative marker line with a circle.
 */
const transitionEntryDecorativeMarkerInitial = `
  top: 50%;
`;

/**
 * Style rules for pseudo-element that contains decorative marker line with a circle.
 */
const transitionEntryDecorativeMarkerFinal = `
  bottom: 50%;
`;


const TransitionEntryWrapper = styled.div`
  position: relative;
  color: white;
  padding: 10px;
  padding-left: ${TRANSITION_ENTRY_MARKER_SIDE_OFFSET_PX + 20}px;
  margin-bottom: 1px;

  &::after {
    content: " ";
    background: white;
    display: block;
    overflow: hidden;
    z-index: 1;
    position: absolute;
    left: ${TRANSITION_ENTRY_MARKER_SIDE_OFFSET_PX}px;

    transform: translateX(-50%) translateY(-50%);
    top: 50%;
    width: 10px;
    height: 10px;
    border-radius: 100%;
  }

  &::before {
    ${transitionEntryDecorativeMarker}
  }
`;


export default TransitionsAndStatus;
