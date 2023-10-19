/** @jsx jsx */
/** @jsxFrag React.Fragment */

import { jsx, css } from '@emotion/react';
import React from 'react';
import { FormGroup, Divider, Classes, Colors } from '@blueprintjs/core';
import * as CR from '../../types/cr';
import { STATE_COLOR } from './TransitionOptions';


export function getTransitionHistory(cr: CR.Base):
[key: string, details: JSX.Element | null, color: typeof Colors[keyof typeof Colors] | undefined][] {
  const els:
  [key: string, details: JSX.Element | null, color: typeof Colors[keyof typeof Colors] | undefined][] =
  [];

  if (cr.pastTransitions && cr.pastTransitions.length > 0) {

    els.push(['started', null, undefined]);

    for (const entry of cr.pastTransitions) {
      const input = entry.input?.toString()?.trim() || null;
      els.push([
        entry.label,
        input ? <>{input}</> : null,
        STATE_COLOR[entry.toState],
      ]);
    }

  } else {

    // Backward compatibility

    els.push(['started', null, undefined]);

    if (CR.isProposed(cr)) {
      els.push(['proposed', <>{cr.justification}</>, Colors.BLUE1]);
    }

    if (CR.isSubmittedForControlBodyReview(cr)) {
      els.push(['submitted for control body review', <>{cr.registerManagerNotes}</>, Colors.BLUE1]);
    }

    if (CR.isReturnedForClarification(cr)) {
      els.push(['returned for clarification', <>{cr.registerManagerNotes} <br /> {(cr as any).controlBodyNotes}</>, Colors.ORANGE1]);
    }

    if (CR.isWithdrawn(cr)) {
      els.push(['withdrawn', null, undefined]);
    } else if (CR.isAccepted(cr)) {
      els.push(['accepted', <>{cr.controlBodyNotes}</>, Colors.GREEN1]);
    } else if (CR.isRejected(cr)) {
      els.push(['rejected', <>{cr.controlBodyNotes}</>, Colors.RED1]);
    }

    if (CR.isAppealed(cr)) {
      els.push(['appealed', <>{cr.appealReason}</>, Colors.ORANGE1]);
    }

    if (CR.isRejectedWithAppealWithdrawn(cr)) {
      els.push(['appeal withdrawn', null, undefined]);
    } else if (CR.isAcceptedOnAppeal(cr)) {
      els.push(['accepted on appeal', <>{cr.registerOwnerNotes}</>, Colors.GREEN1]);
    } else if (CR.isRejectedOnAppeal(cr)) {
      els.push(['rejection upheld on appeal', <>{cr.registerOwnerNotes}</>, Colors.RED1]);
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
