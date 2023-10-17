/** @jsx jsx */
/** @jsxFrag React.Fragment */

import React from 'react';
import { jsx, css } from '@emotion/react';
import { Tag, Divider } from '@blueprintjs/core';

import HelpTooltip from '@riboseinc/paneron-extension-kit/widgets/HelpTooltip';

import type { Register } from '../../types/register';
import { isCreatedBy, type SomeCR } from '../../types/cr';
import type { RegisterStakeholder } from '../../types/stakeholder';
import { RegisterStakeholderListItem } from '../RegisterStakeholder';


const Summary: React.FC<{
  cr: SomeCR
  currentStakeholder: RegisterStakeholder
  registerMetadata: Register
}> = function ({ cr, currentStakeholder, registerMetadata }) {

  const crStakeholder = (registerMetadata?.stakeholders ?? []).
    find(s => s.gitServerUsername === cr.submittingStakeholderGitServerUsername);

  return (
    <>
      {crStakeholder
        ? <div>
            Author: <RegisterStakeholderListItem
              stakeholder={crStakeholder}
              isCurrentUser={isCreatedBy(currentStakeholder, cr) || undefined}
            />
          </div>
        : null}

      <Divider />
      <div>
        Register&nbsp;version before&nbsp;proposal: <strong>{cr.registerVersion ?? 'N/A'}</strong>
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
      </div>
    </>
  );
};

export default Summary;
