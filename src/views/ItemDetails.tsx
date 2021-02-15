import React from 'react';
import { css } from '@emotion/core';
import {
  Button, /*Callout,*/ Classes, Colors, ControlGroup,
  InputGroup, NonIdealState, Tooltip
} from '@blueprintjs/core';
import {
  ItemClassConfiguration, RegisterItem, RegisterItemDataHook,
  RegistryItemViewProps,
  RelatedItemClassConfiguration
} from '../types';


export const ItemDetails: React.FC<{
  itemID?: string;
  itemClass: ItemClassConfiguration<any>;
  subregisterID?: string;
  useRegisterItemData: RegisterItemDataHook;
  getRelatedClass: (clsID: string) => RelatedItemClassConfiguration;
}> = function ({ itemID, itemClass, subregisterID, getRelatedClass, useRegisterItemData }) {
  let details: JSX.Element;

  //const itemPath = `${itemClass.meta.id}/${itemID}`;
  const _itemPath = `${itemClass.meta.id}/${itemID}`;
  const itemPath = subregisterID ? `subregisters/${subregisterID}/${_itemPath}` : _itemPath;

  const itemResponse = useRegisterItemData({
    [itemPath]: 'utf-8' as const,
  });
  const item = (itemResponse.value?.[itemPath] || null) as (null | RegisterItem<any>);

  const ItemTitle = itemClass.views.listItemView;

  if (itemID === undefined) {
    return <NonIdealState title="No item is selected" />;

  } else if (itemResponse.isUpdating) {
    details = <div className={Classes.SKELETON}>Loading…</div>;

  } else if (item) {
    const DetailView = itemClass.views.detailView ?? itemClass.views.editView;

    details = (
      <DetailView
        getRelatedItemClassConfiguration={getRelatedClass}
        useRegisterItemData={useRegisterItemData}
        itemData={item.data} />
    );

  } else {
    details = <NonIdealState title="Item data not available" />;
  }

  function StyledTitle(props: RegistryItemViewProps<any>) {
    const Component = itemResponse.isUpdating || !itemID
      ? (props: { className?: string; }) => <span className={props.className}>
        <span className={Classes.SKELETON}>Loading…</span>
            &emsp;
          </span>
      : ItemTitle;

    return <Component
      css={css`
        margin-top: 1em; font-weight: bold; font-size: 110%;
        line-height: 1;
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
      `}
      itemID={itemID!}
      {...props} />;
  }

  return (
    <div css={css`flex: 1; display: flex; flex-flow: column nowrap; padding: 1rem; overflow: hidden;`}>
      {itemID
        ? <div css={css`flex-shrink: 0; margin-bottom: 1rem; display: flex; flex-flow: column nowrap;`}>
          <ControlGroup>
            <Tooltip content="Internal unique item ID">
              <InputGroup disabled value={item?.id || itemID || ''} fill />
            </Tooltip>
            <Button
              disabled
              intent={item?.status === 'valid' ? 'success' : undefined}
              title="Item status"
              icon={item?.status === 'valid' ? 'tick-circle' : 'blank'}>
              {item?.status || 'unknown status'}
            </Button>
            <InputGroup
              disabled
              leftIcon="calendar"
              value={`acceped ${item?.dateAccepted?.toLocaleDateString?.() || '—'}`} />
          </ControlGroup>
          <StyledTitle
            itemData={item?.data || {}}
            useRegisterItemData={useRegisterItemData}
            getRelatedItemClassConfiguration={getRelatedClass} />
        </div>
        : null}

      <div
        css={css`
            flex: 1; overflow-y: auto; padding: 1rem;
            border-radius: .5rem; background: ${Colors.WHITE};
            position: relative;
          `}
        className={Classes.ELEVATION_3}>
        {details}
      </div>
    </div>
  );
};


export default ItemDetails;
