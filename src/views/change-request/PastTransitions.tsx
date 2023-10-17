/** @jsx jsx */
/** @jsxFrag React.Fragment */

import { jsx, css } from '@emotion/react';
import React from 'react';
import { FormGroup, Divider, Classes } from '@blueprintjs/core';
import * as CR from '../../types/cr';



function getPastTransitions(cr: CR.Base): [key: string, el: JSX.Element][] {
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
    {getPastTransitions(cr).map(([key, el], idx) =>
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
