/** @jsx jsx */
/** @jsxFrag React.Fragment */

import React, { useContext, useState, useMemo, useRef, useLayoutEffect, memo, useCallback } from 'react';
import { jsx, css } from '@emotion/react';
import {
  Button, type ButtonProps,
  Card,
  Classes,
  NonIdealState,
  UL,
  Colors,
} from '@blueprintjs/core';
import { DatasetContext } from '@riboseinc/paneron-extension-kit/context';
import { normalizeObject } from '@riboseinc/paneron-extension-kit/util';
import type { HelpTooltipProps } from '@riboseinc/paneron-extension-kit/widgets/HelpTooltip';
import useSingleRegisterItemData from '../../hooks/useSingleRegisterItemData';
import useItemClassConfig from '../../hooks/useItemClassConfig';
import { Protocols } from '../../protocolRegistry';
import {
  type ChangeProposal,
  type Supersession,
} from '../../../proposals/types';
import {
  type InternalItemReference,
  type ItemClassConfiguration,
  type RegisterItem,
  isRegisterItem,
  DUMMY_REF,
} from '../../../types';
import { InlineDiffGeneric } from '../../diffing/InlineDiff';
import type { Drafted } from '../../../proposals/types';
import { BrowserCtx } from '../../BrowserCtx';
import {
  RegisterHelmet as Helmet,
  maybeEllipsizeString,
  TabContentsWithHeader,
  type TabContentsWithHeaderProps,
  type ActionProps,
} from '../../util';
import { proposalToTagProps } from '../../../proposals/ProposalType';
import ProposalHistoryDrawer from '../../../proposals/HistoryDrawer';
import { useItemRef, itemRefToItemPath, crIDToCRPath, getCRIDFromProposedItemPath } from '../../itemPathUtils';
import { updateCRObjectChangeset, } from '../../../proposals/objectChangeset';
import { ChangeRequestContext } from '../../../proposals/ChangeRequestContext';
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
  const previousItemResponse = useRegisterItemData({
    itemPaths: [itemPath],
    ignoreActiveCR: true,
  });
  const itemDataBefore = previousItemResponse.value[itemPath] ?? undefined;

  if (!itemClass) {
    return <NonIdealState
      icon="heart-broken"
      title="Unable to show item"
      description={`View for ${ref?.itemID ?? uri} cannot be retrieved from item class configuration`}
    />;

  } else if (isRegisterItem(itemData)) {
    return <ItemDetail
      item={itemData}
      itemBefore={itemDataBefore}
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

const EMPTY_OBJECT = {} as const;


export const ItemDetail: React.VoidFunctionComponent<{
  item: RegisterItem
  itemBefore?: RegisterItem
  itemRef: InternalItemReference
  itemClass: ItemClassConfiguration<any>
  className?: string
  compactHeader?: boolean
}> = memo(function ({ item, itemBefore, itemRef, itemClass, className, compactHeader }) {
  const { subregisters, useRegisterItemData, activeChangeRequestID: globallyActiveCRID } = useContext(BrowserCtx);

  const { changeRequest: activeCR, canEdit: activeCRIsEditable } = useContext(ChangeRequestContext);
  const { updateObjects, makeRandomID, performOperation, isBusy } = useContext(DatasetContext);

  const [ editedItemData, setEditedItemData ] = useState<RegisterItem["data"] | null>(null);
  const itemDataHasChanges = JSON.stringify(editedItemData) !== JSON.stringify(item.data);

  const [ isEditingProposal, setIsEditingProposal ] = useState(false);

  //const [ diffMode, setDiffMode ] = useState<boolean>(false);
  // TODO: Implement diff mode
  const diffMode = false;

  const itemPath = itemRefToItemPath(itemRef);

  /** Proposal for the current item. */
  const proposal = ((activeCR && activeCR.items[itemPath])
    ? activeCR.items[itemPath]
    : null) ?? null;

  const [ preferredComparison, setPreferredComparison ] =
    useState<'prior' | 'diff' | null>(null);
  const canCompare = proposal?.type === 'clarification' && itemBefore;
  const showDiff = preferredComparison === 'diff' && canCompare;
  const showBefore = preferredComparison === 'prior' && canCompare;

  // Gather views
  const ListItemView = itemClass.views.listItemView;
  let details: JSX.Element;
  if (editedItemData !== null && activeCRIsEditable) {
    const EditView = itemClass.views.editView;
    details = (
      <EditView
        itemData={editedItemData}
        itemRef={itemRef}
        onChange={!isBusy ? setEditedItemData : undefined}
        // TODO: make importing context from registry-kit work in new-style extension
        useRegisterItemData={useRegisterItemData}
      />
    );
  } else if (showDiff) {
    details = <InlineDiffGeneric
      item1={itemBefore ?? EMPTY_OBJECT}
      item2={item}
      css={css`
        position: absolute; inset: 0; padding: 10px; overflow: auto;
        background-color: white;
        .bp4-dark & {
          background-color: ${Colors.DARK_GRAY2};
        }
      `}
      className={`${Classes.ELEVATION_2} ${Classes.RUNNING_TEXT}`}
    />
  } else {
    const DetailView = itemClass.views.detailView ?? itemClass.views.editView;
    details = (
      <DetailView
        itemRef={itemRef}
        itemData={showBefore ? itemBefore.data : item.data}
        // TODO: make importing context from registry-kit work in new-style extension
        useRegisterItemData={useRegisterItemData}
      />
    );
  }

  const proposedSupersedingItemRefs =
    proposal?.type === 'amendment' && proposal.amendmentType === 'supersession'
      ? proposal.supersedingItemIDs.
        map(id => ({
          itemID: id,
          // Superseding items are always of the same class
          classID: itemClass.meta.id,
          // Superseding items are always in the same subregister
          subregisterID: itemRef.subregisterID,
        }))
      : undefined;

  const supersedingItemRefs = proposedSupersedingItemRefs ?? item.supersededBy ?? [];
  const supersedingItemRefsCacheKey = supersedingItemRefs.map(i => JSON.stringify(i)).toString();

  // It’s superseded (whether in current proposal or not)
  const isSuperseded = /* item.status === 'superseded'; nuh-uh */ supersedingItemRefs.length > 0;
  // Item is valid, proposal is editable, and no change to this item is proposed yet
  const canBeSuperseded = (activeCRIsEditable && !proposal && !editedItemData && item.status === 'valid');
  // This item is being superseded in active proposal
  // XXX: May be redundant with `isSuperseded`?
  const isBeingSuperseded = (proposal?.type === 'amendment' && proposal.amendmentType === 'supersession');

  // Editing is possible for additions and clarifications.
  //const itemDataCanBeEdited = activeCRIsEditable && proposal && proposal.type !== 'amendment';

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
    setEditedItemData(null); // XXX: Redundant?
  };
  const handleEditAddition = async () => {
    await performProposalOperation('editing proposed addition', {
      type: 'addition',
    });
    setEditedItemData(null); // XXX: Redundant?
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
    if (proposal && proposal?.type !== 'amendment' && !editedItemData) {
      throw new Error("Missing item data");
    }
    await updateObjects({
      commitMessage: `${summary} for ${itemPath}`,
      objectChangeset: updateCRObjectChangeset(
        // TODO: We are sure it’s editable already, but casting should be avoided
        activeCR as any,
        { [itemPath]: proposal },
        ((proposal && proposal?.type !== 'amendment') && editedItemData)
          ? { [itemPath]: { ...item, data: editedItemData } }
          : {},
      ),
      // We need this because updateCRObjectChangeset
      // omits oldValue for item data payloads.
      _dangerouslySkipValidation: true,
    });
    setEditedItemData(null);
    setIsEditingProposal(false);
  }, [
    editedItemData,
    activeCRIsEditable,
    itemPath,
    item,
    activeCR,
    updateObjects,
  ]);

  // TODO: Very similar to `handleAdd()` in Browse sidebar menu; refactor?
  const handleProposeLikeThis = useCallback(async function _handleProposeLikeThis(): Promise<void> {
    if (!updateObjects || !makeRandomID || !activeCRIsEditable || !activeCR) {
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
    } else {
      throw new Error("Newly created item did not pass validation (this is likely a bug in RegistryKit)");
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

  const supersedingItemsTooltip: HelpTooltipProps = useMemo(() => ({
    icon: 'info-sign',
    content: 
      <RelatedItems
        css={css`background-color: ${Colors.LIGHT_GRAY3}; padding: 5px;`}
        availableClassIDs={[itemClass.meta.id]}
        itemRefs={supersedingItemRefs}
      />,
  }), [supersedingItemRefsCacheKey, itemClass.meta.id]);

  const classification: TabContentsWithHeaderProps['classification'] = useMemo(() => {
    const classification: TabContentsWithHeaderProps['classification'] = [{
      icon: 'document',
      children: <>
        Register item
        {itemRef.subregisterID
          ? <span title="Subregister"> in {subregisters?.[itemRef.subregisterID]?.title ?? itemRef.subregisterID}</span>
          : null}
      </>,
      tooltip: {
        icon: 'info-sign',
        content: <>
          <UL css={css`margin: 0;`}>
            <li>Class ID: {itemClass.meta.id}</li>
            <li>Subregister ID: {itemRef.subregisterID ?? 'N/A'}</li>
            <li>UUID: {itemRef.itemID}</li>
          </UL>
        </>,
      },
    }, {
      children: itemClass.meta.title,
      tooltip: {
        icon: 'info-sign',
        content: <>
          {itemClass.meta.description ?? "No description is provided for this register item class."}
        </>,
      },
    }];

    classification.push({
      children: item.status,
      intent: item.status === 'valid'
        ? 'success'
        : undefined,
      icon: item.status === 'invalid'
        ? 'ban-circle'
        : item.status === 'retired'
          ? 'warning-sign'
          : 'tick',
      tooltip: isSuperseded
        ? supersedingItemsTooltip
        : undefined,
    });

    if (proposal) {
      const tagProps = proposalToTagProps(proposal);
      classification.push({
        ...tagProps,
        children: <>{tagProps.children} proposed</>,
        icon: 'lightbulb',
        minimal: false,
        tooltip: canBeSuperseded || isBeingSuperseded
          ? supersedingItemsTooltip
          : undefined,
      });
    }

    return classification;
  }, [
    proposal?.type,
    itemClass.meta.id,
    item.status,
    isSuperseded, canBeSuperseded, isBeingSuperseded,
    supersedingItemsTooltip,
  ]);

  const [ historyDrawerOpenState, setHistoryDrawerOpenState ] = useState(false);

  const actions = useMemo(() => {
    const actions: TabContentsWithHeaderProps['actions'] = [{
      children: "View history",
      active: historyDrawerOpenState,
      icon: 'history',
      disabled: isBusy,
      onClick: () => setHistoryDrawerOpenState(true),
    }];

    const isEditingItemData = editedItemData !== null;
    const itemHasProposal = proposal !== null;
    //const canPropose = activeCRIsEditable && item.status === 'valid' && !isBusy;
    const itemIsProposable = item.status === 'valid';

    if (activeCRIsEditable) {
      actions.push({
        children: "Propose another item like this",
        icon: 'duplicate',
        disabled: isBusy,
        onClick: performOperation(
          'adding duplicate item to current propposal',
          handleProposeLikeThis),
        //title="Propose a new item in current proposal, using this item as template."
      });

      const saveEditedItemDataButton: ButtonProps = {
        intent: 'primary',
        disabled: isBusy || !itemDataHasChanges,
        onClick: (!proposal || proposal.type === 'clarification')
          ? handleClarify
          : handleEditAddition,
        children: "Save changes",
      };

      const supersedingItemRefs =
        proposal?.type === 'amendment' && proposal.amendmentType === 'supersession'
          ? proposal.supersedingItemIDs.
            map(id => ({
              itemID: id,
              // Superseding items are always of the same class
              classID: itemClass.meta.id,
              // Superseding items are always in the same subregister
              subregisterID: itemRef.subregisterID,
            }))
          : [];
      const supersedingItems = (
        <RelatedItems
          availableClassIDs={[itemClass.meta.id]}
          itemRefs={supersedingItemRefs}
          onChange={!isBusy
            ? (items) => items.length > 0
                ? handleSupersedeWith(items.map(ref => ref.itemID))
                : handleClearProposal()
            : undefined}
        />
      );

      if (itemIsProposable) {
        if (itemHasProposal) {
          const proposeBtn: ButtonProps = {
            children: `Edit ${proposal.type === 'amendment' ? proposal.amendmentType : proposal.type} proposal for this item`,
            icon: 'edit',
            active: isEditingProposal,
            disabled: isBusy,
            onClick: () => {
              if (isEditingProposal) {
                setIsEditingProposal(false);
                setEditedItemData(null);
                if (proposal && proposal.type !== 'amendment') {
                }
              } else {
                setIsEditingProposal(true);
                if (proposal && proposal.type !== 'amendment') {
                  setEditedItemData(item.data);
                }
              }
            },
          };
          if (isEditingProposal) {
            const editActions: ActionProps[] = [{
              disabled: isBusy || (itemDataHasChanges && proposal.type !== 'amendment'),
              onClick: handleClearProposal,
              icon: 'trash',
              children: "Remove",
              tooltip: [
                `NOTE: Discarding this proposal `,
                `will discard ${proposal.type === 'addition' ? "new" : "changes to"} item’s data `,
                'you provided as part of the proposal.',
              ].join(''),
              intent: proposal.type !== 'amendment' ? 'danger' : 'warning',
            }];
            if (isEditingItemData) {
              editActions.push(saveEditedItemDataButton);
            } else if (proposal.type === 'amendment' && proposal.amendmentType === 'supersession') {
              editActions.push({
                disabled: isBusy,
                children: "Specify superseding items",
                popup: <div css={css`padding: 10px;`}>{supersedingItems}</div>,
              });
            }
            actions.push([proposeBtn, ...editActions]);
          } else {
            actions.push(proposeBtn);
            if (canCompare) {
              actions.push([{
                disabled: isBusy,
                children: "Prior version",
                active: preferredComparison === 'prior',
                onClick: preferredComparison === 'prior'
                  ? () => setPreferredComparison(null)
                  : () => setPreferredComparison('prior'),
              }, {
                disabled: isBusy,
                children: "Diff",
                active: preferredComparison === 'diff',
                onClick: preferredComparison === 'diff'
                  ? () => setPreferredComparison(null)
                  : () => setPreferredComparison('diff'),
              }]);
            }
          }
        } else {
          const proposeBtn: ButtonProps = {
            children: "Propose to change this item",
            icon: 'lightbulb',
            active: isEditingProposal,
            disabled: isBusy,
            onClick: () => setIsEditingProposal(v => !v),
          };
          if (isEditingProposal) {
            const proposalGroup = [proposeBtn, {
              disabled: isBusy || itemHasProposal,
              onClick: handleRetire,
              children: "Retire",
            }, {
              disabled: isBusy || itemHasProposal,
              onClick: handleInvalidate,
              children: "Invalidate",
            }, {
              disabled: isBusy || itemHasProposal || isEditingItemData,
              popup: supersedingItems,
              children: "Supersede",
            }, {
              disabled: isBusy || diffMode,
              active: isEditingItemData,
              onClick: () => setEditedItemData(d => d === null ? item.data : null),
              children: "Clarify",
            }];
            if (isEditingItemData && itemDataHasChanges) {
              proposalGroup.push(saveEditedItemDataButton);
            }
            actions.push(proposalGroup);
          } else {
            actions.push(proposeBtn);
          }
        }
      }
    }
    // TODO: diff view

    return actions;
  }, [
    isBusy,
    itemClass.meta.id,

    proposal === null,
    proposal?.type,
    (proposal as Supersession)?.supersedingItemIDs?.toString(),

    activeCRIsEditable,

    editedItemData === null,
    itemDataHasChanges,

    isEditingProposal,
    performOperation, handleSetProposal,
    historyDrawerOpenState,

    canCompare, preferredComparison, setPreferredComparison,
  ]);

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

  const detailsDivRef = useRef<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    if (itemBefore?.data && detailsDivRef.current && proposal !== null) {
      //console.debug("observing", detailsDivRef.current, observer, itemBefore.data);
      OBSERVER.observe(detailsDivRef.current, {
        attributeFilter: ['value'],
        attributes: true,
        subtree: true,
        childList: true,
      });
    }
    return function cleanUp() {
      //console.debug("disconnecting observer");
      OBSERVER.disconnect();
    };
  }, [detailsDivRef.current, itemBefore?.data, proposal === null]);

  return (
    <TabContentsWithHeader
        smallTitle={compactHeader}
        title={<ListItemView itemRef={itemRef} itemData={item.data} />}
        classification={classification}
        actions={actions}>
      <Card css={css`position: absolute; border-radius: 0; inset: ${compactHeader ? '0' : '10px'}; overflow-y: auto;`}>
        <Helmet><title>{windowTitle}</title></Helmet>
        <ProposalHistoryDrawer
          isOpen={historyDrawerOpenState}
          onClose={() => setHistoryDrawerOpenState(false)}
          itemPath={itemPath}
        />
        <div id="detailsDiv" ref={detailsDivRef} data-observer-root="true">
          {details}
        </div>
      </Card>
    </TabContentsWithHeader>
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
};


export default {
  main: MaybeItemDetail,
  title: ItemTitle,
} as const;


const CHANGED_ITEM_HIGHLIGHT_MS = 1000;
const OBSERVER = new MutationObserver((mutationList: MutationRecord[]) => {
  const changed: [HTMLElement, 'added' | 'removed' | 'changed'][] = [];

  function maybeAddChanged(el: HTMLElement, changeType: 'added' | 'changed') {
    if (!el.parentElement?.getAttribute('data-observer-root')) {
      changed.push([el, changeType]);
    }
  }

  mutationList.forEach((mutation) => {
    switch (mutation.type) {
      case 'childList':
        mutation.addedNodes.forEach((node) => {
          maybeAddChanged(node as HTMLElement, 'added')
        });
        //mutation.removedNodes.forEach((node) => {
        //  //changedNodes.push([node as HTMLElement, 'removed']);
        //  console.log('node removed', node);
        //});
        break;
      case 'attributes':
        maybeAddChanged(mutation.target as HTMLElement, 'changed')
        break;
    }
  });
  const nodesWithBackground: [HTMLElement, string, string, string][] = [];
  for (const [_el, change] of changed) {
    // FIXME: Walk parent elements until one that actually exists?
    const el = change === 'removed' ? _el.parentElement! : _el;
    nodesWithBackground.push([el, el.style.transition, el.style.backgroundColor, el.style.color]);
    el.style.transition = 'none';
    el.style.color = 'white';
    if (change === 'removed') {
      el.style.backgroundColor = Colors.RED2;
    } else {
      el.style.backgroundColor = change === 'added'
        ? Colors.GREEN2
        : Colors.INDIGO2;
    }
  }
  setTimeout(() => {
    for (const [el, , bgc, tc] of nodesWithBackground) {
      el.style.transition = 'background-color linear 1s, color linear 1s';
      el.style.backgroundColor = bgc;
      el.style.color = tc;
    }
    setTimeout(() => {
      for (const [el, tr] of nodesWithBackground) {
        el.style.transition = tr;
      }
    }, CHANGED_ITEM_HIGHLIGHT_MS);
  }, 1);
});
