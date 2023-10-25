/** @jsx jsx */
/** @jsxFrag React.Fragment */

import React, {
  useState,
  useContext,
  useRef,
  useEffect,
  useCallback,
  useMemo,
} from 'react';
import styled from '@emotion/styled';
import { jsx, css } from '@emotion/react';
import {
  Button,
  FormGroup,
  ControlGroup,
  TextArea,
  PanelStack2 as PanelStack, type Panel,
  Menu, MenuDivider, MenuItem,
  Spinner,
  NonIdealState,
  Icon,
  Colors,
} from '@blueprintjs/core';

import DL from '@riboseinc/paneron-extension-kit/widgets/DL';
import HelpTooltip from '@riboseinc/paneron-extension-kit/widgets/HelpTooltip';
import { normalizeObjectRecursively } from '@riboseinc/paneron-extension-kit/util';
import { ChangeRequestContext } from '../../change-request/ChangeRequestContext';
import { RegisterStakeholderListItem } from '../../RegisterStakeholder';
import { maybeEllipsizeString } from '../../util';
import { Val } from '../../diffing/InlineDiff';
import type {
  Register,
  RegisterStakeholder,
} from '../../../types';
import { type SomeCR as CR } from '../../../types/cr';
import TransitionOptions, { isFinalState, getTransitions, STATE_COLOR } from '../../change-request/TransitionOptions';
import { getTransitionHistory, type TransitionHistoryEntry } from '../../change-request/PastTransitions';
import Summary from '../../change-request/Summary';


export const CurrentProposal: React.VoidFunctionComponent<{
  proposal: CR
  register: Register
  stakeholder?: RegisterStakeholder
}> = function ({ stakeholder, register, proposal }) {
  const transitions = stakeholder
    ? getTransitions(proposal, stakeholder)
    : [];

  return (
    <>
      <DL css={css`padding: 10px 12px 10px 12px; flex-grow: 1; flex-basis: max-content;`}>
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


export const TransitionsAndStatus: React.VoidFunctionComponent<{
  pastTransitions: TransitionHistoryEntry[]
  isFinal?: boolean
}> = function ({ pastTransitions, isFinal }) {
  return (
    <>
      {pastTransitions.map((entry, idx) => {
        if (entry) {
          const { label, stakeholder, fromState, toState, input, timestamp } = entry;
          return <TransitionEntry
              title={`Transition ${fromState ? `from ${fromState} ` : ''}to ${toState}`}
              css={css`
                background: linear-gradient(
                  345deg,
                  ${STATE_COLOR[toState] ?? Colors.GRAY1}aa,
                  ${STATE_COLOR[toState] ?? Colors.GRAY1} 50%);
                position: sticky;
                top: ${idx * 3}px;
                z-index: 1;
                ${idx === pastTransitions.length - 1
                  ? `
                      font-weight: bold;
                      ${isFinal
                        ? `
                            &::before {
                              ${transitionEntryDecorativeMarkerFinal}
                            }
                          `
                        : ''}
                    `
                  : ''}
                  ${idx === 0
                    ? `
                        &::before {
                          ${transitionEntryDecorativeMarkerInitial}
                        }
                      `
                    : ''}
              `}
              key={idx}>
            {label}
            {input || timestamp || stakeholder
              ? <>&nbsp;<HelpTooltip icon="info-sign" content={<div css={css`display: flex; flex-flow: column nowrap;`}>
                  {stakeholder
                    ? <span><RegisterStakeholderListItem stakeholder={stakeholder} /></span>
                    : null}
                  {timestamp
                    ? (timestamp.toISOString?.() || timestamp)
                    : null}
                  {input
                    ? <div><Val val={normalizeObjectRecursively(input)} /></div>
                    : null}
                </div>} /></>
              : undefined}
          </TransitionEntry>
        } else {
          if (idx > 0 && pastTransitions[idx - 1] !== undefined) {
            return <div
                css={css`position: relative`}
                title="No detailed state transitions available">
              <Icon
                icon="more"
                css={css`position: relative; left: 22px; transform: translateX(-50%);`}
              />
            </div>;
          } else {
            // Don’t output multiple missing steps in a row.
            return null;
          }
        }
      })}
    </>
  );
};


/**
 * Style rules for pseudo-element that contains decorative marker line with a circle.
 */
const transitionEntryDecorativeMarker = `
  content: " ";
  background: white;
  display: block;
  overflow: hidden;
  z-index: 1;
  position: absolute;
  left: 22px;

  transform: translateX(-50%);
  top: 0;
  width: 2px;
  bottom: 0;
`;

/**
 * Style rules for pseudo-element that contains decorative marker line with a circle.
 */
const transitionEntryDecorativeMarkerInitial = `
  top: 50%;
`;

/**
 * Style rules for pseudo-element that contains decorative marker line with a circle.
 */
const transitionEntryDecorativeMarkerFinal = `
  bottom: 50%;
`;


const TransitionEntry = styled.div`
  position: relative;
  color: white;
  padding: 10px;
  padding-left: 42px;
  margin-bottom: 1px;

  &::after {
    content: " ";
    background: white;
    display: block;
    overflow: hidden;
    z-index: 1;
    position: absolute;
    left: 22px;

    transform: translateX(-50%) translateY(-50%);
    top: 50%;
    width: 10px;
    height: 10px;
    border-radius: 100%;
  }

  &::before {
    ${transitionEntryDecorativeMarker}
  }
`;


export const NewProposal: React.VoidFunctionComponent<{
  register: Register
  onCreateBlank?: (idea: string) => Promise<void>
  className?: string
}> = function ({ register, onCreateBlank, className }) {
  const [ newProposalIdea, setNewProposalIdea ] = useState('');

  const handleNewProposal = useCallback(async function handleNewProposal () {
    if (newProposalIdea.trim()) {
      await onCreateBlank?.(newProposalIdea);
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


/**
 * A list of menu items for given actionable proposals,
 * grouped by label.
 */
const ActionableProposalItems: React.VoidFunctionComponent<{
  actionableProposals: [groupLabel: JSX.Element | string, proposals: CR[] | undefined][]
  onSelect?: (proposalID: string) => void
}> = function ActionableProposalItems ({ actionableProposals, onSelect }) {
  return <>{
    actionableProposals?.
    filter(([, proposals]) => proposals && proposals.length > 0).
    map(([groupLabel, proposals], idx) =>
      <React.Fragment key={idx}>
        <MenuDivider title={groupLabel} />
        {proposals !== undefined && proposals.length > 0
          ? proposals.map(cr =>
              <ActionableProposalItem
                cr={cr}
                onClick={onSelect}
              />)
          : proposals === undefined
            ? <MenuItem disabled text="Loading…" icon={<Spinner />} />
            : <MenuItem disabled text="No pending proposals" icon="clean" />}
      </React.Fragment>)
  }</>;
};


const ActionableProposalItem: React.VoidFunctionComponent<{
  cr: CR
  onClick?: (crID: string) => void
}> = function ({ cr, onClick }) {
  const { changeRequest: activeCR } = useContext(ChangeRequestContext);
  const selectedMenuItem = useRef<HTMLLIElement | null>(null);
  const isActive = activeCR && cr.id === activeCR?.id
    ? true
    : false;
  useEffect(() => {
    selectedMenuItem.current?.scrollIntoView?.({ block: 'nearest' });
  }, [isActive]);
  const handleClick = useCallback(() => {
    return onClick?.(cr.id);
  }, [onClick, cr.id]);
  return (
    <MenuItem
      key={cr.id}
      elementRef={isActive ? selectedMenuItem : undefined}
      selected={isActive}
      active={isActive}
      text={maybeEllipsizeString(cr.justification?.trim() || cr.id, 120)}
      htmlTitle={cr.justification}
      disabled={!onClick}
      onClick={onClick ? handleClick : undefined}
    />
  );
}


export const Proposals: React.VoidFunctionComponent<{
  register: Register
  actionableProposals?: [groupLabel: JSX.Element | string, proposals: CR[] | undefined][]
  onCreate?: (idea: string | false) => Promise<void>
  createMode?: boolean
  onSelectProposal?: (id: string) => void
  onRefreshProposals?: () => void
  className?: string
}> = function ({
  register,
  actionableProposals,
  onCreate,
  createMode,
  onSelectProposal,
  onRefreshProposals,
  className,
}) {
  //const [creating, setCreating] = useState(false);
  const hasActionable = (actionableProposals && actionableProposals.find(p => p[1] && p[1].length > 0));
  const proposalMenuItems = useMemo(() => {
    return hasActionable
      ? <ActionableProposalItems
          actionableProposals={actionableProposals ?? []}
          onSelect={onSelectProposal}
        />
      : null;
  }, [onSelectProposal, hasActionable, actionableProposals?.length]);

  // return <Menu css={css`overflow-y: auto; background: none !important`} className={className}>
  //   {proposalMenuItems}
  // </Menu>

  const stack: Panel<any>[] = useMemo(() => {
    const stack = [];
    const proposalMenu = proposalMenuItems
      ? <Menu css={css`overflow-y: auto; background: none !important;`}>
          {proposalMenuItems}
        </Menu>
      : null;
    if (proposalMenu) {
      stack.push({
        title: createMode
          ? "Proposals"
          : <>
              Proposals
              {hasActionable
                ? <>
                    &nbsp;
                    <Button
                      minimal
                      small
                      onClick={onRefreshProposals}
                      disabled={!onRefreshProposals}
                      icon="refresh"
                    />
                  </>
                : null}
            </>,
        renderPanel: () => proposalMenu,
      });
    }
    if (createMode) {
      stack.push({
        title: "Start proposal",
        renderPanel: () =>
          <NewProposal
            onCreateBlank={onCreate}
            register={register}
            css={css`padding: 5px;`}
          />,
      });
    }
    return stack;
  }, [
    onCreate, createMode,
    onRefreshProposals,
    register, proposalMenuItems,
  ]);

  return <PanelStack
    css={css`flex: 1; .bp4-panel-stack-view { background: none; }`}
    renderActivePanelOnly
    className={className}
    onClose={() => onCreate?.(false)}
    stack={stack.length > 0
      ? stack
      : [{ title: '', renderPanel: () => <NonIdealState title="Nothing to show" /> }]}
  />;
};
