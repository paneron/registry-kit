/** @jsx jsx */
/** @jsxFrag React.Fragment */

import React, { useState } from 'react';
import { jsx, css } from '@emotion/core';
import { Button, ButtonGroup, FormGroup } from '@blueprintjs/core';
import { ChangeRequest } from '../../types';
import Justification from './Justification';
import Proposals from './Proposals';
import { RegisterStakeholderListItem } from '../RegisterStakeholder';


export type SelfApprovedCRData =
  Pick<ChangeRequest, 'proposals' | 'justification' | 'controlBodyNotes' | 'sponsor'>;


function makeTemplate(invariant: Pick<SelfApprovedCRData, 'sponsor' | 'proposals'>):
SelfApprovedCRData {
  return {
    justification: '',
    controlBodyNotes: '',
    ...invariant,
  };
}


interface SelfApprovedCRProps {
  proposals: SelfApprovedCRData['proposals']
  sponsor: SelfApprovedCRData['sponsor']
  onConfirm: (cr: SelfApprovedCRData) => void
  onCancel: () => void
  className?: string
}

/* A form for creating a self-approved change request
   at the time of the edit. The form is intended to be shown
   as a confirmation prompt alongside edits made, and therefore:

   - change proposals are not editable (for rough review only), and
   - it should contain either one changed item,
     or same edit applied to multiple items in a batch. */
const SelfApprovedCR: React.FC<SelfApprovedCRProps> =
function ({ proposals, sponsor, onConfirm, onCancel, className }) {
  const [cr, updateCR] = useState<SelfApprovedCRData>(
    makeTemplate({ proposals, sponsor }));

  function handleConfirm() {
    if (canConfirm) {
      onConfirm({
        justification: cr.justification,
        controlBodyNotes: cr.controlBodyNotes,
        proposals,
        sponsor,
      });
    }
  }

  const canConfirm = cr.justification.trim() !== '';

  return (
    <div
        css={css`
          display: flex; flex-flow: column nowrap;
          /* workaround */
          span.bp3-popover-target { display: unset; }
        `}
        className={className}>
      <Proposals proposals={proposals} css={css`flex: 1;`} />
      <Justification
        justification={cr.justification}
        onChange={justification => updateCR(cr => ({ ...cr, justification }))}
      />
      <FormGroup label="Sponsor:">
        <RegisterStakeholderListItem stakeholder={sponsor} isCurrentUser />
      </FormGroup>
      <ButtonGroup>
        <Button
            intent={canConfirm ? "primary" : undefined}
            disabled={!canConfirm}
            onClick={handleConfirm}>
          Save and approve
        </Button>
        <Button onClick={() => onCancel()}>
          Cancel
        </Button>
      </ButtonGroup>
    </div>
  );
};


export default SelfApprovedCR;
