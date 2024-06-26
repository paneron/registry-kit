/** @jsx jsx */
/** @jsxFrag React.Fragment */

import React, { useContext, useCallback, useMemo } from 'react';
import update from 'immutability-helper';
import { jsx, css } from '@emotion/react';
import { Colors, Tree } from '@blueprintjs/core';
import { DatasetContext } from '@riboseinc/paneron-extension-kit';
import { TabbedWorkspaceContext } from '@riboseinc/paneron-extension-kit/widgets/TabbedWorkspace/context';
import type { PersistentStateReducerHook } from '@riboseinc/paneron-extension-kit/usePersistentStateReducer';
import type { SomeCR as CR } from '../types';
import { ChangeRequestContext } from '../ChangeRequestContext';
import { BrowserCtx } from '../../views/BrowserCtx';
import { getActionableProposalGroupsForRoles } from './queries';
import { Protocols } from '../../views/protocolRegistry';
import {
  type ActionableProposalTreeNode,
  getMapReduceChainsForActionableProposalGroups,
  getActionableProposalGroupsAsTreeNodes,
} from './treeNodes';


interface State {
  //selectedFolderID: string | null
  selectedItemID: string | null
  expandedFolderIDs: readonly string[]
}

const initialState: State = {
  //selectedFolderID: null,
  selectedItemID: null,
  expandedFolderIDs: [],
} as const;

type Action =
  | { type: 'select-folder'; payload: { folderID: string | null; }; }
  | { type: 'enter-folder'; payload: { folderID: string; }; }
  | { type: 'exit-folder'; payload: { folderID: string; }; }
  | { type: 'select-item'; payload: { itemID: string | null; }; }


const ActionableCRTree: React.FC<{
  className?: string
}> =
function ({ className }) {
  const { changeRequest: activeCR } = useContext(ChangeRequestContext);
  const { setActiveChangeRequestID, stakeholder } = useContext(BrowserCtx);
  const { usePersistentDatasetStateReducer, useMapReducedData } = useContext(DatasetContext);
  const { spawnTab } = useContext(TabbedWorkspaceContext);

  const [ state, dispatch, ] = (usePersistentDatasetStateReducer as PersistentStateReducerHook<State, Action>)(
    'actionable-proposals',
    undefined,
    undefined,
    (prevState, action) => {
      switch (action.type) {
        case 'select-folder':
          if (prevState.selectedItemID !== action.payload.folderID) {
            return {
              ...prevState,
              selectedItemID: action.payload.folderID,
            };
          } else {
            return prevState;
          }
        case 'enter-folder':
          if (!prevState.expandedFolderIDs.includes(action.payload.folderID)) {
            return {
              ...prevState,
              selectedItemID: action.payload.folderID,
              expandedFolderIDs: update(
                prevState.expandedFolderIDs,
                { $push: [action.payload.folderID] }),
            };
          } else {
            return prevState;
          }
        case 'exit-folder':
          const idx = prevState.expandedFolderIDs.indexOf(action.payload.folderID);
          if (idx >= 0) {
            return {
              ...prevState,
              selectedItemID: action.payload.folderID,
              expandedFolderIDs: update(
                prevState.expandedFolderIDs,
                { $splice: [[idx, 1]] }),
            };
          } else {
            return prevState;
          }
        case 'select-item':
          if (prevState.selectedItemID !== action.payload.itemID) {
            return {
              ...prevState,
              selectedItemID: action.payload.itemID,
            };
          } else {
            return prevState;
          }
        default:
          throw new Error("Unexpected browse state");
      }
    },
    initialState,
    null);

  const groups = getActionableProposalGroupsForRoles(stakeholder?.roles ?? []);

  const chains = stakeholder
    ? getMapReduceChainsForActionableProposalGroups(groups, stakeholder)
    : {};

  const actionableProposalsResult = useMapReducedData({ chains });

  const actionableProposals = useMemo(
    (() =>
    Object.entries(actionableProposalsResult.value).
      map(([chainID, chainResult]) => ({
        groupLabel: chainID,
        proposals: (Array.isArray(chainResult)
          // TODO: Validate results
          ? (chainResult as CR[])
          : undefined) || undefined
      }))
    ),
    [actionableProposalsResult.value]);

  const nodes = useMemo(
    (() =>
      getActionableProposalGroupsAsTreeNodes(actionableProposals, {
        activeCRID: activeCR?.id,
        expandedGroupLabels: new Set(state.expandedFolderIDs),
        onActivateCR: setActiveChangeRequestID,
        selectedGroup: state.selectedItemID
          ? actionableProposals.
            find(({ groupLabel }) => groupLabel === state.selectedItemID)
              ? state.selectedItemID
              : undefined
          : undefined,
        selectedCRID: state.selectedItemID
          ? actionableProposals.
            flatMap(({ proposals }) => proposals ?? []).
            find(p => p.id === state.selectedItemID)
              ? state.selectedItemID
              : undefined
          : undefined,
      })
    ),
    [activeCR?.id, setActiveChangeRequestID, actionableProposals, state.selectedItemID, state.expandedFolderIDs.join(',')]);

  const activate = useCallback(((proposalID: string) => {
    if (proposalID !== activeCR?.id) {
      setActiveChangeRequestID?.(proposalID as string)
    }
    // open proposal dashboard regardless
    spawnTab(Protocols.PROPOSAL_WORK, { atIdx: 0 });
  }), [activeCR?.id, setActiveChangeRequestID, spawnTab]);

  const eventHandlers = useMemo((() => ({
    onNodeClick: (node: ActionableProposalTreeNode) =>
      node.nodeData?.type === 'group'
        ? dispatch({
            type: 'select-folder',
            payload: { folderID: node.id as string },
          })
        : dispatch({
            type: 'select-item',
            payload: { itemID: node.id as string },
          }),
    onNodeExpand: (node: ActionableProposalTreeNode) =>
      node.nodeData?.type === 'group'
        ? dispatch({
            type: 'enter-folder',
            payload: { folderID: node.id as string },
          })
        : void 0,
    onNodeCollapse: (node: ActionableProposalTreeNode) =>
      node.nodeData?.type === 'group'
        ? dispatch({
            type: 'exit-folder',
            payload: { folderID: node.id as string },
          })
        : void 0,
    onNodeDoubleClick: (node: ActionableProposalTreeNode) =>
      node.nodeData?.type === 'group'
        ? dispatch({
            type: 'enter-folder',
            payload: { folderID: node.id as string },
          })
        : activate(node.id as string),
  })), [dispatch, activate]);

  return <Tree
    className={className}
    contents={nodes}
    css={css`
      .bp4-tree-node {
        &.tree-node-active-proposal, &.tree-node-proposal-group-with-active-proposal:not(.bp4-tree-node-expanded) {
          > .bp4-tree-node-content {
            background: ${Colors.RED5};
            .bp4-dark & {
              background: ${Colors.RED2};
            }
          }
          &.bp4-tree-node-selected > .bp4-tree-node-content {
            background: ${Colors.RED3};
          }
        }
      }
    `}
    {...eventHandlers}
  />;
}

export default ActionableCRTree;
