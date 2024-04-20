import { type TagProps } from '@blueprintjs/core';
import { type ChangeProposal } from '../../proposals/types';


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
