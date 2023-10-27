/** @jsx jsx */
/** @jsxFrag React.Fragment */

import React, {
  useMemo,
  useContext,
  useState,
} from 'react';
//import { Helmet } from 'react-helmet';
import { jsx, css } from '@emotion/react';
import type { ObjectChangeset } from '@riboseinc/paneron-extension-kit/types/objects';
import { type MenuItemProps } from '@blueprintjs/core';
import { DatasetContext } from '@riboseinc/paneron-extension-kit/context';
import { TabbedWorkspaceContext } from '@riboseinc/paneron-extension-kit/widgets/TabbedWorkspace/context';
import { BrowserCtx } from '../../BrowserCtx';
import { ChangeRequestContext } from '../../change-request/ChangeRequestContext';
import { crIDToCRPath } from '../../itemPathUtils';
import { newCRObjectChangeset, importedProposalToCRObjectChangeset } from '../../change-request/objectChangeset';
import { isImportableCR } from '../../../types/cr';
import type { RegisterStakeholder, StakeholderRoleType } from '../../../types';
import { type SomeCR as CR, State } from '../../../types/cr';
import { canBeTransitionedBy } from '../../change-request/TransitionOptions';
import { canImportCR, canCreateCR } from '../../../types/stakeholder';
import { Protocols } from '../../protocolRegistry';
import MetaSummary from './MetaSummary';
import { Proposals, CurrentProposal } from './Proposal';
import { TabContentsWithHeader } from '../../util';
import HomeBlock from './Block';


const RegisterHome: React.VoidFunctionComponent<Record<never, never>> =
function () {
  const { spawnTab } = useContext(TabbedWorkspaceContext);
  const {
    registerMetadata, stakeholder,
    itemClasses,
    setActiveChangeRequestID,
  } = useContext(BrowserCtx);
  const {
    changeRequest: activeCR,
    canDelete,
    deleteCR,
  } = useContext(ChangeRequestContext);
  const {
    requestFileFromFilesystem,
    makeRandomID,
    getObjectData,
    updateObjects,
    performOperation,
    isBusy,
    getMapReducedData,
    useMapReducedData,
  } = useContext(DatasetContext);

  const registerVersion = registerMetadata?.version;

  const getNewEmptyCRChangeset:
  undefined | ((idea: string) => Promise<[ObjectChangeset, string]>) =
  useMemo(() => {
    if (makeRandomID && stakeholder && canCreateCR(stakeholder)) {
      return async function getNewEmptyCRChangeset (newIdea: string) {
        const crID = await makeRandomID();
        return [newCRObjectChangeset(
          crID,
          newIdea,
          registerVersion!,
          stakeholder!.gitServerUsername!,
        ), crID];
      };
    } else {
      return undefined;
    }
  }, [makeRandomID, stakeholder, registerVersion]);

  const getImportedCRChangeset:
  undefined | (() => Promise<[ObjectChangeset, string]>) =
  useMemo(() => {
    if (requestFileFromFilesystem && stakeholder && canImportCR(stakeholder)) {
      return async function getImportedCRChangeset() {
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
            const [changeset, crID] = await importedProposalToCRObjectChangeset(
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
            return [changeset, crID];
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
    if (updateObjects && setActiveChangeRequestID && !isBusy) {
      return [
        getImportedCRChangeset
          ? performOperation('importing proposal', async function () {
              const [objectChangeset, crID] = await getImportedCRChangeset(); 
              await updateObjects({
                commitMessage: 'import proposal',
                objectChangeset,
              });
              setActiveChangeRequestID(crID);
            })
          : undefined,
        getNewEmptyCRChangeset
          ? performOperation('creating blank proposal', async function (newIdea: string) {
              const [objectChangeset, crID] = await getNewEmptyCRChangeset(newIdea);
              await updateObjects({
                commitMessage: `start new empty proposal ${newIdea}`,
                objectChangeset,
              });
              setActiveChangeRequestID(crID);
            })
          : undefined,
      ];
    } else {
      return [undefined, undefined];
    }
  }, [isBusy, performOperation, updateObjects, getImportedCRChangeset, getNewEmptyCRChangeset]);

  // Actionable proposals v2
  const proposalGroups = useMemo(
    (() => stakeholder?.role
      ? getActionableProposalGroupsForRole(stakeholder.role)
      : null),
    [stakeholder?.role]);

  const actionableProposalsResult = useMapReducedData({
    chains:
      (proposalGroups ?? []).
      map(([label, , queryGetter]) => {
        const query = queryGetter(stakeholder);
        const predicateFunc = `
          const objPath = key, obj = value;
          return ((${CR_BASE_QUERY}) && (${query}));
        `;
        const mapFunc = `emit(value);`;
        return { [label]: { mapFunc, predicateFunc } };
      }).reduce((prev, curr) => ({ ...prev, ...curr }), {}),
  });

  const actionableProposals: [string, CR[] | undefined][] = useMemo(
    (() =>
    Object.entries(actionableProposalsResult.value).
      map(([chainID, chainResult]) =>
        [
          chainID,
          (Array.isArray(chainResult)
            ? (chainResult as CR[])
            : undefined) || undefined
        ]
      )
    ),
    [actionableProposalsResult.value]);

  const handleRefreshProposals = actionableProposalsResult.refresh;

  // TODO: Move to action bar
  // const customActions = useMemo(() => customViews.map(cv => ({
  //   key: cv.id,
  //   text: cv.label,
  //   title: cv.description,
  //   icon: cv.icon,
  //   onClick: () => spawnTab(`${Protocols.CUSTOM_VIEW}:${cv.id}/index`),
  // })), [spawnTab, customViews]);

  const [createMode, setCreateMode] = useState(false);
  //const canStakeholderCreateCRs = stakeholder && canCreateCR(stakeholder);
  const handleSelectProposal = useMemo(() => {
    return (setActiveChangeRequestID && !isBusy
      ? function (crid: string) { setActiveChangeRequestID?.(crid) }
      : undefined);
  }, [setActiveChangeRequestID, isBusy]);

  const proposalBlockActions = useMemo(() => {
    const actions = [];
    if (activeCR) {
      actions.push({
        text: "Export proposal",
        onClick: () => void 0,
        icon: 'export',
        disabled: true,
      } as const);
      actions.push({
        text: "Exit proposal",
        icon: 'log-out',
        intent: 'danger',
        disabled: isBusy,
        onClick: setActiveChangeRequestID
          ? () => setActiveChangeRequestID?.(null)
          : undefined,
      } as const);
    } else {
      if (stakeholder && canCreateCR(stakeholder)) {
        actions.push({
          text: "Create blank proposal",
          onClick: !createMode ? (() => setCreateMode(true)) : undefined,
          disabled: !createCR,
          active: createMode,
          selected: createMode,
          icon: 'add',
          intent: actionableProposals.length < 1
            ? 'primary'
            : undefined,
        } as const);
      }
      if (stakeholder && canImportCR(stakeholder)) {
        actions.push({
          text: "Import proposal",
          onClick: importCR,
          disabled: !importCR || createMode,
          icon: 'import',
          intent: actionableProposals.length < 1
            ? 'primary'
            : undefined,
        } as const);
      }
    }
    return actions;
  }, [!activeCR, createMode, importCR, createCR, isBusy, actionableProposals.length < 1]);

  const handleCreate = useMemo((() =>
    createCR && createMode
      ? async function (idea: string | false) {
          if (idea && createCR) {
            await createCR(idea);
          }
          setCreateMode(false);
        }
      : undefined
  ), [createMode, createCR]);

  const proposalBlock = useMemo(() => {
    if (registerMetadata /*&& actionableProposals.find(p => p[1] && p[1].length > 0)*/) {
      return (
        <HomeBlock
          View={Proposals}
          key="proposal dashboard"
          description="Actionable proposals"
          css={css`
            height: 300px;
            flex-basis: calc(50% - 10px);
            flex-grow: 1;
          `}
          props={{
            register: registerMetadata,
            actionableProposals,
            createMode,
            onCreate: handleCreate,
            onRefreshProposals: handleRefreshProposals,
            onSelectProposal: handleSelectProposal,
          }}
          actions={proposalBlockActions}
        />
      );
    } else {
      return null;
    }
  }, [
    createMode, registerMetadata,
    proposalBlockActions,
    handleSelectProposal,
    handleCreate,
    handleRefreshProposals,
    actionableProposals,
  ]);

  const activeCRBlock = useMemo(() => {
    if (activeCR && registerMetadata) {
      const actions: MenuItemProps[] = stakeholder && canBeTransitionedBy(stakeholder, activeCR)
        ? [/*{
            // Action is taken from within the widget.
            text: "Take action",
            onClick: () => void 0,
            icon: 'take-action',
            intent: 'primary',
          }*/]
        : canDelete
          ? [{
              text: "Delete this proposal draft",
              onClick: deleteCR,
              disabled: !deleteCR,
              icon: 'delete',
              intent: 'danger',
            }]
          : [];
      actions.push({
        text: "Open in new window",
        onClick: async () => spawnTab(`${Protocols.CHANGE_REQUEST}:${crIDToCRPath(activeCR.id)}`),
      });
      return (
        <HomeBlock
          View={CurrentProposal}
          description="Active proposal"
          props={{ proposal: activeCR, stakeholder, register: registerMetadata }}
          css={css`
            height: 300px;
            flex-basis: calc(50% - 10px);
            flex-grow: 1;
          `}
          actions={actions}
        />
      );
    } else {
      return null;
    }
  }, [activeCR, registerMetadata, canDelete, deleteCR, stakeholder]);

  const registerMetaBlock = useMemo(() => {
    if (!activeCRBlock && stakeholder) {
      return (
        <HomeBlock
          View={MetaSummary}
          description="Register summary"
          props={registerMetadata
            ? {
                register: registerMetadata,
                style: { padding: '10px 12px 0 12px', flexGrow: 1, flexShrink: 0 },
              }
            : registerMetadata}
          error={registerMetadata === null
            ? "Failed to load register metadata"
            : undefined}
          css={css`
            height: 300px;
            flex-basis: calc(50% - 10px);
            flex-grow: 1;
          `}
          actions={[{
            text: "View or edit register metadata",
            onClick: () => spawnTab(Protocols.REGISTER_META),
            icon: 'properties',
          }]}
        />
      );
    } else {
      return null;
    }
  }, [!activeCRBlock, registerMetadata, stakeholder]);

  return (
    <TabContentsWithHeader
        title={registerMetadata?.name ?? 'Register'}
        layout="card-grid">

      {activeCRBlock ?? registerMetaBlock}

      {proposalBlock}

      {/* TODO: Move to action bar customActions.length > 0
        ? <HomeBlock
            description="Custom actions"
            View={() => <></>}
            props={{}}
            actions={customActions}
          />
        : null*/}

    </TabContentsWithHeader>
  );
}

export default RegisterHome;


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
  ['My Drafts', new Set(['submitter', 'manager', 'control-body', 'owner']), function submitterProposals(stakeholder) {
    if (stakeholder && stakeholder.gitServerUsername) {
      const stakeholderCondition = `obj.submittingStakeholderGitServerUsername === "${stakeholder.gitServerUsername}"`;
      const query = `(obj.state === "${State.DRAFT}" || obj.state === "${State.RETURNED_FOR_CLARIFICATION}") && (${stakeholderCondition})`;
      return query;
    } else {
      return 'false';
    }
  }],
  ['My Rejected', new Set(['submitter', 'manager', 'control-body', 'owner']), function submitterProposals(stakeholder) {
    // Rejections are actionable because they can be appealed by the submitter.
    if (stakeholder && stakeholder.gitServerUsername) {
      const stakeholderCondition = `obj.submittingStakeholderGitServerUsername === "${stakeholder.gitServerUsername}"`;
      const query = `(obj.state === "${State.REJECTED}") && (${stakeholderCondition})`;
      return query;
    } else {
      return 'false';
    }
  }],
  ['Everyone’s Drafts or Returned', new Set(['manager', 'control-body', 'owner']), function submitterProposals(stakeholder) {
    if (stakeholder && stakeholder.gitServerUsername) {
      const stakeholderCondition = `obj.submittingStakeholderGitServerUsername !== "${stakeholder.gitServerUsername}"`;
      const query = `(obj.state === "${State.DRAFT}" || obj.state === "${State.RETURNED_FOR_CLARIFICATION}") && (${stakeholderCondition})`;
      return query;
    } else {
      return 'false';
    }
  }],
  // ['latest reviewed', new Set(['submitter', 'manager', 'control-body', 'owner']), function submitterProposals(stakeholder) {
  //   // TODO: Should filter only rejected perhaps?
  //   // Approved/accepted proposals can be shown in another (public) area.
  //   if (stakeholder && stakeholder.gitServerUsername) {
  //     const stakeholderCondition = stakeholder?.role !== 'submitter'
  //       ? 'true'
  //       : `obj.submittingStakeholderGitServerUsername === "${stakeholder.gitServerUsername}"`;
  //     // Don’t show drafts in the list of pending proposals, unless it’s user’s own drafts.
  //     const query = `(obj.state === "${State.ACCEPTED} || obj.state === "${State.REJECTED} || obj.state === "${State.REJECTION_UPHELD_ON_APPEAL}"") && ${stakeholderCondition}`;
  //     return query;
  //   } else {
  //     return 'false';
  //   }
  //   // TODO: Implement limit
  // }],
  // ['latest withdrawn', new Set(['submitter', 'manager', 'control-body', 'owner']), function submitterProposals(stakeholder) {
  //   if (stakeholder && stakeholder.gitServerUsername) {
  //     const stakeholderCondition = stakeholder?.role !== 'submitter'
  //       ? 'true'
  //       : `obj.submittingStakeholderGitServerUsername === "${stakeholder.gitServerUsername}"`;
  //     // Don’t show drafts in the list of pending proposals, unless it’s user’s own drafts.
  //     const query = `(obj.state === "${State.WITHDRAWN}" || obj.state === "${State.APPEAL_WITHDRAWN}") && ${stakeholderCondition}`;
  //     return query;
  //   } else {
  //     return 'false';
  //   }
  //   // TODO: Implement limit
  // }],
  ['Pending Owner Appeal Review', new Set(['owner']), function ownerProposals() {
    return `obj.state === "${State.APPEALED}"`;
  }],
  ['Pending Control Body Review', new Set(['control-body', 'owner']), function cbProposals() {
    return `obj.state === "${State.SUBMITTED_FOR_CONTROL_BODY_REVIEW}"`;
  }],
  ['Pending Manager Review', new Set(['manager', 'control-body', 'owner']), function managerProposals() {
    return `obj.state === "${State.PROPOSED}"`;
  }],
] as const;
