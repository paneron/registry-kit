/** @jsx jsx */
/** @jsxFrag React.Fragment */

import { jsx, css } from '@emotion/core';
import React, { useContext, useState } from 'react';
import { GenericRelatedItemViewProps, RegisterItem, RelatedItemClassConfiguration } from '../types';
import { Button, ButtonGroup, ControlGroup, Dialog, HTMLSelect } from '@blueprintjs/core';
import { BrowserCtx as BrowserCtxSpec } from './BrowserCtx';
import { BrowserCtx } from './BrowserCtx';
import { ItemBrowser } from './ItemBrowser';


export const GenericRelatedItemView: React.FC<GenericRelatedItemViewProps> = function ({
  itemRef, className,
  useRegisterItemData, getRelatedItemClassConfiguration,
  onCreateNew, onClear, onChange,
  availableClassIDs,
  availableSubregisterIDs,
  itemSorter,
}) {
  const { classID, itemID, subregisterID } = itemRef ?? { classID: '', itemID: '', subregisterID: '' };
  const _itemPath = `${classID}/${itemID}`;
  const itemPath = subregisterID ? `subregisters/${subregisterID}/${_itemPath}` : _itemPath;

  const [selectDialogState, setSelectDialogState] = useState(false);

  //log.debug("Rendering generic related item view", itemRef);
  const browserCtx: BrowserCtxSpec = useContext(BrowserCtx);

  const itemResult = useRegisterItemData({
    [itemPath]: 'utf-8' as const,
  });
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
  const subregisterIDs = availableSubregisterIDs ?? ((itemRef?.subregisterID ?? '') !== '' ? [itemRef!.subregisterID] : []);

  const defaultClassID = classIDs[0];

  //log.debug("Rendering generic related item view: got item", item);
  return (
    <ControlGroup className={className} vertical={onChange !== undefined}>
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
        ? <Dialog
              isOpen={selectDialogState}
              onClose={() => setSelectDialogState(false)}
              style={{ padding: '0' }}>
            <ControlGroup>
              {subregisterIDs.length > 0
                ? <HTMLSelect
                    minimal
                    fill
                    disabled={subregisterIDs.length < 2}
                    value={subregisterID}
                    onChange={(evt) => onChange!({ itemID, classID, subregisterID: evt.currentTarget.value })}
                    options={(availableSubregisterIDs ?? [itemRef!.subregisterID!]).map(subregID => ({
                      value: subregID,
                      label: subregID,
                    }))} />
                : null}
              <HTMLSelect
                minimal
                fill
                disabled={classIDs.length < 2}
                value={classID || defaultClassID}
                onChange={(evt) => onChange!({ itemID, subregisterID, classID: evt.currentTarget.value })}
                options={classIDs.map(clsID => ({
                  label: getRelatedItemClassConfiguration(clsID).title,
                  value: clsID,
                }))}
              />
            </ControlGroup>
            <ItemBrowser
              style={{ height: '80vh' }}
              classID={classID || defaultClassID}
              selectedSubregisterID={subregisterID}
              selectedItem={itemID}
              onSelectItem={(itemID) => onChange!({ itemID: itemID ?? '', classID: classID || defaultClassID, subregisterID })}
              itemSorter={itemSorter}
              getRelatedClassConfig={getRelatedItemClassConfiguration}
              useRegisterItemData={useRegisterItemData} />
          </Dialog>
        : null}
    </ControlGroup>
  );
};


export default GenericRelatedItemView;
