/** @jsx jsx */
/** @jsxFrag React.Fragment */

import React from 'react';
import { jsx, css } from '@emotion/react';
import { Tag, Icon } from '@blueprintjs/core';
import type { Version } from '../types';
import { formatDate } from './util';


export const RegisterVersion: React.FC<{
  version: Version
  isCurrent?: true
}> =
function ({ version, isCurrent }) {
  return <>
    <Icon icon="calendar" />
    &nbsp;
    <span css={css`white-space: nowrap;`}>{registerVersionPlain(version)}</span>
    &nbsp;
    {isCurrent
      ? <Tag round intent="primary" title="This version is the current published version.">
          current
        </Tag>
      : null}
  </>;
}


export function registerVersionPlain(version: Version): string {
  return `${version.id} (published ${formatDate(version.timestamp)})`;
}
