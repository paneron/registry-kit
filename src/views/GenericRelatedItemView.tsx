/** @jsx jsx */
/** @jsxFrag React.Fragment */

import { jsx, css } from '@emotion/react';
import React, { useContext, useMemo, useState } from 'react';
import { Button, ButtonGroup, ButtonProps, Dialog } from '@blueprintjs/core';
import {
  type GenericRelatedItemViewProps,
  type InternalItemReference,
  type RelatedItemClassConfiguration,
  isRegisterItem,
} from '../types';
import { BrowserCtx } from './BrowserCtx';
import { ChangeRequestContext } from './change-request/ChangeRequestContext';
import { isDrafted } from '../types/cr';
import Search from './sidebar/Search';
import { itemPathToItemRef } from './itemPathUtils';
import type { Criterion, CriteriaGroup } from './FilterCriteria/models';
import { Protocols } from './protocolRegistry';


const DUMMY_REF = {
  classID: '',
  itemID: '',
  subregisterID: '',
} as const;


export const GenericRelatedItemView: React.FC<GenericRelatedItemViewProps> = function ({
  itemRef, className,
  onCreateNew, onClear, onChange,
  availableClassIDs,
  onJump,
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
  const affectedByActiveCR = (
    activeChangeRequest &&
    isDrafted(activeChangeRequest) &&
    activeChangeRequest.items[itemPathWithSubregister]
  );
  const itemPath = affectedByActiveCR
    ? `/proposals/${activeChangeRequest.id}/items/${itemPathWithSubregister}`
    : `/${itemPathWithSubregister}`;

  const [selectDialogState, setSelectDialogState] = useState(false);

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

  function jump() {
    //jumpToItem?.(classID, itemID, subregisterID);
    onJump
      ? onJump()
      : jumpTo?.(`${Protocols.ITEM_DETAILS}:/${itemPathWithSubregister}`);
  }

  const hasItem = item !== null && classConfigured && isRegisterItem(item);
  const itemIsMissing = itemID !== '' && (item === null && !itemResult.isUpdating);
  const willShowItemView = hasItem || itemIsMissing || !onChange;
  const canJump = (item !== null || itemIsMissing) && classConfigured && !itemResult.isUpdating && (onJump || jumpTo);

  const itemView: JSX.Element | null = useMemo(() => {
    let itemView: JSX.Element | null;

    if (hasItem) {
      itemView = <Item
        itemRef={{ classID, itemID, subregisterID }}
        itemData={item.data}
      />;
    } else {
      if (itemIsMissing) {
        itemView = <span>Item not found: {itemID ?? 'N/A'}</span>;
      } else {
        itemView = <span>Item not specified</span>;
      }
    }
    return itemView;
  }, [itemID, classID, subregisterID, item, hasItem, itemIsMissing]);

  const itemButtons = useMemo(() => {
    const canAutoCreateRelatedItem = itemID === '' && onCreateNew && !itemResult.isUpdating;
    const canChangeRelatedItem = /*classIDs.length >= 1 && */onChange && !itemResult.isUpdating;
    const canClear = onClear && itemID !== '' && !itemResult.isUpdating;

    let itemButtons: ButtonProps[] = [];

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
      });
    }
    if (canChangeRelatedItem) {
      itemButtons.push({
        onClick: () => setSelectDialogState(true),
        icon: 'edit',
        text: willShowItemView ? undefined : 'Specify',
        intent: 'primary',
        /*disabled: classIDs.length < 1,*/
      });
    }
    if (canClear) {
      itemButtons.push({ onClick: onClear, icon: 'cross', intent: 'danger' });
    }

    return itemButtons;
  }, [itemID, itemResult.isUpdating, onCreateNew, onChange, onClear]);

  //log.debug("Rendering generic related item view: got item", item);
  return (
    <ButtonGroup
        fill
        dir="ltr"
        className={className}
        css={css`.bp4-button-text { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }`}>
      {classID
        ? <Button
              alignText="left"
              css={css`width: 180px;`}
              title={`Item class: ${cfg.title ?? "N/A"}`}
              outlined disabled>
            {cfg.title ?? "Class N/A"}
          </Button>
        : null}
      {willShowItemView
        ? <Button
              alignText="left"
              fill={hasItem} outlined
              disabled={!canJump}
              onClick={jump}
              loading={itemResult.isUpdating}
              title={hasItem
                ? `${cfg.title} (click to jump to item)`
                : undefined}>
            {itemView}
          </Button>
        : null}

      {itemButtons.map((props, idx) =>
        <Button key={idx} outlined {...props} />
      )}

      {onChange
        ? <RelatedItemSelectionDialog
            isOpen={selectDialogState}
            onClose={() => setSelectDialogState(false)}
            onChange={onChange}
            availableClassIDs={classIDs}
          />
        : null}
    </ButtonGroup>
  );
};


const RelatedItemSelectionDialog: React.FC<{
  isOpen: boolean
  onClose: () => void
  onChange: (itemRef: InternalItemReference) => void
  availableClassIDs: string[]
}> = function ({
  isOpen, onClose, onChange,
  availableClassIDs,
}) {
  const { subregisters } = useContext(BrowserCtx);

  const classCriteria: Criterion[] = availableClassIDs.map(clsID => ({
    key: 'item-class',
    query: `objPath.indexOf(\"/${clsID}/\") >= 0`,
  }));

  const implicitCriteria: CriteriaGroup | undefined = classCriteria.length > 0
    ? {
        require: 'any',
        criteria: classCriteria,
      }
    : undefined;

  return (
    <Dialog
        isOpen={isOpen}
        onClose={onClose}
        enforceFocus={false}
        style={{ padding: '0', width: 'unset' }}>
      <Search
        style={{ height: '90vh', width: '90vw' }}
        availableClassIDs={availableClassIDs}
        implicitCriteria={implicitCriteria}
        stateName="superseding-item-selector-search"
        onOpenItem={(itemPath) => {
          onChange(itemPathToItemRef(subregisters !== undefined, itemPath));
          onClose();
        }}
      />
    </Dialog>
  );
}


export default GenericRelatedItemView;
