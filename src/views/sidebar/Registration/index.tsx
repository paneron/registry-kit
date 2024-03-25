/** @jsx jsx */
/** @jsxFrag React.Fragment */

import React, { useEffect, useMemo, useCallback, useContext } from 'react';
import { jsx, css } from '@emotion/react';
import { Icon } from '@blueprintjs/core';
import { TabbedWorkspaceContext } from '@riboseinc/paneron-extension-kit/widgets/TabbedWorkspace/context';
import { DatasetContext } from '@riboseinc/paneron-extension-kit/context';
import type { PersistentStateReducerHook } from '@riboseinc/paneron-extension-kit/usePersistentStateReducer';
//import { DatasetContext } from '@riboseinc/paneron-extension-kit/context';
import makeSearchResultList from '@riboseinc/paneron-extension-kit/widgets/SearchResultList';
import { type Base as BaseCR, hasSubmitterInput, isDisposed, hadBeenProposed } from '../../../types/cr';
import { BrowserCtx } from '../../BrowserCtx';
import { itemRefToItemPath } from '../../itemPathUtils';
import { Datestamp } from '../../../views/util';
import { Protocols } from '../../protocolRegistry';


export const PendingChangeRequestsBlock: React.FC<Record<never, never>> = function () {
  const { stakeholder } = useContext(BrowserCtx);
  const stakeholderUsername = stakeholder?.gitServerUsername;
  const stakeholderCondition = stakeholderUsername
    ? `obj.submittingStakeholderGitServerUsername === "${stakeholderUsername}"`
    : 'false';
  // Don’t show drafts in the list of pending proposals, unless it’s user’s own drafts.
  const query = `!obj.timeDisposed && (obj.state !== "draft" || ${stakeholderCondition})`;

  return <ChangeRequestListBlock impliedQuery={query} />;
};


export const ChangeRequestHistoryBlock: React.FC<Record<never, never>> = function () {
  return <ChangeRequestListBlock impliedQuery={DISPOSED_CR_QUERY} />;
};


const CR_BASE_QUERY = 'objPath.indexOf("/proposals/") === 0 && objPath.endsWith("main.yaml")';
export const DISPOSED_CR_QUERY = 'obj.timeDisposed !== undefined && obj.timeDisposed !== null';


interface ChangeRequestBlockState {
  quickSubstringQuery: string;
  selectedItemPath: string | null;
}
const initialState: ChangeRequestBlockState = {
  quickSubstringQuery: '',
  selectedItemPath: null,
} as const;
type ChangeRequestBlockAction =
  | { type: 'update-quick-substring-query'; payload: { substring: string; }; }
  | { type: 'select-item'; payload: { itemPath: string | null; }; }

export const ChangeRequestListBlock: React.FC<{ impliedQuery: string, itemPath?: string }> = function ({ impliedQuery, itemPath: _itemPath }) {
  const { usePersistentDatasetStateReducer } = useContext(DatasetContext);
  const { spawnTab, focusedTabURI } = useContext(TabbedWorkspaceContext);
  const { selectedRegisterItem } = useContext(BrowserCtx);

  const itemPath = _itemPath ?? (
    selectedRegisterItem
      ? itemRefToItemPath(selectedRegisterItem.ref)
      : selectedRegisterItem);
      // ^ Adopt undefined value if no data is available, null if item is not selected

  const [ state, dispatch, ] = (usePersistentDatasetStateReducer as PersistentStateReducerHook<ChangeRequestBlockState, ChangeRequestBlockAction>)(
    `change-request-list-block-${itemPath === null ? 'global' : itemPath}-${impliedQuery}`,
    undefined,
    undefined,
    (prevState, action) => {
      switch (action.type) {
        case 'update-quick-substring-query':
          return {
            ...prevState,
            quickSubstringQuery: action.payload.substring,
          };
        case 'select-item':
          return {
            ...prevState,
            selectedItemPath: action.payload.itemPath,
          };
        default:
          throw new Error("Unexpected search state");
      }
    },
    initialState,
    null);

  const query = useMemo((() => itemPath
    ? `return ${CR_BASE_QUERY} && ${impliedQuery} && obj.items["${itemPath}"] !== undefined`
    : itemPath === null
      ? `return ${CR_BASE_QUERY} && ${impliedQuery}`
      // If item data is loading or unavailable, don’t show any CRs
      // to avoid flashing all CRs during item switching.
      : `return false`
  ), [impliedQuery, itemPath]);

  useEffect(() => {
    const selectedCRPath: string | null =
      focusedTabURI && focusedTabURI.startsWith(`${Protocols.CHANGE_REQUEST}:`)
        ? focusedTabURI.split(':')[1]
        : null;
    if (itemPath !== undefined && selectedCRPath) {
      setTimeout(() => {
        dispatch({ type: 'select-item', payload: { itemPath: selectedCRPath } });
      }, 500);
    }
  }, [dispatch, itemPath, focusedTabURI]);

  return (
    <ChangeRequestSearchResultList
      queryExpression={query}
      selectedItemPath={state.selectedItemPath}
      onSelectItem={useCallback((itemPath =>
        dispatch({
          type: 'select-item',
          payload: { itemPath },
        })
      ), [dispatch])}
      onOpenItem={useCallback((itemPath =>
        spawnTab(`${Protocols.CHANGE_REQUEST}:${itemPath}`)
      ), [spawnTab])}
    />
  )
};


const CRHistoryItem: React.FC<{
  objectData: BaseCR,
  objectPath: string,
}> = function ({ objectData }) {
  const { activeChangeRequestID, setActiveChangeRequestID } = useContext(BrowserCtx);
  const isActive = activeChangeRequestID === objectData.id;
  const canToggle = activeChangeRequestID == null || isActive;

  const justification = hasSubmitterInput(objectData) ? objectData.justification : 'N/A';

  return <span title={`${justification} (proposal ID: ${objectData.id})`}>
    <Icon
      icon={isActive ? 'record' : 'dot'}
      css={css`vertical-align: top; ${canToggle ? 'cursor: pointer; transition: all .2s;' : 'opacity: .5;'}`}
      title={canToggle
        ? isActive
          ? "Click to deactivate this proposal"
          : "Click to activate this proposal"
        : undefined}
      onClick={canToggle
        ? () => setActiveChangeRequestID?.(activeChangeRequestID === objectData.id ? null : objectData.id)
        : undefined}
      intent={isActive
        ? 'danger'
        : canToggle
          ? 'primary'
          : undefined}
    />
    &nbsp;
    {isDisposed(objectData)
      ? <><Datestamp date={objectData.timeDisposed} title="Disposed" />: </>
      : hadBeenProposed(objectData)
        ? <><Datestamp date={objectData.timeProposed} title="Proposed" />: </>
        : null}
    {justification}
  </span>;
};


const ChangeRequestSearchResultList = makeSearchResultList<BaseCR>(CRHistoryItem, (objPath) => ({
  name: 'Prp.',
  iconProps: {
    icon: 'lightbulb',
    title: objPath,
    htmlTitle: `icon for proposal at ${objPath}`,
  },
}));
