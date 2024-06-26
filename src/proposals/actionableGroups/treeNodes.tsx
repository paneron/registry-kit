/** @jsx jsx */
/** @jsxFrag React.Fragment */

/**
 * Tools for rendering proposal groups as tree nodes.
 * Each proposal group is top-level node, with proposals as nested nodes.
 */

import React, { useCallback } from 'react';
import { jsx } from '@emotion/react';

import { Button, Tag } from '@blueprintjs/core';
import type { IconName, TreeNodeInfo } from '@blueprintjs/core';
import type { RegisterStakeholder } from '../../types';
import type { SomeCR as CR } from '../types';
import type { ActionableProposalGroup } from './types';
import { CR_BASE_QUERY } from '../queries';


export type ActionableProposalTreeNode = TreeNodeInfo<{ type: 'group' | 'item' }>;


interface ActionableProposalGroupResult {
  groupLabel: string
  proposals: CR[] | undefined
}
export function getActionableProposalGroupsAsTreeNodes(
  groups: readonly ActionableProposalGroupResult[],
  opts?: {
    expandedGroupLabels?: Set<string>
    selectedGroup?: string
    selectedCRID?: string
    activeCRID?: string
    onActivateCR?: (crID: string | null) => void | Promise<void>
  },
): ActionableProposalTreeNode[] {
  return groups.
    //filter(({ proposals }) => proposals && proposals.length > 0).
    map(({ groupLabel, proposals }) => {
      const hasProposals = proposals && proposals.length > 0;
      const hasActiveProposal = hasProposals
        && opts?.activeCRID && proposals.find(p => p.id === opts.activeCRID);
      const hasSelectedProposal = hasProposals
        && opts?.selectedCRID && proposals.find(p => p.id === opts.selectedCRID);
      const isExpanded =
        groups.length === 1
        || opts?.expandedGroupLabels?.has(groupLabel)
        || hasSelectedProposal
          ? true
          : false;

      return {
        id: groupLabel,
        label: groupLabel,
        hasCaret: true,
        className: hasActiveProposal
          ? 'tree-node-proposal-group-with-active-proposal'
          : undefined,
        secondaryLabel:
          hasActiveProposal && !isExpanded
            ? <ActiveMarker
                isActive
                title="A proposal in this group is currently active, expand group to see it"
              />
            : <Tag
                  minimal={!hasProposals}
                  intent={hasProposals ? 'warning' : undefined}>
                {hasProposals ? proposals.length : 0}
              </Tag>,
        icon: isExpanded
          ? 'folder-open'
          : 'folder-close' as IconName,
        isExpanded,
        isSelected: groupLabel === opts?.selectedGroup,
        nodeData: { type: 'group' },
        childNodes: hasProposals && isExpanded
          ? proposals.map(p => getActionableProposalTreeNode(p, {
              isSelected: p.id === opts?.selectedCRID,
              isActive: p.id === opts?.activeCRID,
              onActivateCR: opts?.onActivateCR,
            }))
          : [],
      };
    });
}

const ActiveMarker: React.FC<{
  isActive?: boolean
  onToggle?: () => void
  title?: string
}> = function ({ onToggle, title, isActive }) {
  const handleClick = useCallback(
    ((evt: React.MouseEvent<any>) => {
      evt.stopPropagation();
      onToggle?.();
    }),
    [onToggle]);
  return <Button
    icon="eye-open"
    small
    title={title ?? (onToggle
      ? isActive
        ? "Click to deactivate (exit) this proposal"
        : "Click to activate this proposal"
      : undefined)}
    active={isActive}
    intent={isActive ? 'danger' : 'primary'}
    disabled={!onToggle}
    onClick={handleClick}
  />
};


function getActionableProposalTreeNode(
  proposal: CR,
  opts?: {
    isSelected?: boolean
    isActive?: boolean
    onActivateCR?: (crID: string | null) => void
  },
): ActionableProposalTreeNode {
  return {
    id: proposal.id,
    label: <span title={`“${proposal.justification}” — double-click to open & activate this proposal`}>
      {proposal.justification}
    </span>,
    isSelected: opts?.isSelected ?? false,
    icon: 'lightbulb',
    className: opts?.isActive
      ? 'tree-node-active-proposal'
      : undefined,
    secondaryLabel: opts?.isActive
      ? <ActiveMarker isActive onToggle={opts.onActivateCR ? () => opts?.onActivateCR?.(null) : undefined} />
      : <ActiveMarker onToggle={opts?.onActivateCR ? () => opts?.onActivateCR?.(proposal.id) : undefined} />,
    nodeData: { type: 'item' },
  };
}


export function getMapReduceChainsForActionableProposalGroups(
  proposalGroups: readonly ActionableProposalGroup[],
  stakeholder: RegisterStakeholder,
) {
  return proposalGroups.map(([label, , queryGetter]) => {
    const query = queryGetter(stakeholder);
    const predicateFunc = `
      const objPath = key, obj = value;
      return ((${CR_BASE_QUERY}) && (${query}));
    `;
    const mapFunc = `emit(value);`;
    return { [label]: { mapFunc, predicateFunc } };
  }).reduce((prev, curr) => ({ ...prev, ...curr }), {});
}
