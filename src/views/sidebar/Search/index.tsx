/** @jsx jsx */
/** @jsxFrag React.Fragment */

import React, { memo, useContext, useCallback, useMemo, useEffect } from 'react';
import { jsx, css } from '@emotion/react';
import { DatasetContext } from '@riboseinc/paneron-extension-kit/context';
import { toJSONNormalized } from '@riboseinc/paneron-extension-kit/util';
import type { PersistentStateReducerHook } from '@riboseinc/paneron-extension-kit/usePersistentStateReducer';
import makeSearchResultList from '@riboseinc/paneron-extension-kit/widgets/SearchResultList';
import useDebounce from '@riboseinc/paneron-extension-kit/useDebounce';
import { type CriteriaGroup, isCriteriaGroup, BLANK_CRITERIA } from '../../FilterCriteria/models';
import criteriaGroupToQueryExpression from '../../FilterCriteria/criteriaGroupToQueryExpression';
import { RAW_SUBSTRING, CUSTOM_CONDITION } from '../../FilterCriteria/CRITERIA_CONFIGURATION';
import { ChangeRequestContext } from '../../../proposals/ChangeRequestContext';
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
function isState(val: any): val is State {
  return val
    && val.query
    && val.query.criteria
    && isCriteriaGroup(val.query.criteria)
    && typeof val.quickSubstringQuery === 'string'
    && (val.selectedItemPath === null || typeof val.selectedItemPath === 'string')
}
type Action =
  | { type: 'update-query'; payload: { query: Query; }; }
  | { type: 'update-quick-substring-query'; payload: { substring: string; }; }
  | { type: 'select-item'; payload: { itemPath: string | null; }; }

const initialState: State = {
  query: { criteria: BLANK_CRITERIA },
  quickSubstringQuery: '',
  selectedItemPath: null,
} as const;

function isInitialState(state: State): boolean {
  return toJSONNormalized(state) === toJSONNormalized(initialState);
}

function reducer(prevState: State, action: Action) {
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
}

const Search: React.FC<{
  /**
   * Human-readable description of what would be searched.
   * Optional, but if provided must be a lower-case noun
   * to be integrated in GUI copy.
   */
  scope?: string,

  /**
   * Criteria that will always apply.
   * Used e.g. in superseding item selection
   * (to limit to the same item class).
   */
  implicitCriteria?: CriteriaGroup,

  availableClassIDs?: string[]
  onOpenItem?: (itemPath: string) => void

  zeroResultsView?: JSX.Element
  initialView?: JSX.Element

  stateName?: string

  List?: ReturnType<typeof makeSearchResultList>
  extraData?: Record<string, any>

  className?: string
  style?: React.CSSProperties
}> =
memo(function ({ scope, implicitCriteria, initialView, zeroResultsView, availableClassIDs, stateName, onOpenItem, List, extraData, className, style }) {
  const { usePersistentDatasetStateReducer } = useContext(DatasetContext);

  const ListComponent = useMemo((() => List ?? RegisterItemSearchResultList), [List]);

  const {
    // TODO: defaultSearchCriteria,
    keyExpression,
    getQuickSearchPredicate,
    itemClasses,
    subregisters,
    selectedRegisterItem,
    jumpTo,
  } = useContext(BrowserCtx);

  const { changeRequest } = useContext(ChangeRequestContext);

  const [ state, dispatch, stateRecalled ] = (usePersistentDatasetStateReducer as PersistentStateReducerHook<State, Action>)( stateName ?? 'search-sidebar',
    undefined,
    isState,
    reducer,
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

  // Why are we memoing this? It’s just a string and seems not too slow to compute.
  const effectiveQueryExpression: string = useMemo(() => {
    const quickSearchString = (state.quickSubstringQuery ?? '').trim();
    const withSearchString: CriteriaGroup =
      state.query.criteria.criteria.length < 1 && quickSearchString !== ''
        ? {
            require: 'all',
            criteria: [
              getQuickSearchPredicate
                ? {
                    key: 'custom',
                    query: CUSTOM_CONDITION.toQuery(
                      { customExpression: getQuickSearchPredicate(quickSearchString) },
                      { itemClasses, subregisters },
                    ),
                  }
                : {
                    key: 'raw-substring',
                    query: RAW_SUBSTRING.toQuery(
                      { substring: quickSearchString },
                      { itemClasses, subregisters }),
                  },
            ],
          }
        : state.query.criteria;
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
  }, [state.query.criteria, state.quickSubstringQuery, itemClasses, subregisters, getQuickSearchPredicate]);

  const stateRecalledDebounced = useDebounce(stateRecalled, 100);
  const queryExpressionDebounced = useDebounce(
    effectiveQueryExpression,
    stateRecalledDebounced ? 500 : 0,
  );

  const datasetObjectSearchQueryExpression = useMemo((() =>
    queryExpressionDebounced.trim() !== '' && queryExpressionDebounced != 'false'
      ? getRegisterItemQuery(queryExpressionDebounced, changeRequest ?? undefined)
      : 'return false'
  ), [queryExpressionDebounced, changeRequest]);

  const handleSelectItem = useCallback(
    (itemPath => dispatch({ type: 'select-item', payload: { itemPath }})),
    [dispatch]);

  const defaultHandleOpenItem = useCallback(
    (itemPath => jumpTo?.(`${Protocols.ITEM_DETAILS}:${itemPath}`)),
    [jumpTo]);
  const handleOpenItem = onOpenItem ?? defaultHandleOpenItem;

  const showInitialScreen = initialView && isInitialState({ ...state, selectedItemPath: null });

  return (
    <div css={css`display: flex; flex-flow: column nowrap;`} className={className} style={style}>
      <SearchQuery
        scope={scope}
        rootCriteria={state.query.criteria}
        quickSearchString={state.quickSubstringQuery}
        availableClassIDs={availableClassIDs}
        onCriteriaChange={useCallback((
          criteria => dispatch({ type: 'update-query', payload: { query: { criteria } } })
        ), [dispatch])}
        onQuickSearchStringChange={useCallback((
          substring => dispatch({ type: 'update-quick-substring-query', payload: { substring } })
        ), [dispatch])}
        css={css`padding: 2px; margin-bottom: 10px;`}
      />
      <div css={css`flex: 1; overflow-y: auto;`}>
        {showInitialScreen
          ? initialView
          : <ListComponent
              queryExpression={datasetObjectSearchQueryExpression}
              keyExpression={keyExpression}
              selectedItemPath={state.selectedItemPath}
              onSelectItem={handleSelectItem}
              onOpenItem={handleOpenItem}
              extraItemViewData={extraData as any}
              zeroResultsView={effectiveQueryExpression === queryExpressionDebounced
                ? zeroResultsView
                : undefined}
            />}
      </div>
    </div>
  );
});


const RegisterItemSearchResultList = makeSearchResultList<RegisterItem<any>>(ListItem, (objPath) => ({
  name: 'reg. item',
  iconProps: {
    icon: 'document',
    title: objPath,
    htmlTitle: `Icon for item at ${objPath}`,
  },
}));


export default Search;
