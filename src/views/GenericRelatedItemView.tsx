/** @jsx jsx */
/** @jsxFrag React.Fragment */

import { jsx, css } from '@emotion/react';
import React, { useRef, useContext, useCallback, useMemo, useState } from 'react';
import { InputGroup, Button, ControlGroup, type ControlGroupProps, type ButtonProps } from '@blueprintjs/core';
import {
  type GenericRelatedItemViewProps,
  type RelatedItemClassConfiguration,
  isRegisterItem,
} from '../types';
import { ChangeRequestContext } from '../proposals/ChangeRequestContext';
import { isDrafted } from '../proposals/types';
import { BrowserCtx } from './BrowserCtx';
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
  hideItemClassTitle,
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
          css={css`overflow: hidden; text-overflow: ellipsis;`}
        />
      : itemIsMissing
          ? <span css={css`overflow: hidden; text-overflow: ellipsis;`}>
              Not found: {itemID ?? 'N/A'}
            </span>
          : <span>Not specified</span>;
    return <>{itemView}{!hideItemClassTitle ? <>&emsp;{classView}</> : null}</>;
  }, [itemID, classID, !hideItemClassTitle && itemClassTitle, subregisterID, item?.data, hasItem, itemIsMissing]);

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

  /** Input ref for using within this component */
  //const cbRef = useRef<HTMLDivElement | null>(null);
  const _drawerContainerRef = useRef<HTMLElement | null>(null);
  const closePeekingDrawer = useCallback(
    (() => setPeekingDrawerState(false)),
    [setPeekingDrawerState]);

  const _itemRef = useMemo(() => itemRef, [JSON.stringify(itemRef)]);

  //log.debug("Rendering generic related item view: got item", item);
  return (
    <ControlGroup
        dir="ltr"
        className={className}
        title={itemTitle}
        {...controlGroupProps}>

      {/*<div ref={cbRef} />*/}

      {/*
        It could technically be a div, since input is empty,
        but that input is useful
        if callers utilize inputRef for form validation API,
        for example.
      */}
      <InputGroup
        fill={hasItem}
        readOnly={!onChange && !onClear}
        inputRef={inputRef}
        onChange={useCallback(() => void 0, [])}
        css={css`
          flex-shrink: 1;

          /* leftElement which displays itemView */
          .bp4-input-left-container {
            /* Some obscure magic, since we augment bp4’s styling here. */
            top: unset;
            bottom: .42em;
            padding-left: 10px;
            padding-right: 5px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;

            display: block;

            max-width: 100%;
          }
          .bp4-input {
            /* Hide raw UUID */
            color: rgba(125, 125, 125, 0);
            font-family: monospace;
            padding-left: 0 !important;
          }
        `}
        leftElement={canJump
          ? <a
                onClick={jump}
                css={css`
                  display: flex;
                  flex-flow: row nowrap;
                  align-items: baseline;
                `}>
              {itemView}
            </a>
          : itemView}
        value={itemID ?? ''}
        title={itemTitle}
      />

      {/*canJump
        ? <Button outlined onClick={jump} icon="maximize" />
        : null*/}

      {itemButtons.map((props, idx) =>
        <Button key={idx} outlined {...props} />
      )}

      <ItemSearchDrawer
        isOpen={selectDialogState}
        onClose={useCallback(
          () => setSelectDialogState(false),
          [setSelectDialogState])}
        onChooseItem={onChange}
        availableClassIDs={classIDs}
      />

      {_itemRef
        ? <ItemDetailsDrawer
            isOpen={peekingDrawerState}
            onClose={closePeekingDrawer}
            itemRef={_itemRef}
            portalContainer={_drawerContainerRef.current ?? undefined}
          />
        : null}

    </ControlGroup>
  );
};


export default GenericRelatedItemView;
