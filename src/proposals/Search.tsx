/** @jsx jsx */
/** @jsxFrag React.Fragment */

import React, { memo, useContext, useCallback, useMemo } from 'react';
import { jsx, css } from '@emotion/react';
import makeList, { type ItemProps, LabelledListIcon, type ListData } from '@riboseinc/paneron-extension-kit/widgets/List';

import type { RegisterItem } from '../types/item';
import { itemPathToItemRef } from '../views/itemPathUtils';
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
  const ListItemView = clsConfig.itemView;
  const itemPayload: Record<string, any> | null = registerItem?.data ?? null;
 
  const itemView = itemPayload
    ? <ListItemView
        itemData={itemPayload}
        itemRef={itemRef}
      />
    : <span css={css`opacity: .4`}>
        (missing item data at {itemPath})
      </span>;

  return (
    <LabelledListIcon
        isSelected={extraData.selectedItemPath === itemPath}
        onSelect={onSelect}
        onOpen={onOpen}
        //contentClassName={(isUpdating && !objData) ? Classes.SKELETON : undefined}
        entityType={{ name: proposalItem.type }}
        >
      {itemView}
    </LabelledListIcon>
  );
};

const List = makeList<ProposalListData>(ProposalItem);

export const ProposalSearchResultList: React.FC<SearchResultListProps> =
memo(function ({ extraItemViewData, queryExpression, selectedItemPath, onSelectItem, onOpenItem, className }) {
  const { useRegisterItemData } = useContext(BrowserCtx);
  const proposal = extraItemViewData.proposal;

  const expressionParsed =
    new Function('objPath', 'obj', queryExpression) as (objPath: string, obj: null | RegisterItem<any> | ChangeProposal) => boolean;

  const proposedItemDataReq = useRegisterItemData({
    itemPaths: Object.keys(proposal.items),
  });

  const itemData = proposedItemDataReq.value;

  const predicate = useCallback(([objPath, obj]: [string, ChangeProposal]) => {
    return (
      expressionParsed(objPath, itemData[objPath])
      || expressionParsed(objPath, obj)
    );
  }, [queryExpression, itemData]);

  const validItems = Object.entries(proposal.items).filter(predicate);

  const matchingItemIDs = validItems.map(([p, ]) => p);

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
