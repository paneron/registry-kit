/** @jsx jsx */
/** @jsxFrag React.Fragment */

import React from 'react';
import { jsx, css } from '@emotion/react';
import { Icon, Tag } from '@blueprintjs/core';
import type { RegisterStakeholder } from '../types';


export const RegisterStakeholderListItem: React.FC<{
  stakeholder: RegisterStakeholder
  showRole?: true
  isCurrentUser?: true
}> =
function ({ stakeholder, isCurrentUser, showRole }) {
  return <span>
    <Icon icon="person" />
    &nbsp;
    <span
        title={registerStakeholderPlain(stakeholder, { showRole: true })}
        css={css`white-space: break-word;`}>
      {registerStakeholderPlain(stakeholder, { showRole })}
    </span>
    &nbsp;
    {isCurrentUser
      ? <Tag round minimal intent="primary" css={css`display: inline;`}>
          you
        </Tag>
      : null}
  </span>;
}


export function registerStakeholderPlain(
  stakeholder: RegisterStakeholder,
  opts?: { showRole?: boolean },
): string {
  return `${stakeholder.name}${opts?.showRole ? ` (${formatRole(stakeholder)})` : ''}`;
}


function formatRole(stakeholder: RegisterStakeholder): string {
  return `${stakeholder.roles?.join(', ') ?? '(no roles)'}`;
}
