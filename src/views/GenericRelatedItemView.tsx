/** @jsx jsx */
/** @jsxFrag React.Fragment */

import { jsx, css } from '@emotion/core';
import React, { useContext, useState } from 'react';
import { GenericRelatedItemViewProps, InternalItemReference, RegisterItem, RelatedItemClassConfiguration } from '../types';
import { Button, ButtonGroup, ControlGroup, Dialog } from '@blueprintjs/core';
import { BrowserCtx as BrowserCtxSpec } from './BrowserCtx';
import { BrowserCtx } from './BrowserCtx';
import RegisterItemGrid, { SearchQuery } from './RegisterItemGrid';
import criteriaGroupToQueryExpression from './FilterCriteria/criteriaGroupToQueryExpression';
import { CriteriaGroup } from './FilterCriteria/models';


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
  const browserCtx: BrowserCtxSpec = useContext(BrowserCtx);

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
  const subregisterIDs = availableSubregisterIDs ?? ((itemRef?.subregisterID ?? '') !== '' ? [itemRef!.subregisterID!] : []);

  const defaultSubregisterID: string | undefined = subregisterIDs[0];
  const effectiveSubregisterID: string | undefined = defaultSubregisterID;

  //log.debug("Rendering generic related item view: got item", item);
  return (
    <ControlGroup fill className={className} vertical>
      <ButtonGroup>
        {classID
          ? <Button
                alignText="left"
                title="Item class"
                outlined disabled>
              {cfg.title ?? "Class not specified"}
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
              : <span>Item not found: {itemRef?.itemID ?? 'N/A'}</span>}
        </Button>
      </ButtonGroup>

      <ButtonGroup>
        {itemID === ''
          ? onCreateNew
            ? <Button intent="primary" onClick={handleCreateNew} icon="add">Auto-create</Button>
            : null
          : <>
              <Button
                icon={item === null && itemID !== '' ? 'error' : 'locate'}
                disabled={item === null || !browserCtx.jumpToItem || !classConfigured || itemResult.isUpdating}
                onClick={() => browserCtx.jumpToItem?.(classID, itemID, subregisterID)} />
              {onClear
                ? <Button onClick={onClear} icon="cross" />
                : null}
            </>}
        {onChange
          ? <Button disabled={classIDs.length < 1} onClick={() => setSelectDialogState(true)} icon="edit" />
          : null}
      </ButtonGroup>

      {onChange
        ? <RelatedItemSelectionDialog
            isOpen={selectDialogState}
            onClose={() => setSelectDialogState(false)}
            onChange={onChange}
            onClear={onClear}
            selectedItem={itemRef}
            selectedSubregisterID={effectiveSubregisterID}
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
  selectedSubregisterID?: string
  availableClassIDs: string[]
  availableSubregisterIDs: string[]
  useRegisterItemData: GenericRelatedItemViewProps["useRegisterItemData"]
  getRelatedItemClassConfiguration: GenericRelatedItemViewProps["getRelatedItemClassConfiguration"]
}> = function ({
  isOpen, onClose, onChange, onClear,
  selectedItem, selectedSubregisterID,
  availableClassIDs,
  useRegisterItemData, getRelatedItemClassConfiguration,
}) {
  const [filterCriteria, setFilterCriteria] = useState<CriteriaGroup>({ require: 'all', criteria: [] });
  const { itemClasses, subregisters } = useContext(BrowserCtx);

  return (
    <Dialog
        isOpen={isOpen}
        onClose={onClose}
        enforceFocus={false}
        style={{ padding: '0', width: 'unset' }}>
      <RegisterItemGrid
        style={{ height: '90vh', width: '90vw' }}
        selectedItem={selectedItem}
        hasSubregisters={selectedSubregisterID !== undefined ? true : undefined}
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
