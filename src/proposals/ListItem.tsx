/** @jsx jsx */
/** @jsxFrag React.Fragment */

import React from 'react';
import { jsx } from '@emotion/react';
import { Datestamp } from '../views/util';
import { isDisposed, hadBeenProposed, hasSubmitterInput, type SomeCR } from './types';



export const ProposalAsListItem: React.FC<{
  proposal: SomeCR
  showTime?: boolean
}> = function ({ proposal, showTime }) {
  const justification = hasSubmitterInput(proposal) ? proposal.justification : 'N/A';

  return <span title={`${justification} (proposal ID: ${proposal.id})`}>
    {isDisposed(proposal)
      ? <><Datestamp useUTC showTime={showTime} date={proposal.timeDisposed} title="Disposed" />: </>
      : hadBeenProposed(proposal)
        ? <><Datestamp useUTC showTime={showTime} date={proposal.timeProposed} title="Proposed" />: </>
        : null}
    {justification}
  </span>;
};


export default ProposalAsListItem;
