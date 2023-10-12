/** @jsx jsx */
/** @jsxFrag React.Fragment */

import React, { useContext, useState, useMemo, memo, useCallback } from 'react';
import { jsx, css } from '@emotion/react';
import styled from '@emotion/styled';
import {
  Button, ButtonGroup,
  Card,
  Classes,
  FormGroup as BaseFormGroup,
  ControlGroup,
  InputGroup,
  NonIdealState,
  UL,
  H5,
} from '@blueprintjs/core';
import { DatasetContext } from '@riboseinc/paneron-extension-kit/context';
import { normalizeObject } from '@riboseinc/paneron-extension-kit/util';
import HelpTooltip from '@riboseinc/paneron-extension-kit/widgets/HelpTooltip';
import { TabbedWorkspaceContext } from '@riboseinc/paneron-extension-kit/widgets/TabbedWorkspace/context';
import useSingleRegisterItemData from '../../hooks/useSingleRegisterItemData';
import useItemClassConfig from '../../hooks/useItemClassConfig';
import { Protocols } from '../../protocolRegistry';
import {
  type ChangeProposal,
  type RegisterItem,
  type InternalItemReference,
  type ItemClassConfiguration,
  isRegisterItem,
  DUMMY_REF,
} from '../../../types';
import type { Drafted } from '../../../types/cr';
import { BrowserCtx } from '../../BrowserCtx';
import {
  RegisterHelmet as Helmet,
  maybeEllipsizeString,
  TabContentsWithActions,
} from '../../util';
import { useItemRef, itemRefToItemPath, crIDToCRPath, getCRIDFromProposedItemPath } from '../../itemPathUtils';
import { updateCRObjectChangeset, } from '../../change-request/objectChangeset';
import { ChangeRequestContext } from '../../change-request/ChangeRequestContext';
import { RelatedItems } from './RelatedItems';


/**
 * Main register item view.
 *
 * NOTE: while generally intended as tab content handler,
 * is also reused within change request view.
 */
const MaybeItemDetail: React.VoidFunctionComponent<{ uri: string }> =
memo(function ({ uri }) {
  //const { value: itemData } = useSingleRegisterItemData(ref);
  const { jumpTo, subregisters, useRegisterItemData } = useContext(BrowserCtx);
  const { changeRequest: activeCR } = useContext(ChangeRequestContext);
  const ref = useItemRef(subregisters !== undefined, uri);
  const itemClass = useItemClassConfig(ref?.classID ?? 'NONEXISTENT_CLASS_ID');

  const itemClassID = itemClass?.meta?.id;
  const itemRef = ref ?? DUMMY_REF;
  const { itemID, subregisterID } = itemRef;

  const _itemPath = `${itemClassID ?? 'NONEXISTENT_CLASS'}/${itemID}.yaml`;
  const itemPath = subregisterID
    ? `/subregisters/${subregisterID}/${_itemPath}`
    : `/${_itemPath}`;
  const itemRequest = useMemo(() => ({
    itemPaths: [itemPath],
  }), [itemPath]);
  const itemResponse = useRegisterItemData(itemRequest);
  const itemData = itemResponse.value[itemPath];

  if (!itemClass) {
    return <NonIdealState
      icon="heart-broken"
      title="Unable to show item"
      description={`View for ${ref?.itemID ?? uri} cannot be retrieved from item class configuration`}
    />;

  } else if (isRegisterItem(itemData)) {
    return <ItemDetail
      item={itemData}
      itemRef={itemRef}
      itemClass={itemClass}
    />;

  } else if (itemResponse.isUpdating) {
    return <div className={Classes.SKELETON}>
      Loading
    </div>;

  } else {
    // Opened using URI that points within a proposal.
    // The item may or may not have been accepted.
    const inCRWithID = getCRIDFromProposedItemPath(uri);
    if (inCRWithID !== null && activeCR?.id !== inCRWithID) {
      return <NonIdealState
        icon="help"
        title="This item does not exist…"
        description={
          <>
            …but it might be proposed.
            <br />
            {jumpTo
              ? <Button
                    css={css`margin: 10px;`}
                    intent="primary"
                    onClick={() => jumpTo?.(`${Protocols.CHANGE_REQUEST}:${crIDToCRPath(inCRWithID)}`)}>
                  Go to proposal
                </Button>
              : null}
          </>
        }
      />;
    } else {
      const desc = itemData === null || itemData === undefined
        ? "does not exist or could not be deserialized"
        : "may use unexpected data format";
      return <NonIdealState
        icon="heart-broken"
        title="Unable to show item"
        description={`Item at ${itemPath} ${desc}`}
      />;
    }
  }
});


export const ItemDetail: React.VoidFunctionComponent<{
  item: RegisterItem<any>
  itemRef: InternalItemReference
  itemClass: ItemClassConfiguration<any>
  className?: string
  inProposalWithID?: string
}> = memo(function ({ item, itemRef, itemClass, className, inProposalWithID }) {
  const { subregisters, activeChangeRequestID: globallyActiveCRID } = useContext(BrowserCtx);

  const { changeRequest: activeCR, canEdit: activeCRIsEditable } = useContext(ChangeRequestContext);
  const { updateObjects, makeRandomID, performOperation, isBusy } = useContext(DatasetContext);
  const { spawnTab } = useContext(TabbedWorkspaceContext);

  const [ editedClarification, setEditedClarification ] = useState<RegisterItem<any>["data"] | null>(null);

  //const [ diffMode, setDiffMode ] = useState<boolean>(false);
  // TODO: Implement diff mode
  const diffMode = false;

  const itemPath = itemRefToItemPath(itemRef);

  const proposal = ((activeCR && activeCR.items[itemPath])
    ? activeCR.items[itemPath]
    : null) ?? null;

  const handleClearProposal = () => performProposalOperation('clearing draft proposal', null);
  const handleRetire = () => performProposalOperation('proposing retirement of an item', {
    type: 'amendment',
    amendmentType: 'retirement',
  });
  const handleInvalidate = () => performProposalOperation('proposing invalidation', {
    type: 'amendment',
    amendmentType: 'invalidation',
  });
  const handleSupersedeWith = (items: string[]) => performProposalOperation('proposing supersession', {
    type: 'amendment',
    amendmentType: 'supersession',
    supersedingItemIDs: items,
  });
  const handleClarify = async () => {
    await performProposalOperation('proposing clarification', {
      type: 'clarification',
    });
    setEditedClarification(null);
  };
  const handleEditAddition = async () => {
    await performProposalOperation('editing proposed addition', {
      type: 'addition',
    });
    setEditedClarification(null);
  };

  async function performProposalOperation(summary: string, proposal: ChangeProposal | null) {
    return await performOperation(summary, handleSetProposal)(summary, proposal);
  }

  const handleSetProposal = useCallback(async function _handleSetProposal(
    summary: string,
    proposal: ChangeProposal | null,
  ): Promise<void> {
    if (!activeCRIsEditable || !updateObjects || !isRegisterItem(item)) {
      throw new Error("Proposal isn’t editable")
    }
    if (proposal && proposal?.type !== 'amendment' && !editedClarification) {
      throw new Error("Missing item data");
    }
    await updateObjects({
      commitMessage: `${summary} for ${itemPath}`,
      objectChangeset: updateCRObjectChangeset(
        // TODO: We are sure it’s editable already, but casting should be avoided
        activeCR as any,
        { [itemPath]: proposal },
        ((proposal && proposal?.type !== 'amendment') && editedClarification)
          ? { [itemPath]: { ...item, data: editedClarification } }
          : {},
      ),
      // We need this because updateCRObjectChangeset
      // omits oldValue for item data payloads.
      _dangerouslySkipValidation: true,
    });
  }, [
    editedClarification,
    activeCRIsEditable,
    itemPath,
    item,
    activeCR,
    updateObjects,
  ]);

  // TODO: Very similar to `handleAdd()` in Browse sidebar menu; refactor?
  const handleProposeLikeThis = useCallback(async function _handleProposeLikeThis(): Promise<void> {
    if (!updateObjects || !makeRandomID || !activeCRIsEditable || !activeCR || !itemClass || !isRegisterItem(item)) {
      throw new Error("Unable to create item: likely current proposal is not editable or dataset is read-only");
    }
    const { classID, subregisterID } = itemRef;
    const itemID = await makeRandomID();
    const newRef = { classID, subregisterID, itemID };
    const newItem: RegisterItem<any> = {
      id: itemID,
      dateAccepted: new Date(),
      status: 'valid',
      data: { ...item.data },
    };
    if (isRegisterItem(newItem)) {
      const newPath = itemRefToItemPath(newRef);
      await updateObjects({
        commitMessage: `clone ${itemRef.itemID} to propose a new item`,
        objectChangeset: updateCRObjectChangeset(
          activeCR as Drafted,
          { [newPath]: { type: 'addition' } },
          { [newPath]: newItem },
        ),
        _dangerouslySkipValidation: true,
      });
      if (activeCR.id === globallyActiveCRID) {
        spawnTab(`${Protocols.ITEM_DETAILS}:${itemRefToItemPath(newRef, activeCR.id)}`);
      }
    } else {
      throw new Error("Newly created item did not pass validation (this is likely a bug in RegistryKit");
    }
  }, [
    updateObjects,
    activeCRIsEditable,
    itemPath,
    activeCR?.id,
    activeCR?.state,
    Object.entries(activeCR?.items ?? {}).flat().map(i => JSON.stringify(i)).toString(),
    item ? JSON.stringify(normalizeObject(item)) : item,
  ]);
  let details: JSX.Element;

  if (editedClarification !== null && activeCRIsEditable) {
    const EditView = itemClass.views.editView;
    details = (
      <EditView
        itemData={editedClarification}
        itemRef={itemRef}
        onChange={!isBusy ? setEditedClarification : undefined}
      />
    );

  } else {
    const DetailView = itemClass.views.detailView ?? itemClass.views.editView;
    details = (
      <DetailView
        itemRef={itemRef}
        itemData={item.data}
      />
    );
  }

  console.debug("Rendering RegisterItem view");

  //const canAmend = activeCR && itemData.status === 'valid';
  const itemStatus =
    <FormGroup inline label="status:" css={css`margin: 0;`}>
      <ControlGroup fill>
        <InputGroup
          value={proposal?.type === 'amendment'
            ? `${proposal.amendmentType} proposed`
            : proposal?.type === 'addition'
              ? "addition proposed"
              : item.status}
          intent={proposal?.type === 'amendment'
            ? 'warning'
            : proposal?.type === 'addition'
              ? 'primary'
              : item.status === 'valid'
                ? 'success'
                : undefined}
          leftIcon={proposal && (proposal.type === 'amendment' || proposal.type === 'addition')
            ? 'asterisk'
            : item.status === 'valid'
              ? 'tick'
              : item.status === 'invalid'
                ? 'ban-circle'
                : 'warning-sign'}
          readOnly
        />
        {activeCRIsEditable && !editedClarification
          ? <>
              {proposal?.type === 'addition'
                ? <Button
                      intent="warning"
                      title="Remove the proposal to add this new item."
                      disabled={isBusy}
                      onClick={handleClearProposal}>
                    Remove proposed addition
                  </Button>
                : null}
              {proposal?.type === 'amendment'
                ? <Button
                      intent="warning"
                      title={`Remove amendment (${proposal.amendmentType}) for this item from current proposal.`}
                      disabled={isBusy}
                      onClick={handleClearProposal}>
                    Clear proposed amendment
                  </Button>
                : !proposal && item.status === 'valid'
                  ? <ButtonGroup>
                      <Button
                          intent="primary"
                          disabled={isBusy}
                          onClick={handleRetire}>
                        Retire
                      </Button>
                      <Button
                          intent="primary"
                          disabled={isBusy}
                          onClick={handleInvalidate}>
                        Invalidate
                      </Button>
                    </ButtonGroup>
                  : null}
            </>
          : null}
      </ControlGroup>
    </FormGroup>;

  // It’s superseded (whether in current proposal or not)
  const isSuperseded = item.status === 'superseded';
  // Item is valid, proposal is editable, and no change to this item is proposed yet
  const canBeSuperseded = (activeCRIsEditable && !proposal && !editedClarification && item.status === 'valid');
  // This item is being superseded in active proposal
  // XXX: May be redundant with `isSuperseded`?
  const isBeingSuperseded = (proposal?.type === 'amendment' && proposal.amendmentType === 'supersession');

  const supersedingItems = isSuperseded || canBeSuperseded || isBeingSuperseded
    ? <FormGroup inline label="superseded by: " css={css`margin: 0;`}>
        <RelatedItems
          availableClassIDs={[itemClass.meta.id]}
          itemRefs={proposal?.type === 'amendment' && proposal.amendmentType === 'supersession'
            ? proposal.supersedingItemIDs.
              map(id => ({
                itemID: id,
                // Superseding items are always of the same class
                classID: itemClass.meta.id,
                // Superseding items are always in the same subregister
                subregisterID: itemRef.subregisterID,
              }))
            : (item.supersededBy ?? [])}
          onChange={!isBusy && activeCRIsEditable && (
            (proposal?.type === 'amendment' && proposal.amendmentType === 'supersession') ||
            (!proposal && item.status === 'valid'))
            ? (items) => items.length > 0
                ? handleSupersedeWith(items.map(ref => ref.itemID))
                : handleClearProposal()
            : undefined}
        />
      </FormGroup>
    : null;

  const clarificationHasChanges = JSON.stringify(editedClarification) !== JSON.stringify(item.data);

  const clarificationAction = (
    (proposal && proposal?.type !== 'amendment')
    || (activeCRIsEditable && !proposal && item.status === 'valid'))
    ? <FormGroup inline label={`${proposal?.type ?? "clarification"}: `} css={css`margin: 0;`}>
        {activeCRIsEditable
          ? <ButtonGroup>
              {editedClarification
                ? <>
                    <Button
                        intent={clarificationHasChanges ? "primary" : undefined}
                        // TODO(perf): this is expensive if renders are frequent…
                        disabled={!clarificationHasChanges || isBusy}
                        onClick={(!proposal || proposal?.type === 'clarification')
                          ? handleClarify
                          : handleEditAddition}>
                      Save
                    </Button>
                    <Button onClick={() => setEditedClarification(null)}>Do not save</Button>
                  </>
                : <>
                    <Button
                        disabled={diffMode || isBusy}
                        intent="primary"
                        outlined
                        onClick={() => setEditedClarification(item.data)}>
                      {!proposal ? "Clarify" : "Edit"}
                    </Button>
                    {proposal?.type === 'clarification'
                      ? <>
                          <Button
                              disabled={diffMode || isBusy || proposal?.type !== 'clarification'}
                              intent="warning"
                              onClick={handleClearProposal}>
                            Clear
                          </Button>
                        </>
                      : null}
                  </>}
            </ButtonGroup>
          : <Button disabled>
              {proposal?.type === 'clarification' ? "Clarified" : "Added"} in active proposal
            </Button>}
      </FormGroup>
    : null;

  const proposeLikeThis = activeCRIsEditable && !editedClarification
    ? <Button
          title="Propose a new item in current proposal, using this item as template."
          icon='plus'
          disabled={isBusy}
          outlined
          onClick={performOperation('duplicating item', handleProposeLikeThis)}>
        Propose another like this
      </Button>
    : null;

  // If there’s a CR context without active CR,
  // or active CR isn’t the same as the one in CR context,
  // then we can assume that the item is shown in proposal window
  // and we’d set window title to proposal’s title rather than item’s.
  // If there’s a CR context and active CR and they’re the same
  // then it *could* be that the item is shown in its own tab;
  // we will render proposal’s title if the item appears in the change request
  // (makes sense because the user *is* technically viewing a proposal then).
  const windowTitle: string = (
    activeCR && (
      !globallyActiveCRID
      || activeCR.id !== globallyActiveCRID
      || activeCR.items[itemPath]
    )
  ) ? `Proposal ${maybeEllipsizeString(activeCR.justification, 20)}…`
    : `${itemClass.meta.title ?? 'register item'} #${item.id}`;

  return (
    <TabContentsWithActions
      actions={<>
        <FormGroup
            inline
            labelInfo={<HelpTooltip
              icon='info-sign'
              content={<>
                <H5>{itemClass.meta.title}</H5>
                {itemClass.meta.description ?? "No description is provided for this register item class."}
                <UL>
                  <li>Class ID: {itemClass.meta.id}</li>
                  <li>Subregister ID: {itemRef.subregisterID ?? 'N/A'}</li>
                  <li>UUID: {itemRef.itemID}</li>
                </UL>
              </>}
            />}
            label={<>
              <strong>{itemClass.meta.title}</strong>
              {itemRef.subregisterID
                ? <span title="Subregister"> in {subregisters?.[itemRef.subregisterID]?.title ?? itemRef.subregisterID}</span>
                : null}
            </>}
            css={css`margin: 0; .bp4-form-content { display: flex; flex-flow: row wrap; gap: 10px; }`}>
          {itemStatus}
          {supersedingItems}
          {clarificationAction}
          {proposeLikeThis}
        </FormGroup>
      </>}
      main={
        <Card css={css`position: absolute; inset: ${inProposalWithID ? '0' : '10px'}; overflow-y: auto;`}>
          <Helmet><title>{windowTitle}</title></Helmet>
          {details}
        </Card>
      }
    />
  );
});


const ItemTitle: React.FC<{ uri: string }> = function ({ uri }) {
  const { subregisters } = useContext(BrowserCtx);
  const ref = useItemRef(subregisters !== undefined, uri);
  const clsConfig = useItemClassConfig(ref?.classID ?? 'NONEXISTENT_CLASS_ID');
  const { value: itemData } = useSingleRegisterItemData(ref);
  const fallbackView = useCallback((() => <>{ref?.itemID ?? uri}</>), [uri]);
  const View = itemData
    ? (clsConfig?.views.listItemView ?? fallbackView)
    : fallbackView;
  return <View
    itemRef={ref ?? DUMMY_REF}
    itemData={itemData}
  />;
}


export default {
  main: MaybeItemDetail,
  title: ItemTitle,
};


const FormGroup = styled(BaseFormGroup)`
  margin: 0;
  label.bp4-label {
    white-space: nowrap;
  }
`;
