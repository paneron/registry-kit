/** @jsx jsx */
/** @jsxFrag React.Fragment */

import React, { useContext, useMemo } from 'react';
import { jsx, css } from '@emotion/react';
import { Tag } from '@blueprintjs/core';

import HelpTooltip from '@riboseinc/paneron-extension-kit/widgets/HelpTooltip';
import { DatasetContext } from '@riboseinc/paneron-extension-kit/context';

import { RegisterStakeholderListItem } from '../views/RegisterStakeholder';
import type { Register, RegisterStakeholder } from '../types';
import { crIDToCRPath } from '../views/itemPathUtils';
import useLatestAcceptedProposal from '../views/hooks/useLatestAcceptedProposal';

import ProposalAsListItem from './ListItem';
import { hasSubmitterInput, isCreatedBy, type SomeCR } from './types';


/** Proposal meta properties, must be nested within a DL. */
const Summary: React.FC<{
  cr: SomeCR
  register?: Register
  currentStakeholder?: RegisterStakeholder
  submittingStakeholder?: RegisterStakeholder
  compareRegisterVersion?: boolean
}> = function ({ cr, currentStakeholder, register, compareRegisterVersion }) {
  const { useObjectData } = useContext(DatasetContext);

  const crPath = crIDToCRPath(cr.registerVersion);
  const previousProposal = useObjectData({
    objectPaths: crPath ? [crPath] : [],
    nounLabel: 'proposal(s)',
  }).value?.data[crPath ?? ''] as unknown ?? (crPath ? undefined : null);

  const registerVersion = previousProposal && hasSubmitterInput(previousProposal)
    ? <ProposalAsListItem showTime proposal={previousProposal as SomeCR} />
    : cr.registerVersion ?? 'N/A';

  let currentVersion: string | undefined;
  try {
    currentVersion = useLatestAcceptedProposal()?.id ?? undefined;
  } catch (e) {
    console.error("Failed to obtain latest accepted proposal");
    currentVersion = undefined;
  }

  const submittingStakeholder = useMemo(
    (() => (register?.stakeholders ?? []).find(s => isCreatedBy(s, cr))),
    [register, cr]);

  const isCurrentMarker = useMemo(() => {
    const proposedAgainstCurrentVersion = cr.registerVersion === currentVersion;
    const shouldShowMarker = compareRegisterVersion && cr.registerVersion;
    const marker = shouldShowMarker
      ? <Tag
            css={css`display: inline;`}
            intent={currentVersion
              ? proposedAgainstCurrentVersion
                ? 'success'
                : 'warning'
              : undefined}
            minimal
            round>
          {currentVersion
            ? proposedAgainstCurrentVersion
              ? <>
                  current
                  {" "}
                  <HelpTooltip intent='success' content={<>
                    Published version of the register
                    {" "}
                    had not changed since this proposal started.
                  </>} />
                </>
              : <>
                  not current
                  {" "}
                  <HelpTooltip intent='warning' icon='warning-sign' content={<>
                    Register is currently at version <strong>{currentVersion}</strong>,
                    {" "}
                    which is different from version proposal author may have had in mind.
                    {" "}
                    It is recommended that proposed changes are reviewed to avoid unintentionally
                    {" "}
                    undoing a prior change.
                  </>} />
                </>
            : <>
                unable to compare
                {" "}
                <HelpTooltip intent={undefined} icon='warning-sign' content={<>
                  Unable to determine current register version.
                  {" "}
                  This may be the case if there are no accepted proposals
                  (since register version is derived from latest accepted proposal).
                  {" "}
                  Barring that, there may be a data integrity issue.
                </>} />
              </>}
        </Tag>
      : null;
    return marker ? <>&ensp;{marker}</> : null;
  }, [cr.registerVersion, currentVersion, compareRegisterVersion]);

  return (
    <>
      {submittingStakeholder
        ? <div>
            <dt>Author:</dt>
            <dd>
              <RegisterStakeholderListItem
                stakeholder={submittingStakeholder}
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
          {registerVersion}
          {isCurrentMarker}
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
