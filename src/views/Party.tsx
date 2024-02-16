/** @jsx jsx */
/** @jsxFrag React.Fragment */

import React, { useMemo, useContext } from 'react';
import { jsx, css } from '@emotion/react';
import { Icon, type IconName, Tag } from '@blueprintjs/core';

import { DatasetContext } from '@riboseinc/paneron-extension-kit/context';
import { BrowserCtx } from './BrowserCtx';
import { registerStakeholderPlain } from './RegisterStakeholder';


/** Parties that current user can act as, based on chosen remote username. */
export function useAvailableParties() {
  const { useRemoteUsername } = useContext(DatasetContext);
  const { value: { username } } = useRemoteUsername();
  const { registerMetadata } = useContext(BrowserCtx);
  const parties = registerMetadata?.parties;
  const partyIDs = parties
    ? Object.entries(parties).
        filter(([, party]) => party.gitServerUsername === username).
        map(([partyID, ]) => partyID).
        sort()
    : [];
  return useMemo(
    (() => Object.freeze(partyIDs)),
    [partyIDs.join(',')]);
}


export const PartyView: React.FC<{
  partyID: string
  markIfCurrentUser?: boolean
}> = function ({ partyID, markIfCurrentUser }) {
  const { useRemoteUsername } = useContext(DatasetContext);
  const { value: { username } } = useRemoteUsername();
  const { registerMetadata } = useContext(BrowserCtx);
  const party = registerMetadata?.parties[partyID];
  if (party && registerMetadata?.stakeholders) {
    const stakeholders = Object.entries(registerMetadata?.stakeholders).
      filter(([shID, ]) => party.stakeholderIDs.includes(shID)).
      map(([, sh]) => sh);
    const isCurrentUser = party.gitServerUsername === username;
    return <>
      <Icon icon={ROLE_ICONS[party.type]} />
      &nbsp;
      {stakeholders.map(sh =>
        <span title="Stakeholder information" css={css`white-space: nowrap;`}>{registerStakeholderPlain(sh)}</span>
      ).join(', ')}
      &nbsp;
      {markIfCurrentUser && isCurrentUser
        ? <Tag round minimal intent="primary" css={css`display: inline;`}>
            you
          </Tag>
        : null}
    </>;
  } else {
    return <>N/A</>;
  }
}

const ROLE_ICONS: Readonly<Record<string, IconName>> = {
  'role': 'hat',
  'individual': 'person',
  'organization': 'office',
} as const;
