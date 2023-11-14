/** @jsx jsx */
/** @jsxFrag React.Fragment */

import React, { useContext, useState, useCallback, memo, useMemo } from 'react';
import { ClassNames, jsx, css } from '@emotion/react';
import {
  ButtonGroup,
  Button,
  Drawer, DrawerSize,
  Classes,
  Colors,
  MenuItem, type MenuItemProps, type MenuDividerProps,
  type IconName,
  Tag,
  H5,
} from '@blueprintjs/core';
import { type ItemRenderer, Select2 as Select } from '@blueprintjs/select';
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
import ErrorState from '@riboseinc/paneron-extension-kit/widgets/ErrorState';
import type { Drafted } from '../../types/cr';
import { Protocols, type Protocol } from '../protocolRegistry';
import { PROPOSAL_TYPES, AMENDMENT_TYPES } from '../../types/proposal';
import { BrowserCtx, type BrowserCtx as BrowserCtxType } from '../BrowserCtx';
import { useItemRef, itemPathToItemRef } from '../itemPathUtils';
import useItemClassConfig from '../hooks/useItemClassConfig';
import { InlineDiffGeneric } from '../diffing/InlineDiff';
import { proposalToTagProps } from './util';
import { HomeBlockCard, HomeBlockActions } from '../detail/RegisterHome/Block';
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


interface ProposalBrowserProps<CR extends Drafted> {
  proposals: CR['items']

  selectedItem?: (string & keyof CR['items']) | null
  onSelectItem: (selectedItem: (string & keyof CR['items']) | null) => void

  /**
   * If provided, button to delete each proposed change
   * is shown in change card list mode.
   */
  onDeleteProposalForItemAtPath?: (itemPath: string) => void
}
/**
 * Shows a list of individual proposed changes as cards by default,
 * allowing to expand a proposal and view item details.
 *
 * If no proposals exist, returns null.
 */
export function Proposals<CR extends Drafted>
({ proposals, onDeleteProposalForItemAtPath, selectedItem, onSelectItem: selectProposal }:
ProposalBrowserProps<CR>) {
  const [ preferDiff, setPreferDiff ] = useState(false);

  const selectedProposal = selectedItem ?? null;

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

  //useEffect(() => {
  //  // if (!selectedProposal) {
  //  //   const firstProposal = Object.keys(proposals)[0];
  //  //   if (firstProposal) {
  //  //     if (getCurrentItem(firstProposal) || getProposedItem(firstProposal)) {
  //  //       selectProposal(firstProposal);
  //  //     }
  //  //   }
  //  // }
  //  if (selectedProposal) {
  //    if (selectedProposalDetailRef.current) {
  //      selectedProposalDetailRef.current.scrollIntoView({ block: 'center' });
  //    }
  //  }
  //}, [selectedProposal === null]);

  const canShowDiff: boolean =
    haveSelectedItem && proposals[selectedProposal]?.type === 'clarification'
      ? true
      : false;
  const showDiff = canShowDiff && preferDiff;

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

  const selectedItemDrawer = useMemo((() =>
    <Drawer
        isOpen={proposalCount > 0 && haveSelectedItem ? true : false}
        onClose={() => selectProposal(null)}
        size={DrawerSize.LARGE}
        enforceFocus={false}>
      {proposalCount > 0 && haveSelectedItem
        ? <>
            <ButtonGroup>
              <Button
                disabled={!jumpTo || proposals[selectedProposal]?.type === 'addition'}
                icon='open-application'
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
                text="Compare"
                title="Annotate proposed clarifications for this item"
              />
              <ClassNames>
                {(({ css: css2 }) =>
                  <Select<ChangeProposalItem>
                      filterable={false}
                      itemsEqual={stringifiedJSONEqual}
                      menuProps={{ className: css2(`max-height: 50vh; overflow-y: auto;`) }}
                      activeItem={activeItem}
                      items={allItems}
                      popoverProps={{ minimal: true, matchTargetWidth: true }}
                      fill
                      itemRenderer={ChangeProposalItemView}
                      onItemSelect={handleItemSelect}>
                    <Button
                        fill
                        rightIcon="chevron-down"
                        icon={icon}
                        title="Switch between items in this proposal"
                        css={css`white-space: nowrap;`}>
                      {selectedItemSummary}
                    </Button>
                  </Select>
                )}
              </ClassNames>
              <Button
                onClick={() => selectProposal(null)}
                icon="minimize"
                title="Minimize proposed change view"
                text="Minimize"
              />
            </ButtonGroup>
            <div css={css`position: relative; flex: 1;`}>
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
          </>
        : null}
    </Drawer>
  ), [proposalCount > 0, haveSelectedItem, selectedItemProposed, selectedItemCurrent, preferDiff, jumpTo, handleItemSelect, selectedProposal && proposals[selectedProposal]]);

  return (
    <>
      {selectedItemDrawer}
      {allItems.map(cpi => {
        const actions: (MenuItemProps | MenuDividerProps)[] = [{
          onClick: () => selectProposal(cpi.itemPath),
          text: "Expand",
          title: "Expand proposed change to see item details",
          icon: 'maximize',
        }];
        if (onDeleteProposalForItemAtPath) {
          actions.push({
            text: "Delete this proposal",
            intent: 'danger',
            onClick: () => onDeleteProposalForItemAtPath(cpi.itemPath),
            icon: 'trash',
          });
        }
        return <HomeBlockCard
            css={css`
              flex-basis: calc(33.33% - 10px*2/3);
            `}
            description={`${cpi.proposal.type} proposal`}
            key={cpi.itemPath}>
          <ProposalType item={cpi as any} />
          <div css={css`padding: 5px; flex-grow: 1;`}>
            {cpi.item !== null
              ? <H5 css={css`margin: 0; overflow: hidden; text-overflow: ellipsis;`}>
                  <ProposalSummary
                    itemRef={cpi.itemRef}
                    proposal={cpi.proposal}
                    itemBefore={cpi.itemBefore}
                    item={cpi.item}
                  />
                </H5>
              : <>Problem reading proposed item data.</>}
          </div>
          {actions.length > 0
            ? <HomeBlockActions actions={actions} />
            : null}
        </HomeBlockCard>
      })}
    </>
  );
};


function ProposalType({ item }: { item: ChangeProposalItem & { item: RegisterItem<any> } }) {
  const proposalConfig = 
    item.proposal.type === 'amendment'
      ? PROPOSAL_VIEWS[item.proposal.amendmentType]
      : PROPOSAL_VIEWS[item.proposal.type];
  //const ProposalTypeLabel: React.FC<ProposalProps<any>> = proposalConfig.summary;
  const tagProps = proposalToTagProps(item.proposal);
  return (
    <Tag
      minimal
      {...tagProps}
      rightIcon={<HelpTooltip content={<>Proposed to be {proposalConfig.hint}</>} />}
    />
    
  );
}


const ChangeProposalItemView: ItemRenderer<ChangeProposalItem> =
(item, { handleClick, modifiers, query }) => {
  if (item.item !== null) {
    const i = item as ChangeProposalItem & { item: RegisterItem<any> };
    return (
      <MenuItem
        active={modifiers.active}
        disabled={modifiers.disabled}
        labelElement={<ProposalType item={i} />}
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
        css={css`
          position: absolute; inset: 0; padding: 10px; overflow: auto;
          background-color: white;
          .bp4-dark & {
            background-color: ${Colors.DARK_GRAY2};
          }
        `}
        className={`${Classes.ELEVATION_2} ${Classes.RUNNING_TEXT}`}
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
  const cls = itemClasses[classID];
  const ListItemView = cls?.views?.listItemView;

  if (ListItemView) {
    return <>
      <ListItemView
        itemRef={itemRef}
        itemData={item.data}
        css={css`text-overflow: ellipsis; overflow: hidden;`}
      />
      &emsp;
      <small>{cls.meta.title}</small>
    </>;
  } else {
    return <ErrorState
      viewName="list item view"
      inline
      error="unable to load list item view"
    />;
  }
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
