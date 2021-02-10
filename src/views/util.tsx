/** @jsx jsx */
/** @jsxFrag React.Fragment */

import { css, jsx } from '@emotion/core';

//import log from 'electron-log';
import React, { createContext, useContext } from 'react';
import { GenericRelatedItemViewProps, ItemClassConfiguration, RegisterItem, RelatedItemClassConfiguration } from '../types';
import { Button, ControlGroup, FormGroup, IFormGroupProps } from '@blueprintjs/core';


type BrowserCtx = { jumpToItem: (classID: string, itemID: string, subregisterID?: string) => void }
export const BrowserCtx = createContext<BrowserCtx>({ jumpToItem: () => {} });


export const PropertyDetailView: React.FC<{
  title: IFormGroupProps["label"]
  secondaryTitle?: IFormGroupProps["labelInfo"]
  inline?: IFormGroupProps["inline"]
}> = function ({ title, inline, children, secondaryTitle }) {
  return <FormGroup
      label={`${title}:`}
      labelInfo={secondaryTitle}
      css={css`&, &.bp3-inline { label.bp3-label { font-weight: bold; line-height: unset } }`}
      inline={inline}>
    {children}
  </FormGroup>;
};


export const _getRelatedClass = (classes: Record<string, ItemClassConfiguration<any>>) => {
  return (clsID: string): RelatedItemClassConfiguration => {
    const cfg = classes[clsID];
    return {
      title: cfg.meta.title,
      itemView: cfg.views.listItemView,
    };
  };
};


export const GenericRelatedItemView: React.FC<GenericRelatedItemViewProps> = function ({
  itemRef, className,
  useRegisterItemData, getRelatedItemClassConfiguration,
}) {
  const { classID, itemID, subregisterID } = itemRef;
  const _itemPath = `${classID}/${itemID}`;
  const itemPath = subregisterID ? `subregisters/${subregisterID}/${_itemPath}` : _itemPath;

  //log.debug("Rendering generic related item view", itemRef);

  const browserCtx: BrowserCtx = useContext(BrowserCtx);

  const itemResult = useRegisterItemData({
    [itemPath]: 'utf-8' as const,
  });
  const item = (itemResult.value?.[itemPath] || null) as RegisterItem<any> | null;

  let classConfigured: boolean
  let cfg: RelatedItemClassConfiguration
  try {
    cfg = getRelatedItemClassConfiguration(itemRef.classID);
    classConfigured = true;
  } catch (e) {
    cfg = {
      title: itemRef.classID,
      itemView: () => <span>{itemID}</span>
    }
    classConfigured = false;
  }

  const Item = cfg.itemView;

  //log.debug("Rendering generic related item view: got item", item);

  return (
    <ControlGroup className={className}>
      <Button
          alignText="left"
          fill outlined disabled
          loading={itemResult.isUpdating} title={cfg.title}
          css={css`.bp3-button-text { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }`}>
        {item !== null && !itemResult.isUpdating
          ? <Item
              itemID={itemID}
              useRegisterItemData={useRegisterItemData}
              itemData={item.data}
              getRelatedItemClassConfiguration={getRelatedItemClassConfiguration}
            />
          : <span>Item not found: {itemRef.itemID}</span>}
      </Button>
      <Button
        outlined
        icon={item === null ? 'error' : 'locate'}
        disabled={item === null || !browserCtx.jumpToItem || !classConfigured || itemResult.isUpdating}
        onClick={() => browserCtx.jumpToItem(classID, itemID, subregisterID)} />
    </ControlGroup>
  );
};
