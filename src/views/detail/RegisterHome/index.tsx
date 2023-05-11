/** @jsx jsx */
/** @jsxFrag React.Fragment */

import React, { useContext, useState } from 'react';
//import { Helmet } from 'react-helmet';
import { jsx, css } from '@emotion/react';
import { Menu, MenuDivider, MenuItem, InputGroup, Button, NonIdealState, Spinner, Callout } from '@blueprintjs/core';
import { DatasetContext } from '@riboseinc/paneron-extension-kit/context';
import { TabbedWorkspaceContext } from '@riboseinc/paneron-extension-kit/widgets/TabbedWorkspace/context';
import { BrowserCtx } from '../../BrowserCtx';
import { registerStakeholderPlain } from '../../RegisterStakeholder';
import { newCRObjectChangeset } from '../../change-request/objectChangeset';

import { Protocols } from '../../protocolRegistry';
import { crIDToCRPath } from '../../itemPathUtils';


const RegisterHome: React.VoidFunctionComponent<Record<never, never>> =
function () {
  const { spawnTab } = useContext(TabbedWorkspaceContext);
  const { customViews, registerMetadata, stakeholder, offline } = useContext(BrowserCtx);
  const { makeRandomID, updateObjects, performOperation } = useContext(DatasetContext);

  const [ newProposalIdea, setNewProposalIdea ] = useState<string>('');

  const registerVersion = registerMetadata?.version;
  const canCreateCR = (
    stakeholder &&
    stakeholder.role &&
    stakeholder.gitServerUsername?.trim() !== '' &&
    makeRandomID &&
    updateObjects &&
    (registerVersion?.id ?? '').trim() !== '');

  async function createCR(justification: string): Promise<string> {
    if (canCreateCR) {
      const id = await makeRandomID();
      await updateObjects({
        commitMessage: "start new proposal",
        objectChangeset: newCRObjectChangeset(
          id,
          justification,
          registerVersion!,
          stakeholder.gitServerUsername!,
        ),
      });
      return id;
    } else {
      throw new Error("Unable to create proposal: read-only dataset");
    }
  }

  async function handleNewProposal() {
    if (newProposalIdea) {
      const crID = await performOperation("creating proposal", createCR)(newProposalIdea);
      setNewProposalIdea('');
      spawnTab(`${Protocols.CHANGE_REQUEST}:${crIDToCRPath(crID)}`);
    }
  }

  const menu = (
    <Menu css={css`margin: 10px;`}>
      <MenuDivider title="Quick links" />
      {customViews.map((cv, _) => 
        <MenuItem
          key={cv.id}
          text={cv.label}
          title={cv.description}
          icon={cv.icon}
          onClick={() => spawnTab(`${Protocols.CUSTOM_VIEW}:${cv.id}/index`)}
        />
      )}
      {customViews.length > 0 ? <MenuDivider /> : null}

      <MenuItem
        text={`Propose a change to version ${registerMetadata?.version?.id ?? '(missing)'}`}
        disabled={!canCreateCR}
        icon="lightbulb"
        title={canCreateCR
            ? "A blank proposal will be created and opened in a new tab."
            : undefined}>
        <InputGroup
          value={newProposalIdea || undefined}
          placeholder="Your idea…"
          title="Justification draft (you can change this later)"
          onChange={evt => setNewProposalIdea(evt.currentTarget.value)}
          rightElement={
            <Button
              small
              intent={newProposalIdea ? 'primary': undefined}
              disabled={!newProposalIdea}
              onClick={handleNewProposal}
              icon="tick"
            />
          }
        />
      </MenuItem>
      <MenuItem
        text="View register metadata"
        icon="properties"
        onClick={() => spawnTab(Protocols.REGISTER_META)}
      />
    </Menu>
  );

  const intro = <Callout intent="primary" css={css`text-align: left;`}>
    {stakeholder
      ? <>You can create proposals as {registerStakeholderPlain(stakeholder)}.</>
      : offline
        ? <>
            Because this repository is offline (no remote configured),
            and remote username is currently required for proposal,
            you cannot create proposals.</>
        : <>
            Since your remote username is not in the list of stakeholders,
            you cannot create proposals currently.
          </>}
  </Callout>

  const greeting = registerMetadata
    ? <NonIdealState
        title={`Welcome to ${registerMetadata.name}`}
        description={<>
          {intro}
          {menu}
        </>}
      />
    : registerMetadata === undefined
      ? <NonIdealState
          icon={<Spinner />}
          description="Loading register information…"
        />
      : <NonIdealState
          icon="heart-broken"
          title="Register metadata is missing or invalid."
          description={<>
            {menu}
          </>}
        />;

  return greeting;
}

export default RegisterHome;
