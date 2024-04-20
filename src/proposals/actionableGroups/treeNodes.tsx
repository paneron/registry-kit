/** @jsx jsx */
/** @jsxFrag React.Fragment */

/**
 * Tools for rendering proposal groups as tree nodes.
 * Each proposal group is top-level node, with proposals as nested nodes.
 */

//import React, { useContext, useMemo } from 'react';
import { jsx } from '@emotion/react';

import { Tag } from '@blueprintjs/core';
import type { IconName, TreeNodeInfo } from '@blueprintjs/core';
import type { RegisterStakeholder } from '../../types';
import type { SomeCR as CR } from '../types';
import type { ActionableProposalGroup } from './types';
import { CR_BASE_QUERY } from './queries';


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
        secondaryLabel:
          hasActiveProposal && !isExpanded
            ? activeCRMarker
            : <Tag
                  minimal={!hasProposals}
                  intent={hasProposals ? 'primary' : undefined}>
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
            }))
          : [],
      };
    });
}

const activeCRMarker = <Tag intent='danger'>active</Tag>;

function getActionableProposalTreeNode(
  proposal: CR,
  opts?: { isSelected?: boolean, isActive?: boolean },
): ActionableProposalTreeNode {
  return {
    id: proposal.id,
    label: <span title={`Double-click the proposal to activate: “${proposal.justification}”`}>
      {proposal.justification}
    </span>,
    isSelected: opts?.isSelected ?? false,
    icon: 'lightbulb',
    secondaryLabel: opts?.isActive ? activeCRMarker : undefined,
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
