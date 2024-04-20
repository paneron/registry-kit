/** @jsx jsx */
/** @jsxFrag React.Fragment */

import { jsx } from '@emotion/react';
import React, { memo } from 'react';
import {
  Tag,
  type TagProps,
} from '@blueprintjs/core';
import HelpTooltip from '@riboseinc/paneron-extension-kit/widgets/HelpTooltip';

import {
  type ChangeProposal,
  type Clarification,
  type Invalidation,
  type Supersession,
  type Addition,
  type Retirement,
  PROPOSAL_TYPES,
  AMENDMENT_TYPES,
  ProposalProps,
} from './types';


/** Returns props for a Tag that classifies this proposal. */
export function proposalToTagProps(proposal: ChangeProposal): TagProps {
  return {
    children: proposal.type === 'amendment'
      ? proposal.amendmentType
      : proposal.type === 'addition'
        ? "addition"
        : proposal.type === 'clarification'
          ? "clarification"
          : "(unknown proposal type)",
    intent: proposal.type === 'amendment'
      ? 'warning'
      : proposal.type === 'addition' || proposal.type === 'clarification'
        ? 'primary'
        : undefined,
  }
}



type ProposalOrAmendmentType =
  | Exclude<typeof PROPOSAL_TYPES[number], 'amendment'>
  | typeof AMENDMENT_TYPES[number];


interface ProposalViewConfig<P extends ChangeProposal> {
  summary: React.FC<ProposalProps<P>>
  hint: JSX.Element | string
}



export function ProposalType({ proposal }: { proposal: ChangeProposal }) {
  const proposalConfig = 
    proposal.type === 'amendment'
      ? PROPOSAL_VIEWS[proposal.amendmentType]
      : PROPOSAL_VIEWS[proposal.type];
  //const ProposalTypeLabel: React.FC<ProposalProps<any>> = proposalConfig.summary;
  const tagProps = proposalToTagProps(proposal);
  return (
    <Tag
      minimal
      {...tagProps}
      rightIcon={<HelpTooltip content={<>Proposed to be {proposalConfig.hint}</>} />}
    />
    
  );
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


const PROPOSAL_VIEWS: { [type in ProposalOrAmendmentType]: ProposalViewConfig<any> } = {
  clarification,
  addition,
  retirement,
  supersession,
  invalidation,
} as const;


export default ProposalType;
