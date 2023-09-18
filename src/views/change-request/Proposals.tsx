/** @jsx jsx */
/** @jsxFrag React.Fragment */

import React, { useContext, useEffect, useState, useCallback, memo, useMemo } from 'react';
import { ClassNames, jsx, css } from '@emotion/react';
import styled from '@emotion/styled';
import {
  ControlGroup,
  ButtonGroup,
  Switch,
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
} from '../../types';
import type { Drafted } from '../../types/cr';
import { Protocols, type Protocol } from '../protocolRegistry';
import { PROPOSAL_TYPES, AMENDMENT_TYPES } from '../../types/proposal';
import { BrowserCtx, type BrowserCtx as BrowserCtxType } from '../BrowserCtx';
import { useItemRef, itemPathToItemRef, itemRefToItemPath } from '../itemPathUtils';
import StructuredDiff from '../diffing/StructuredDiff';
import registerItemDetailView from '../detail/RegisterItem';


interface ChangeProposalItem {
  itemPath: string
  itemRef: InternalItemReference
  proposal: ChangeProposal
  itemData: Payload
  itemDataBefore: Payload | undefined
}


const Proposals: React.FC<{
  proposals: Drafted['items']
  className?: string
}> = function ({ proposals, className }) {
  const [ _selectedProposal, selectProposal ] = useState<string | null>(null);
  const [ showDiff, setShowDiff ] = useState(false);
  const [ showOnlyChanged, setShowOnlyChanged ] = useState(true);

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

  const firstProposal: string | undefined = Object.keys(proposals)[0];

  // Effective selected proposal
  const selectedProposal: string | undefined =
    ((_selectedProposal && proposals[_selectedProposal]) ? _selectedProposal : null)
    ?? firstProposal
    ?? undefined;

  // Force select available proposal
  useEffect(() => {
    if (firstProposal && (_selectedProposal === null || !proposals[_selectedProposal])) {
      selectProposal(firstProposal ?? null);
    }
  }, [firstProposal, _selectedProposal, proposals]);

  const selectedItemRef = useItemRef(subregisters !== undefined, selectedProposal);

  // Data for proposed items
  const proposedItemPaths = Object.entries(proposals).map(([itemPath, proposal]) => {
    if (proposal.type === 'clarification' || proposal.type === 'addition') {
      return itemPath;
    } else {
      return undefined;
    }
  }).filter(s => s !== undefined) as string[];
  const proposedItemDataReq = useRegisterItemData({
    itemPaths: proposedItemPaths,
  });

  // Data for pre-existing items
  const currentItemDataReq = useRegisterItemData({
    itemPaths: Object.keys(proposals),
    ignoreActiveCR: true,
  });

  const getCurrentItemData = useCallback(
    ((itemPath: string) => currentItemDataReq.value[itemPath]?.data ?? null),
    [currentItemDataReq.value]);
  const getProposedItemData = useCallback(
    ((itemPath: string) => proposedItemDataReq.value[itemPath]?.data ?? null),
    [proposedItemDataReq.value]);

  const selectedItemCurrentData = getCurrentItemData(selectedProposal);
  const selectedItemProposedData = getProposedItemData(selectedProposal);

  const handleItemSelect = useCallback(
    ((item: ChangeProposalItem) => selectProposal(item.itemPath)),
    [selectProposal]);

  const activeItem: ChangeProposalItem | null = useMemo((() =>
    selectedProposal
      ? ({
          itemPath: selectedProposal,
          proposal: proposals[selectedProposal],
          itemData: (selectedItemProposedData ?? selectedItemCurrentData)!,
          itemDataBefore: selectedItemCurrentData ?? undefined,
          itemRef: itemPathToItemRef(subregisters !== undefined, selectedProposal),
        })
      : null
  ), [selectedProposal, proposals, subregisters]);

  const allItems: ChangeProposalItem[] = useMemo((() =>
    Object.entries(proposals).map(([itemPath, proposal]) => ({
      itemPath,
      proposal,
      itemData: (getProposedItemData(itemPath) ?? getCurrentItemData(itemPath))! ?? null,
      itemDataBefore: undefined,
      itemRef: itemPathToItemRef(subregisters !== undefined, itemPath),
    })).filter(item => item.itemData !== null)
  ), [proposals, getCurrentItemData, getProposedItemData]);

  if (
    selectedProposal
    && selectedItemRef
    && proposals[selectedProposal]
    && !currentItemDataReq.isUpdating
    && !proposedItemDataReq.isUpdating
  ) {
    const selectedItemSummary = <ProposalSummary
      itemRef={selectedItemRef}
      itemData={(selectedItemProposedData ?? selectedItemCurrentData)!}
      itemDataBefore={selectedItemCurrentData ?? undefined}
      proposal={proposals[selectedProposal]}
    />;

    return (
      <div css={css`display: flex; flex-flow: column nowrap;`} className={className}>
        <div>
          <ControlGroup>
            <Switch
              checked={showDiff}
              onChange={evt => setShowDiff(evt.currentTarget.checked)}
              label="View source"
              css={css`margin-right: 1em !important`}
            />
            <Switch
              checked={showDiff && showOnlyChanged}
              disabled={!showDiff}
              onChange={evt => setShowOnlyChanged(evt.currentTarget.checked)}
              label="Show clarified properties only"
            />
          </ControlGroup>
          <ButtonGroup>
            <Button
                disabled={!jumpTo || proposals[selectedProposal]?.type === 'addition'}
                icon='locate'
                onClick={() => jumpTo?.(`${Protocols.ITEM_DETAILS}:${selectedProposal}`)}
                title="Open selected item in a new tab (not applicable to proposed additions)">
              Reveal in registry
            </Button>
            {Object.keys(proposals).length > 1
              ? <ClassNames>
                  {(({ css: css2 }) =>
                    <Select<ChangeProposalItem>
                        filterable={false}
                        itemsEqual={(i1, i2) => JSON.stringify(i1) === JSON.stringify(i2)}
                        menuProps={{ className: css2(`height: 50vh; overflow-y: auto;`) }}
                        activeItem={activeItem}
                        items={allItems}
                        popoverProps={{ minimal: true }}
                        fill
                        itemRenderer={ChangeProposalItemView}
                        onItemSelect={handleItemSelect}>
                      <Button rightIcon="chevron-down" icon={getProposalIcon(proposals[selectedProposal])}>
                        {selectedItemSummary}
                      </Button>
                    </Select>
                  )}
                </ClassNames>
              : <Button
                    fill
                    alignText="left"
                    icon={getProposalIcon(proposals[selectedProposal])}
                    rightIcon="chevron-down">
                  {selectedItemSummary}
                </Button>}
          </ButtonGroup>
        </div>
        <div css={css`position: relative; flex: 1;`}>
          <BrowserCtx.Provider value={proposalBrowserCtx}>
            <ProposalDetail
              itemRef={selectedItemRef}
              showDiff={showDiff}
              showOnlyChanged={showOnlyChanged}
              itemData={(selectedItemProposedData ?? selectedItemCurrentData)!}
              itemDataBefore={selectedItemCurrentData ?? undefined}
              proposal={proposals[selectedProposal]}
            />
          </BrowserCtx.Provider>
        </div>
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
        <ProposalTypeLabel {...item} />
        {" "}
        <HelpTooltip content={<>Proposed to be {proposalConfig.hint}</>} />
      </>}
      key={item.itemPath}
      onClick={handleClick}
      icon={getProposalIcon(item.proposal)}
      text={<ProposalSummary {...item} />} />
  );
};


interface ProposalProps<P extends ChangeProposal> {
  proposal: P
  showDiff?: boolean
  showOnlyChanged?: boolean
  itemRef: InternalItemReference
  itemData: Payload
  itemDataBefore: P extends Clarification ? Payload : undefined
  onChange?: (newProposal: P) => void
}
export const ProposalDetail: React.FC<ProposalProps<ChangeProposal>> =
function ({ proposal, showDiff, showOnlyChanged, itemRef, itemData, itemDataBefore, onChange }) {
  const ItemView = registerItemDetailView.main;

  const view: JSX.Element = showDiff
    ? <MaximizedStructuredDiff
        item1={itemDataBefore ?? ITEM_DATA_PLACEHOLDER}
        item2={itemData}
        showUnchanged={!showOnlyChanged}
        css={css`background: white; border-radius: 2.5px; padding: 10px 0; margin: 10px 0;`}
        className={Classes.ELEVATION_2}
      />
    : <ItemView uri={itemRefToItemPath(itemRef)} key={JSON.stringify(itemRef)} />

  return <div css={css`position: absolute; inset: 0; display: flex; flex-flow: column;`}>
    {view}
  </div>;
};
export const ProposalSummary: React.FC<ProposalProps<ChangeProposal>> =
function ({ proposal, itemRef, itemData, itemDataBefore, onChange }) {
  const { itemClasses } = useContext(BrowserCtx);
  const { classID } = itemRef;
  const ListItemView = itemClasses[classID].views.listItemView;

  return <ListItemView
    itemRef={itemRef}
    itemData={itemData}
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
  summary: memo(({ proposal, itemData, itemRef }) => <>Clarification</>, () => true),
};


const addition: ProposalViewConfig<Addition> = {
  hint: <>added to this register.</>,
  summary: memo(({ proposal, itemData, itemRef }) => <>Addition</>, () => true),
};


const retirement: ProposalViewConfig<Retirement> = {
  hint: <>
    marked as no longer current.
    (Note that this register is append-only, so the item cannot be removed altogether.)
  </>,
  summary: memo(({ proposal, itemRef, itemData }) => <>Retirement</>, () => true),
};


const supersession: ProposalViewConfig<Supersession> = {
  hint: <>
    removed from the register with another item recommended for use in its place.
    A relation between the superseding and superseded item will be created,
    though the exact semantics of that relation depend on the register.
  </>,
  summary: memo(({ proposal, itemRef, itemData }) => <>Supersession</>, () => true),
};


const invalidation: ProposalViewConfig<Invalidation> = {
  hint: <>
    marked as invalid. The exact semantics of invalidation depend on the register.
  </>,
  summary: memo(({ proposal, itemRef, itemData }) => <>Invalidation</>, () => true),
}


const MaximizedStructuredDiff = styled(StructuredDiff)`
  position: absolute;
  inset: 0;
`;


type ProposalOrAmendmentType =
  | Exclude<typeof PROPOSAL_TYPES[number], 'amendment'>
  | typeof AMENDMENT_TYPES[number];


const PROPOSAL_VIEWS: { [type in ProposalOrAmendmentType]: ProposalViewConfig<any> } = {
  clarification,
  addition,
  retirement,
  supersession,
  invalidation,
};


function getProposalIcon(proposal: ChangeProposal): IconName {
  return proposal.type === 'addition'
      ? 'add'
      : proposal.type === 'clarification'
        ? 'edit'
        : 'ban-circle';
}


export default Proposals;


const ITEM_DATA_PLACEHOLDER = {} as const;
