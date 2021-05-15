/** @jsx jsx */
/** @jsxFrag React.Fragment */

import React, { useContext, useEffect, useState } from 'react';
import { jsx } from '@emotion/core';
//import { DatasetContext } from '@riboseinc/paneron-extension-kit/context';
import { MenuItem, NonIdealState } from '@blueprintjs/core';
import { ItemRenderer, Select } from '@blueprintjs/select';
import {
  Addition,
  ChangeProposal,
  ChangeRequest,
  Clarification,
  InternalItemReference,
  Retirement,
  Supersession,
} from '../../types';
import { BrowserCtx } from '../BrowserCtx';
import { itemPathToItemRef, itemRefToItemPath } from '../itemPathUtils';
import InlineDiff from '../InlineDiff';


interface ChangeProposalItem {
  itemPath: string
  itemRef: InternalItemReference
  proposal: ChangeProposal
}


const ChangeProposalSelect = Select.ofType<ChangeProposalItem>();


const Proposals: React.FC<{
  proposals: ChangeRequest['proposals']
  onChange?: (newProposals: ChangeRequest['proposals']) => void
}> = function ({ proposals, onChange }) {
  const [selectedProposal, selectProposal] = useState<string | null>(null);
  const { subregisters } = useContext(BrowserCtx);

  useEffect(() => {
    const firstProposal: string | undefined = Object.keys(proposals)[0];
    if (firstProposal && selectedProposal === null) {
      selectProposal(firstProposal);
    }
  }, [JSON.stringify(proposals)]);

  return (
    <>
      {Object.keys(proposals).length > 0
        ? <ChangeProposalSelect
            items={
              Object.entries(proposals).map(([itemPath, proposal]) => ({
                itemPath,
                proposal,
                itemRef: itemPathToItemRef(subregisters !== undefined, itemPath),
              }))}
            popoverProps={{ minimal: true }}
            itemRenderer={ChangeProposalItemView}
            onItemSelect={(item) => selectProposal(item.itemPath)}
          />
        : null}
      {selectedProposal
        ? <Proposal
            itemRef={itemPathToItemRef(subregisters !== undefined, selectedProposal)}
            proposal={proposals[selectedProposal]}
          />
        : <NonIdealState description="No proposal to show." />}
    </>
  );
};


const ChangeProposalItemView: ItemRenderer<ChangeProposalItem> =
(item, { handleClick, modifiers, query }) => {
  const View: React.FC<ProposalProps<any>> =
    item.proposal.type === 'amendment'
      ? PROPOSAL_VIEWS[item.proposal.amendmentType].summary
      : PROPOSAL_VIEWS[item.proposal.type].summary;

  return (
    <MenuItem
      active={modifiers.active}
      disabled={modifiers.disabled}
      key={item.itemPath}
      onClick={handleClick}
      text={<View proposal={item.proposal} itemRef={item.itemRef} />} />
  );
}


interface ProposalProps<P extends ChangeProposal> {
  proposal: P
  itemRef: InternalItemReference
  onChange?: (newProposal: P) => void
}
export const Proposal: React.FC<ProposalProps<ChangeProposal>> =
function ({ proposal, itemRef, onChange }) {
  const View: React.FC<ProposalProps<any>> =
    proposal.type === 'amendment'
      ? PROPOSAL_VIEWS[proposal.amendmentType].summary
      : PROPOSAL_VIEWS[proposal.type].summary;

  return <View itemRef={itemRef} proposal={proposal} />;
};


type PROPOSAL_TYPE_ID = 'clarification' | 'addition' | 'retirement' | 'supersession';


interface ProposalViewConfig<P extends ChangeProposal> {
  detail: React.FC<ProposalProps<P>>
  summary: React.FC<ProposalProps<P>>
}


const SimpleProposalDetailView: React.FC<ProposalProps<any>> =
function ({ proposal, itemRef, onChange }) {
  const {
    useRegisterItemData,
    getRelatedItemClassConfiguration,
    itemClasses,
  } = useContext(BrowserCtx);
  const { classID } = itemRef;
  const DetailView = itemClasses[classID].views.detailView ?? itemClasses[classID].views.editView;
  return <DetailView
    useRegisterItemData={useRegisterItemData}
    getRelatedItemClassConfiguration={getRelatedItemClassConfiguration}
    itemData={proposal.payload}
  />;
};


const clarification: ProposalViewConfig<Clarification> = {
  detail: ({ proposal, itemRef, onChange }) => {
    const {
      useRegisterItemData,
      itemClasses,
    } = useContext(BrowserCtx);
    const { classID } = itemRef;
    const itemPath = itemRefToItemPath(itemRef);
    const originalItemResp = useRegisterItemData({
      itemPaths: [itemPath]
    });
    const originalItem = originalItemResp.value[itemPath];
    if (!originalItem) {
      return <NonIdealState title="Original item data could not be retrieved" />;
    }
    const DetailView = itemClasses[classID].views.detailView ?? itemClasses[classID].views.editView;
    return <InlineDiff
      DetailView={DetailView}
      item1={originalItem.data}
      item2={proposal.payload}
    />;
  },
  summary: ({ proposal, itemRef }) => {
    const {
      useRegisterItemData,
      itemClasses,
      getRelatedItemClassConfiguration,
    } = useContext(BrowserCtx);
    const { classID } = itemRef;
    const ListItemView = itemClasses[classID].views.listItemView;
    return <>Clarification of <ListItemView
      itemID={itemRef.itemID}
      itemData={proposal.payload}
      useRegisterItemData={useRegisterItemData}
      getRelatedItemClassConfiguration={getRelatedItemClassConfiguration} /></>;
  },
};


const addition: ProposalViewConfig<Addition> = {
  detail: SimpleProposalDetailView,
  summary: ({ proposal, itemRef }) => {
    const {
      useRegisterItemData,
      itemClasses,
      getRelatedItemClassConfiguration,
    } = useContext(BrowserCtx);
    const { classID } = itemRef;
    const ListItemView = itemClasses[classID].views.listItemView;
    return <>Addition of <ListItemView
      itemID={itemRef.itemID}
      itemData={proposal.payload}
      useRegisterItemData={useRegisterItemData}
      getRelatedItemClassConfiguration={getRelatedItemClassConfiguration} /></>;
  },
};


const retirement: ProposalViewConfig<Retirement> = {
  detail: SimpleProposalDetailView,
  summary: ({ proposal, itemRef }) => {
    const {
      useRegisterItemData,
      itemClasses,
      getRelatedItemClassConfiguration,
    } = useContext(BrowserCtx);
    const { classID } = itemRef;
    const itemPath = itemRefToItemPath(itemRef);
    const originalItemResp = useRegisterItemData({
      itemPaths: [itemPath]
    });
    const originalItem = originalItemResp.value[itemPath];
    if (!originalItem) {
      return <>(item view not available)</>;
    }
    const ListItemView = itemClasses[classID].views.listItemView;
    return <>Retirement of <ListItemView
      itemID={itemRef.itemID}
      itemData={originalItem.data}
      useRegisterItemData={useRegisterItemData}
      getRelatedItemClassConfiguration={getRelatedItemClassConfiguration} /></>;
  },
};


const supersession: ProposalViewConfig<Supersession> = {
  detail: ({ proposal, itemRef }) => {
    const {
      useRegisterItemData,
      itemClasses,
    } = useContext(BrowserCtx);
    const { classID } = itemRef;
    const originalItemPath = itemRefToItemPath(itemRef);
    const supersedingItemPath = itemRefToItemPath({
      classID: itemRef.classID,
      subregisterID: itemRef.subregisterID,
      itemID: proposal.supersedingItemID,
    });
    const itemDataResp = useRegisterItemData({
      itemPaths: [originalItemPath, supersedingItemPath],
    });
    const originalItem = itemDataResp.value[originalItemPath];
    if (!originalItem) {
      return <NonIdealState title="Original item data could not be retrieved" />;
    }
    const supersedingItem = itemDataResp.value[supersedingItemPath];
    if (!supersedingItem) {
      return <NonIdealState title="Original item data could not be retrieved" />;
    }
    const DetailView = itemClasses[classID].views.detailView ?? itemClasses[classID].views.editView;
    return <InlineDiff
      DetailView={DetailView}
      item1={originalItem.data}
      item2={supersedingItem.data}
    />;
  },
  summary: ({ proposal, itemRef }) => {
    const {
      useRegisterItemData,
      itemClasses,
      getRelatedItemClassConfiguration,
    } = useContext(BrowserCtx);
    const { classID } = itemRef;
    const itemPath = itemRefToItemPath(itemRef);
    const originalItemResp = useRegisterItemData({
      itemPaths: [itemPath]
    });
    const originalItem = originalItemResp.value[itemPath];
    if (!originalItem) {
      return <>(item view not available)</>;
    }
    const ListItemView = itemClasses[classID].views.listItemView;
    return <>Supersession of <ListItemView
      itemID={itemRef.itemID}
      itemData={originalItem.data}
      useRegisterItemData={useRegisterItemData}
      getRelatedItemClassConfiguration={getRelatedItemClassConfiguration} /></>;
  },
}


const PROPOSAL_VIEWS: { [type in PROPOSAL_TYPE_ID]: ProposalViewConfig<any> } = {
  clarification,
  addition,
  retirement,
  supersession,
}


export default Proposals;
