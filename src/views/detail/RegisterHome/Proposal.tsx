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
} from '@blueprintjs/core';

import { ChangeRequestContext } from '../../change-request/ChangeRequestContext';
import { maybeEllipsizeString } from '../../util';
import type { Register } from '../../../types';
import { type SomeCR as CR } from '../../../types/cr';


const NewProposal: React.VoidFunctionComponent<{
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
  // TODO: Try to avoid useContext here.
  // Originally activeCR was passed via prop, need to try again.
  // Switch to context was done to avoid rerendering the entire list
  // & losing scroll position.
  // We want(?) active CR to determine if this item is active
  // and keep it in viewport after user switches back.
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
};


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
  }, [onSelectProposal, hasActionable, actionableProposals]);

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
    className={className}
    onClose={() => onCreate?.(false)}
    stack={stack.length > 0
      ? stack
      : [{ title: '', renderPanel: () => <NonIdealState title="Nothing to show" /> }]}
  />;
};
