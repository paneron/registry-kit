/** @jsx jsx */
/** @jsxFrag React.Fragment */

import React, { useMemo, useContext } from 'react';
//import { Helmet } from 'react-helmet';
import { jsx, css } from '@emotion/react';
import type { ObjectChangeset } from '@riboseinc/paneron-extension-kit/types/objects';
import { Card, Menu, MenuItem, type MenuItemProps, NonIdealState, Spinner } from '@blueprintjs/core';
import { registerStakeholderPlain } from '../../RegisterStakeholder';
import { DatasetContext } from '@riboseinc/paneron-extension-kit/context';
import { TabbedWorkspaceContext } from '@riboseinc/paneron-extension-kit/widgets/TabbedWorkspace/context';
import { BrowserCtx } from '../../BrowserCtx';
import { ChangeRequestContext } from '../../change-request/ChangeRequestContext';
import { newCRObjectChangeset, importedProposalToCRObjectChangeset } from '../../change-request/objectChangeset';
import { isImportableCR } from '../../../types/cr';
import { Protocols } from '../../protocolRegistry';
import { crIDToCRPath } from '../../itemPathUtils';
import { GriddishContainer } from '../../../views/util'; 
import MetaSummary from './MetaSummary';
import { TabContentsWithActions } from '../../util';
import { CurrentProposal, NewProposal } from './Proposal';


const RegisterHome: React.VoidFunctionComponent<Record<never, never>> =
function () {
  const { spawnTab } = useContext(TabbedWorkspaceContext);
  const { customViews, registerMetadata, stakeholder, offline, itemClasses, setActiveChangeRequestID } = useContext(BrowserCtx);
  const { changeRequest: activeCR } = useContext(ChangeRequestContext);
  const {
    requestFileFromFilesystem,
    makeRandomID,
    getObjectData,
    updateObjects,
    performOperation,
    getMapReducedData,
  } = useContext(DatasetContext);

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

  async function handleNewProposal(newProposalIdea: string) {
    if (newProposalIdea.trim()) {
      const crID = await performOperation("creating proposal", createCR)(newProposalIdea);
      spawnTab(`${Protocols.CHANGE_REQUEST}:${crIDToCRPath(crID)}`);
    }
  }

  async function getCRImportChangeset(): Promise<[ObjectChangeset, string]> {
    if (!requestFileFromFilesystem) {
      throw new Error("Cannot request file from filesystem");
    }
    const data = await requestFileFromFilesystem({
      prompt: "Select one register proposal JSON file",
      filters: [
        { name: "JSON files", extensions: ['.json'] },
      ],
    });
    const fileData = Object.values(data)[0]!;
    if (!fileData) {
      throw new Error("No file was selected");
    }
    if (isImportableCR(fileData)) {
      const crID = fileData.proposalDraft.id;
      try {
        const changeset = await importedProposalToCRObjectChangeset(
          fileData,
          itemClasses,
          stakeholder!.gitServerUsername!,
          getObjectData,
          async function findObjects(predicate: string) {
            const result = (await getMapReducedData({
              chains: {
                _: {
                  mapFunc: `
                    const data = value.data;
                    if (data && (${predicate})) {
                      emit({ objectPath: key, objectData: value });
                    }
                  `,
                },
              },
            }));
            // NOTE: map returns an empty object if there’re no items,
            // but we promise to return a list.
            if (!Array.isArray(result._)) {
              return [];
            }
            return result._;
          },
        );
        return [changeset, crID];
      } catch (e) {
        throw new Error("Error reading proposal data");
      }
    } else {
      throw new Error("Invalid proposal format");
    }
  }

  async function handleImportProposal() {
    const [objectChangeset, crID] = await performOperation(
      'reading proposal data',
      getCRImportChangeset,
    )();

    await performOperation(
      'creating proposal',
      updateObjects ?? (async () => { throw new Error("Read-only dataset"); }),
    )({
      commitMessage: "import proposal",
      objectChangeset,
    });

    spawnTab(`${Protocols.CHANGE_REQUEST}:${crIDToCRPath(crID)}`);
  }

  const customActions = useMemo(() => customViews.map(cv => ({
    key: cv.id,
    text: cv.label,
    title: cv.description,
    icon: cv.icon,
    onClick: () => spawnTab(`${Protocols.CUSTOM_VIEW}:${cv.id}/index`),
  })), [spawnTab, customViews]);

  let proposalBlock = useMemo(() => {
    if (activeCR) {
      return <HomeBlock
        View={CurrentProposal}
        props={activeCR
          ? { proposal: activeCR, stakeholder }
          : activeCR}
        actions={[{
          text: "Exit proposal view",
          onClick: () => setActiveChangeRequestID?.(null),
          disabled: !setActiveChangeRequestID,
        }]}
      />;
    } else {
      const importAction: MenuItemProps = {
        text: "Import proposal",
        icon: 'import',
        disabled: !canCreateCR,
        onClick: handleImportProposal,
      };
      switch (stakeholder?.role) {
        case 'submitter':
        case 'owner':
        case 'manager':
        case 'control-body':
          return <HomeBlock
            View={NewProposal}
            props={!offline && registerMetadata
              ? {
                  stakeholder,
                  register: registerMetadata,
                  onPropose: canCreateCR ? handleNewProposal : undefined,
                }
              : null}
            actions={!offline && registerMetadata
              ? [importAction]
              : []}
            error={offline
              ? <>
                  Because this repository is offline (no remote configured),
                  and remote username is currently required for proposal,
                  you cannot create proposals.
                </>
              : !registerMetadata
                ? "Unable to retrieve register metadata"
                : undefined}
          />;
        case undefined:
        default:
          return <HomeBlock
            View={CurrentProposal}
            props={null}
            error="View view is not implemented yet"
          />;
      }
    }
  }, [stakeholder, activeCR, canCreateCR, registerMetadata, setActiveChangeRequestID]);

  return (
    <TabContentsWithActions
      actions={
        <>
          Acting as {stakeholder
            ? <>stakeholder: {registerStakeholderPlain(stakeholder)}</>
            : <>non-stakeholder</>}
        </>
      }
      main={
        <GriddishContainer>
          <HomeBlock
            View={MetaSummary}
            props={registerMetadata
              ? { register: registerMetadata, stakeholder }
              : registerMetadata}
            error={registerMetadata === null ? "Failed to load register metadata" : undefined}
            actions={useMemo(() => [{
              text: "View or edit register metadata",
              onClick: () => spawnTab(Protocols.REGISTER_META),
              icon: "properties",
            }], [spawnTab])}
          />
          {proposalBlock}
          {customActions.length > 0
            ? <HomeBlock View={() => <></>} props={{}} actions={customActions} />
            : null}
        </GriddishContainer>
      }
    />
  );
}

export default RegisterHome;


interface HomeBlockProps<P extends Record<string, any>> {
  View: React.VoidFunctionComponent<P>,
  props: P | null | undefined,
  error?: string | JSX.Element,
  actions?: MenuItemProps[],
}
function HomeBlock<P extends Record<string, any>>(
  { View, props, error, actions }: HomeBlockProps<P>
) {
  return (
    <Card css={css`padding: 11px; border-radius: 5px;`}>
      {props
        ? <View {...props} />
        : props === undefined
          ? <NonIdealState icon={<Spinner />} />
          : <NonIdealState icon="heart-broken" title="Failed to load" description={error} />}
      {actions
        ? <Menu>
            {actions.map((mip, idx) => <MenuItem key={idx} {...mip }/>)}
          </Menu>
        : null}
    </Card>
  );
}
