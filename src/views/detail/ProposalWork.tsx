/** @jsx jsx */
/** @jsxFrag React.Fragment */

import React, { useMemo, useContext, memo } from 'react';
import { jsx, css } from '@emotion/react';
import {
  Button,
  NonIdealState,
} from '@blueprintjs/core';
import DL from '@riboseinc/paneron-extension-kit/widgets/DL';
import { BrowserCtx } from '../BrowserCtx';
import type { CriteriaGroup } from '../FilterCriteria/models';
import type { Register, RegisterStakeholder } from '../../types';
import { canCreateCR } from '../../types/stakeholder';
import { type SomeCR as CR } from '../../types/cr';
import Summary from '../change-request/Summary';
import Search from '../sidebar/Search';
import { RegisterHelmet as Helmet } from '../util';
import { ChangeRequestContext } from '../change-request/ChangeRequestContext';
import { TabContentsWithHeader } from '../util';
import TransitionOptions, { getTransitions, isFinalState } from '../change-request/TransitionOptions';
import TransitionsAndStatus, { getTransitionHistory } from '../change-request/TransitionHistory';


const ProposalWork: React.VoidFunctionComponent<Record<never, never>> =
memo(function () {
  const { changeRequest: activeCR } = useContext(ChangeRequestContext);
  const {
    registerMetadata: register,
    stakeholder,
  } = useContext(BrowserCtx);
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
  const transitions = useMemo(
    (() => stakeholder
      ? getTransitions(proposal, stakeholder)
      : []),
    [proposal, stakeholder]);

  const implicitCriteria: CriteriaGroup | undefined = useMemo(() => (
    {
      require: 'any',
      criteria: [{
        key: 'custom',
        query: `objPath.indexOf("/proposals/${proposal.id}") === 0`,
      }],
    }
  ), [proposal?.id]);

  return (
    <TabContentsWithHeader
        title={<>{proposal.justification}</>}
        classification={[{ children: <>{proposal.state}</> }]}>
        <div css={css`display: flex; flex-flow: row nowrap;`}>
        <Helmet><title>Working on proposal {proposal.justification}</title></Helmet>
          <div css={css`flex-basis: 70%; position: relative; display: flex; flex-flow: column nowrap; overflow: hidden;`}>
            <DL css={css`padding: 10px 12px 10px 12px; flex-basis: max-content;`}>
              <div>
                <dt>Viewing&nbsp;proposal:</dt>
                <dd css={css`max-height: 40px; overflow-y: auto;`}>
                  “{proposal.justification.trim() || '(justification N/A)'}”
                </dd>
              </div>
              <Summary
                cr={proposal}
                currentStakeholder={stakeholder}
                registerMetadata={register}
              />
            </DL>
            <div css={css`padding: 10px; flex: 1; display: flex; flex-flow: column nowrap; overflow: hidden;`}>
              <Search
                css={css`flex: 1;`}
                //style={{ height: '100vh', width: '50vw', minWidth: '500px', maxWidth: '90vw' }}
                implicitCriteria={implicitCriteria}
                stateName={`proposal-${proposal.id}-search`}
                //onOpenItem={onChooseItem ? handleOpenItem : undefined}
              />
            </div>
          </div>
          <div css={css`flex-basis: 30%; display: flex; flex-flow: column nowrap;`}>
            <div css={css`flex: 1; overflow-y: auto;`}>
              <TransitionsAndStatus
                pastTransitions={getTransitionHistory(proposal)}
                isFinal={isFinalState(proposal.state)}
              />
              {transitions.length > 0
                ? <TransitionOptions
                    stakeholder={stakeholder}
                    transitions={transitions}
                    cr={proposal}
                    css={css`flex: 1; height: 80%; padding: 12px;`}
                  />
                : null}
            </div>
        </div>
          </div>
    </TabContentsWithHeader>
  );
};

