/** @jsx jsx */
/** @jsxFrag React.Fragment */

import React from 'react';
import { jsx, css } from '@emotion/core';
import styled from '@emotion/styled';

import {
  Button, /*Callout,*/ Classes, Colors, ControlGroup,
  FormGroup,
  InputGroup, NonIdealState, Tooltip
} from '@blueprintjs/core';

import {
  ItemAction,
  ItemClassConfiguration, RegisterItemDataHook,
  RegistryItemViewProps,
  RelatedItemClassConfiguration
} from '../types';


export const ItemDetails: React.FC<{
  itemID?: string;
  itemClass: ItemClassConfiguration<any>;
  subregisterID?: string;
  useRegisterItemData: RegisterItemDataHook;
  getRelatedClass: (clsID: string) => RelatedItemClassConfiguration;
  itemActions?: ItemAction[];
}> = function ({ itemID, itemClass, subregisterID, getRelatedClass, useRegisterItemData, itemActions }) {
  let details: JSX.Element;

  //const itemPath = `${itemClass.meta.id}/${itemID}`;
  const _itemPath = `/${itemClass?.meta?.id ?? 'NONEXISTENT_CLASS'}/${itemID}.yaml`;
  const itemPath = subregisterID ? `/subregisters/${subregisterID}/${_itemPath}` : _itemPath;

  const itemResponse = useRegisterItemData({ itemPaths: [itemPath] });
  const item = itemResponse.value[itemPath];

  const ItemTitle = itemClass?.views?.listItemView;

  if (itemID === undefined) {
    return <NonIdealState title="No item is selected" />;

  } else if (!itemClass) {
    return <NonIdealState
      icon="heart-broken"
      title="Item class not found"
      description="This may be an issue with registry extension configuration" />

  } else if (itemResponse.isUpdating) {
    details = <div className={Classes.SKELETON}>Loading…</div>;

  } else if (item) {
    const DetailView = itemClass.views.detailView ?? itemClass.views.editView;

    details = (
      <DetailView
        getRelatedItemClassConfiguration={getRelatedClass}
        subregisterID={subregisterID}
        useRegisterItemData={useRegisterItemData}
        itemData={item.data} />
    );

  } else {
    details = <NonIdealState title="Item data not available" />;
  }

  function StyledTitle(props: RegistryItemViewProps<any>) {
    const Component = itemResponse.isUpdating || !itemID
      ? (props: { className?: string; }) => (
          <span className={props.className}>
            <span className={Classes.SKELETON}>Loading…</span>
            &emsp;
          </span>
        )
      : ItemTitle;

    return (
      <Component
        css={css`
          margin-top: 1em; font-weight: bold; font-size: 110%;
          line-height: 1;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        `}
        itemID={itemID!}
        {...props} />
    );
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
              {item?.status ?? 'unknown status'}
            </Button>
            <InputGroup
              disabled
              leftIcon="calendar"
              value={`accepted ${item?.dateAccepted?.toLocaleDateString?.() ?? '—'}`} />
          </ControlGroup>
          <StyledTitle
            itemData={item?.data ?? {}}
            useRegisterItemData={useRegisterItemData}
            getRelatedItemClassConfiguration={getRelatedClass} />
        </div>
        : null}

      <ItemDetailsWrapperDiv className={Classes.ELEVATION_3}>
        {details}
      </ItemDetailsWrapperDiv>

      {item && ((itemActions ?? []).length > 0)
        ? <div css={css`flex-shrink: 0; margin-top: 1rem; display: flex; flex-flow: row nowrap; align-items: center;`}>
            <FormGroup css={css`margin-bottom: 0;`}>
              {itemActions!.map((action, idx) =>
                <Button
                    css={css`${idx !== itemActions!.length - 1 ? 'margin-right: .5rem;' : ''}`}
                    {...action.getButtonProps(item, itemClass)} />
              )}
            </FormGroup>
          </div>
        : null}
    </div>
  );
};


export const ItemDetailsWrapperDiv = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
  border-radius: .5rem;
  background: ${Colors.WHITE};
  position: relative;
`;


export default ItemDetails;
