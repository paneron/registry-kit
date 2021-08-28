/** @jsx jsx */
/** @jsxFrag React.Fragment */

import React, { useContext } from 'react';
import { jsx, css } from '@emotion/react';
import { Button, ControlGroup, Colors, InputGroup, Tag } from '@blueprintjs/core';
import { Popover2, Tooltip2 } from '@blueprintjs/popover2';
import CriteriaTree from './FilterCriteria';
import { CriteriaGroup } from './FilterCriteria/models';
import criteriaGroupToQueryExpression from './FilterCriteria/criteriaGroupToQueryExpression';
import criteriaGroupToSummary from './FilterCriteria/criteriaGroupToSummary';
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
    const classIDs = availableClassIDs ?? Object.keys(itemClasses);
    return (
      <ControlGroup vertical className={className}>
        <InputGroup
          disabled={!onQuickSearchStringChange}
          value={quickSearchString}
          leftIcon="search"
          placeholder="Quick text search"
          title="Search for a substring occurring anywhere within serialized item data."
          css={css`width: 200px; ${quickSearchString !== '' ? 'input { font-weight: bold; }' : ''}`}
          rightElement={<Button
            disabled={!onQuickSearchStringChange || quickSearchString === ''}
            onClick={() => onQuickSearchStringChange?.('')}
            small
            minimal
            icon="cross"
            title="Clear quick search" />}
          onChange={evt => onQuickSearchStringChange?.(evt.currentTarget.value)} />
        <Popover2
          minimal
          popoverClassName="filter-popover"
          css={css`& { flex: unset !important }`} // BP3 defualt styling stretches popover trigger inside button group.
          content={<>
            <CriteriaTree
              key="tree"
              criteria={rootCriteria}
              onChange={onCriteriaChange}
              itemClasses={itemClasses}
              availableClassIDs={classIDs}
              subregisters={subregisters}
              css={css`width: 100vw; max-height: 50vh; overflow-y: auto;`} />
            <div key="query" css={css`margin-top: 5px; padding: 0 10px 10px 10px; color: ${Colors.GRAY3}; font-size: 90%;`}>
              Computed query: <code>{criteriaGroupToQueryExpression(rootCriteria)}</code>
            </div>
          </>}>
          <Button
            title="Edit advanced query"
            icon='filter'
            alignText='left'
            rightIcon={rootCriteria.criteria.length > 0
              ? quickSearchString !== ''
                ? <Tooltip2
                  placement="bottom"
                  minimal
                  content={<>Clear quick text search for advanced query to have effect.</>}>
                  <Tag round>off: using quick search</Tag>
                </Tooltip2>
                : <Tooltip2
                  placement="bottom"
                  minimal
                  content={<>Showing items where {criteriaGroupToSummary(rootCriteria, { itemClasses, subregisters })}</>}>
                  <Tag intent="success" round>on</Tag>
                </Tooltip2>
              : <Tag round>off: showing all</Tag>}>
            Advanced
        </Button>
        </Popover2>
        {rootCriteria.criteria.length > 0
          ? <Button
            disabled={!onCriteriaChange}
            icon="filter-remove"
            title="Clear advanced query (show all)"
            onClick={() => onCriteriaChange!({ criteria: [], require: 'all' })} />
          : null}
      </ControlGroup>
    );
  };

export default SearchQuery;
