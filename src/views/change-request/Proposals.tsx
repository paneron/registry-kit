/** @jsx jsx */
/** @jsxFrag React.Fragment */

import React, { useEffect, useContext, useState, useCallback, memo, useMemo } from 'react';
import { ClassNames, jsx, css } from '@emotion/react';
import {
  ButtonGroup,
  Button,
  Classes,
  MenuItem,
  NonIdealState,
  IconName,
} from '@blueprintjs/core';
import { ItemRenderer, Select2 as Select } from '@blueprintjs/select';
import HelpTooltip from '@riboseinc/paneron-extension-kit/widgets/HelpTooltip';
import type {
  Addition,
  ChangeProposal,
  Clarification,
  InternalItemReference,
  Retirement,
  Supersession,
  Invalidation,
  Payload,
  RegisterItem,
} from '../../types';
import ErrorBoundary from '@riboseinc/paneron-extension-kit/widgets/ErrorBoundary';
import type { Drafted } from '../../types/cr';
import { Protocols, type Protocol } from '../protocolRegistry';
import { PROPOSAL_TYPES, AMENDMENT_TYPES } from '../../types/proposal';
import { BrowserCtx, type BrowserCtx as BrowserCtxType } from '../BrowserCtx';
import { useItemRef, itemPathToItemRef } from '../itemPathUtils';
import useItemClassConfig from '../hooks/useItemClassConfig';
import { InlineDiffGeneric } from '../diffing/InlineDiff';
import { ItemDetail } from '../detail/RegisterItem';


interface ChangeProposalItem {
  itemPath: string
  itemRef: InternalItemReference
  proposal: ChangeProposal
  item: RegisterItem<Payload> | null
  itemBefore: RegisterItem<Payload> | undefined
}
function stringifiedJSONEqual(i1: any, i2: any): boolean {
  return JSON.stringify(i1) === JSON.stringify(i2);
}


const Proposals: React.FC<{
  proposals: Drafted['items']
  className?: string
}> = function ({ proposals, className }) {
  const [ selectedProposal, selectProposal ] = useState<string | null>(null);
  const [ preferDiff, setPreferDiff ] = useState(false);

  // TODO: Temporarily unsupported
  // (limitations of current change annotation implementation)
  //const [ showOnlyChanged, setShowOnlyChanged ] = useState(true);

  const outerBrowserCtx = useContext(BrowserCtx);
  const { jumpTo, subregisters, useRegisterItemData } = outerBrowserCtx;

  /**
   * When jumping to an item affected by current CR,
   * jump in-CR instead of spawning tab.
   */
  const handleCRJump = useCallback(function _handleCRJump(uri: `${Protocol}:${string}`): void {
    if (uri.startsWith(Protocols.ITEM_DETAILS)) {
      const itemPath = uri.split(':')[1];
      if (proposals[itemPath]) {
        selectProposal(itemPath);
      } else {
        jumpTo?.(uri);
      }
    }
  }, [Object.keys(proposals), jumpTo]);

  const proposalBrowserCtx: BrowserCtxType = useMemo((() => ({
    ...outerBrowserCtx,
    jumpTo: handleCRJump,
  })), [handleCRJump, outerBrowserCtx]);

  /** Paths of register items in proposal. */
  const proposedItemPaths = Object.entries(proposals).map(([itemPath, proposal]) => {
    if (proposal.type === 'clarification' || proposal.type === 'addition') {
      return itemPath;
    } else {
      return undefined;
    }
  }).filter(s => s !== undefined) as string[];

  /** Proposed data of register items in proposal. */
  const proposedItemDataReq = useRegisterItemData({
    itemPaths: proposedItemPaths,
  });

  /** Pre-existing data of register items in proposal. */
  const currentItemDataReq = useRegisterItemData({
    itemPaths: Object.keys(proposals),
    ignoreActiveCR: true,
  });

  const getCurrentItem = useCallback(
    ((itemPath: string) => currentItemDataReq.value[itemPath] ?? null),
    [currentItemDataReq.value]);
  const getProposedItem = useCallback(
    ((itemPath: string) => proposedItemDataReq.value[itemPath] ?? null),
    [proposedItemDataReq.value]);

  /** Current register item (if any) corresponding to selected proposal. */
  const selectedItemCurrent = selectedProposal ? getCurrentItem(selectedProposal) : null;

  /** Proposed register item corresponding to selected proposal. */
  const selectedItemProposed = selectedProposal ? getProposedItem(selectedProposal) : null;

  const selectedItemRef = useItemRef(subregisters !== undefined, selectedProposal);

  const handleItemSelect = useCallback(
    ((item: ChangeProposalItem) => selectProposal(item.itemPath)),
    [selectProposal]);

  const activeItem: ChangeProposalItem | null = useMemo((() =>
    selectedProposal
      ? ({
          itemPath: selectedProposal,
          proposal: proposals[selectedProposal],
          item: (selectedItemProposed ?? selectedItemCurrent)!,
          itemBefore: selectedItemCurrent ?? undefined,
          itemRef: itemPathToItemRef(subregisters !== undefined, selectedProposal),
        })
      : null
  ), [selectedProposal, proposals, subregisters]);

  const allItems: ChangeProposalItem[] = useMemo((() =>
    Object.entries(proposals).map(([itemPath, proposal]) => ({
      itemPath,
      proposal,
      item: (getProposedItem(itemPath) ?? getCurrentItem(itemPath))! ?? null,
      itemBefore: undefined,
      itemRef: itemPathToItemRef(subregisters !== undefined, itemPath),
    }))
  ), [proposals, getCurrentItem, getProposedItem]);

  const haveSelectedItem =
    selectedProposal
    && selectedItemRef
    && proposals[selectedProposal]
    && (selectedItemProposed || selectedItemCurrent);

  const proposalCount = Object.keys(proposals).length;

  useEffect(() => {
    if (!selectedProposal) {
      const firstProposal = Object.keys(proposals)[0];
      if (firstProposal) {
        if (getCurrentItem(firstProposal) || getProposedItem(firstProposal)) {
          selectProposal(firstProposal);
        }
      }
    }
  }, [proposalCount, selectedProposal, getCurrentItem, getProposedItem]);

  const canShowDiff: boolean = haveSelectedItem && proposals[selectedProposal]?.type === 'clarification'
    ? true
    : false;
  const showDiff = canShowDiff && preferDiff;

  if (!currentItemDataReq.isUpdating && !proposedItemDataReq.isUpdating) {
    const selectedItemSummary = haveSelectedItem
      ? <ProposalSummary
          itemRef={selectedItemRef}
          item={(selectedItemProposed ?? selectedItemCurrent)!}
          itemBefore={selectedItemCurrent ?? undefined}
          proposal={proposals[selectedProposal]}
        />
      : <>Select item…</>;
    const icon = haveSelectedItem
      ? getProposalIcon(proposals[selectedProposal])
      : undefined;
    return (
      <div css={css`display: flex; flex-flow: column nowrap;`} className={className}>
        {proposalCount > 0
          ? <ButtonGroup css={css`margin: 5px 0 0 5px;`}>
              {haveSelectedItem
                ? <>
                    <Button
                      disabled={!jumpTo || proposals[selectedProposal]?.type === 'addition'}
                      icon='locate'
                      onClick={() => jumpTo?.(`${Protocols.ITEM_DETAILS}:${selectedProposal}`)}
                      title="Open selected item in a new tab (not applicable to proposed additions)"
                    />
                    <Button
                      active={preferDiff}
                      onClick={() => setPreferDiff(v => !v)}
                      // Diffing only makes sense for clarifications.
                      // Additions are entire new items, and for amendments
                      // item data is unchanged.
                      disabled={!canShowDiff}
                      icon="changes"
                      title="Annotate proposed clarifications for this item"
                    />
                    {/*
                    <Switch
                      checked={preferDiff && showOnlyChanged}
                      disabled={!preferDiff}
                      onChange={evt => setShowOnlyChanged(evt.currentTarget.checked)}
                      label="Show clarified properties only"
                    />
                    */}
                  </>
                : null}
              <ClassNames>
                {(({ css: css2 }) =>
                  <Select<ChangeProposalItem>
                      filterable={false}
                      itemsEqual={stringifiedJSONEqual}
                      menuProps={{ className: css2(`height: 50vh; overflow-y: auto;`) }}
                      activeItem={activeItem}
                      items={allItems}
                      popoverProps={{ minimal: true }}
                      fill
                      itemRenderer={ChangeProposalItemView}
                      onItemSelect={handleItemSelect}>
                    <Button rightIcon="chevron-down" icon={icon} css={css`white-space: nowrap;`}>
                      {selectedItemSummary}
                    </Button>
                  </Select>
                )}
              </ClassNames>
            </ButtonGroup>
          : null}
        {haveSelectedItem
          ? <div css={css`position: relative; flex: 1;`}>
              <BrowserCtx.Provider value={proposalBrowserCtx}>
                <ErrorBoundary viewName="Proposal detail">
                  <ProposalDetail
                    itemRef={selectedItemRef}
                    showDiff={showDiff}
                    //showOnlyChanged={showOnlyChanged}
                    item={(selectedItemProposed ?? selectedItemCurrent)!}
                    itemBefore={selectedItemCurrent ?? undefined}
                    proposal={proposals[selectedProposal]}
                  />
                </ErrorBoundary>
              </BrowserCtx.Provider>
            </div>
          : null}
      </div>
    );
  } else {
    return <NonIdealState
      icon='clean'
      className={className}
      title="Nothing is proposed here yet."
    />;
  }
};


const ChangeProposalItemView: ItemRenderer<ChangeProposalItem> =
(item, { handleClick, modifiers, query }) => {
  if (item.item !== null) {
    const i = item as ChangeProposalItem & { item: RegisterItem<any> };
    const proposalConfig = 
      item.proposal.type === 'amendment'
        ? PROPOSAL_VIEWS[item.proposal.amendmentType]
        : PROPOSAL_VIEWS[item.proposal.type];
    const ProposalTypeLabel: React.FC<ProposalProps<any>> = proposalConfig.summary;
    return (
      <MenuItem
        active={modifiers.active}
        disabled={modifiers.disabled}
        labelElement={<>
          <ProposalTypeLabel {...i} />
          {" "}
          <HelpTooltip content={<>Proposed to be {proposalConfig.hint}</>} />
        </>}
        key={item.itemPath}
        onClick={handleClick}
        icon={getProposalIcon(item.proposal)}
        text={<ProposalSummary {...i} />} />
    );
  } else {
    return <MenuItem
      disabled
      icon="heart-broken"
      onClick={handleClick}
      text={`Broken proposal entry at path ${item.itemPath}`}
    />
  }
};


interface ProposalProps<P extends ChangeProposal> {
  proposal: P

  /** Highlight changes. */
  showDiff?: boolean

  /** In diff mode, only show changed data. (Provisional.) */
  showOnlyChanged?: boolean

  itemRef: InternalItemReference
  item: RegisterItem<Payload>
  itemBefore: P extends Clarification ? RegisterItem<Payload> : undefined
  onChange?: (newProposal: P) => void
}
export const ProposalDetail: React.FC<ProposalProps<ChangeProposal>> =
memo(function ({ proposal, showDiff, showOnlyChanged, itemRef, item, itemBefore, onChange }) {
  const itemClass = useItemClassConfig(itemRef.classID ?? 'NONEXISTENT_CLASS_ID');

  if (!itemClass) {
    throw new Error(`Unknown item class “${itemRef.classID}”!`);
  }

  const view: JSX.Element = showDiff
    ? <InlineDiffGeneric
        item1={itemBefore ?? {}}
        item2={item}
        css={css`position: absolute; inset: 0; background: white; padding: 10px 0; overflow: auto;`}
        className={Classes.ELEVATION_2}
      />
    : <ItemDetail
        itemRef={itemRef}
        item={item}
        itemClass={itemClass}
        key={JSON.stringify(itemRef)}
        compactHeader
      />;

  return <div css={css`position: absolute; inset: 0; display: flex; flex-flow: column;`}>
    {view}
  </div>;
});
export const ProposalSummary: React.FC<ProposalProps<ChangeProposal>> =
function ({ proposal, itemRef, item, itemBefore, onChange }) {
  const { itemClasses } = useContext(BrowserCtx);
  const { classID } = itemRef;
  const ListItemView = itemClasses[classID].views.listItemView;

  return <ListItemView
    itemRef={itemRef}
    itemData={item.data}
  />;
};


interface ProposalViewConfig<P extends ChangeProposal> {
  summary: React.FC<ProposalProps<P>>
  hint: JSX.Element | string
}


const clarification: ProposalViewConfig<Clarification> = {
  hint: <>
    altered to represent the same concept more clearly.
  </>,
  summary: memo(({ proposal, item, itemRef }) => <>Clarification</>, () => true),
};


const addition: ProposalViewConfig<Addition> = {
  hint: <>added to this register.</>,
  summary: memo(({ proposal, item, itemRef }) => <>Addition</>, () => true),
};


const retirement: ProposalViewConfig<Retirement> = {
  hint: <>
    marked as no longer current.
    (Note that this register is append-only, so the item cannot be removed altogether.)
  </>,
  summary: memo(({ proposal, itemRef, item }) => <>Retirement</>, () => true),
};


const supersession: ProposalViewConfig<Supersession> = {
  hint: <>
    removed from the register with another item recommended for use in its place.
    A relation between the superseding and superseded item will be created,
    though the exact semantics of that relation depend on the register.
  </>,
  summary: memo(({ proposal, itemRef, item }) => <>Supersession</>, () => true),
};


const invalidation: ProposalViewConfig<Invalidation> = {
  hint: <>
    marked as invalid. The exact semantics of invalidation depend on the register.
  </>,
  summary: memo(({ proposal, itemRef, item }) => <>Invalidation</>, () => true),
}


type ProposalOrAmendmentType =
  | Exclude<typeof PROPOSAL_TYPES[number], 'amendment'>
  | typeof AMENDMENT_TYPES[number];


const PROPOSAL_VIEWS: { [type in ProposalOrAmendmentType]: ProposalViewConfig<any> } = {
  clarification,
  addition,
  retirement,
  supersession,
  invalidation,
} as const;


function getProposalIcon(proposal: ChangeProposal): IconName {
  return proposal.type === 'addition'
      ? 'add'
      : proposal.type === 'clarification'
        ? 'edit'
        : 'ban-circle';
}


export default Proposals;
