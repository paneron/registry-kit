/** @jsx jsx */
/** @jsxFrag React.Fragment */

import React, { memo, useMemo, useEffect, useRef, useState, useContext, useCallback } from 'react';
import { jsx, css } from '@emotion/react';
import { Button, ControlGroup, Colors, InputGroup, Tag, ButtonGroup } from '@blueprintjs/core';
import CriteriaTree from './FilterCriteria';
import { BLANK_CRITERIA } from './FilterCriteria/models';
import { CUSTOM_CONDITION, RAW_SUBSTRING } from './FilterCriteria/CRITERIA_CONFIGURATION';
import { CriteriaGroup, Criterion } from './FilterCriteria/models';
import criteriaGroupToQueryExpression from './FilterCriteria/criteriaGroupToQueryExpression';
//import criteriaGroupToSummary from './FilterCriteria/criteriaGroupToSummary';
import { BrowserCtx } from './BrowserCtx';


const SearchQuery: React.FC<{
  /**
   * Human-readable description of what would be searched.
   * Optional, but if provided must be a lower-case noun
   * to be integrated in GUI copy.
   */
  scope?: string;

  rootCriteria: CriteriaGroup;
  onCriteriaChange?: (rootCriteria: CriteriaGroup) => void;

  quickSearchString: string;
  onQuickSearchStringChange?: (searchString: string) => void;

  availableClassIDs?: string[];
  className?: string;
}> = memo(function ({
  scope,
  rootCriteria,
  onCriteriaChange,
  quickSearchString,
  onQuickSearchStringChange,
  availableClassIDs,
  className,
}) {
  const { itemClasses, subregisters, stakeholder, getQuickSearchPredicate } = useContext(BrowserCtx);

  const [ editingAdvanced, toggleEditingAdvanced ] = useState<boolean>(false);

  const classIDs = useMemo(
    (() =>
      availableClassIDs === undefined
        ? Object.keys(itemClasses)
        : availableClassIDs
    ),
    [availableClassIDs, itemClasses]);

  const hasAdvancedQuery = rootCriteria.criteria.length > 0;

  const makeDefaultCriteria = useCallback(function makeDefaultCriteria(): Criterion {
    if (quickSearchString) {
      if (getQuickSearchPredicate) {
        return {
          key: 'custom',
          query: CUSTOM_CONDITION.toQuery(
            { customExpression: getQuickSearchPredicate(quickSearchString) },
            { itemClasses, subregisters },
          ),
        }
      } else {
        return {
          key: 'raw-substring',
          query: RAW_SUBSTRING.toQuery(
            { substring: quickSearchString },
            { itemClasses, subregisters },
          ),
        }
      }
    } else {
      return {
        key: 'custom',
        query: CUSTOM_CONDITION.toQuery(
          { customExpression: 'true' },
          { itemClasses, subregisters },
        ),
      }
    }
  }, [quickSearchString, getQuickSearchPredicate, itemClasses, subregisters]);

  const quickSearchIsEnabled = onQuickSearchStringChange && !hasAdvancedQuery;
  const quickSearchInputRef = useRef<HTMLInputElement | null>(null);
  useEffect(() => {
    if (quickSearchIsEnabled && quickSearchInputRef.current) {
      quickSearchInputRef.current.focus();
    }
  }, []);

  const quickSearchLabel = scope
    ? `Quick search across ${scope}`
    : "Quick search";

  return (
    <ControlGroup fill vertical className={className}>
      <InputGroup
        fill
        inputRef={quickSearchInputRef}
        disabled={!quickSearchIsEnabled}
        value={hasAdvancedQuery ? '' : quickSearchString}
        leftIcon="search"
        placeholder={quickSearchLabel}
        title={!hasAdvancedQuery
          ? "Searching common item attributes (such as names, descriptions, identifiers)."
          : "Advanced query overrides quick search. Remove advanced query to re-enable."}
        css={css`width: 200px; ${quickSearchString !== '' && !hasAdvancedQuery ? 'input { font-weight: bold; }' : ''}`}
        rightElement={
          !onQuickSearchStringChange || quickSearchString === '' || hasAdvancedQuery
            ? undefined
            : <Button
                onClick={() => onQuickSearchStringChange?.('')}
                small
                minimal
                icon="cross"
                title="Clear quick search"
              />}
        onChange={evt => onQuickSearchStringChange?.(evt.currentTarget.value)}
      />
      <ButtonGroup fill>
        <Button
            fill
            small
            minimal
            title="Edit advanced search query"
            icon='filter'
            onClick={!hasAdvancedQuery
              ? (() => {
                  onCriteriaChange!({ criteria: [makeDefaultCriteria()], require: 'all' });
                  toggleEditingAdvanced(true);
                })
              : () => toggleEditingAdvanced(v => !v)}
                        rightIcon={rootCriteria.criteria.length > 0
              ? <Tag intent="success" round>on</Tag>
              : <Tag round>off</Tag>}>
          {editingAdvanced && hasAdvancedQuery
            ? "Advanced search query"
            : hasAdvancedQuery
              ? "Advanced search query"
              : "Enable advanced search"}
        </Button>
        {onCriteriaChange && hasAdvancedQuery
          ? <Button
                fill
                small
                minimal
                title="Remove advanced search query"
                icon='filter-remove'
                onClick={() => onCriteriaChange!(BLANK_CRITERIA)}>
              Clear advanced search
            </Button>
          : null}
      </ButtonGroup>
      {hasAdvancedQuery && editingAdvanced
        ? <>
            <CriteriaTree
              key="tree"
              criteria={rootCriteria}
              onChange={onCriteriaChange}
              itemClasses={itemClasses}
              availableClassIDs={classIDs}
              subregisters={subregisters}
              css={css`max-height: 50vh; overflow-y: auto;`}
            />
            <div
                key="query"
                css={css`
                  margin-top: 5px;
                  padding: 0 10px 10px 10px;
                  color: ${Colors.GRAY3};
                  font-size: 90%;
                  overflow-wrap: break-word;
                `}>
              Query used: <code>{criteriaGroupToQueryExpression(rootCriteria)}</code>
            </div>
          </>
        : null}
    </ControlGroup>
  );
});

export default SearchQuery;
