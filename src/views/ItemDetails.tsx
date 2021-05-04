/** @jsx jsx */
/** @jsxFrag React.Fragment */

import React, { useContext, useMemo } from 'react';
import { jsx, css } from '@emotion/core';
import styled from '@emotion/styled';

import {
  Button, /*Callout,*/ Classes, ControlGroup,
  InputGroup, Menu, MenuItem, NonIdealState
} from '@blueprintjs/core';

import Workspace from '@riboseinc/paneron-extension-kit/widgets/Workspace';
import makeSidebar from '@riboseinc/paneron-extension-kit/widgets/Sidebar';
import PropertyView from '@riboseinc/paneron-extension-kit/widgets/Sidebar/PropertyView';
import { DatasetContext } from '@riboseinc/paneron-extension-kit/context';

import {
  InternalItemReference,
  ItemAction,
} from '../types';

import { BrowserCtx } from './BrowserCtx';
import ItemSummary from './sidebar-blocks/ItemSummary';
import { Popover2 } from '@blueprintjs/popover2';
import ItemClass from './sidebar-blocks/ItemClass';


export const ItemDetails: React.FC<{
  itemRef: InternalItemReference
  itemActions?: ItemAction[]
  onClose?: () => void
  className?: string
  style?: React.CSSProperties
}> = function ({ itemRef, onClose, itemActions, className, style }) {
  let details: JSX.Element;

  const { itemID, classID, subregisterID } = itemRef;

  const { usePersistentDatasetStateReducer } = useContext(DatasetContext);
  const { useRegisterItemData, itemClasses, getRelatedItemClassConfiguration } = useContext(BrowserCtx);

  const Sidebar = useMemo(() => makeSidebar(usePersistentDatasetStateReducer!), []);

  const itemClass = itemClasses[classID];

  //const itemPath = `${itemClass.meta.id}/${itemID}`;
  const _itemPath = `/${itemClass?.meta?.id ?? 'NONEXISTENT_CLASS'}/${itemID}.yaml`;
  const itemPath = subregisterID ? `/subregisters/${subregisterID}/${_itemPath}` : _itemPath;
  const itemResponse = useRegisterItemData({ itemPaths: [itemPath] });
  const itemData = itemResponse.value[itemPath];

  if (!itemClass) {
    return <NonIdealState
      icon="heart-broken"
      title="Item class not found"
      description="This may be an issue with registry extension configuration" />;

  } else if (itemResponse.isUpdating) {
    details = <div className={Classes.SKELETON}>Loading…</div>;

  } else if (itemData) {
    const DetailView = itemClass.views.detailView ?? itemClass.views.editView;

    details = (
      <DetailView
        getRelatedItemClassConfiguration={getRelatedItemClassConfiguration}
        subregisterID={subregisterID}
        useRegisterItemData={useRegisterItemData}
        itemData={itemData.data} />
    );

  } else {
    details = <div className={Classes.SKELETON}>Loading…</div>;
  }

  // function StyledTitle(props: RegistryItemViewProps<any>) {
  //   const Component = itemResponse.isUpdating || !itemID
  //     ? (props: { className?: string; }) => (
  //         <span className={props.className}>
  //           <span className={Classes.SKELETON}>Loading…</span>
  //           &emsp;
  //         </span>
  //       )
  //     : ItemTitle;

  //   return (
  //     <Component
  //       css={css`font-weight: bold; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;`}
  //       itemID={itemID!}
  //       {...props} />
  //   );
  // }

  const itemActionMenu = itemData && ((itemActions ?? []).length > 0)
    ? (
        <Menu css={css`margin-bottom: 0;`}>
          {itemActions!.map((action, idx) =>
            <MenuItem
              key={idx}
              {...action.getButtonProps(itemData, itemClass)} />
          )}
        </Menu>
      )
    : undefined;

  const toolbar = (
    <>
      <ControlGroup>
        {onClose
          ? <Button icon="arrow-left" title="Return to item grid" onClick={onClose} />
          : null}
        {itemActionMenu
          ? <Popover2 content={itemActionMenu}><Button icon="more" /></Popover2>
          : null}
      </ControlGroup>
    </>
  );

  const sidebar = <Sidebar 
    stateKey='opened-register-item'
    css={css`width: 280px; z-index: 1;`}
    title="Item metadata"
    blocks={[{
      key: 'summary',
      title: "Summary",
      content: <ItemSummary itemRef={itemRef} />,
    }, {
      key: 'registration',
      title: "Registration",
      content: <>
        <PropertyView label="Internal item ID" title="This ID is permanent and cannot be changed.">
          {itemData?.id ?? `[${itemID}]`}
        </PropertyView>
      </>,
    }, {
      key: 'classification',
      title: "Classification",
      content: <ItemClass classID={itemRef.classID} />,
    }, {
      key: 'normative-status',
      title: "Normative status",
      content: <>
        <PropertyView label="Current">
          <InputGroup
            disabled
            intent={itemData?.status === 'valid' ? 'success' : undefined} value={itemData?.status}
          />
        </PropertyView>
        <PropertyView label="Accepted">
          <InputGroup
            disabled
            value={itemData?.dateAccepted?.toLocaleDateString?.() ?? 'N/A'} />
        </PropertyView>
      </>,
    }, {
      key: 'history',
      title: "Change history",
      content: <>
        (Coming soon.)
      </>,
    }]}
  />;

  return (
    <Workspace
        css={css`
          flex: 1 1 auto;
        `}
        style={style}
        className={className}
        sidebar={sidebar}
        toolbar={toolbar}>
      <ItemDetailsWrapperDiv css={css`flex: 1;`}>
        {details}
      </ItemDetailsWrapperDiv>
    </Workspace>
  );
};


export const ItemDetailsWrapperDiv = styled.div`
  overflow-y: auto;
  position: relative;
`;


export default ItemDetails;
