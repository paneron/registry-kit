/** @jsx jsx */
/** @jsxFrag React.Fragment */

import React, { useContext, useMemo, useState } from 'react';
import { jsx, css } from '@emotion/core';
import styled from '@emotion/styled';

import {
  Button, ButtonGroup, /*Callout,*/ Classes, ControlGroup,
  InputGroup, Menu, MenuItem, NonIdealState, OverflowList
} from '@blueprintjs/core';

import Workspace from '@riboseinc/paneron-extension-kit/widgets/Workspace';
import makeSidebar from '@riboseinc/paneron-extension-kit/widgets/Sidebar';
import PropertyView from '@riboseinc/paneron-extension-kit/widgets/Sidebar/PropertyView';
import { DatasetContext } from '@riboseinc/paneron-extension-kit/context';

import {
  Clarification,
  InternalItemReference,
  ItemAction,
  RegisterItem,
  Retirement,
  Supersession,
} from '../types';

import { BrowserCtx } from './BrowserCtx';
import ItemSummary from './sidebar-blocks/ItemSummary';
import { Popover2 } from '@blueprintjs/popover2';
import ItemClass from './sidebar-blocks/ItemClass';
import GenericRelatedItemView from './GenericRelatedItemView';
import { itemRefToItemPath } from './itemPathUtils';
import SelfApprovedCR from './change-request/SelfApprovedCR';


export const ItemDetails: React.FC<{
  itemRef: InternalItemReference
  itemActions?: ItemAction[]
  onClose?: () => void
  onChange?: (opts: { justification: string, controlBodyNotes?: string }) => Promise<void>
  className?: string
  style?: React.CSSProperties
}> = function ({ itemRef, onClose, onChange, itemActions, className, style }) {
  let details: JSX.Element;

  const { itemID, classID, subregisterID } = itemRef;
  const [editedItemData, setEditedItemData] = useState<RegisterItem<any>["data"] | null>(null);
  const [selfApprovedProposal, setSelfApprovedProposal] = useState<Clarification | Supersession | Retirement | null>(null);
  const [amendmentPromptState, setAmendmentPromptState] = useState(false);

  const { usePersistentDatasetStateReducer } = useContext(DatasetContext);
  const { useRegisterItemData, itemClasses, getRelatedItemClassConfiguration } = useContext(BrowserCtx);

  const Sidebar = useMemo(() => makeSidebar(usePersistentDatasetStateReducer!), []);

  const itemClass = itemClasses[classID];

  //const itemPath = `${itemClass.meta.id}/${itemID}`;
  const _itemPath = `/${itemClass?.meta?.id ?? 'NONEXISTENT_CLASS'}/${itemID}.yaml`;
  const itemPath = subregisterID ? `/subregisters/${subregisterID}/${_itemPath}` : _itemPath;
  const itemResponse = useRegisterItemData({ itemPaths: [itemPath] });
  const itemData = itemResponse.value[itemPath];

  const isEdited = onChange && itemData && editedItemData && JSON.stringify(editedItemData) !== JSON.stringify(itemData.data);

  let actions: ItemAction[] = [];
  if ((itemActions ?? []).length > 0) {
    actions = itemActions!;
  } else if (onChange && itemData) {
    if (editedItemData === null) {
      actions.push({
        getButtonProps: () => ({
          disabled: !onChange || !itemData || editedItemData !== null,
          onClick: () => setEditedItemData(JSON.parse(JSON.stringify(itemData!.data))),
          text: "Clarify",
        }),
      });
      actions.push({
        getButtonProps: () => ({
          disabled: !onChange || !itemData || editedItemData !== null || amendmentPromptState,
          onClick: () => setAmendmentPromptState(true),
          text: "Amend",
        }),
      });
    } else {
      actions.push({
        getButtonProps: () => ({
          disabled: !isEdited,
          onClick: handleChange,
          intent: isEdited ? 'primary' : undefined,
          text: "Save",
        })
      });
      actions.push({
        getButtonProps: () => ({
          onClick: () => setEditedItemData(null),
          text: "Do not save",
        }),
      });
    }
  }

  async function handleChange() {
    if (!isEdited || !itemData || !onChange || !editedItemData) {
      throw new Error("Can’t handle change: missing functions");
    }
    console.debug("Clarifying item", itemData.data, editedItemData);
    await onChange!(itemData, { ...itemData, data: editedItemData }, "Clarify item");
    setEditedItemData(null);
  }

  if (!itemClass) {
    return <NonIdealState
      icon="heart-broken"
      title="Item class not found"
      description="This may be an issue with registry extension configuration" />;

  } else if (itemResponse.isUpdating) {
    details = <div className={Classes.SKELETON}>Loading…</div>;

  } else if (itemData) {
    if (editedItemData !== null) {
      const EditView = itemClass.views.editView;
      details = (
        <EditView
          getRelatedItemClassConfiguration={getRelatedItemClassConfiguration}
          subregisterID={subregisterID}
          useRegisterItemData={useRegisterItemData}
          itemData={editedItemData}
          onChange={(newData) => {
            setEditedItemData(newData);
          }}
        />
      );

    } else {
      const DetailView = itemClass.views.detailView ?? itemClass.views.editView;
      details = (
        <DetailView
          getRelatedItemClassConfiguration={getRelatedItemClassConfiguration}
          subregisterID={subregisterID}
          useRegisterItemData={useRegisterItemData}
          itemData={itemData.data}
        />
      );
    }

  } else {
    details = <div className={Classes.SKELETON}>Loading…</div>;
  }

  const itemActionMenu = itemData && ((actions ?? []).length > 0)
    ? (
      <ButtonGroup css={css`margin-left: 10px;`}>
        <OverflowList
          items={actions}
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
      )
    : undefined;

  let changePopoverContents: JSX.Element | null;
  if (amendmentPromptState === true && onChange) {
    changePopoverContents = <>
      <Button
          onClick={() => {
            const proposal: Retirement = {
              type: 'amendment',
              amendmentType: 'retirement',
            };
            setSelfApprovedProposal(proposal);
          }}>
        Retire
      </Button>
      &nbsp;
      or select a superseding item:
      &nbsp;
      <GenericRelatedItemView
        onChange={(ref) => {
          const proposal: Supersession = {
            type: 'amendment',
            amendmentType: 'supersession',
            supersedingItemID: itemRefToItemPath(ref),
          };
          setSelfApprovedProposal(proposal);
        }}
        useRegisterItemData={useRegisterItemData}
        getRelatedItemClassConfiguration={getRelatedItemClassConfiguration}
      />
    </>;
  } else if (selfApprovedProposal !== null && onChange) {
    changePopoverContents = <SelfApprovedCR
      onConfirm={onChange}
      onCancel={() => setSelfApprovedProposal(null)}
      sponsor={sponsor}
      proposals={{
        [itemPath]: selfApprovedProposal,
      }}
    />;
  } else {
    changePopoverContents = null;
  }

  const toolbar = (
    <>
      <Popover2
          isOpen={changePopoverContents !== null}
          hasBackdrop
          content={changePopoverContents ?? undefined}>
        <ControlGroup>
          <Button
            disabled={!onClose || editedItemData !== null}
            icon="arrow-left"
            title="Close item"
            onClick={onClose} />
          {itemActionMenu}
        </ControlGroup>
      </Popover2>
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
