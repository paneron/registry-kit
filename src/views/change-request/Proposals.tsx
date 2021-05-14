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
  Retirement,
  Supersession,
} from '../../types';
import { BrowserCtx } from '../BrowserCtx';
import { itemPathToItemRef } from '../itemPathUtils';


interface ChangeProposalItem {
  itemPath: string
  proposal: ChangeProposal
}


const ChangeProposalSelect = Select.ofType<ChangeProposalItem>();


const Proposals: React.FC<{
  proposals: ChangeRequest['proposals']
  onChange?: (newProposals: ChangeRequest['proposals']) => void
}> = function ({ proposals, onChange }) {
  const [selectedProposal, selectProposal] = useState<string | null>(null);

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
              }))}
            popoverProps={{ minimal: true }}
            itemRenderer={ChangeProposalItemView}
            onItemSelect={(item) => selectProposal(item.itemPath)}
          />
        : null}
      {selectedProposal
        ? <Proposal proposal={proposals[selectedProposal]} />
        : <NonIdealState description="No proposal to show." />}
    </>
  );
};


const ChangeProposalItemView: ItemRenderer<ChangeProposalItem> =
(item, { handleClick, modifiers, query }) => {
  //const { useObjectData } = useContext(DatasetContext);
  const { useRegisterItemData, getRelatedItemClassConfiguration, subregisters, itemClasses } = useContext(BrowserCtx);
  const { classID, itemID } = itemPathToItemRef(subregisters !== undefined, item.itemPath);
  const ItemView = itemClasses[classID].views.listItemView;
  const referenceItemData = useRegisterItemData({ itemPaths: [item.itemPath ]});
  const data = (item.proposal.type === 'clarification' || item.proposal.type === 'addition')
    ? item.proposal.payload
    : referenceItemData.value[item.itemPath]?.data;

  return (
    <MenuItem
      active={modifiers.active}
      disabled={modifiers.disabled}
      key={item.itemPath}
      onClick={handleClick}
      text={<>
        {item.proposal.type}:
        {data
          ? <ItemView
              itemID={itemID}
              itemData={data}
              useRegisterItemData={useRegisterItemData}
              getRelatedItemClassConfiguration={getRelatedItemClassConfiguration}
            />
          : <>Item data not available</>}

      </>} />
  );
}


interface ProposalProps<P extends ChangeProposal> {
  proposal: P
  onChange?: (newProposal: P) => void
}
export const Proposal: React.FC<ProposalProps<ChangeProposal>> =
function ({ proposal, onChange }) {
  let proposalView: JSX.Element;
  switch (proposal.type) {
    case 'clarification':
      proposalView = <ClarificationDetails proposal={proposal} onChange={onChange} />;
      break;
    case 'addition':
      proposalView = <AdditionDetails proposal={proposal} onChange={onChange} />;
      break;
    case 'amendment':
      switch (proposal.amendmentType) {
        case 'retirement':
          proposalView = <RetirementDetails proposal={proposal} onChange={onChange} />;
          break;
        case 'supersession':
          proposalView = <SupersessionDetails proposal={proposal} onChange={onChange} />;
          break;
      }
  }
  return proposalView;
};


const ClarificationDetails: React.FC<ProposalProps<Clarification>> =
function ({ proposal, onChange }) {
  return <>clarification</>;
}


const AdditionDetails: React.FC<ProposalProps<Addition>> =
function ({ proposal, onChange }) {
  return <>addition</>;
}


const RetirementDetails: React.FC<ProposalProps<Retirement>> =
function ({ proposal, onChange }) {
  return <>retirement</>;
}


const SupersessionDetails: React.FC<ProposalProps<Supersession>> =
function ({ proposal, onChange }) {
  return <>supersession</>;
}


export default Proposals;
