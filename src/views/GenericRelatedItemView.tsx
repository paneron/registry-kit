/** @jsx jsx */
/** @jsxFrag React.Fragment */

import { jsx, css } from '@emotion/core';
import React, { useContext, useState } from 'react';
import { GenericRelatedItemViewProps, InternalItemReference, RegisterItem, RelatedItemClassConfiguration } from '../types';
import { Button, ButtonGroup, ControlGroup, Dialog, HTMLSelect } from '@blueprintjs/core';
import { BrowserCtx as BrowserCtxSpec } from './BrowserCtx';
import { BrowserCtx } from './BrowserCtx';
import { ItemBrowser } from './ItemBrowser';
import { DatasetContext } from '@riboseinc/paneron-extension-kit/context';


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

  console.debug("GenericRelatedItemView", itemPath);

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

  const defaultClassID = classIDs[0];
  const effectiveClassID = classID || defaultClassID;

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

      {onChange && (classID || defaultClassID)
        ? <RelatedItemSelectionDialog
            isOpen={selectDialogState}
            onClose={() => setSelectDialogState(false)}
            onChange={onChange}
            selectedItem={itemID}
            selectedClassID={effectiveClassID}
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
  selectedItem: string
  selectedClassID: string
  selectedSubregisterID?: string
  availableClassIDs: string[]
  availableSubregisterIDs: string[]
  useRegisterItemData: GenericRelatedItemViewProps["useRegisterItemData"]
  getRelatedItemClassConfiguration: GenericRelatedItemViewProps["getRelatedItemClassConfiguration"]
}> = function ({
  isOpen, onClose, onChange,
  selectedItem, selectedClassID, selectedSubregisterID,
  availableClassIDs, availableSubregisterIDs,
  useRegisterItemData, getRelatedItemClassConfiguration,
}) {
  const ctx = useContext(DatasetContext);
  //const { useObjectPaths } = useContext(DatasetContext);
  const { useFilteredIndex } = ctx;

  const itemClassPath: string = selectedSubregisterID
    ? `/subregisters/${selectedSubregisterID}/${selectedClassID}/`
    : `/${selectedClassID}/`;

  const queryExpression: string = `return objPath.indexOf("${itemClassPath}") === 0`;

  const indexReq = useFilteredIndex({ queryExpression });
  const indexID: string = indexReq.value.indexID ?? '';
  //const objectPathsQuery = useObjectPaths({ pathPrefix });

  return (
    <Dialog
        isOpen={isOpen}
        onClose={onClose}
        style={{ padding: '0' }}>
      <ControlGroup>
        {availableSubregisterIDs.length > 0 || selectedSubregisterID !== undefined
          ? <HTMLSelect
              minimal
              fill
              disabled={availableSubregisterIDs.length < 2}
              value={selectedSubregisterID}
              onChange={(evt) => onChange!({ itemID: selectedItem, classID: selectedClassID, subregisterID: evt.currentTarget.value })}
              options={(availableSubregisterIDs ?? [selectedSubregisterID!]).map(subregID => ({
                value: subregID,
                label: subregID,
              }))} />
          : null}
        <HTMLSelect
          minimal
          fill
          disabled={availableClassIDs.length < 2}
          value={selectedClassID}
          onChange={(evt) => onChange!({
            itemID: selectedItem,
            subregisterID: selectedSubregisterID,
            classID: evt.currentTarget.value,
          })}
          options={availableClassIDs.map(clsID => ({
            label: getRelatedItemClassConfiguration(clsID).title,
            value: clsID,
          }))}
        />
      </ControlGroup>
      <ItemBrowser
        style={{ height: '80vh' }}
        classID={selectedClassID}
        selectedSubregisterID={selectedSubregisterID}
        selectedItem={selectedItem}
        indexID={indexID}
        onSelectItem={(itemID) => onChange!({
          itemID: itemID ?? '',
          classID: selectedClassID,
          subregisterID: selectedSubregisterID,
        })}
        getRelatedClassConfig={getRelatedItemClassConfiguration}
        useRegisterItemData={useRegisterItemData} />
    </Dialog>
  );
}


export default GenericRelatedItemView;
