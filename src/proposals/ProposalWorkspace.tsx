/** @jsx jsx */
/** @jsxFrag React.Fragment */

import React, { useMemo, useState } from 'react';
import { jsx, css } from '@emotion/react';
import {
  Icon,
  Checkbox,
  UL,
  type Intent,
  type IconName,
} from '@blueprintjs/core';

import DL from '@riboseinc/paneron-extension-kit/widgets/DL';
import Workspace from '@riboseinc/paneron-extension-kit/widgets/Workspace';
import SuperSidebar from '@riboseinc/paneron-extension-kit/widgets/TabbedWorkspace/SuperSidebar';

import type { Register, RegisterStakeholder } from '../types';
import { TabContentsWithHeader, Datestamp } from '../views/util';
import { RegisterHelmet as Helmet } from '../views/util';
import { MATCHES_ANY_CRITERIA } from '../views/FilterCriteria/models';
import { type SomeCR as CR, isDisposed, hadBeenProposed } from './types';
import MetaProperties from './MetaProperties';
import ProposalSearch from './Search';
import Search from '../views/sidebar/Search';
import TransitionOptions, { getTransitions, isFinalState } from './TransitionOptions';
import TransitionsAndStatus, { getTransitionHistory } from './TransitionHistory';


const ProposalWorkspace: React.VoidFunctionComponent<{
  proposal: CR
  register: Register
  stakeholder?: RegisterStakeholder
}> = function ({ proposal, register, stakeholder }) {
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

  return (
    <TabContentsWithHeader
        title={<>{proposal.justification}</>}
        classification={classification}>
      <Workspace sidebarPosition="right" sidebar={
        <SuperSidebar
          sidebarIDs={['meta']}
          css={css`width: 30% !important; min-width: 300px;`}
          selectedSidebarID='meta'
          config={{
            meta: {
              icon: () => <Icon icon="document" />,
              title: "Meta",
              blocks: [{
                key: 'summary',
                title: "Summary",
                content: <div css={css`padding: 0 5px;`}>
                  “{proposal.justification?.trim()}”
                  <br />
                  <DL>
                    <MetaProperties
                      cr={proposal}
                      currentStakeholder={stakeholder}
                      registerMetadata={register}
                    />
                  </DL>
                </div>,
              }, {
                key: 'transitions',
                title: "Transitions",
                content: <TransitionBlockContents
                  proposal={proposal}
                  stakeholder={stakeholder}
                />,
              }],
            },
          }}
        />
      }>
        <Helmet><title>Working on proposal {proposal.justification}</title></Helmet>
        <div css={css`padding: 10px; flex: 1; display: flex; flex-flow: column nowrap; overflow: hidden;`}>
          <Search
            css={css`flex: 1;`}
            //style={{ height: '100vh', width: '50vw', minWidth: '500px', maxWidth: '90vw' }}
            implicitCriteria={MATCHES_ANY_CRITERIA}
            stateName={`proposal-${proposal.id}-search`}
            List={ProposalSearch as any}
            extraData={{ proposal }}
            //onOpenItem={onChooseItem ? handleOpenItem : undefined}
          />
        </div>
      </Workspace>
    </TabContentsWithHeader>
  );
};

export default ProposalWorkspace;


const TransitionBlockContents: React.VoidFunctionComponent<{
  proposal: CR
  stakeholder?: RegisterStakeholder
}> = function ({ proposal, stakeholder }) {
  const transitions = useMemo(
    (() => stakeholder
      ? getTransitions(proposal, stakeholder)
      : []),
    [proposal, stakeholder]);

  const [showDetailedHistory, setShowDetailedHistory] = useState(false);

  const transitionsBlock = useMemo(
    (() =>
      <div css={css`overflow-y: auto; max-height: 300px;`}>
        <Checkbox
            // NOTE: left margin aligns with transition history bullets…
            css={css`margin: 5px 15px;`}
            checked={showDetailedHistory}
            onChange={(evt) => setShowDetailedHistory(evt.currentTarget.checked)}>
          Show detailed history
        </Checkbox>
        <TransitionsAndStatus
          pastTransitions={getTransitionHistory(proposal)}
          isFinal={isFinalState(proposal.state)}
          detailed={showDetailedHistory}
        />
        {!showDetailedHistory && transitions.length > 0
          ? <TransitionOptions
              stakeholder={stakeholder}
              transitions={transitions}
              cr={proposal}
              css={css`padding: 12px;`}
            />
          : null}
      </div>),
    [proposal, transitions, setShowDetailedHistory, showDetailedHistory]);

  return transitionsBlock;
}
