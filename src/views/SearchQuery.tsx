/** @jsx jsx */
/** @jsxFrag React.Fragment */

import React, { useState, useContext } from 'react';
import { jsx, css } from '@emotion/react';
import { Button, ControlGroup, Colors, InputGroup, Tag, ButtonGroup } from '@blueprintjs/core';
import CriteriaTree from './FilterCriteria';
import { CUSTOM_CONDITION, RAW_SUBSTRING } from './FilterCriteria/CRITERIA_CONFIGURATION';
import { CriteriaGroup, Criterion } from './FilterCriteria/models';
import criteriaGroupToQueryExpression from './FilterCriteria/criteriaGroupToQueryExpression';
//import criteriaGroupToSummary from './FilterCriteria/criteriaGroupToSummary';
import { BrowserCtx } from './BrowserCtx';



const SearchQuery: React.FC<{
  rootCriteria: CriteriaGroup;
  onCriteriaChange?: (rootCriteria: CriteriaGroup) => void;

  quickSearchString: string;
  onQuickSearchStringChange?: (searchString: string) => void;

  availableClassIDs?: string[];
  className?: string;
}> = function ({
  rootCriteria,
  onCriteriaChange,
  quickSearchString,
  onQuickSearchStringChange,
  availableClassIDs,
  className,
}) {
    const { itemClasses, subregisters } = useContext(BrowserCtx);

    const [ editingAdvanced, toggleEditingAdvanced ] = useState<boolean>(false);

    const classIDs = availableClassIDs ?? Object.keys(itemClasses);

    const hasAdvancedQuery = rootCriteria.criteria.length > 0;

    function makeDefaultCriteria(): Criterion {
      if (quickSearchString) {
        return {
          key: 'raw-substring',
          query: RAW_SUBSTRING.toQuery(
            { substring: quickSearchString },
            { itemClasses, subregisters },
          ),
        }
      } else {
        return {
          key: 'custom',
          query: CUSTOM_CONDITION.toQuery(
            { customExpression: 'false' },
            { itemClasses, subregisters },
          ),
        }
      }
    }

    return (
      <ControlGroup fill vertical className={className}>
        <InputGroup
          fill
          small
          disabled={!onQuickSearchStringChange || hasAdvancedQuery}
          value={hasAdvancedQuery ? '' : quickSearchString}
          leftIcon="search"
          placeholder="Quick search"
          title={!hasAdvancedQuery
            ? "Search for a substring occurring anywhere within serialized item data."
            : "Advanced query overrides quick search."}
          css={css`width: 200px; ${quickSearchString !== '' && !hasAdvancedQuery ? 'input { font-weight: bold; }' : ''}`}
          rightElement={<Button
            disabled={!onQuickSearchStringChange || quickSearchString === '' || hasAdvancedQuery}
            onClick={() => onQuickSearchStringChange?.('')}
            small
            minimal
            icon="cross"
            title="Clear quick search" />}
          onChange={evt => onQuickSearchStringChange?.(evt.currentTarget.value)} />
        <ButtonGroup fill>
          <Button
            fill
            small
            title="Edit advanced search query"
            icon='filter'
            onClick={!hasAdvancedQuery
              ? (() => {
                  onCriteriaChange!({ criteria: [makeDefaultCriteria()], require: 'all' });
                  toggleEditingAdvanced(true);
                })
              : () => toggleEditingAdvanced(v => !v)}
            active={editingAdvanced && hasAdvancedQuery}
            disabled={!hasAdvancedQuery && !onCriteriaChange}
            rightIcon={rootCriteria.criteria.length > 0
              ? <Tag intent="success" round>on</Tag>
              : <Tag round>off</Tag>}>
            Advanced
          </Button>
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
                css={css`max-height: 50vh; overflow-y: auto;`} />
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
  };

export default SearchQuery;
