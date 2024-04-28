/** @jsx jsx */
/** @jsxFrag React.Fragment */

import React, { useContext } from 'react';
import { jsx, css } from '@emotion/react';
import { Tag } from '@blueprintjs/core';

import HelpTooltip from '@riboseinc/paneron-extension-kit/widgets/HelpTooltip';
import { DatasetContext } from '@riboseinc/paneron-extension-kit/context';

import type { Register } from '../types/register';
import { RegisterStakeholderListItem } from '../views/RegisterStakeholder';
import type { RegisterStakeholder } from '../types/stakeholder';
import { crIDToCRPath } from '../views/itemPathUtils';
import useLatestAcceptedProposal from '../views/hooks/useLatestAcceptedProposal';

import ProposalAsListItem from './ListItem';
import { hasSubmitterInput, isCreatedBy, type SomeCR } from './types';


/** Proposal meta properties, must be nested within a DL. */
const Summary: React.FC<{
  cr: SomeCR
  currentStakeholder?: RegisterStakeholder
  registerMetadata?: Register
}> = function ({ cr, currentStakeholder, registerMetadata }) {
  const crStakeholder = (registerMetadata?.stakeholders ?? []).
    find(s => s.gitServerUsername === cr.submittingStakeholderGitServerUsername);

  const { useObjectData } = useContext(DatasetContext);

  let latestAcceptedProposalID: string | null | undefined;
  try {
    latestAcceptedProposalID = useLatestAcceptedProposal()?.id ?? null;
  } catch (e) {
    console.error("Failed to obtain latest accepted proposal");
    latestAcceptedProposalID = undefined;
  }

  const crPath = crIDToCRPath(cr.registerVersion);
  const previousProposal = useObjectData({
    objectPaths: crPath ? [crPath] : [],
    nounLabel: 'proposal(s)',
  }).value?.data[crPath ?? ''] as unknown ?? (crPath ? undefined : null);
  const versionView = previousProposal && hasSubmitterInput(previousProposal)
    ? <>
        <ProposalAsListItem proposal={previousProposal as SomeCR} />
        {latestAcceptedProposalID
          ? <>
              &ensp;
              {cr.registerVersion === latestAcceptedProposalID
                ? <Tag css={css`display: inline;`} intent='success' minimal round>
                    current
                    {" "}
                    <HelpTooltip intent='success' content={<>
                      Published version of the register
                      {" "}
                      had not changed since this proposal started.
                    </>} />
                  </Tag>
                : <Tag css={css`display: inline;`} intent='warning' minimal round>
                    not current
                    {" "}
                    <HelpTooltip intent='warning' icon='warning-sign' content={<>
                      Register is currently at version <strong>{latestAcceptedProposalID}</strong>,
                      {" "}
                      which is different from version proposal author may have had in mind.
                      {" "}
                      It is recommended that proposed changes are reviewed to avoid unintentionally
                      {" "}
                      undoing a prior change.
                    </>} />
                  </Tag>}
            </>
          : null}
      </>
    : cr.registerVersion ?? 'N/A';

  return (
    <>
      {crStakeholder
        ? <div>
            <dt>Author:</dt>
            <dd>
              <RegisterStakeholderListItem
                stakeholder={crStakeholder}
                showRole
                isCurrentUser={(currentStakeholder
                  ? isCreatedBy(currentStakeholder, cr)
                  : false) || undefined}
              />
            </dd>
          </div>
        : null}

      <div>
        <dt>
          Register&nbsp;version before&nbsp;proposal:
        </dt>
        <dd>
          {versionView}
        </dd>
      </div>

      <div>
        <dt>Proposal&nbsp;ID:</dt>
        <dd><code css={css`white-space: nowrap;`}>{cr.id}</code></dd>
      </div>
    </>
  );
};

export default Summary;
