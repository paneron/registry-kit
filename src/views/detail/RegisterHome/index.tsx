/** @jsx jsx */
/** @jsxFrag React.Fragment */

import React, { useMemo, useContext, useEffect, useState } from 'react';
//import { Helmet } from 'react-helmet';
import { jsx, css } from '@emotion/react';
import type { ObjectChangeset } from '@riboseinc/paneron-extension-kit/types/objects';
import { Menu, MenuItem, type MenuItemProps, NonIdealState, Spinner } from '@blueprintjs/core';
import { DatasetContext } from '@riboseinc/paneron-extension-kit/context';
import { toJSONNormalized } from '@riboseinc/paneron-extension-kit/util';
import { TabbedWorkspaceContext } from '@riboseinc/paneron-extension-kit/widgets/TabbedWorkspace/context';
import { BrowserCtx } from '../../BrowserCtx';
import { ChangeRequestContext } from '../../change-request/ChangeRequestContext';
import { newCRObjectChangeset, importedProposalToCRObjectChangeset } from '../../change-request/objectChangeset';
import { isImportableCR } from '../../../types/cr';
import type { RegisterStakeholder, StakeholderRoleType } from '../../../types';
import { type SomeCR as CR } from '../../../types/cr';
import { canImportCR, canCreateCR } from '../../../types/stakeholder';
import { Protocols } from '../../protocolRegistry';
import MetaSummary from './MetaSummary';
import { TabContentsWithHeader, CardInGrid } from '../../util';
import {
  // CurrentProposal,
  Proposals,
} from './Proposal';


const RegisterHome: React.VoidFunctionComponent<Record<never, never>> =
function () {
  const { spawnTab } = useContext(TabbedWorkspaceContext);
  const {
    customViews, registerMetadata, stakeholder,
    // offline,
    itemClasses,
    setActiveChangeRequestID,
  } = useContext(BrowserCtx);
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

  const getNewEmptyCRChangeset:
  undefined | ((idea: string) => Promise<ObjectChangeset>) =
  useMemo(() => {
    if (makeRandomID && stakeholder && canCreateCR(stakeholder)) {
      return async function getNewEmptyCRChangeset (newIdea: string) {
        const crID = await makeRandomID();
        return newCRObjectChangeset(
          crID,
          newIdea,
          registerVersion!,
          stakeholder!.gitServerUsername!,
        );
      };
    } else {
      return undefined;
    }
  }, [makeRandomID, stakeholder, registerVersion]);

  const getImportedCRChangeset:
  undefined | (() => Promise<ObjectChangeset>) =
  useMemo(() => {
    if (requestFileFromFilesystem && stakeholder && canImportCR(stakeholder)) {
      return async function getImportedCRChangeset(): Promise<ObjectChangeset> {
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
          try {
            const changeset = await importedProposalToCRObjectChangeset(
              fileData,
              itemClasses,
              stakeholder!.gitServerUsername!,
              getObjectData,
              async function findObjects(predicate: string) {
                const result = await getMapReducedData({
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
                });
                // NOTE: map returns an empty object if there’re no items,
                // but we promise to return a list.
                if (!Array.isArray(result._)) {
                  return [];
                }
                return result._;
              },
            );
            return changeset;
          } catch (e) {
            throw new Error("Error reading proposal data");
          }
        } else {
          throw new Error("Invalid proposal format");
        }
      }
    } else {
      return undefined;
    }
  }, [getMapReducedData, requestFileFromFilesystem, getObjectData, stakeholder]);

  const [importCR, createCR] = useMemo(() => {
    if (updateObjects) {
      return [
        getImportedCRChangeset
          ? performOperation('importing proposal', async function () {
              await updateObjects({
                commitMessage: 'import proposal',
                objectChangeset: await getImportedCRChangeset(),
              });
            })
          : undefined,
        getNewEmptyCRChangeset
          ? performOperation('creating blank proposal', async function (newIdea: string) {
              await updateObjects({
                commitMessage: 'start new empty proposal',
                objectChangeset: await getNewEmptyCRChangeset(newIdea),
              });
            })
          : undefined,
      ];
    } else {
      return [undefined, undefined];
    }
  }, [performOperation, updateObjects, getImportedCRChangeset, getNewEmptyCRChangeset]);

  // Actionable proposals
  const [actionableProposals, setActionableProposals] =
  useState<[string, CR[] | undefined][]>([]);
  const [reqCounter, setReqCounter] = useState(1);
  useEffect(() => {
    let cancelled = false;
    if (stakeholder) {
      const proposalGroups = getActionableProposalGroupsForRole(stakeholder.role);
      setActionableProposals(proposalGroups.map(([groupLabel, ]) => [groupLabel, undefined]));

      console.debug("TEST1");
      async function updateItems([ groupLabel, , queryGetter ]: ActionableProposalGroup) {
        const query = queryGetter(stakeholder);

        console.debug("TEST2", query);
        const mapFunc = `
          const objPath = key, obj = value;
          if ((${CR_BASE_QUERY}) && (${query})) {
            emit(obj);
          }
        `;
        const result = await getMapReducedData({
          chains: { _: { mapFunc } },
        });
        if (!Array.isArray(result._)) {
          console.error("Weird result", result);
        }
        if (!cancelled) {
          setActionableProposals(previousGroups =>
            previousGroups.map(([previousGroupLabel, previousProposals]) =>
              previousGroupLabel === groupLabel
                ? [previousGroupLabel, Array.isArray(result._) ? result._ : []]
                : [previousGroupLabel, previousProposals]
            )
          );
        }

      };
      proposalGroups.map(updateItems);
    } else {
      setActionableProposals([]);
    }
    return function cleanUp() { cancelled = true; };
  }, [stakeholder, reqCounter, getMapReducedData]);

  const customActions = useMemo(() => customViews.map(cv => ({
    key: cv.id,
    text: cv.label,
    title: cv.description,
    icon: cv.icon,
    onClick: () => spawnTab(`${Protocols.CUSTOM_VIEW}:${cv.id}/index`),
  })), [spawnTab, customViews]);

  const proposalBlocks: JSX.Element[] = useMemo(() => {
    const blocks: JSX.Element[] = [];
    if (actionableProposals.find(p => p[1] && p[1].length > 0) || activeCR || importCR || createCR) {
      blocks.push(
        <HomeBlock
          View={Proposals}
          key="proposal dashboard"
          description="Actionable proposals"
          css={css`
            height: 300px; flex-basis: 20%; flex-grow: 1;
          `}
          props={{
            stakeholder,
            activeCR,
            register: registerMetadata || undefined,
            actionableProposals,
            onImport: importCR,
            onCreate: createCR,
            onRefreshProposals: () => setReqCounter(c => c + 1),
            onExitProposal: setActiveChangeRequestID
              ? () => setActiveChangeRequestID?.(null)
              : undefined,
            onEnterProposal: setActiveChangeRequestID
              ? crid => { setActiveChangeRequestID?.(crid) }
              : undefined,
          }}
        />
      );
    }
    // if (activeCR) {
    //   blocks.push(
    //     <HomeBlock
    //       View={ProposalStatus}
    //       key="active proposal status"
    //       description="Current proposal status"
    //       props={{
    //         activeCR,
    //       }}
    //     />
    //   );
    // }
    return blocks;
  }, [importCR, createCR, registerMetadata, stakeholder, activeCR, toJSONNormalized(actionableProposals)]);

    // if (activeCR) {
    //   return <HomeBlock
    //     View={CurrentProposal}
    //     props={activeCR
    //       ? { proposal: activeCR, stakeholder }
    //       : activeCR}
    //     actions={[{
    //       text: "Exit proposal view",
    //       onClick: () => setActiveChangeRequestID?.(null),
    //       disabled: !setActiveChangeRequestID,
    //     }]}
    //   />;
    // } else {
    //   const importAction: MenuItemProps = {
    //     text: "Import proposal",
    //     icon: 'import',
    //     disabled: !canCreateCR,
    //     onClick: handleImportProposal,
    //   };
    //   switch (stakeholder?.role) {
    //     case 'submitter':
    //     case 'owner':
    //     case 'manager':
    //     case 'control-body':
    //       return <HomeBlock
    //         View={NewProposal}
    //         props={!offline && registerMetadata
    //           ? {
    //               stakeholder,
    //               register: registerMetadata,
    //               onPropose: canCreateCR ? handleNewProposal : undefined,
    //             }
    //           : null}
    //         actions={!offline && registerMetadata
    //           ? [importAction]
    //           : []}
    //         error={offline
    //           ? <>
    //               Because this repository is offline (no remote configured),
    //               and remote username is currently required for proposal,
    //               you cannot create proposals.
    //             </>
    //           : !registerMetadata
    //             ? "Unable to retrieve register metadata"
    //             : undefined}
    //       />;
    //     case undefined:
    //     default:
    //       return <HomeBlock
    //         View={CurrentProposal}
    //         props={null}
    //         error="View view is not implemented yet"
    //       />;
    //   }
    // }

  return (
    <TabContentsWithHeader
        title={registerMetadata?.name ?? 'Register'}
        layout="card-grid">

      <HomeBlock
        View={MetaSummary}
        description="Register summary"
        props={registerMetadata
          ? { register: registerMetadata, stakeholder }
          : registerMetadata}
        error={registerMetadata === null ? "Failed to load register metadata" : undefined}
        css={css`height: 300px`}
        actions={[{
          text: "View or edit register metadata",
          onClick: () => spawnTab(Protocols.REGISTER_META),
          icon: "properties",
        }]}
      />

      {customActions.length > 0
        ? <HomeBlock
            description="Custom actions"
            View={() => <></>}
            props={{}}
            actions={customActions}
          />
        : null}

      {proposalBlocks}

    </TabContentsWithHeader>
  );
}

export default RegisterHome;


interface HomeBlockProps<P extends Record<string, any>> {
  View: React.VoidFunctionComponent<P>,
  description: string,
  props: P | null | undefined,
  error?: string | JSX.Element,
  actions?: MenuItemProps[],
  className?: string,
}
function HomeBlock<P extends Record<string, any>>(
  { View, description, props, error, actions, className }: HomeBlockProps<P>
) {
  return (
    <CardInGrid
        css={css`padding: 5px; display: flex; flex-flow: column nowrap;`}
        description={description}
        className={className}>
      <div css={css`position: relative; flex: 1; padding: 5px;`}>
        {props
          ? <View {...props} />
          : props === undefined
            ? <NonIdealState icon={<Spinner />} />
            : <NonIdealState icon="heart-broken" title="Failed to load" description={error} />}
      </div>
      {actions
        ? <Menu css={css`background: none !important;`}>
            {actions.map((mip, idx) => <MenuItem key={idx} {...mip }/>)}
          </Menu>
        : null}
    </CardInGrid>
  );
}


function getActionableProposalGroupsForRole(role: StakeholderRoleType): ActionableProposalGroup[] {
  return CR_QUERIES_FOR_ROLES.filter(([, roles]) => roles.has(role));
}


const CR_BASE_QUERY = 'objPath.indexOf("/proposals/") === 0 && objPath.endsWith("main.yaml")';
type ActionableProposalGroup = readonly [
  label: string,
  roles: Set<StakeholderRoleType>,
  queryGetter: (stakeholder?: RegisterStakeholder) => string,
];
const CR_QUERIES_FOR_ROLES: readonly ActionableProposalGroup[] =
[
  ['unsubmitted', new Set(['submitter', 'manager', 'control-body', 'owner']), function submitterProposals(stakeholder) {
    if (stakeholder && stakeholder.gitServerUsername) {
      const stakeholderUsername = stakeholder.gitServerUsername;
      const stakeholderRole = stakeholder.role;
      const stakeholderCondition = stakeholderRole !== 'submitter'
        ? 'true'
        : `obj.submittingStakeholderGitServerUsername === "${stakeholderUsername}"`
      // Don’t show drafts in the list of pending proposals, unless it’s user’s own drafts.
      const query = `(obj.state === "draft" || obj.state === "returned-for-clarification") && ${stakeholderCondition}`;
      return query;
    } else {
      return 'false';
    }
  }],
  ['pending manager review', new Set(['manager', 'control-body', 'owner']), function managerProposals() {
    return 'false';
  }],
  ['pending control body review', new Set(['control-body', 'owner']), function cbProposals() {
    return 'false';
  }],
  ['pending owner review', new Set(['owner']), function ownerProposals() {
    return 'false';
  }],
] as const;
