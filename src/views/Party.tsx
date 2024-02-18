/** @jsx jsx */
/** @jsxFrag React.Fragment */

import React, { useMemo, useContext } from 'react';
import { jsx, css } from '@emotion/react';
import { Icon, type IconName, Tag } from '@blueprintjs/core';

import { DatasetContext } from '@riboseinc/paneron-extension-kit/context';
import { BrowserCtx } from './BrowserCtx';
import { registerStakeholderPlain } from './RegisterStakeholder';


const PREFERRED_PARTY_SETTING_NAME = 'preferred_party_id';


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


export function usePreferredPartyID(): string | undefined {
  const { useSettings } = useContext(DatasetContext);
  const { value: { settings } } = useSettings();
  return settings[PREFERRED_PARTY_SETTING_NAME] ?? undefined;
}


export function useCurrentUserPartyID() {
  const parties = useAvailableParties();
  const preferPartyID = usePreferredPartyID();

  if (parties.length < 1) {
    return undefined;
  }

  if (preferPartyID && parties.includes(preferPartyID)) {
    return preferPartyID;
  } else {
    return parties[0];
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
