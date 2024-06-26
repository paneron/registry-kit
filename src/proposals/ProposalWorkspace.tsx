/** @jsx jsx */
/** @jsxFrag React.Fragment */

import React, { useMemo, useState } from 'react';
import { jsx, css } from '@emotion/react';
import {
  Icon,
  Checkbox,
} from '@blueprintjs/core';

import { WrappableDL as DL } from '@riboseinc/paneron-extension-kit/widgets/DL';
import Workspace from '@riboseinc/paneron-extension-kit/widgets/Workspace';
import SuperSidebar from '@riboseinc/paneron-extension-kit/widgets/TabbedWorkspace/SuperSidebar';

import type { Register, RegisterStakeholder } from '../types';
import Search from '../views/sidebar/Search';
import { RegisterHelmet as Helmet } from '../views/util';
import { MATCHES_ANY_CRITERIA } from '../views/FilterCriteria/models';
import { type SomeCR as CR } from './types';
import MetaProperties from './MetaProperties';
import ProposalSearch from './Search';
import TransitionOptions, { getTransitions, isFinalState } from './TransitionOptions';
import TransitionsAndStatus, { getTransitionHistory } from './TransitionHistory';


const SIDEBAR_IDS = ['meta'] as const;


const ProposalWorkspace: React.VoidFunctionComponent<{
  proposal: CR
  compareRegisterVersion?: boolean
  register?: Register

  /** Current stakeholder. */
  stakeholder?: RegisterStakeholder

  /** If not specified, opening an item will spawn its tab. */
  onOpenItem?: (itemPath: string | null) => void
}> = function ({ proposal, compareRegisterVersion, register, stakeholder, onOpenItem }) {

  const sidebarConfig = useMemo(() => {
    return {
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
                register={register}
                compareRegisterVersion={compareRegisterVersion}
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
    };
  }, [compareRegisterVersion, register, stakeholder, proposal]);

  return (
    <Workspace sidebarPosition="right" sidebar={
      <SuperSidebar
        sidebarIDs={SIDEBAR_IDS}
        css={css`width: 30% !important; min-width: 300px;`}
        selectedSidebarID='meta'
        config={sidebarConfig}
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
          onOpenItem={onOpenItem}
        />
      </div>
    </Workspace>
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
