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
  // TODO: Sort party IDs by party name?
  const partyIDs = parties
    ? Object.entries(parties).
        filter(([, party]) => party.gitServerUsername === username).
        map(([partyID, ]) => partyID).
        sort()
    : [];
  return useMemo(
    (() => Object.freeze(partyIDs)),
    [partyIDs.join(',')],
  );
}

function usePreferredPartyID(): string | undefined {
  const { useSettings } = useContext(DatasetContext);
  const { value: { settings } } = useSettings();
  return settings[PREFERRED_PARTY_SETTING_NAME] ?? undefined;
}

export function setPreferredPartyID(partyID: string) {
  const { updateSetting } = useContext(DatasetContext);
  return updateSetting({ key: PREFERRED_PARTY_SETTING_NAME, value: partyID });
}

/** Retrieves current user’s active party (preferred or first available). */
export function useCurrentUserPartyID() {
  const parties = useAvailableParties();
  const preferPartyID = usePreferredPartyID();

  if (parties.length < 1) {
    return undefined;
  } else if (parties.length === 1) {
    return parties[0];
  } else if (preferPartyID && parties.includes(preferPartyID)) {
    return preferPartyID;
  } else {
    return parties[0];
  }
}

/** Retrieves full party information about all specified party IDs. */
export function useParties(partyIDs: string[]) {
  const { registerMetadata } = useContext(BrowserCtx);
  const allPartyIDs = Object.keys(registerMetadata?.parties ?? {});
  const parties = partyIDs.length < 1 || allPartyIDs.length < 1
    ? []
    : partyIDs.map(partyID => registerMetadata?.parties?.[partyID]).
        filter(party => party !== undefined).
        map(p => p!);
  return useMemo(
    () => Object.freeze(parties),
    [partyIDs.join(','), allPartyIDs.join(',')],
  )
}

/** Retrieves full party information about current user’s active party. */
export function useParty() {
  const { registerMetadata } = useContext(BrowserCtx);
  const partyID = useCurrentUserPartyID();
  const parties = registerMetadata?.parties ?? {};
  const partyIDs = Object.keys(parties);
  const party = partyID && partyIDs.length > 0
    ? parties[partyID]
    : undefined;
  return useMemo(
    () => Object.freeze(party),
    [partyID, partyIDs.join(',')],
  );
}

/** Stakeholders that current user’s active party is associated with. */
export function useStakeholders() {
  const { registerMetadata } = useContext(BrowserCtx);
  const party = useParty();
  // TODO: Sort stakeholders by name?
  const stakeholders = party && registerMetadata?.stakeholders
    ? Object.entries(registerMetadata.stakeholders).
        filter(([stakeholderID, ]) => party.stakeholderIDs.includes(stakeholderID))
    : [];
  return useMemo(
    () => Object.freeze(stakeholders.map(([, s]) => s)),
    [party, stakeholders.map(([sID, ]) => sID).join(',')],
  );
}


/** Stakeholder roles that current user’s active party inherit. */
export function useRoles() {
  const stakeholders = useStakeholders();
  const roles = stakeholders.map(s => s.role).sort();
  return useMemo(
    () => roles,
    [roles.join(',')],
  );
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
