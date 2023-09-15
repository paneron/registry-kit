/** @jsx jsx */
/** @jsxFrag React.Fragment */

import React, { memo, useContext, useCallback, useMemo, useEffect } from 'react';
import { jsx, css } from '@emotion/react';
import { DatasetContext } from '@riboseinc/paneron-extension-kit/context';
import { PersistentStateReducerHook } from '@riboseinc/paneron-extension-kit/usePersistentStateReducer';
import { TabbedWorkspaceContext } from '@riboseinc/paneron-extension-kit/widgets/TabbedWorkspace/context';
import makeSearchResultList from '@riboseinc/paneron-extension-kit/widgets/SearchResultList';
import useDebounce from '@riboseinc/paneron-extension-kit/useDebounce';
import { type CriteriaGroup, BLANK_CRITERIA } from '../../FilterCriteria/models';
import criteriaGroupToQueryExpression from '../../FilterCriteria/criteriaGroupToQueryExpression';
import { RAW_SUBSTRING } from '../../FilterCriteria/CRITERIA_CONFIGURATION';
import { ChangeRequestContext } from '../../change-request/ChangeRequestContext';
import type { RegisterItem } from '../../../types';
import { itemRefToItemPath } from '../../itemPathUtils';
import { getRegisterItemQuery } from '../../itemQueryUtils';
import { BrowserCtx } from '../../BrowserCtx';
import SearchQuery from '../../SearchQuery';
import ListItem from '../ListItem';
import { Protocols } from '../../protocolRegistry';


// TODO: Move Search widget core out of sidebar, as it’s used elsewhere too.


interface Query {
  criteria: CriteriaGroup;
}
interface State {
  query: Query;
  quickSubstringQuery: string;
  selectedItemPath: string | null;
}
type Action =
  | { type: 'update-query'; payload: { query: Query; }; }
  | { type: 'update-quick-substring-query'; payload: { substring: string; }; }
  | { type: 'select-item'; payload: { itemPath: string | null; }; }

const initialState: State = {
  query: { criteria: BLANK_CRITERIA },
  quickSubstringQuery: '',
  selectedItemPath: null,
};

const Search: React.FC<{
  /**
   * Criteria that will always apply.
   * Used e.g. in superseding item selection
   * (to limit to the same item class).
   */
  implicitCriteria?: CriteriaGroup,

  availableClassIDs?: string[]
  onOpenItem?: (itemPath: string) => void

  stateName?: string

  className?: string
  style?: React.CSSProperties
}> =
memo(function ({ implicitCriteria, availableClassIDs, stateName, onOpenItem, className, style }) {
  const { usePersistentDatasetStateReducer } = useContext(DatasetContext);
  const { spawnTab } = useContext(TabbedWorkspaceContext);
  const { keyExpression, itemClasses, subregisters, selectedRegisterItem } = useContext(BrowserCtx);
  const { changeRequest } = useContext(ChangeRequestContext);

  const [ state, dispatch, stateRecalled ] = (usePersistentDatasetStateReducer as PersistentStateReducerHook<State, Action>)(
    stateName ?? 'search-sidebar',
    undefined,
    undefined,
    (prevState, action) => {
      switch (action.type) {
        case 'update-query':
          return {
            ...prevState,
            query: action.payload.query,
          };
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

  const selectedItemPath = selectedRegisterItem?.ref
    ? itemRefToItemPath(selectedRegisterItem.ref, changeRequest?.id)
    : null;

  useEffect(() => {
    if (selectedItemPath) {
      dispatch({ type: 'select-item', payload: { itemPath: selectedItemPath } });
    }
  }, [selectedItemPath, dispatch]);

  const effectiveQueryExpression = useMemo(() => {
    const quickSearchString = (state.quickSubstringQuery ?? '').trim();
    const withSearchString: CriteriaGroup =
      state.query.criteria.criteria.length < 1 && quickSearchString !== ''
        ? {
            require: 'all',
            criteria: [
              {
                key: 'raw-substring',
                query: RAW_SUBSTRING.toQuery(
                  { substring: quickSearchString },
                  { itemClasses, subregisters }),
              },
            ],
          }
        : state.query.criteria
    const withImplicit: CriteriaGroup = implicitCriteria
      ? {
          require: 'all',
          criteria: [ implicitCriteria, withSearchString ],
        }
      : withSearchString;
    return withImplicit.criteria.length > 0
      ? criteriaGroupToQueryExpression(withImplicit)
      // If no criteria provided, don’t show anything by default.
      : 'false';
  }, [state.query.criteria, state.quickSubstringQuery, itemClasses, subregisters]);

  const stateRecalledDebounced = useDebounce(stateRecalled, 100);
  const queryExpressionDebounced = useDebounce(
    effectiveQueryExpression,
    stateRecalledDebounced ? 500 : 0,
  );

  const datasetObjectSearchQueryExpression = useMemo((() =>
    queryExpressionDebounced != 'false'
      ? getRegisterItemQuery(queryExpressionDebounced, changeRequest ?? undefined)
      : 'return false'
  ), [queryExpressionDebounced, changeRequest]);

  const handleSelectItem = useCallback(
    (itemPath => dispatch({ type: 'select-item', payload: { itemPath }})),
    [dispatch]);


  const handleOpenItem = useCallback(
    onOpenItem ?? (itemPath => spawnTab(`${Protocols.ITEM_DETAILS}:${itemPath}`)),
    [onOpenItem, spawnTab]);

  return (
    <div css={css`display: flex; flex-flow: column nowrap;`} className={className} style={style}>
      <SearchQuery
        rootCriteria={state.query.criteria}
        quickSearchString={state.quickSubstringQuery}
        availableClassIDs={availableClassIDs}
        onCriteriaChange={useCallback((
          criteria => dispatch({ type: 'update-query', payload: { query: { criteria } } })
        ), [dispatch])}
        onQuickSearchStringChange={useCallback((
          substring => dispatch({ type: 'update-quick-substring-query', payload: { substring } })
        ), [dispatch])}
        css={css`padding: 5px;`}
      />
      <div css={css`flex: 1;`}>
        <SearchResultList
            queryExpression={datasetObjectSearchQueryExpression}
            keyExpression={keyExpression}
            selectedItemPath={state.selectedItemPath}
            onSelectItem={handleSelectItem}
            onOpenItem={handleOpenItem}
          />
      </div>
    </div>
  );
});


const SearchResultList = makeSearchResultList<RegisterItem<any>>(ListItem, (objPath) => ({
  name: 'reg. item',
  iconProps: {
    icon: 'document',
    title: objPath,
    htmlTitle: `Icon for item at ${objPath}`,
  },
}));


export default Search;
