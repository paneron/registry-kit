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
                key={cr.id}
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


//1const ProposalsBlock: React.VoidFunctionComponent<{
//1  proposal: CR
//1  register: Register
//1  stakeholder?: RegisterStakeholder
//1  canDelete?: boolean
//1  onDelete?: () => (void | Promise<void>)
//1  onOpen?: () => void
//1  className?: string
//1}> = function ({ proposal, stakeholder, register, onDelete, onOpen, canDelete, className }) {
//1  const actions: MenuItemProps[] = stakeholder && canBeTransitionedBy(stakeholder, proposal)
//1    ? [/*{
//1        // Action is taken from within the widget.
//1        text: "Take action",
//1        onClick: () => void 0,
//1        icon: 'take-action',
//1        intent: 'primary',
//1      }*/]
//1    : canDelete
//1      ? [{
//1          text: "Delete this proposal draft",
//1          onClick: onDelete,
//1          disabled: !onDelete,
//1          icon: 'delete',
//1          intent: 'danger',
//1        }]
//1      : [];
//1
//1  actions.push({
//1    text: "Open in new window",
//1    disabled: !onOpen,
//1    onClick: onOpen,
//1  });
//1  const proposalBlockActions = useMemo(() => {
//1    const actions = [];
//1    if (activeCR) {
//1      actions.push({
//1        text: "Export proposal",
//1        onClick: () => void 0,
//1        icon: 'export',
//1        disabled: true,
//1      } as const);
//1      actions.push({
//1        text: "Exit proposal",
//1        icon: 'log-out',
//1        intent: 'danger',
//1        disabled: isBusy,
//1        onClick: setActiveChangeRequestID
//1          ? () => setActiveChangeRequestID?.(null)
//1          : undefined,
//1      } as const);
//1    } else {
//1      if (stakeholder && canCreateCR(stakeholder)) {
//1        actions.push({
//1          text: "Create blank proposal",
//1          onClick: !createMode ? (() => setCreateMode(true)) : undefined,
//1          disabled: !createCR,
//1          active: createMode,
//1          selected: createMode,
//1          icon: 'add',
//1          intent: actionableProposals.length < 1
//1            ? 'primary'
//1            : undefined,
//1        } as const);
//1      }
//1      if (stakeholder && canImportCR(stakeholder)) {
//1        actions.push({
//1          text: "Import proposal",
//1          onClick: importCR,
//1          disabled: !importCR || createMode,
//1          icon: 'import',
//1          intent: actionableProposals.length < 1
//1            ? 'primary'
//1            : undefined,
//1        } as const);
//1      }
//1    }
//1    return actions;
//1  }, [!activeCR, createMode, importCR, createCR, isBusy, actionableProposals.length < 1]);
//1
//1  return (
//1    <HomeBlock
//1      View={Proposals}
//1      key="proposal dashboard"
//1      description="Actionable proposals"
//1      css={css`
//1        height: 300px;
//1        flex-basis: calc(50% - 10px);
//1        flex-grow: 1;
//1      `}
//1      props={{
//1        register,
//1        actionableProposals,
//1        createMode,
//1        onCreate: handleCreate,
//1        onRefreshProposals: handleRefreshProposals,
//1        onSelectProposal: handleSelectProposal,
//1      }}
//1      actions={proposalBlockActions}
//1    />
//1  );
//1};
//1export default ProposalsBlock;
