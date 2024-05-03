/** @jsx jsx */
/** @jsxFrag React.Fragment */

import React, { useMemo } from 'react';
import { jsx, css } from '@emotion/react';
import { type MenuItemProps } from '@blueprintjs/core';

import DL from '@riboseinc/paneron-extension-kit/widgets/DL';

import MetaProperties from '../../../proposals/MetaProperties';
import type { Register, RegisterStakeholder } from '../../../types';
import { type SomeCR as CR, isCreatedBy } from '../../../proposals/types';
import TransitionOptions, { isFinalState, getTransitions, canBeTransitionedBy } from '../../../proposals/TransitionOptions';
import TransitionsAndStatus, { getTransitionHistory } from '../../../proposals/TransitionHistory';
import HomeBlock from './Block';


const CurrentProposalBlock: React.VoidFunctionComponent<{
  proposal: CR
  register: Register
  stakeholder?: RegisterStakeholder
  canDelete?: boolean
  onDelete?: () => (void | Promise<void>)
  onOpen?: () => void
  className?: string
}> = function ({ proposal, stakeholder, register, onDelete, onOpen, canDelete, className }) {
  const actions = useMemo(() => {
    const actions: MenuItemProps[] = stakeholder && canBeTransitionedBy(stakeholder, proposal)
      ? [/*{
          // Action is taken from within the widget.
          text: "Take action",
          onClick: () => void 0,
          icon: 'take-action',
          intent: 'primary',
        }*/]
      : [];

    if (canDelete) {
      actions.push({
        text: "Delete this proposal draft",
        onClick: onDelete,
        disabled: !onDelete,
        icon: 'delete',
        intent: 'danger',
      });
    }

    actions.push({
      text: "View proposal in a new tab",
      icon: 'open-application',
      disabled: !onOpen,
      onClick: onOpen,
    });

    return actions;
  }, [onDelete, onOpen, stakeholder, proposal, canDelete]);

  return (
    <HomeBlock
      View={CurrentProposal}
      description="Active proposal"
      props={{ proposal, stakeholder, register }}
      className={className}
      actions={actions}
    />
  );
};

export default CurrentProposalBlock;


const CurrentProposal: React.VoidFunctionComponent<{
  proposal: CR
  register: Register
  stakeholder?: RegisterStakeholder
}> = function ({ stakeholder, register, proposal }) {
  const transitions = stakeholder
    ? getTransitions(proposal, stakeholder)
    : [];
  const crStakeholder = (register?.stakeholders ?? []).
    find(s => isCreatedBy(s, proposal));

  return (
    <>
      <DL css={css`padding: 10px 12px 10px 12px; flex-grow: 1; flex-basis: max-content;`}>
        <div>
          <dt>Viewing&nbsp;proposal:</dt>
          <dd css={css`max-height: 40px; overflow-y: auto;`}>
            “{proposal.justification.trim() || '(justification N/A)'}”
          </dd>
        </div>
        <MetaProperties
          cr={proposal}
          currentStakeholder={stakeholder}
          submittingStakeholder={crStakeholder}
        />
      </DL>
      <div css={css`overflow-y: auto; flex-basis: min-content;`}>
        <TransitionsAndStatus
          pastTransitions={getTransitionHistory(proposal)}
          isFinal={isFinalState(proposal.state)}
        />
        {transitions.length > 0
          ? <TransitionOptions
              stakeholder={stakeholder}
              transitions={transitions}
              cr={proposal}
              css={css`padding: 12px;`}
            />
          : null}
      </div>
    </>
  );
};
