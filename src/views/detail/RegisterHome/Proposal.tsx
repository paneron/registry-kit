/** @jsx jsx */
/** @jsxFrag React.Fragment */

import React, { useState, useCallback } from 'react';
import { jsx } from '@emotion/react';
import { Button, InputGroup } from '@blueprintjs/core';
import type { Register, RegisterStakeholder } from '../../../types';
import { type SomeCR as CR } from '../../../types/cr';


export const CurrentProposal: React.VoidFunctionComponent<{
  proposal: CR
  stakeholder?: RegisterStakeholder
  className?: string
}> = function ({ proposal, className }) {
  return (
    <div className={className}>
      {proposal.id}
    </div>
  );
};


export const NewProposal: React.VoidFunctionComponent<{
  stakeholder: RegisterStakeholder
  register: Register
  onPropose?: (idea: string) => void
  className?: string
}> = function ({ stakeholder, register, onPropose, className }) {
  const [ newProposalIdea, setNewProposalIdea ] = useState<string>('');

  const handleNewProposal = useCallback(() => {
    onPropose?.(newProposalIdea);
    setNewProposalIdea('');
  }, [onPropose]);

  return (
    <div className={className}>
      <p>
        Propose a change to version {register.version?.id ?? '(N/A)'}
      </p>
      <InputGroup
        value={newProposalIdea || undefined}
        placeholder="Your idea…"
        title="Justification draft (you can change this later)"
        onChange={evt => setNewProposalIdea(evt.currentTarget.value)}
        rightElement={
          <Button
            small
            intent={newProposalIdea ? 'primary': undefined}
            disabled={!newProposalIdea.trim() || !onPropose}
            title="A blank proposal will be created and opened in a new tab."
            onClick={handleNewProposal}
            icon="tick"
          />
        }
      />
    </div>
  );
};
