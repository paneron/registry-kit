/** @jsx jsx */
/** @jsxFrag React.Fragment */

import React, { useMemo, useState, useContext, memo } from 'react';
import { jsx, css } from '@emotion/react';
import {
  Button,
  NonIdealState,
  Icon,
  Checkbox,
} from '@blueprintjs/core';
import DL from '@riboseinc/paneron-extension-kit/widgets/DL';
import Workspace from '@riboseinc/paneron-extension-kit/widgets/Workspace';
import SuperSidebar from '@riboseinc/paneron-extension-kit/widgets/TabbedWorkspace/SuperSidebar';
import { BrowserCtx } from '../BrowserCtx';
import type { CriteriaGroup } from '../FilterCriteria/models';
import type { Register, RegisterStakeholder } from '../../types';
import { canCreateCR } from '../../types/stakeholder';
import { type SomeCR as CR } from '../../types/cr';
import Summary from '../change-request/Summary';
import ProposalSearch from '../../proposals/Search';
import Search from '../../views/sidebar/Search';
import { RegisterHelmet as Helmet } from '../util';
import { ChangeRequestContext } from '../change-request/ChangeRequestContext';
import { TabContentsWithHeader } from '../util';
import TransitionOptions, { getTransitions, isFinalState } from '../change-request/TransitionOptions';
import TransitionsAndStatus, { getTransitionHistory } from '../change-request/TransitionHistory';


const ProposalWork: React.VoidFunctionComponent<Record<never, never>> =
memo(function () {
  const { changeRequest: activeCR } = useContext(ChangeRequestContext);
  const { registerMetadata: register, stakeholder, } = useContext(BrowserCtx);
  if (!activeCR || !register || !stakeholder) {
    return <NonIdealState
      icon="clean"
      title="Not working on any proposal"
      description={<>
        <p>
          Choose an actionable proposal from the sidebar to the left
          and activate it by double-clicking
        </p>
        {register && stakeholder && canCreateCR(stakeholder)
          ? <>
              <p>—or—</p>
              <Button large intent="primary">Start a new proposal</Button>
            </>
          : null}
      </>}
    />;
  } else {
    return <ActiveProposal
      proposal={activeCR}
      register={register}
      stakeholder={stakeholder}
    />;
  }
});


const ProposalWorkTitle: React.VoidFunctionComponent<Record<never, never>> = function () {
  const { changeRequest: activeCR } = useContext(ChangeRequestContext);
  return <>{activeCR
    ? <strong> Active proposal</strong>
    : <>Proposal dashboard</>}</>;
};


export default {
  main: ProposalWork,
  title: ProposalWorkTitle,
} as const;


const ActiveProposal: React.VoidFunctionComponent<{
  proposal: CR
  register: Register
  stakeholder?: RegisterStakeholder
}> = function ({ proposal, register, stakeholder }) {
  const implicitCriteria: CriteriaGroup | undefined = useMemo(() => (
    {
      require: 'any',
      criteria: [{
        key: 'custom',
        // TODO: Can drop this
        query: `true`,
      }],
    }
  ), [proposal?.id]);

  return (
    <TabContentsWithHeader
        title={<>{proposal.justification}</>}
        classification={[{ children: <>{proposal.state}</> }]}>
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
                    <Summary
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
            implicitCriteria={implicitCriteria}
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
