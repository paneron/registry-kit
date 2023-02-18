/** @jsx jsx */
/** @jsxFrag React.Fragment */

import React from 'react';
import { jsx, css } from '@emotion/react';
import { Icon, Tag } from '@blueprintjs/core';
import { RegisterStakeholder } from '../types';


export const RegisterStakeholderListItem: React.FC<{
  stakeholder: RegisterStakeholder
  isCurrentUser?: true
}> =
function ({ stakeholder, isCurrentUser }) {
  return <>
    <Icon icon="person" />
    &nbsp;
    <span css={css`white-space: nowrap;`}>{registerStakeholderPlain(stakeholder)}</span>
    &nbsp;
    {isCurrentUser ? <Tag round intent="primary">you</Tag> : null}
  </>;
}


export function registerStakeholderPlain(stakeholder: RegisterStakeholder): string {
  return `${stakeholder.name} (${stakeholder.role ?? 'unspecified role'})`;
}
