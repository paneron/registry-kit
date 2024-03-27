/** @jsx jsx */
/** @jsxFrag React.Fragment */

import React, { useContext, useMemo } from 'react';
import update from 'immutability-helper';
import { jsx } from '@emotion/react';
import { Tree, type TreeNodeInfo } from '@blueprintjs/core';
import { DatasetContext } from '@riboseinc/paneron-extension-kit';
import type { PersistentStateReducerHook } from '@riboseinc/paneron-extension-kit/usePersistentStateReducer';

export type ItemOrGroupTreeNode = TreeNodeInfo<{ type: 'group' | 'item' }>;

export interface State {
  selectedItemID: string | null
  expandedItemIDs: readonly string[]
}

const initialState: State = {
  selectedItemID: null,
  expandedItemIDs: [],
} as const;

type Action =
  | { type: 'select-item'; payload: { itemID: string | null; }; }
  | { type: 'enter-item'; payload: { itemID: string; }; }
  | { type: 'exit-item'; payload: { itemID: string; }; }


/** A tree that also uses persistent state reducer. */
export const GenericStatefulTree: React.FC<{
  getNodes: (state: State) => ItemOrGroupTreeNode[]
  stateKey: string
  onItemDoubleClick?: (node: TreeNodeInfo<any>) => void
  className?: string
}> =
function ({ getNodes, stateKey, onItemDoubleClick, className }) {
  const { usePersistentDatasetStateReducer } = useContext(DatasetContext);

  const [ state, dispatch, ] = (usePersistentDatasetStateReducer as PersistentStateReducerHook<State, Action>)(
    stateKey,
    undefined,
    undefined,
    function reduce(prevState, action) {
      switch (action.type) {
        case 'select-item':
          if (prevState.selectedItemID !== action.payload.itemID) {
            return {
              ...prevState,
              selectedItemID: action.payload.itemID,
            };
          } else {
            return prevState;
          }
        case 'enter-item':
          if (!prevState.expandedItemIDs.includes(action.payload.itemID)) {
            return {
              ...prevState,
              selectedItemID: action.payload.itemID,
              expandedItemIDs: update(
                prevState.expandedItemIDs,
                { $push: [action.payload.itemID] }),
            };
          } else {
            return prevState;
          }
        case 'exit-item':
          const idx = prevState.expandedItemIDs.indexOf(action.payload.itemID);
          if (idx >= 0) {
            return {
              ...prevState,
              selectedItemID: action.payload.itemID,
              expandedItemIDs: update(
                prevState.expandedItemIDs,
                { $splice: [[idx, 1]] }),
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

  const nodes = useMemo(
    (() => getNodes(state)),
    [state, getNodes]);

  const eventHandlers = useMemo((() => ({
    onNodeClick: (node: ItemOrGroupTreeNode) =>
      dispatch({
        type: 'select-item',
        payload: { itemID: node.id as string },
      }),
    onNodeExpand: (node: ItemOrGroupTreeNode) =>
      node.nodeData?.type === 'group'
        ? dispatch({
            type: 'enter-item',
            payload: { itemID: node.id as string },
          })
        : void 0,
    onNodeCollapse: (node: ItemOrGroupTreeNode) =>
      node.nodeData?.type === 'group'
        ? dispatch({
            type: 'exit-item',
            payload: { itemID: node.id as string },
          })
        : void 0,
    onNodeDoubleClick: (node: ItemOrGroupTreeNode) =>
      node.nodeData?.type === 'group'
        ? dispatch({
            type: 'enter-item',
            payload: { itemID: node.id as string },
          })
        : onItemDoubleClick?.(node),
  })), [dispatch, onItemDoubleClick]);

  return <Tree
    className={className}
    contents={nodes}
    {...eventHandlers}
  />;
};

export default GenericStatefulTree;
