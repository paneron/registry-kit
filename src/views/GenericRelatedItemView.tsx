/** @jsx jsx */
/** @jsxFrag React.Fragment */

import { jsx, css } from '@emotion/react';
import React, { useContext, useEffect, useState } from 'react';
import { GenericRelatedItemViewProps, InternalItemReference, RegisterItem, RelatedItemClassConfiguration } from '../types';
import { Button, ButtonGroup, ButtonProps, Dialog } from '@blueprintjs/core';
import { BrowserCtx } from './BrowserCtx';
import RegisterItemGrid, { SearchQuery } from './RegisterItemGrid';
import criteriaGroupToQueryExpression from './FilterCriteria/criteriaGroupToQueryExpression';
import { CriteriaGroup } from './FilterCriteria/models';
import CRITERIA_CONFIGURATION from './FilterCriteria/CRITERIA_CONFIGURATION';


export const GenericRelatedItemView: React.FC<GenericRelatedItemViewProps> = function ({
  itemRef, className,
  useRegisterItemData, getRelatedItemClassConfiguration,
  onCreateNew, onClear, onChange,
  availableClassIDs,
  availableSubregisterIDs,
  itemSorter,
}) {
  const { classID, itemID, subregisterID } = itemRef ?? { classID: '', itemID: '', subregisterID: '' };
  const _itemPath = `${classID}/${itemID}.yaml`;
  const itemPath = subregisterID ? `/subregisters/${subregisterID}/${_itemPath}` : `/${_itemPath}`;

  const [selectDialogState, setSelectDialogState] = useState(false);

  //log.debug("Rendering generic related item view", itemRef);
  const { jumpToItem } = useContext(BrowserCtx);

  const itemResult = useRegisterItemData({ itemPaths: [itemPath] });
  const item = (itemResult.value?.[itemPath] || null) as RegisterItem<any> | null;

  let classConfigured: boolean;
  let cfg: RelatedItemClassConfiguration;
  try {
    cfg = getRelatedItemClassConfiguration(classID);
    classConfigured = true;
  } catch (e) {
    cfg = {
      title: classID,
      itemView: () => <span>{itemID}</span>
    };
    classConfigured = false;
  }

  const Item = cfg.itemView;

  async function handleCreateNew() {
    if (!onCreateNew) { return; }
    const itemRef = await onCreateNew();
    console.debug("Created new", itemRef);
  }

  const classIDs = availableClassIDs ?? ((itemRef?.classID ?? '') !== '' ? [itemRef!.classID] : []);
  const subregisterIDs = availableSubregisterIDs !== undefined
    ? availableSubregisterIDs
    : (itemRef?.subregisterID ?? '') !== ''
    ? [itemRef!.subregisterID!]
    : undefined;

  function jump() {
    jumpToItem?.(classID, itemID, subregisterID);
  }

  const hasItem = item !== null && classConfigured;
  const itemIsMissing = itemID !== '' && (item === null && !itemResult.isUpdating);
  const canAutoCreateRelatedItem = itemID === '' && onCreateNew && !itemResult.isUpdating;
  const canChangeRelatedItem = classIDs.length >= 1 && onChange && !itemResult.isUpdating;
  const canClear = onClear && itemID !== '' && !itemResult.isUpdating;
  const canJump = item !== null && jumpToItem && classConfigured && !canClear && !onChange && !itemResult.isUpdating;

  let itemView: JSX.Element | null;
  let itemButtons: ButtonProps[] = [];

  if (hasItem) {
    itemView = <Item
      itemID={itemID}
      useRegisterItemData={useRegisterItemData}
      itemData={item?.data}
      getRelatedItemClassConfiguration={getRelatedItemClassConfiguration} />;
  } else {
    if (canAutoCreateRelatedItem) {
      itemButtons.push({
        onClick: handleCreateNew,
        icon: 'add',
        text: 'Auto create',
        intent: 'primary',
      });
    }
    if (itemIsMissing) {
      itemView = <span>Item not found: {itemID ?? 'N/A'}</span>;
    } else {
      itemView = <span>Item not specified</span>;
    }
  }

  if (canChangeRelatedItem) {
    itemButtons.push({
      onClick: () => setSelectDialogState(true),
      icon: 'edit',
      text: 'Specify',
      intent: 'primary',
      disabled: classIDs.length < 1,
    });
  }

  if (canClear) {
    itemButtons.push({ onClick: onClear, icon: 'cross', intent: 'danger' });
  }

  //log.debug("Rendering generic related item view: got item", item);
  return (
    <ButtonGroup
        fill className={className}
        css={css`.bp3-button-text { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }`}>
      {classID
        ? <Button
              alignText="left"
              css={css`width: 180px;`}
              title={`Item class: ${cfg.title ?? "N/A"}`}
              outlined disabled>
            {cfg.title ?? "Class N/A"}
          </Button>
        : null}
      <Button
          alignText="left"
          fill={hasItem} outlined
          disabled={!canJump}
          onClick={jump}
          loading={itemResult.isUpdating}
          title={cfg.title}>
        {itemView}
      </Button>
      {itemButtons.map(props => <Button {...props} outlined />)}

      {onChange
        ? <RelatedItemSelectionDialog
            isOpen={selectDialogState}
            onClose={() => setSelectDialogState(false)}
            onChange={onChange}
            onClear={onClear}
            selectedItem={itemRef}
            availableClassIDs={classIDs}
            availableSubregisterIDs={subregisterIDs}
            useRegisterItemData={useRegisterItemData}
            getRelatedItemClassConfiguration={getRelatedItemClassConfiguration}
          />
        : null}
    </ButtonGroup>
  );
};


const RelatedItemSelectionDialog: React.FC<{
  isOpen: boolean
  onClose: () => void
  onChange: (itemRef: InternalItemReference) => void
  onClear?: () => void
  selectedItem?: InternalItemReference
  availableClassIDs: string[]
  availableSubregisterIDs?: string[]
  useRegisterItemData: GenericRelatedItemViewProps["useRegisterItemData"]
  getRelatedItemClassConfiguration: GenericRelatedItemViewProps["getRelatedItemClassConfiguration"]
}> = function ({
  isOpen, onClose, onChange, onClear,
  selectedItem,
  availableSubregisterIDs,
  availableClassIDs,
  useRegisterItemData,
  getRelatedItemClassConfiguration,
}) {
  const { itemClasses, subregisters } = useContext(BrowserCtx);

  const [filterCriteria, setFilterCriteria] = useState<CriteriaGroup>({ require: 'all', criteria: [] });

  useEffect(() => {
    const baseCriteria: CriteriaGroup[] = [];
    if (availableClassIDs.length > 0) {
      baseCriteria.push({
        require: 'any',
        criteria: availableClassIDs.map(classID => ({
          key: 'item-class',
          query: CRITERIA_CONFIGURATION['item-class'].toQuery({ classID }, { itemClasses, subregisters }),
          })),
      });
    }
    if (availableSubregisterIDs && availableSubregisterIDs.length > 0) {
      baseCriteria.push({
        require: 'any',
        criteria: availableSubregisterIDs.map(subregisterID => ({
          key: 'subregister',
          query: CRITERIA_CONFIGURATION['subregister'].toQuery({ subregisterID }, { itemClasses, subregisters }),
        })),
      });
    }
    setFilterCriteria({
      require: 'all',
      criteria: baseCriteria,
    });
  }, [JSON.stringify(availableClassIDs), JSON.stringify(availableSubregisterIDs)]);

  return (
    <Dialog
        isOpen={isOpen}
        onClose={onClose}
        enforceFocus={false}
        style={{ padding: '0', width: 'unset' }}>
      <RegisterItemGrid
        style={{ height: '90vh', width: '90vw' }}
        selectedItem={selectedItem ?? undefined /* NOTE: for some reason it can be null; this is wrong */}
        hasSubregisters={availableSubregisterIDs !== undefined ? true : undefined}
        queryExpression={criteriaGroupToQueryExpression(filterCriteria)}
        onSelectItem={(itemRef) => itemRef ? onChange(itemRef) : onClear ? onClear() : void 0}
        onOpenItem={(itemRef) => { onChange(itemRef); onClose(); }}
        getRelatedClassConfig={getRelatedItemClassConfiguration}
        useRegisterItemData={useRegisterItemData}
        toolbar={<SearchQuery
          rootCriteria={filterCriteria}
          viewingMeta={false}
          itemClasses={itemClasses}
          availableClassIDs={availableClassIDs}
          subregisters={subregisters}
          onCriteriaChange={setFilterCriteria}
        />}
      />
    </Dialog>
  );
}


export default GenericRelatedItemView;
