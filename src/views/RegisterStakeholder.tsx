/** @jsx jsx */
/** @jsxFrag React.Fragment */

import React from 'react';
import { jsx } from '@emotion/react';
import { Icon, Tag } from '@blueprintjs/core';
import { RegisterStakeholder } from '../types';


export const RegisterStakeholderListItem: React.FC<{
  stakeholder: RegisterStakeholder
  isCurrentUser?: true
}> =
function ({ stakeholder, isCurrentUser }) {
  return <>
    <Icon icon="person" />
    &ensp;
    {stakeholder.name}
    &nbsp;
    {isCurrentUser ? <Tag round intent="primary">you</Tag> : null}
  </>;
}
