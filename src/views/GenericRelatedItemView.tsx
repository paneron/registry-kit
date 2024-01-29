/** @jsx jsx */
/** @jsxFrag React.Fragment */

import { jsx, css } from '@emotion/react';
import React, { useContext, useCallback, useMemo, useState } from 'react';
import { InputGroup, Button, ControlGroup, type ControlGroupProps, type ButtonProps } from '@blueprintjs/core';
import {
  type GenericRelatedItemViewProps,
  type RelatedItemClassConfiguration,
  isRegisterItem,
} from '../types';
import { BrowserCtx } from './BrowserCtx';
import { ChangeRequestContext } from './change-request/ChangeRequestContext';
import { isDrafted } from '../types/cr';
import ItemSearchDrawer from './ItemSearchDrawer';
import ItemDetailsDrawer from './ItemDetailsDrawer';


const DUMMY_REF = {
  classID: '',
  itemID: '',
  subregisterID: '',
} as const;


export const GenericRelatedItemView: React.FC<GenericRelatedItemViewProps & {
  controlGroupProps?: ControlGroupProps
}> = function ({
  itemRef, className,
  onCreateNew, onClear, onChange,
  availableClassIDs,
  onJump,
  inputRef,
  controlGroupProps,
  // availableSubregisterIDs,
  // itemSorter,
}) {
  const {
    useRegisterItemData,
    getRelatedItemClassConfiguration,
    jumpTo,
  } = useContext(BrowserCtx);
  const { changeRequest: activeChangeRequest } = useContext(ChangeRequestContext);
  const { classID, itemID, subregisterID } = itemRef ?? DUMMY_REF;

  const itemPathWithClass = `${classID}/${itemID}.yaml`;
  // If curretn register has subregisters, specify subregister-relative path
  const itemPathWithSubregister = subregisterID
    ? `subregisters/${subregisterID}/${itemPathWithClass}`
    : `${itemPathWithClass}`;
  // If a change request is active
  // and this item is among clarifications or additions
  // then use item path relative to the change request
  // TODO: make useRegisterItemData() handle active change request
  const affectedByActiveCR = (
    activeChangeRequest &&
    isDrafted(activeChangeRequest) &&
    activeChangeRequest.items[itemPathWithSubregister]
  );
  const itemPath = affectedByActiveCR
    ? `/proposals/${activeChangeRequest.id}/items/${itemPathWithSubregister}`
    : `/${itemPathWithSubregister}`;

  const [selectDialogState, setSelectDialogState] = useState(false);
  const [peekingDrawerState, setPeekingDrawerState] = useState(false);

  //log.debug("Rendering generic related item view", itemRef);
  //const { jumpToItem } = useContext(BrowserCtx);

  const itemResult = useRegisterItemData({ itemPaths: [itemPath] });
  const item = (itemResult.value?.[itemPath] || null);

  const [classConfigured, cfg]: [boolean, RelatedItemClassConfiguration] = useMemo(() => {
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
    return [classConfigured, cfg];
  }, [itemID, classID, getRelatedItemClassConfiguration]);

  const Item = cfg.itemView;

  const classIDs = useMemo((() =>
    availableClassIDs ?? ((itemRef?.classID ?? '') !== '' ? [itemRef!.classID] : [])
  ), [availableClassIDs?.join(','), itemRef?.classID]);

  const itemClassTitle = cfg.title.trim() || null;

  const hasItem = item !== null && classConfigured && isRegisterItem(item);
  const itemIsMissing = itemID !== '' && (item === null && !itemResult.isUpdating);
  const willShowItemView = hasItem || itemIsMissing || !onChange;
  const canJump = (item !== null || itemIsMissing) && classConfigured && !itemResult.isUpdating && (onJump || jumpTo);

  const jump = useCallback(function jump() {
    return onJump
      ? onJump()
      : setPeekingDrawerState(true)
  }, [onJump, jumpTo]);

  const itemView: JSX.Element | null = useMemo(() => {
    const classView = <small css={css`letter-spacing: -.01em`}>
      {itemClassTitle
        ? itemClassTitle
        : <em>unknown class</em>}
    </small>;
    const itemView = hasItem
      ? <Item
          itemRef={{ classID, itemID, subregisterID }}
          itemData={item.data}
        />
      : itemIsMissing
          ? <span css={css`overflow: hidden; text-overflow: ellipsis;`}>
              Not found: {itemID ?? 'N/A'}
            </span>
          : <span>Not specified</span>;
    return <>{itemView}&emsp;{classView}</>;
  }, [itemID, classID, itemClassTitle, subregisterID, item?.data, hasItem, itemIsMissing]);

  const itemButtons = useMemo(() => {
    const canAutoCreateRelatedItem = itemID === '' && onCreateNew && !itemResult.isUpdating;
    const canChangeRelatedItem = /*classIDs.length >= 1 && */onChange && !itemResult.isUpdating;
    const canClear = onClear && itemID !== '' && !itemResult.isUpdating;

    let itemButtons: (ButtonProps & { title: string })[] = [];

    async function handleCreateNew() {
      if (!onCreateNew) { return; }
      const itemRef = await onCreateNew();
      console.debug("Created new item", itemRef);
    }

    if (!hasItem && canAutoCreateRelatedItem) {
      itemButtons.push({
        onClick: handleCreateNew,
        icon: 'add',
        text: 'Auto create',
        intent: 'primary',
        title: "Automatically create new item",
      });
    }
    if (canChangeRelatedItem) {
      itemButtons.push({
        onClick: () => setSelectDialogState(true),
        icon: 'edit',
        text: willShowItemView ? undefined : 'Specify',
        intent: 'primary',
        title: "Select related item",
        /*disabled: classIDs.length < 1,*/
      });
    }
    if (canClear) {
      itemButtons.push({
        onClick: onClear,
        icon: 'eraser',
        intent: 'danger',
        title: "Clear related item selection",
      });
    }

    return itemButtons;
  }, [itemID, itemResult.isUpdating, onCreateNew, onChange, onClear]);

  const itemTitle = hasItem
    ? `${itemClassTitle ?? 'unknown class'} item ${itemID ?? 'with unknown ID'}`
    : undefined;

  //log.debug("Rendering generic related item view: got item", item);
  return (
    <ControlGroup
        dir="ltr"
        className={className}
        title={itemTitle}
        {...controlGroupProps}>

      <InputGroup
        fill={hasItem}
        readOnly={!onChange && !onClear}
        onChange={() => void 0}
        inputRef={inputRef}
        css={css`
          /* leftElement which displays itemView */
          .bp4-input-left-container {
            top: unset;
            bottom: .42em;
            padding-left: 10px;
            padding-right: 5px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;

            display: inline-flex;
            flex-flow: row nowrap;
            align-items: baseline;

            max-width: 70%;
          }
          .bp4-input {
            color: rgba(125, 125, 125, 0.5);
            font-family: monospace;
          }
        `}
        leftElement={itemView}
        value={itemID ?? ''}
        title={itemTitle}
      />

      {canJump
        ? <Button outlined onClick={jump} icon="maximize" />
        : null}

      {itemButtons.map((props, idx) =>
        <Button key={idx} outlined {...props} />
      )}

      <ItemSearchDrawer
        isOpen={selectDialogState}
        onClose={() => setSelectDialogState(false)}
        onChooseItem={onChange}
        availableClassIDs={classIDs}
      />

      {itemRef
        ? <ItemDetailsDrawer
            isOpen={peekingDrawerState}
            onClose={() => setPeekingDrawerState(false)}
            itemRef={itemRef}
          />
        : null}

    </ControlGroup>
  );
};


export default GenericRelatedItemView;
