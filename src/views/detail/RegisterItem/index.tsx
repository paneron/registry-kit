/** @jsx jsx */
/** @jsxFrag React.Fragment */

import React, { useContext, useState, useCallback } from 'react';
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
import HelpTooltip from '@riboseinc/paneron-extension-kit/widgets/HelpTooltip';
import { TabbedWorkspaceContext } from '@riboseinc/paneron-extension-kit/widgets/TabbedWorkspace/context';
import useItemRef from '../../hooks/useItemRef';
import useSingleRegisterItemData from '../../hooks/useSingleRegisterItemData';
import useItemClassConfig from '../../hooks/useItemClassConfig';
import { Protocols } from '../../protocolRegistry';
import {
  type ChangeProposal,
  type InternalItemReference,
  type RegisterItem,
  isRegisterItem,
} from '../../../types';
import { BrowserCtx } from '../../BrowserCtx';
import {
  RegisterHelmet as Helmet,
  maybeEllipsizeString,
  TabContentsWithActions,
} from '../../util';
import { itemRefToItemPath, crIDToCRPath, getCRIDFromProposedItemPath } from '../../itemPathUtils';
import { updateCRObjectChangeset, } from '../../change-request/objectChangeset';
import { ChangeRequestContext } from '../../change-request/ChangeRequestContext';
import { RelatedItems } from './RelatedItems';


/**
 * Main register item view.
 *
 * NOTE: while generally intended as tab content handler,
 * is also reused within change request view.
 */
const ItemDetail: React.FC<{ uri: string, inProposalWithID?: string }> = function ({ uri, inProposalWithID }) {
  const { value: ref } = useItemRef(uri);
  const { value: clsConfig } = useItemClassConfig(ref?.classID ?? 'NONEXISTENT_CLASS_ID');
  //const { value: itemData } = useSingleRegisterItemData(ref);
  const { updateObjects, makeRandomID, performOperation, isBusy } = useContext(DatasetContext);
  const { spawnTab } = useContext(TabbedWorkspaceContext);
  const {
    jumpTo,
    subregisters,
    useRegisterItemData,
    activeChangeRequestID: globallyActiveCRID,
  } = useContext(BrowserCtx);

  const { changeRequest: activeCR, canEdit: activeCRIsEditable } = useContext(ChangeRequestContext);

  const itemClass = clsConfig;
  const itemClassID = itemClass?.meta?.id;
  const itemRef = ref ?? dummyRef;
  const { itemID, subregisterID } = itemRef;

  const _itemPath = `${itemClassID ?? 'NONEXISTENT_CLASS'}/${itemID}.yaml`;
  const itemPath = subregisterID ? `/subregisters/${subregisterID}/${_itemPath}` : `/${_itemPath}`;
  const itemRequest = {
    itemPaths: [itemPath],
  };
  const itemResponse = useRegisterItemData(itemRequest);
  const itemData = itemResponse.value[itemPath];

  const [ editedClarification, setEditedClarification ] = useState<RegisterItem<any>["data"] | null>(null);

  //const [ diffMode, setDiffMode ] = useState<boolean>(false);
  // TODO: Implement diff mode
  const diffMode = false;

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
    if (!activeCRIsEditable || !updateObjects || !isRegisterItem(itemData)) {
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
          ? { [itemPath]: { ...itemData, data: editedClarification } }
          : {},
      ),
      // We need this because updateCRObjectChangeset
      // omits oldValue for item data payloads.
      _dangerouslySkipValidation: true,
    });
  }, [
    updateObjects,
    activeCRIsEditable,
    itemPath,
    JSON.stringify(activeCR),
    JSON.stringify(itemData),
    JSON.stringify(editedClarification),
  ]);

  // TODO: Very similar to `handleAdd()` in Browse sidebar menu; refactor?
  const handleProposeLikeThis = useCallback(async function _handleProposeLikeThis(): Promise<void> {
    if (!updateObjects || !makeRandomID || !activeCRIsEditable || !activeCR || !itemClass || !isRegisterItem(itemData)) {
      throw new Error("Unable to create item: likely current proposal is not editable or dataset is read-only");
    }
    const { classID, subregisterID } = itemRef;
    const itemID = await makeRandomID();
    const newRef = { classID, subregisterID, itemID };
    const newItem: RegisterItem<any> = {
      id: itemID,
      dateAccepted: new Date(),
      status: 'valid',
      data: { ...itemData.data },
    };
    if (isRegisterItem(newItem)) {
      const newPath = itemRefToItemPath(newRef);
      await updateObjects({
        commitMessage: `clone ${itemRef.itemID} to propose a new item`,
        objectChangeset: updateCRObjectChangeset(
          activeCR as any,
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
    JSON.stringify(activeCR),
    JSON.stringify(itemData),
  ]);

  if (!itemClass) {
    return <NonIdealState
      icon="heart-broken"
      title="Unable to show item"
      description={`View for ${ref?.itemID ?? uri} cannot be retrieved from item class configuration`}
    />;

  } else if (isRegisterItem(itemData)) {
    let details: JSX.Element;

    if (editedClarification !== null && activeCRIsEditable) {
      const EditView = itemClass.views.editView;
      details = (
        <EditView
          itemData={editedClarification}
          itemRef={itemRef}
          onChange={!isBusy
            ? (newData) => {
                setEditedClarification(newData);
              }
            : undefined}
        />
      );

    } else {
      const DetailView = itemClass.views.detailView ?? itemClass.views.editView;
      details = (
        <DetailView
          itemRef={itemRef}
          itemData={itemData.data}
        />
      );
    }

    //const canAmend = activeCR && itemData.status === 'valid';
    const itemStatus =
      <FormGroup inline label="status:" css={css`margin: 0;`}>
        <ControlGroup fill>
          <InputGroup
            value={proposal?.type === 'amendment'
              ? `${proposal.amendmentType} proposed`
              : proposal?.type === 'addition'
                ? "addition proposed"
                : itemData.status}
            intent={proposal?.type === 'amendment'
              ? 'warning'
              : proposal?.type === 'addition'
                ? 'primary'
                : itemData.status === 'valid'
                  ? 'success'
                  : undefined}
            leftIcon={proposal && (proposal.type === 'amendment' || proposal.type === 'addition')
              ? 'asterisk'
              : itemData.status === 'valid'
                ? 'tick'
                : itemData.status === 'invalid'
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
                  : !proposal && itemData.status === 'valid'
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

    const supersedingItems = (
      // It’s superseded (whether in current proposal or not)
      itemData.status === 'superseded'
      // Item is valid, proposal is editable, and no change to this item is proposed yet
      || (activeCRIsEditable && !proposal && !editedClarification && itemData.status === 'valid')
      // This item is being superseded in active proposal
      // XXX: Redundant condition with the first one?
      || (proposal?.type === 'amendment' && proposal.amendmentType === 'supersession'))
      ? <FormGroup inline label="superseded by: " css={css`margin: 0;`}>
          <RelatedItems
            availableClassIDs={[itemClass.meta.id]}
            itemRefs={proposal?.type === 'amendment' && proposal.amendmentType === 'supersession'
              ? proposal.supersedingItemIDs.
                map(id => ({ itemID: id, classID: itemClass.meta.id, subregisterID }))
              : (itemData.supersededBy ?? [])}
            onChange={!isBusy && activeCRIsEditable && (
              (proposal?.type === 'amendment' && proposal.amendmentType === 'supersession') ||
              (!proposal && itemData.status === 'valid'))
              ? (items) => items.length > 0
                  ? handleSupersedeWith(items.map(ref => ref.itemID))
                  : handleClearProposal()
              : undefined}
          />
        </FormGroup>
      : null;

    const clarificationHasChanges = JSON.stringify(editedClarification) !== JSON.stringify(itemData.data);

    const clarificationAction = (
      (proposal && proposal?.type !== 'amendment')
      || (activeCRIsEditable && !proposal && itemData.status === 'valid'))
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
                          onClick={() => setEditedClarification(itemData.data)}>
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
      : `${itemClass.meta.title ?? 'register item'} #${itemData.id}`;

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
                    <li>Class ID: {itemClassID}</li>
                    <li>Subregister ID: {subregisterID ?? 'N/A'}</li>
                    <li>UUID: {itemID}</li>
                  </UL>
                </>}
              />}
              label={<>
                <strong>{itemClass.meta.title}</strong>
                {subregisterID
                  ? <span title="Subregister"> in {subregisters?.[subregisterID]?.title ?? subregisterID}</span>
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

  } else if (itemResponse.isUpdating) {
    return <div className={Classes.SKELETON}>Loading…</div>;

  } else {
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
};


const ItemTitle: React.FC<{ uri: string }> = function ({ uri }) {
  const { value: ref } = useItemRef(uri);
  const { value: clsConfig } = useItemClassConfig(ref?.classID ?? 'NONEXISTENT_CLASS_ID');
  const { value: itemData } = useSingleRegisterItemData(ref);
  const fallbackView = (() => <>{ref?.itemID ?? uri}</>);
  const View = itemData ? (clsConfig?.views.listItemView ?? fallbackView) : fallbackView;
  return <View
    itemRef={ref ?? dummyRef}
    itemData={itemData}
  />;
}


export default {
  main: ItemDetail,
  title: ItemTitle,
};


const dummyRef: InternalItemReference = {
  itemID: 'NONEXISTENT_ITEM_ID',
  classID: 'NONEXISTENT_CLASS_ID',
  subregisterID: undefined,
};


const FormGroup = styled(BaseFormGroup)`
  margin: 0;
  label.bp4-label {
    white-space: nowrap;
  }
`;
