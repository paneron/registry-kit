/** @jsx jsx */
/** @jsxFrag React.Fragment */

import React, { useContext, memo } from 'react';
import { jsx } from '@emotion/react';
import {
  Button,
  NonIdealState,
} from '@blueprintjs/core';
import { BrowserCtx } from '../BrowserCtx';
import { canCreateCR } from '../../types/stakeholder';
import { ChangeRequestContext } from '../../proposals/ChangeRequestContext';
import ProposalTab from '../../proposals/ProposalTab';


const ProposalWork: React.VoidFunctionComponent<Record<never, never>> =
memo(function () {
  const { changeRequest: activeCR } = useContext(ChangeRequestContext);
  const { registerMetadata: register, stakeholder } = useContext(BrowserCtx);
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
    return <ProposalTab
      proposal={activeCR}
      register={register}
      stakeholder={stakeholder}
    />;
  }
});


const ProposalWorkTitle: React.VoidFunctionComponent<Record<never, never>> = function () {
  const { changeRequest: activeCR } = useContext(ChangeRequestContext);
  return <>{activeCR
    ? <strong>Active proposal</strong>
    : <>Proposal dashboard</>}</>;
};


export default {
  main: ProposalWork,
  title: ProposalWorkTitle,
} as const;
