/** @jsx jsx */
/** @jsxFrag React.Fragment */

import React, { useContext, useState } from 'react';
import { jsx, css } from '@emotion/react';
import { Button, ButtonGroup, FormGroup } from '@blueprintjs/core';
import { DatasetContext } from '@riboseinc/paneron-extension-kit/context';
import { ValueHook } from '@riboseinc/paneron-extension-kit/types';
import { ChangeRequest } from '../../types';
import { RegisterStakeholderListItem } from '../RegisterStakeholder';
import { BrowserCtx } from '../BrowserCtx';
import Justification from './Justification';
import Proposals from './Proposals';


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
  onConfirm: (cr: SelfApprovedCRData, opts?: { addForLater?: string | true }) => void
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

  const { useObjectData, useFilteredIndex, useObjectPathFromFilteredIndex, useIndexDescription } = useContext(DatasetContext);
  const { stakeholder } = useContext(BrowserCtx);

  const crIndex = useFilteredIndex({
    queryExpression: stakeholder?.gitServerUsername
      ? `return objPath.indexOf("/change-requests/") === 0 && obj.sponsor?.gitServerUsername === "${stakeholder?.gitServerUsername}" && obj.timeDisposed === undefined && obj.status === 'pending'`
      : 'return false',
  });

  const crIndexStatus = useIndexDescription({ indexID: crIndex.value.indexID }).value.status;

  const [selectedCRPosition, selectCRPosition] = useState<number>(-1); // -1 means not adding to existing CR.

  const selectedCRPath = useObjectPathFromFilteredIndex({
    indexID: crIndex.value.indexID ?? '',
    position: selectedCRPosition >= 0 ? selectedCRPosition : 0,
  }).value.objectPath;

  const selectedCRDataRequest = useObjectData({
    objectPaths: selectedCRPath !== '' ? [selectedCRPath] : [],
  }) as ValueHook<{ data: Record<string, ChangeRequest | null> }>;

  const selectedCRData = selectedCRPosition >= 0 && selectedCRPath
    ? selectedCRDataRequest.value.data[selectedCRPath]
    : null;

  function handleConfirm(addForLater?: string | true) {
    if (canAdd) {
      onConfirm({
        justification: selectedCRData?.justification ?? cr.justification,
        controlBodyNotes: cr.controlBodyNotes,
        proposals,
        sponsor,
      }, {
        addForLater,
      });
    } else if (canAutoApprove) {
      onConfirm({
        justification: cr.justification,
        controlBodyNotes: cr.controlBodyNotes,
        proposals,
        sponsor,
      }, {
        addForLater,
      });
    }
  }

  const canAutoApprove = cr.justification.trim() !== '';
  const canAdd = (selectedCRPosition < 0 && cr.justification.trim() !== '') || selectedCRData !== null;

  return (
    <div
        css={css`
          display: flex; flex-flow: column nowrap;
          /* workaround */
          span.bp3-popover-target { display: unset; }
        `}
        className={className}>
      <Proposals proposals={proposals} css={css`flex: 1; margin-bottom: 20px;`} />
      <ButtonGroup
          fill
          css={css`margin-bottom: 10px;`}
          title="Use arrows on the sides to select a change request to add these proposals to.">
        <Button
          icon="arrow-left"
          disabled={selectedCRPosition < 0}
          onClick={() => selectCRPosition(pos => pos < 0 ? pos : pos -= 1)}
        />
        <Button
            disabled
            fill
            loading={selectedCRPosition >= 0 && selectedCRData === null}>
          {selectedCRPosition < 0
            ? "Don’t add to an existing pending change request"
            : `Add to “${selectedCRData?.justification}”`}
        </Button>
        <Button
          icon="arrow-right"
          disabled={selectedCRPosition >= crIndexStatus.objectCount - 1}
          onClick={() => selectCRPosition(pos => pos += 1)}
        />
      </ButtonGroup>
      <Justification
        justification={selectedCRData ? selectedCRData.justification : cr.justification}
        onChange={selectedCRData?.justification
          ? undefined
          : justification => updateCR(cr => ({ ...cr, justification }))}
      />
      <FormGroup label="Sponsor:">
        <RegisterStakeholderListItem stakeholder={sponsor} isCurrentUser />
      </FormGroup>
      <ButtonGroup>
        <Button
            intent={canAutoApprove ? "success" : undefined}
            disabled={!canAutoApprove}
            onClick={() => handleConfirm()}>
          Save and approve immediately
        </Button>
        <Button
            disabled={!canAdd}
            intent={canAdd ? "success" : undefined}
            onClick={() => handleConfirm(selectedCRData?.id ?? true)}>
          Save and propose later{selectedCRData ? ' as part of selected CR above' : ''}
        </Button>
        <Button onClick={() => onCancel()}>
          Cancel
        </Button>
      </ButtonGroup>
    </div>
  );
};


export default SelfApprovedCR;
