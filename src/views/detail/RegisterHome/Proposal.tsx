/** @jsx jsx */
/** @jsxFrag React.Fragment */

import React, { useState, useContext, useEffect, useCallback, useMemo } from 'react';
import { jsx, css } from '@emotion/react';
import {
  Button,
  InputGroup,
  PanelStack2 as PanelStack, type Panel,
  Menu, MenuDivider, MenuItem,
  Icon,
} from '@blueprintjs/core';

import { DatasetContext } from '@riboseinc/paneron-extension-kit/context';
import { maybeEllipsizeString } from '../../util';
import type {
  Register,
  RegisterStakeholder,
  StakeholderRoleType,
} from '../../../types';
import { type SomeCR as CR } from '../../../types/cr';
import { canBeTransitionedBy } from '../../change-request/TransitionOptions';


export const CurrentProposal: React.VoidFunctionComponent<{
  proposal: CR
  stakeholder?: RegisterStakeholder
  className?: string
}> = function ({ proposal, className }) {
  return (
    <div className={className}>
      {proposal.id}
    </div>
  );
};


export const NewProposal: React.VoidFunctionComponent<{
  stakeholder: RegisterStakeholder
  register: Register
  onPropose?: (idea: string) => void
  className?: string
}> = function ({ stakeholder, register, onPropose, className }) {
  const [ newProposalIdea, setNewProposalIdea ] = useState<string>('');

  const handleNewProposal = useCallback(() => {
    onPropose?.(newProposalIdea);
    setNewProposalIdea('');
  }, [onPropose]);

  return (
    <div className={className}>
      <p>
        Propose a change to version {register.version?.id ?? '(N/A)'}
      </p>
      <InputGroup
        value={newProposalIdea || undefined}
        placeholder="Your idea…"
        title="Justification draft (you can change this later)"
        onChange={evt => setNewProposalIdea(evt.currentTarget.value)}
        rightElement={
          <Button
            small
            intent={newProposalIdea ? 'primary': undefined}
            disabled={!newProposalIdea.trim() || !onPropose}
            title="A blank proposal will be created and opened in a new tab."
            onClick={handleNewProposal}
            icon="tick"
          />
        }
      />
    </div>
  );
};


const CR_BASE_QUERY = 'objPath.indexOf("/proposals/") === 0 && objPath.endsWith("main.yaml")';
const PROPOSALS_PER_ROLE:
readonly (readonly [label: string, roles: Set<StakeholderRoleType>, queryGetter: (stakeholder?: RegisterStakeholder) => string])[] =
[
  ['unsubmitted', new Set(['submitter', 'manager', 'control-body', 'owner']), function submitterProposals(stakeholder) {
    if (stakeholder && stakeholder.gitServerUsername) {
      const stakeholderUsername = stakeholder.gitServerUsername;
      const stakeholderRole = stakeholder.role;
      const stakeholderCondition = stakeholderRole !== 'submitter'
        ? 'true'
        : `obj.submittingStakeholderGitServerUsername === "${stakeholderUsername}"`
      // Don’t show drafts in the list of pending proposals, unless it’s user’s own drafts.
      const query = `(obj.state === "draft" || obj.state === "returned-for-clarification") && ${stakeholderCondition}`;
      return query;
    } else {
      return 'false';
    }
  }],
  ['pending manager review', new Set(['manager', 'control-body', 'owner']), function managerProposals() {
    return 'false';
  }],
  ['pending control body review', new Set(['control-body', 'owner']), function cbProposals() {
    return 'false';
  }],
  ['pending owner review', new Set(['owner']), function ownerProposals() {
    return 'false';
  }],
] as const;


const ProposalList: React.VoidFunctionComponent<{
  label: string
  query: string
  reqCounter: number
  stakeholder?: RegisterStakeholder
  onEnterProposal?: (proposalID: string) => void
}> = function ({ label, reqCounter, query, stakeholder, onEnterProposal }) {
  const [ items, setItems ] = useState<CR[] | undefined>(undefined);
  const loading = items === undefined;
  const hasItems = items && items.length > 0;
  const { getMapReducedData } = useContext(DatasetContext);

  useEffect(() => {
    setItems(undefined);
    console.debug("TEST1");
    let cancelled = false;
    async function getItems () {
      console.debug("TEST2");
      const mapFunc = `
        const objPath = key, obj = value;
        if ((${CR_BASE_QUERY}) && (${query})) {
          emit(obj);
        }
      `;
      const result = await getMapReducedData({
        chains: { _: { mapFunc } },
      });
      if (!Array.isArray(result._)) {
        console.error("Weird result", result);
      }
      if (!cancelled) {
        setItems(Array.isArray(result._) ? result._ : []);
      }
    };
    setTimeout(getItems, 200);
    return function cleanUp() { cancelled = true; };
  }, [reqCounter, query, getMapReducedData]);

  return (
    <>
      <MenuDivider title={label} />
      {hasItems
        ? items.map(cr =>
            <MenuItem
              key={cr.id}
              text={maybeEllipsizeString(cr.justification, 40)}
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
        : loading
          ? <MenuItem disabled text="Loading…" />
          : <MenuItem disabled text="No proposals to show" />}
    </>
  );
}

const ProposalDashboard: React.VoidFunctionComponent<{
  stakeholder?: RegisterStakeholder
  reqCounter: number
  onEnterProposal?: (proposalID: string) => void
}> = function ({ stakeholder, reqCounter, onEnterProposal }) {
  const items: JSX.Element[] = useMemo(() => {
    const items: JSX.Element[] = [];
    for (const [label, eligibleRoles, getQuery] of PROPOSALS_PER_ROLE) {
      if (stakeholder?.role && eligibleRoles.has(stakeholder.role)) {
        const query = getQuery(stakeholder);
        items.push(<ProposalList
          query={query}
          stakeholder={stakeholder}
          label={label}
          reqCounter={reqCounter}
          onEnterProposal={onEnterProposal}
        />);
      }
    }
    return items;
  }, [stakeholder, onEnterProposal, reqCounter]);
  return (
    <Menu css={css`overflow-y: auto; background: none !important;`}>
      {items}
    </Menu>
  );
}


export const Proposals: React.VoidFunctionComponent<{
  stakeholder?: RegisterStakeholder
  activeCR?: CR | null
  onExitProposal?: () => void
  onEnterProposal?: (id: string) => void
  onImportProposal?: () => void
  onCreateProposal?: (idea: string) => void
  className?: string
}> = function ({ stakeholder, activeCR, onEnterProposal, onExitProposal, className }) {
  const [ reqCounter, setReqCounter ] = useState(1);

  const stack = useMemo(() => {
    const stack: Panel<any>[] = [{
      title: activeCR
        ? "Proposals"
        : <>
            Proposals
            &nbsp;
            <Button minimal small onClick={() => setReqCounter(c => c + 1)} icon="refresh" />
          </>,
      renderPanel: () =>
        <ProposalDashboard
          stakeholder={stakeholder}
          onEnterProposal={onEnterProposal}
          reqCounter={reqCounter}
        />
    }];
    if (activeCR) {
      stack.push({
        title: "Active proposal",
        renderPanel: () =>
          <CurrentProposal
            proposal={activeCR}
            css={css`padding: 5px;`}
          />
      });
    }
    return stack;
  }, [activeCR, stakeholder, reqCounter]);

  return <PanelStack
    css={css`position: absolute; inset: 0; .bp4-panel-stack-view { background: none; }`}
    renderActivePanelOnly
    className={className}
    onClose={onExitProposal}
    stack={stack}
  />;
}
