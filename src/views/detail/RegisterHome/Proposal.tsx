/** @jsx jsx */
/** @jsxFrag React.Fragment */

import React, { useState, useCallback, useMemo } from 'react';
import styled from '@emotion/styled';
import { jsx, css } from '@emotion/react';
import {
  Button,
  FormGroup,
  ControlGroup,
  TextArea,
  //PanelStack2 as PanelStack, type Panel,
  Menu, MenuDivider, MenuItem,
  Icon, Spinner,
  //NonIdealState,
  Colors,
  Classes,
} from '@blueprintjs/core';

import DL from '@riboseinc/paneron-extension-kit/widgets/DL';
import HelpTooltip from '@riboseinc/paneron-extension-kit/widgets/HelpTooltip';
import { maybeEllipsizeString } from '../../util';
import type {
  Register,
  RegisterStakeholder,
} from '../../../types';
import { type SomeCR as CR } from '../../../types/cr';
import TransitionOptions, { isFinalState, getTransitions, canBeTransitionedBy } from '../../change-request/TransitionOptions';
import { getTransitionHistory, type TransitionHistoryEntry } from '../../change-request/PastTransitions';
import Summary from '../../change-request/Summary';


export const CurrentProposal: React.VoidFunctionComponent<{
  proposal: CR
  register: Register
  stakeholder?: RegisterStakeholder
  className?: string
}> = function ({ stakeholder, register, proposal, className }) {
  const transitions = stakeholder ? getTransitions(proposal, stakeholder) : [];

  return (
    <div className={className}>
      <DL className={Classes.RUNNING_TEXT} css={css`padding: 10px;`}>
        <div>
          <dt>Viewing proposal:</dt>
          <dd>“{proposal.justification.trim() || '(justification N/A)'}”</dd>
        </div>
        <Summary
          cr={proposal}
          currentStakeholder={stakeholder}
          registerMetadata={register}
        />
      </DL>
      <TransitionsAndStatus
        pastTransitions={getTransitionHistory(proposal)}
        isFinal={isFinalState(proposal.state)}
      />
      <TransitionOptions
        stakeholder={stakeholder}
        transitions={transitions}
        cr={proposal}
        css={css`padding: 10px;`}
      />
    </div>
  );
};


export const TransitionsAndStatus: React.VoidFunctionComponent<{
  pastTransitions: TransitionHistoryEntry[]
  isFinal?: boolean
}> = function ({ pastTransitions, isFinal }) {
  return (
    <>
      {pastTransitions.map(([label, notes, color], idx) =>
        <TransitionEntry
            css={css`
              background-color: ${color ? color : Colors.GRAY1};
              &::before {
                background-color: ${color ? color : Colors.GRAY1};
              }
              ${idx === pastTransitions.length - 1
                ? `
                    font-weight: bold;
                    ${isFinal
                      ? '&::before { display: none; }'
                      : ''}
                  `
                : ''}
            `}
            key={idx}>
          {label}
          {notes
            ? <>&nbsp;<HelpTooltip icon="info-sign" content={notes} /></>
            : undefined}
        </TransitionEntry>
      )}
    </>
  );
};


const TransitionEntry = styled.div`
  position: relative;
  color: white;
  padding: 10px;
  margin-bottom: 1px;
  &::before {
    content: " ";
    display: block;
    overflow: hidden;
    height: 10px;
    width: 10px;
    transform: rotate(45deg);
    position: absolute;
    bottom: -5px;
    right: 20px;
    z-index: 10;
  }
`;


export const NewProposal: React.VoidFunctionComponent<{
  register: Register
  onCreateBlank?: (idea: string) => void
  className?: string
}> = function ({ register, onCreateBlank, className }) {
  const [ newProposalIdea, setNewProposalIdea ] = useState('');

  const handleNewProposal = useCallback(() => {
    if (newProposalIdea.trim()) {
      onCreateBlank?.(newProposalIdea);
      setNewProposalIdea('');
    } else {
      throw new Error("Cannot create proposal: need some initial motivation for the change");
    }
  }, [newProposalIdea, onCreateBlank]);

  return (
    <FormGroup
        className={className}
        css={css`overflow-y: auto;`}
        label={<>Propose a change to version {register.version?.id ?? '(N/A)'}:</>}>
      <ControlGroup vertical>
        <TextArea
          value={newProposalIdea ?? ''}
          placeholder="Your idea…"
          title="Justification draft (you can change this later)"
          onChange={evt => setNewProposalIdea(evt.currentTarget.value)}
        />
        <Button
            fill
            intent={newProposalIdea ? 'primary': undefined}
            disabled={!newProposalIdea.trim() || !onCreateBlank}
            title="A blank proposal will be created and opened in a new tab."
            onClick={handleNewProposal}
            icon="tick">
          Create
        </Button>
      </ControlGroup>
    </FormGroup>
  );
};

const ActionableProposalItems: React.VoidFunctionComponent<{
  actionableProposals: [groupLabel: JSX.Element | string, proposals: CR[] | undefined][]
  stakeholder?: RegisterStakeholder
  onEnterProposal?: (proposalID: string) => void
  activeCR?: CR
}> = function ({ stakeholder, actionableProposals, activeCR, onEnterProposal }) {
  return (
    <>
      {actionableProposals?.
      filter(([, proposals]) => proposals && proposals.length > 0).
      map(([groupLabel, proposals], idx) =>
        <React.Fragment key={idx}>
          <MenuDivider title={groupLabel} />
          {proposals !== undefined && proposals.length > 0
            ? proposals.map(cr =>
                <MenuItem
                  key={cr.id}
                  selected={activeCR && cr.id === activeCR?.id}
                  active={activeCR && cr.id === activeCR?.id}
                  text={maybeEllipsizeString(cr.justification?.trim() || cr.id, 120)}
                  htmlTitle={cr.justification}
                  disabled={!onEnterProposal}
                  labelElement={<Icon
                    icon={stakeholder && canBeTransitionedBy(stakeholder, cr)
                      ? 'take-action'
                      : undefined}
                  />}
                  onClick={() => onEnterProposal?.(cr.id)}
                />
              )
            : proposals === undefined
              ? <MenuItem disabled text="Loading…" icon={<Spinner />} />
              : <MenuItem disabled text="No pending proposals" icon="clean" />}
        </React.Fragment>)}
    </>
  );
}


export const Proposals: React.VoidFunctionComponent<{
  stakeholder?: RegisterStakeholder
  register: Register
  actionableProposals?: [groupLabel: JSX.Element | string, proposals: CR[] | undefined][]
  activeCR?: CR | null
  onImport?: () => void
  onCreate?: (idea: string) => void
  onExitProposal?: () => void
  onEnterProposal?: (id: string) => void
  onRefreshProposals?: () => void
  className?: string
}> = function ({
  stakeholder,
  activeCR,
  //register,
  actionableProposals,
  //onImport,
  //onCreate,
  onEnterProposal,
  //onExitProposal,
  //onRefreshProposals,
  className,
}) {
  //const [creating, setCreating] = useState(false);
  const hasActionable = (actionableProposals && actionableProposals.find(p => p[1] && p[1].length > 0));
  const proposalMenuItems: JSX.Element | null = useMemo(() => {
    return hasActionable
      ? <ActionableProposalItems
          stakeholder={stakeholder}
          actionableProposals={actionableProposals ?? []}
          onEnterProposal={onEnterProposal}
          activeCR={activeCR ?? undefined}
        />
      : null;
  }, [onEnterProposal, activeCR, hasActionable, stakeholder, actionableProposals]);

  return <Menu css={css`overflow-y: auto; background: none !important`} className={className}>
    {proposalMenuItems}
  </Menu>

  // const stack: Panel<any>[] = useMemo(() => {
  //   const stack = [];
  //   const proposalMenu = proposalMenuItems || onImport || onCreate
  //     ? <Menu css={css`overflow-y: auto; background: none !important;`}>
  //         {onImport
  //           ? <MenuItem onClick={onImport} text="Import proposal" icon="import" />
  //           : null}
  //         {onCreate
  //           ? <MenuItem
  //               onClick={() => setCreating(true)}
  //               text="Create blank proposal"
  //               icon="add"
  //             />
  //           : null}
  //         {proposalMenuItems}
  //       </Menu>
  //     : null;
  //   if (proposalMenu) {
  //     stack.push({
  //       title: activeCR
  //         ? "Proposals"
  //         : <>
  //             Proposals
  //             {hasActionable && !creating && !activeCR
  //               ? <>
  //                   &nbsp;
  //                   <Button
  //                     minimal
  //                     small
  //                     onClick={onRefreshProposals}
  //                     disabled={!onRefreshProposals}
  //                     icon="refresh"
  //                   />
  //                 </>
  //               : null}
  //           </>,
  //       renderPanel: () => proposalMenu,
  //     });
  //   }
  //   if (activeCR) {
  //     stack.push({
  //       title: activeCR.justification.trim() || activeCR.id,
  //       renderPanel: () =>
  //         <CurrentProposal
  //           proposal={activeCR}
  //           stakeholder={stakeholder}
  //           register={register}
  //           css={css`padding: 5px;`}
  //         />,
  //     });
  //   } else if (creating) {
  //     stack.push({
  //       title: "Start proposal",
  //       renderPanel: () =>
  //         <NewProposal
  //           onCreateBlank={onCreate}
  //           register={register}
  //           css={css`padding: 5px;`}
  //         />,
  //     });
  //   }
  //   return stack;
  // }, [
  //   onCreate, onImport, onRefreshProposals,
  //   creating, activeCR, register, stakeholder, proposalMenuItems
  // ]);

  // function handleClosePanel() {
  //   setCreating(false);
  //   onExitProposal?.();
  // }

  // return <PanelStack
  //   css={css`position: absolute; inset: 0; .bp4-panel-stack-view { background: none; }`}
  //   renderActivePanelOnly
  //   className={className}
  //   onClose={handleClosePanel}
  //   stack={stack.length > 0
  //     ? stack
  //     : [{ title: '', renderPanel: () => <NonIdealState title="Nothing to show" /> }]}
  // />;
}
