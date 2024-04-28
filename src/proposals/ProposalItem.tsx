/** @jsx jsx */
/** @jsxFrag React.Fragment */

//import React from 'react';
import { type ItemRenderer } from '@blueprintjs/select';
import { jsx } from '@emotion/react';
import { type IconName, MenuItem } from '@blueprintjs/core';
import type {
  InternalItemReference,
  Payload,
  RegisterItem,
} from '../types';
import type { ChangeProposal } from './types';

import ProposalSummary from './ProposalSummary';
import ProposalType from './ProposalType';

export interface ChangeProposalItem {
  itemPath: string
  itemRef: InternalItemReference
  proposal: ChangeProposal
  item: RegisterItem<Payload> | null
  itemBefore: RegisterItem<Payload> | undefined
}

export const ChangeProposalItemView: ItemRenderer<ChangeProposalItem> =
(item, { handleClick, modifiers, query }) => {
  if (item.item !== null) {
    const i = item as ChangeProposalItem & { item: RegisterItem<any> };
    return (
      <MenuItem
        active={modifiers.active}
        disabled={modifiers.disabled}
        labelElement={<ProposalType proposal={i.proposal} />}
        key={item.itemPath}
        onClick={handleClick}
        icon={getProposalIcon(item.proposal)}
        text={<ProposalSummary {...i} />}
      />
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

export default ChangeProposalItemView;


export function getProposalIcon(proposal: ChangeProposal): IconName {
  return proposal.type === 'addition'
      ? 'add'
      : proposal.type === 'clarification'
        ? 'edit'
        : 'ban-circle';
}
