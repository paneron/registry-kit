/** @jsx jsx */
/** @jsxFrag React.Fragment */

import React, { useMemo } from 'react';
import { jsx, css } from '@emotion/react';
import {
  UL,
  type Intent,
  type IconName,
} from '@blueprintjs/core';

import type { Register, RegisterStakeholder } from '../types';
import { TabContentsWithHeader, Datestamp } from '../views/util';
import { type SomeCR as CR, isDisposed, hadBeenProposed } from './types';

import Workspace from './ProposalWorkspace';


const ProposalTab: React.VoidFunctionComponent<{
  proposal: CR
  onDelete?: () => void
  register: Register
  stakeholder?: RegisterStakeholder
}> = function ({ proposal, onDelete, register, stakeholder }) {
  const pending = !isDisposed(proposal);
  const proposedMarker = <>
    Proposed: {hadBeenProposed(proposal)
      ? <Datestamp date={proposal.timeProposed} />
      : 'not yet'}
  </>;
  const disposedMarker = <>
    Disposed: {!pending
      ? <Datestamp date={proposal.timeDisposed} />
      : 'not yet'}
  </>;
  const editedMarker = <>Edited: <Datestamp date={proposal.timeEdited} /></>;
  const classification = useMemo(() => {
    return [{
      icon: 'lightbulb' as IconName,
      children: "Proposal",
      tooltip: {
        icon: 'info-sign' as IconName,
        content: <UL css={css`margin: 0;`}>
          <li>Proposal ID: {proposal.id}</li>
        </UL>,
      },
    }, {
      children: pending
        ? <>pending</>
        : <>disposed</>,
    }, {
      children: proposal.state?.replaceAll('-', ' ') || 'N/A',
      tooltip: {
        icon: 'history' as IconName,
        content: <UL css={css`margin: 0;`}>
          <li>{editedMarker}</li>
          <li>{proposedMarker}</li>
          <li>{disposedMarker}</li>
        </UL>,
      },
      intent: proposal.state === 'accepted'
        ? 'success'
        : proposal.state === 'returned-for-clarification'
          ? 'warning'
          : proposal.state === 'withdrawn' || proposal.state === 'rejected'
            ? 'danger'
            : proposal.state === 'draft'
              ? undefined
              : 'primary' as Intent,
    }];
  }, [
    proposal.state,
    pending,
    editedMarker, proposedMarker, disposedMarker,
  ]);

  const actions = useMemo(() => {
    const actions = [];
    if (onDelete) {
      actions.push({
        text: "Delete this proposal",
        onClick: onDelete,
      });
    }
    return actions;
  }, [onDelete]);
  return (
    <TabContentsWithHeader
        title={<>{proposal.justification}</>}
        classification={classification}
        actions={actions}>
      <Workspace proposal={proposal} register={register} stakeholder={stakeholder} />
    </TabContentsWithHeader>
  );

};

export default ProposalTab;
