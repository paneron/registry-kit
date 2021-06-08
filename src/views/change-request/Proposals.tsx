/** @jsx jsx */
/** @jsxFrag React.Fragment */

import React, { useContext, useEffect, useState } from 'react';
import { jsx, css } from '@emotion/core';
import styled from '@emotion/styled';
//import { DatasetContext } from '@riboseinc/paneron-extension-kit/context';
import { Classes, MenuItem, NonIdealState } from '@blueprintjs/core';
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
import StructuredDiff from '../diffing/StructuredDiff';


interface ChangeProposalItem {
  itemPath: string
  itemRef: InternalItemReference
  proposal: ChangeProposal
}


const ChangeProposalSelect = Select.ofType<ChangeProposalItem>();


const Proposals: React.FC<{
  proposals: ChangeRequest['proposals']
  onChange?: (newProposals: ChangeRequest['proposals']) => void
  className?: string
}> = function ({ proposals, onChange, className }) {
  const [selectedProposal, selectProposal] = useState<string | null>(null);
  const { subregisters } = useContext(BrowserCtx);

  useEffect(() => {
    const firstProposal: string | undefined = Object.keys(proposals)[0];
    if (firstProposal && selectedProposal === null) {
      selectProposal(firstProposal);
    }
  }, [JSON.stringify(proposals)]);

  const selectedItemRef = selectedProposal
    ? itemPathToItemRef(subregisters !== undefined, selectedProposal)
    : null;

  return (
    <div css={css`display: flex; flex-flow: column nowrap;`} className={className}>
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
      {selectedProposal && selectedItemRef && proposals[selectedProposal]
        ? <>
            <div css={css`margin-bottom: 10px;`}>
              <ProposalSummary
                itemRef={selectedItemRef}
                proposal={proposals[selectedProposal]}
              />
            </div>
            <div css={css`position: relative; flex: 1;`}>
              <ProposalDetail
                itemRef={selectedItemRef}
                proposal={proposals[selectedProposal]}
              />
            </div>
          </>
        : <NonIdealState description="No proposal to show." />}
    </div>
  );
};


const ChangeProposalItemView: ItemRenderer<ChangeProposalItem> =
(item, { handleClick, modifiers, query }) => {
  return (
    <MenuItem
      active={modifiers.active}
      disabled={modifiers.disabled}
      key={item.itemPath}
      onClick={handleClick}
      text={<ProposalSummary proposal={item.proposal} itemRef={item.itemRef} />} />
  );
}


interface ProposalProps<P extends ChangeProposal> {
  proposal: P
  itemRef: InternalItemReference
  onChange?: (newProposal: P) => void
}
export const ProposalDetail: React.FC<ProposalProps<ChangeProposal>> =
function ({ proposal, itemRef, onChange }) {
  const View: React.FC<ProposalProps<any>> =
    proposal.type === 'amendment'
      ? PROPOSAL_VIEWS[proposal.amendmentType].detail
      : PROPOSAL_VIEWS[proposal.type].detail;

  return <View itemRef={itemRef} proposal={proposal} />;
};
export const ProposalSummary: React.FC<ProposalProps<ChangeProposal>> =
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


// TODO: De-duplicate these or otherwise refactor  given time.
const SimpleProposalDetailView: React.FC<ProposalProps<Addition>> =
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
const SimpleItemDetailView: React.FC<ProposalProps<Retirement>> =
function ({ itemRef, onChange }) {
  const {
    useRegisterItemData,
    getRelatedItemClassConfiguration,
    itemClasses,
  } = useContext(BrowserCtx);
  const { classID } = itemRef;
  const itemPath = itemRefToItemPath(itemRef);
  const originalItemResp = useRegisterItemData({
    itemPaths: [itemPath]
  });
  const originalItem = originalItemResp.value[itemPath];
  if (!originalItem?.data) {
    return <NonIdealState title="Original item data could not be retrieved" />;
  }
  const DetailView = itemClasses[classID].views.detailView ?? itemClasses[classID].views.editView;
  return <DetailView
    css={css`background: white; border-radius: 5px; margin: 0 -30px;`}
    className={Classes.ELEVATION_2}
    useRegisterItemData={useRegisterItemData}
    getRelatedItemClassConfiguration={getRelatedItemClassConfiguration}
    itemData={originalItem.data}
  />;
};


const clarification: ProposalViewConfig<Clarification> = {
  detail: ({ proposal, itemRef, onChange }) => {
    const { useRegisterItemData } = useContext(BrowserCtx);
    const itemPath = itemRefToItemPath(itemRef);
    const originalItemResp = useRegisterItemData({
      itemPaths: [itemPath]
    });
    const originalItem = originalItemResp.value[itemPath];
    if (!originalItem?.data) {
      return <NonIdealState title="Original item data could not be retrieved" />;
    }
    return <MaximizedStructuredDiff
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
    return <>Clarification of [<ListItemView
      itemID={itemRef.itemID}
      itemData={proposal.payload}
      useRegisterItemData={useRegisterItemData}
      getRelatedItemClassConfiguration={getRelatedItemClassConfiguration} />]</>;
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
    return <>Addition of [<ListItemView
      itemID={itemRef.itemID}
      itemData={proposal.payload}
      useRegisterItemData={useRegisterItemData}
      getRelatedItemClassConfiguration={getRelatedItemClassConfiguration} />]</>;
  },
};


const retirement: ProposalViewConfig<Retirement> = {
  detail: SimpleItemDetailView,
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
    if (!originalItem?.data) {
      return <>(item data is not available)</>;
    }
    const ListItemView = itemClasses[classID].views.listItemView;
    return <>Retirement of [<ListItemView
      itemID={itemRef.itemID}
      itemData={originalItem.data}
      useRegisterItemData={useRegisterItemData}
      getRelatedItemClassConfiguration={getRelatedItemClassConfiguration} />]</>;
  },
};


const supersession: ProposalViewConfig<Supersession> = {
  detail: ({ proposal, itemRef }) => {
    const { useRegisterItemData, itemClasses, getRelatedItemClassConfiguration } = useContext(BrowserCtx);
    const originalItemPath = itemRefToItemPath(itemRef);
    const supersedingItemRefs = proposal.supersedingItemIDs.map(itemID => ({
      classID: itemRef.classID,
      subregisterID: itemRef.subregisterID,
      itemID,
    }));
    const supersedingItemPaths = supersedingItemRefs.map(itemRefToItemPath);
    const itemDataResp = useRegisterItemData({
      itemPaths: [originalItemPath, ...supersedingItemPaths],
    });
    const originalItem = itemDataResp.value[originalItemPath];
    if (!originalItem?.data) {
      return <NonIdealState title="Original item data could not be retrieved" />;
    }
    const ListItemView = itemClasses[itemRef.classID].views.listItemView;
    return <>
      <p>Superseding items:</p>
      {supersedingItemRefs.map(itemRef =>
        <ListItemView
          key={itemRef.itemID}
          itemID={itemRef.itemID}
          itemData={itemDataResp.value[itemRefToItemPath(itemRef)]?.data}
          useRegisterItemData={useRegisterItemData}
          getRelatedItemClassConfiguration={getRelatedItemClassConfiguration}
        />
      )}
    </>;
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


const MaximizedStructuredDiff = styled(StructuredDiff)`
  position: absolute; top: 0; left: 0; bottom: 10px; right: 0;
`;


const PROPOSAL_VIEWS: { [type in PROPOSAL_TYPE_ID]: ProposalViewConfig<any> } = {
  clarification,
  addition,
  retirement,
  supersession,
}


export default Proposals;
