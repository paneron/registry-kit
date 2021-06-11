/** @jsx jsx */
/** @jsxFrag React.Fragment */

import React, { useContext, useEffect, useMemo, useState } from 'react';
import { jsx, css } from '@emotion/react';
import styled from '@emotion/styled';

import {
  Button, ButtonGroup, /*Callout,*/ Classes, ControlGroup,
  Dialog,
  InputGroup, Menu, MenuItem, NonIdealState, OverflowList
} from '@blueprintjs/core';
import { Popover2 } from '@blueprintjs/popover2';

import Workspace from '@riboseinc/paneron-extension-kit/widgets/Workspace';
import makeSidebar from '@riboseinc/paneron-extension-kit/widgets/Sidebar';
import PropertyView from '@riboseinc/paneron-extension-kit/widgets/Sidebar/PropertyView';
import { DatasetContext } from '@riboseinc/paneron-extension-kit/context';

import {
  Addition,
  ChangeProposal,
  InternalItemReference,
  ItemAction,
  RegisterItem,
} from '../types';

import { BrowserCtx } from './BrowserCtx';
import ItemClass from './sidebar-blocks/ItemClass';
import SelfApprovedCR, { SelfApprovedCRData } from './change-request/SelfApprovedCR';
import { itemRefToItemPath } from './itemPathUtils';
import { makeAdditionProposal } from './change-request/objectChangeset';


export const NewItem: React.FC<{
  itemRef: InternalItemReference
  onClose?: () => void
  initialPayload: any
  onAdd:
    (cr: SelfApprovedCRData, originalItemData: Record<string, RegisterItem<any>>, opts?: { addForLater?: string | true }) =>
      Promise<void>
  className?: string
  style?: React.CSSProperties
}> = function ({ itemRef, initialPayload, onClose, onAdd, className, style }) {
  let details: JSX.Element;

  const { itemID, classID, subregisterID } = itemRef;
  const [_itemData, setItemData] = useState<RegisterItem<any>["data"] | null>(null);
  const [selfApprovedProposal, setSelfApprovedProposal] = useState<ChangeProposal | null>(null);
  const [newRelatedItemRef, setNewRelatedItemRef] = useState<InternalItemReference | null>(null);

  const itemData = _itemData ?? initialPayload;

  const { usePersistentDatasetStateReducer, makeRandomID } = useContext(DatasetContext);
  const { useRegisterItemData, itemClasses, getRelatedItemClassConfiguration, stakeholder } = useContext(BrowserCtx);

  useEffect(() => {
    setSelfApprovedProposal(null);
    setNewRelatedItemRef(null);
  }, [JSON.stringify(itemRef)]);

  const Sidebar = useMemo(() => makeSidebar(usePersistentDatasetStateReducer!), []);

  const itemClass = itemClasses[classID];

  const itemRequest: { itemPaths: string[] } = {
    itemPaths: [],
  };
  const supersedingItemPaths: string[] = [];
  if (selfApprovedProposal?.type === 'amendment' && selfApprovedProposal.amendmentType === 'supersession') {
    supersedingItemPaths.concat(selfApprovedProposal.supersedingItemIDs.map(itemID => itemRefToItemPath({
      subregisterID: itemRef.subregisterID,
      classID: itemRef.classID,
      itemID,
    })));
    itemRequest.itemPaths.concat(supersedingItemPaths);
  }
  const itemResponse = useRegisterItemData(itemRequest);
  const supersedingItemData: Record<string, RegisterItem<any>> = {};

  for (const supersedingItemPath of supersedingItemPaths) {
    const _d = itemResponse.value[supersedingItemPath];
    if (_d) {
      supersedingItemData[supersedingItemPath] = _d;
    }
  }

  const isValid = itemData !== null;

  let actions: ItemAction[] = [];
  actions.push({
    getButtonProps: () => ({
      disabled: !isValid,
      onClick: handleAdd,
      intent: isValid ? 'primary' : undefined,
      text: "Add",
    })
  });
  actions.push({
    getButtonProps: () => ({
      onClick: () => setItemData(null),
      text: "Clear item data",
      disabled: _itemData === null,
      htmlTitle: "Reset item data to defaults.",
    }),
  });

  function handleAddProposal(proposal: Addition) {
    setSelfApprovedProposal(proposal);
  }

  async function handleAdd() {
    if (!isValid || !itemData) {
      throw new Error("Can’t handle change: missing functions");
    }
    handleAddProposal({
      type: 'addition',
      payload: itemData,
    });
  }

  if (!itemClass) {
    return <NonIdealState
      icon="heart-broken"
      title="Item class not found"
      description="This may be an issue with registry extension configuration" />;

  } else if (itemResponse.isUpdating) {
    details = <div className={Classes.SKELETON}>Loading…</div>;

  } else if (itemData) {
    const EditView = itemClass.views.editView;
    details = (
      <EditView
        getRelatedItemClassConfiguration={getRelatedItemClassConfiguration}
        onCreateRelatedItem={async (classID, subregisterID) => {
          if (!makeRandomID) {
            throw new Error("Unable to create related item: random ID maker function is not available");
          }
          const [itemRef, proposal] = await makeAdditionProposal(
            makeRandomID,
            itemClasses[classID],
            undefined,
            subregisterID,
          );
          setSelfApprovedProposal(proposal);
          setNewRelatedItemRef(itemRef);
          return itemRef;
        }}
        subregisterID={subregisterID}
        useRegisterItemData={useRegisterItemData}
        itemData={itemData}
        onChange={(newData) => {
          setItemData(newData);
        }}
      />
    );

  } else {
    details = <div className={Classes.SKELETON}>Loading…</div>;
  }

  const itemActionMenu = itemData && ((actions ?? []).length > 0)
    ? <ButtonGroup css={css`margin-left: 10px;`}>
        <OverflowList
          items={actions}
          className="bp3-button-group"
          visibleItemRenderer={(action, idx) =>
            <Button key={idx} {...action.getButtonProps(itemData, itemClass)} />
          }
          overflowRenderer={(actions) => {
            if (actions.length > 0) {
              return (
                <Popover2
                    content={
                      <Menu css={css`margin-bottom: 0;`}>
                        {actions.map((action, idx) =>
                          <MenuItem
                            key={idx}
                            {...action.getButtonProps(itemData, itemClass)} />
                        )}
                      </Menu>}>
                  <Button icon="more" />
                </Popover2>
              );
            } else {
              return null;
            }
          }}
        />
      </ButtonGroup>
    : undefined;

  let changePopoverContents: JSX.Element | null;
  if (selfApprovedProposal !== null && stakeholder) {
    // Proposal can either refer to the item in question, or a related item.
    // If new related item ref is given, assume a related item is being added, otherwise this item.
    const itemPath = itemRefToItemPath(itemRef);
    changePopoverContents = <SelfApprovedCR
      sponsor={stakeholder}
      proposals={{
        [newRelatedItemRef ? itemRefToItemPath(newRelatedItemRef!) : itemPath]:
          selfApprovedProposal,
      }}
      onConfirm={async (cr, opts) => {
        await onAdd(cr, { [itemPath]: itemData, ...supersedingItemData }, opts);
        setSelfApprovedProposal(null);
        if (selfApprovedProposal.type !== 'addition') {
          setNewRelatedItemRef(null);
        }
      }}
      onCancel={() => {
        setSelfApprovedProposal(null);
        setNewRelatedItemRef(null);
      }}
      css={css`width: 80vw; height: 80vh;`}
    />;
  } else {
    changePopoverContents = null;
  }

  const toolbar = (
    <ControlGroup>
      <Button
        disabled={!onClose}
        icon="cross"
        title="Close and cancel. If you have entered new item data below, it will be lost."
        onClick={onClose} />
      {itemActionMenu}
      <Dialog
          isOpen={changePopoverContents !== null}
          style={{ width: 'unset', padding: 0 }}
          canEscapeKeyClose
          canOutsideClickClose
          hasBackdrop>
        {changePopoverContents
          ? <div css={css`padding: 20px;`}>{changePopoverContents}</div>
          : undefined}
      </Dialog>
    </ControlGroup>
  );

  const sidebar = <Sidebar 
    stateKey='opened-register-item'
    css={css`width: 280px; z-index: 1;`}
    title="Item metadata"
    blocks={[{
      key: 'registration',
      title: "Registration",
      content: <>
        <PropertyView label="Provisional item ID" title="This ID will be permanent and cannot be changed.">
          {itemID} (not yet registered)
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
          <InputGroup disabled value="Not yet approved" />
        </PropertyView>
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
      <ItemDetailsWrapperDiv css={css`flex: 1;`} className={Classes.ELEVATION_1}>
        {details}
      </ItemDetailsWrapperDiv>
    </Workspace>
  );
};


export const ItemDetailsWrapperDiv = styled.div`
  overflow-y: auto;
  position: relative;
`;


export default NewItem;
