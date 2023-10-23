/** @jsx jsx */
/** @jsxFrag React.Fragment */

import React from 'react';
import { jsx, css } from '@emotion/react';
import { Tag, Classes } from '@blueprintjs/core';

import HelpTooltip from '@riboseinc/paneron-extension-kit/widgets/HelpTooltip';
import DL from '@riboseinc/paneron-extension-kit/widgets/DL';

import type { Register } from '../../types/register';
import { isCreatedBy, type SomeCR, type Proposed } from '../../types/cr';
import type { RegisterStakeholder } from '../../types/stakeholder';
import { RegisterStakeholderListItem } from '../RegisterStakeholder';


const Summary: React.FC<{
  cr: SomeCR
  currentStakeholder?: RegisterStakeholder
  registerMetadata?: Register
  className?: string
}> = function ({ cr, currentStakeholder, registerMetadata, className }) {
  const crStakeholder = (registerMetadata?.stakeholders ?? []).
    find(s => s.gitServerUsername === cr.submittingStakeholderGitServerUsername);

  return (
    <DL className={`${className ?? ''} ${Classes.RUNNING_TEXT}`}>
      <div title="Justification for proposed changes">
        <dt>{(cr as Proposed).timeProposed ? "Justification": "Personal draft label"}</dt>
        <dd>{cr.justification.trim() || "(N/A)"}</dd>
      </div>

      {crStakeholder
        ? <div>
            <dt>Author:</dt>
            <dd>
              <RegisterStakeholderListItem
                stakeholder={crStakeholder}
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
          {cr.registerVersion ?? 'N/A'}
          &ensp;
          {cr.registerVersion === registerMetadata?.version?.id
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
                  Register is currently at version <strong>{registerMetadata?.version?.id ?? 'N/A'}</strong>,
                  {" "}
                  which is different from version proposal author may have had in mind.
                  {" "}
                  It is recommended that proposed changes are reviewed to avoid unintentionally
                  {" "}
                  undoing a prior change.
                </>} />
              </Tag>}
        </dd>
      </div>

      <div>
        <dt>Proposal&nbsp;ID:</dt>
        <dd><code css={css`white-space: nowrap;`}>{cr.id}</code></dd>
      </div>
    </DL>
  );
};

export default Summary;
