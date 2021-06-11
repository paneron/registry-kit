/** @jsx jsx */
/** @jsxFrag React.Fragment */

import { jsx, css } from '@emotion/react';
import React, { useContext, useEffect, useState } from 'react';
import { GenericRelatedItemViewProps, InternalItemReference, RegisterItem, RelatedItemClassConfiguration } from '../types';
import { Button, ButtonGroup, ControlGroup, Dialog } from '@blueprintjs/core';
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

  //log.debug("Rendering generic related item view: got item", item);
  return (
    <ControlGroup fill className={className} vertical>
      <ButtonGroup>
        {classID
          ? <Button
                alignText="left"
                title="Item class"
                outlined disabled>
              {cfg.title ?? "Class N/A"}
            </Button>
          : null}
        <Button
            alignText="left"
            fill outlined disabled
            loading={itemResult.isUpdating}
            title={cfg.title}
            css={css`.bp3-button-text { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }`}>
          {itemID === ''
            ? <span>Item not specified</span>
            : item !== null && !itemResult.isUpdating
              ? <Item
                  itemID={itemID}
                  useRegisterItemData={useRegisterItemData}
                  itemData={item.data}
                  getRelatedItemClassConfiguration={getRelatedItemClassConfiguration} />
              : <span>Item not found: {itemID ?? 'N/A'}</span>}
        </Button>
      </ButtonGroup>

      <ButtonGroup>
        {onChange
          ? <Button disabled={classIDs.length < 1} onClick={() => setSelectDialogState(true)} icon="edit" />
          : null}
        {itemID === ''
          ? onCreateNew
            ? <Button intent="primary" onClick={handleCreateNew} icon="add">Auto-create</Button>
            : null
          : <>
              <Button
                icon={item === null && itemID !== '' ? 'error' : 'locate'}
                disabled={item === null || !jumpToItem || !classConfigured || itemResult.isUpdating}
                onClick={() => jumpToItem?.(classID, itemID, subregisterID)} />
              {onClear
                ? <Button onClick={onClear} icon="cross" />
                : null}
            </>}
      </ButtonGroup>

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
    </ControlGroup>
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
