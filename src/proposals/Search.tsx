/** @jsx jsx */
/** @jsxFrag React.Fragment */

import React, { memo, useContext, useCallback, useMemo } from 'react';
import { jsx, css } from '@emotion/react';
import makeList, { type ItemProps, LabelledListIcon, type ListData } from '@riboseinc/paneron-extension-kit/widgets/List';

import type { RegisterItem } from '../types/item';
import { itemPathInCR, itemPathToItemRef } from '../views/itemPathUtils';
import { BrowserCtx } from '../views/BrowserCtx';

import type { SomeCR } from './types';
import type { ChangeProposal } from './types';


export interface ProposalListData {
  selectedItemPath: string | null;
  extraItemViewData: { proposal: SomeCR, itemData: Record<string, RegisterItem<any> | null> }
}

export interface SearchResultListProps {
  queryExpression: string;
  selectedItemPath: string | null;
  onSelectItem: (itemPath: string | null) => void;
  onOpenItem?: (itemPath: string) => void;
  keyExpression?: string;
  extraItemViewData: { proposal: SomeCR, itemData: Record<string, RegisterItem<any> | null> }
  className?: string;
}


const ProposalItem: React.FC<ItemProps<ProposalListData>> =
function ({ onSelect, onOpen, extraData, itemRef: itemPath }) {
  const { subregisters, getRelatedItemClassConfiguration } = useContext(BrowserCtx);

  const proposalItem = extraData.extraItemViewData.proposal.items[itemPath];
  const registerItem = extraData.extraItemViewData.itemData[itemPath] ?? null;

  const itemRef = itemPathToItemRef(subregisters !== undefined, itemPath);

  const clsConfig = getRelatedItemClassConfiguration(itemRef.classID);
  const ListItemView = clsConfig?.itemView;
  const itemPayload: Record<string, any> | null = registerItem?.data ?? null;
 
  const itemView = itemPayload && ListItemView
    ? <>
        <div>{clsConfig.title}</div>
        <ListItemView
          itemData={itemPayload}
          itemRef={itemRef}
        />
      </>
    : <span css={css`opacity: .4`}>
        (missing item data at {itemPath})
      </span>;

  return (
    <LabelledListIcon
        contentStyle={{ display: 'flex', flexFlow: 'row nowrap', gap: '10px' }}
        isSelected={extraData.selectedItemPath === itemPath}
        onSelect={onSelect}
        onOpen={onOpen}
        //contentClassName={(isUpdating && !objData) ? Classes.SKELETON : undefined}
        entityType={{ name: proposalItem.type }}>
      {itemView}
    </LabelledListIcon>
  );
};

const List = makeList<ProposalListData>(ProposalItem);

export const ProposalSearchResultList: React.FC<SearchResultListProps> =
memo(function ({ extraItemViewData, queryExpression, selectedItemPath, onSelectItem, onOpenItem, className }) {
  const { useRegisterItemData, keyExpression } = useContext(BrowserCtx);
  const proposal = extraItemViewData.proposal;

  const proposedItemDataReq = useRegisterItemData({
    itemPaths: Object.keys(proposal.items),
  });

  const itemData = proposedItemDataReq.value;

  let expressionParsed: (objPath: string, obj: null | RegisterItem<any> | ChangeProposal) => boolean;
  try {
    expressionParsed = new Function('objPath', 'obj', queryExpression) as typeof expressionParsed;
  } catch (e) {
    console.error("Parsing query expression failed", e);
    expressionParsed = () => false;
  }


  const predicate = useCallback(([objPath, obj]: [string, ChangeProposal]) => {
    const objPathInCR = itemPathInCR(objPath, extraItemViewData.proposal.id);
    try {
      return (
        expressionParsed(objPath, itemData[objPath])
        || expressionParsed(objPath, obj)
        || expressionParsed(objPathInCR, itemData[objPath])
        || expressionParsed(objPathInCR, obj)
      );
    } catch (e) {
      console.error("Predicate failed", e);
      return false;
    }
  }, [queryExpression, itemData, extraItemViewData.proposal.id]);

  const matchingItemIDs = useMemo(() => {
    let keyExpressionParsed: null | ((obj: RegisterItem<any>) => any);
    try {
      keyExpressionParsed = keyExpression
        ? new Function('obj', `return ${keyExpression}`) as (obj: RegisterItem<any>) => any
        : null;
    } catch (e) {
      console.error("Parsing key expression failed", e);
      keyExpressionParsed = null;
    }

    const matchingItems = Object.entries(proposal.items).filter(predicate);

    const matchingItemsWithKeys = keyExpressionParsed && !proposedItemDataReq.isUpdating
      ? matchingItems.map(([p, ]) => {
          try {
            return [p, keyExpressionParsed!(itemData[p]!)];
          } catch (e) {
            console.debug("Failed to run key expression", keyExpression, p, itemData[p], e);
            return [p, p];
          }
        })
      : matchingItems.map(([p, ]) => [p, p]);

    matchingItemsWithKeys.sort((pair1, pair2) =>
      typeof pair1[1] === 'string'
        ? pair1[1].localeCompare(pair2[1])
        : typeof pair1[1] === 'number'
          ? pair1[1] - pair2[1]
          : 0);

    return matchingItemsWithKeys.map(([p, ]) => p);
  }, [keyExpression, itemData, predicate, proposal.items]);

  const extraData: ProposalListData = useMemo((() => ({
    extraItemViewData: { proposal, itemData },
    selectedItemPath,
  })), [selectedItemPath, proposal, itemData]);

  const getListData = useCallback(function _getListData(): ListData<ProposalListData> | null {
    return {
      items: matchingItemIDs,
      selectedItem: selectedItemPath,
      selectItem: onSelectItem,
      openItem: onOpenItem,
      itemHeight: 32,
      padding: 0,
      extraData,
    };
  }, [matchingItemIDs.join(','), extraData, onOpenItem, onSelectItem]);

  return <List
    className={className}
    getListData={getListData}
  />;
});


export default ProposalSearchResultList;
