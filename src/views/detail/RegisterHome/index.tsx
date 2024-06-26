/** @jsx jsx */
/** @jsxFrag React.Fragment */

import React, {
  useMemo,
  useContext,
  useState,
} from 'react';
//import { Helmet } from 'react-helmet';
import styled from '@emotion/styled';
import { jsx, css } from '@emotion/react';
import { H5, H4, Colors, Tag, type MenuItemProps } from '@blueprintjs/core'
import type { ObjectChangeset } from '@riboseinc/paneron-extension-kit/types/objects';
import { DatasetContext } from '@riboseinc/paneron-extension-kit/context';
import { TabbedWorkspaceContext } from '@riboseinc/paneron-extension-kit/widgets/TabbedWorkspace/context';
import { BrowserCtx } from '../../BrowserCtx';
import { ChangeRequestContext } from '../../../proposals/ChangeRequestContext';
import {
  newCRObjectChangeset,
  importedProposalToCRObjectChangeset,
  ProposalBrowser,
  getActionableProposalGroupsForRole,
  CR_BASE_QUERY,
} from '../../../proposals';
import { isImportableCR, type SomeCR as CR } from '../../../proposals/types';
import { crIDToCRPath } from '../../itemPathUtils';

import { canImportCR, canCreateCR } from '../../../types/stakeholder';
import { itemPathToItemRef, itemRefToItemPath } from '../../itemPathUtils';
import { Protocols } from '../../protocolRegistry';
import MetaSummary from './MetaSummary';
import { TabContentsWithHeader } from '../../util';
import { Proposals as ProposalsBlock } from './Proposal';
import HomeBlock, { HomeBlockCard, HomeBlockActions } from './Block';
import CurrentProposalBlock from './ActiveProposalDetails';
import ItemSearchDrawer from '../../ItemSearchDrawer';


const RegisterHome: React.VoidFunctionComponent<Record<never, never>> =
function () {
  const { spawnTab } = useContext(TabbedWorkspaceContext);
  const {
    registerMetadata, stakeholder,
    itemClasses,
    itemClassGroups,
    setActiveChangeRequestID,
    jumpTo,
  } = useContext(BrowserCtx);
  const {
    changeRequest: activeCR,
    canEdit: activeCRIsEditable,
    proposeBlankItem,
    canDelete,
    deleteCR,
    updateItemProposal,
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
    if (makeRandomID && stakeholder && canCreateCR(stakeholder) && registerVersion?.id) {
      return async function getNewEmptyCRChangeset (newIdea: string) {
        const crID = await makeRandomID();
        return [newCRObjectChangeset(
          crID,
          newIdea,
          registerVersion!.id,
          stakeholder!.gitServerUsername!,
        ), crID];
      };
    } else {
      return undefined;
    }
  }, [makeRandomID, stakeholder, registerVersion?.id]);

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
              async function resolvePredicates(predicates) {
                const mapReduceChains = [...predicates.values()].map(predicate => ({
                  [predicate]: {
                    mapFunc: `
                      const data = value.data;
                      if (!key.startsWith('/proposals/') && data && (${predicate})) {
                        emit({ objectPath: key, objectData: value });
                      }
                    `,
                  },
                })).reduce((prev, curr) => ({ ...prev, ...curr }), {});

                const result:
                Record<string, { objectPath: string, objectData: any }[] | {}> =
                await getMapReducedData({
                  chains: mapReduceChains,
                });

                return Object.entries(result).map(([chainLabel, chainResult]) => {
                  const objects =
                    // Map returns an empty object if there’re no items,
                    // but we promise to return a list.
                    (Array.isArray(chainResult) ? chainResult : []);
                  if (objects.length < 1) {
                    throw new Error(`Unable to resolve predicate to item UUID: no item found matching predicate ${chainLabel}`);
                  } else if (objects.length > 1) {
                    const objectOverview = objects.map((o: any) => JSON.stringify(o)).join(', ')
                    throw new Error(`Unable to resolve predicate to item UUID: more than one item matches predicate ${chainLabel}: ${objectOverview}`);
                  } else {
                    return {
                      // There’s just one item anyway, hence `objects[0]`.
                      [chainLabel]: itemPathToItemRef(false, objects[0].objectPath),
                    };
                  }
                }).reduce((prev, curr) => ({ ...prev, ...curr }), {});
              },
            );
            return [changeset, crID];
          } catch (e) {
            console.error("Error reading proposal data", e);
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
    (() => stakeholder?.roles[0]
      ? stakeholder.roles.flatMap(getActionableProposalGroupsForRole)
      : null),
    [stakeholder?.roles.join(',')]);

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
    if (registerMetadata && (createCR || (actionableProposals ?? []).find(p => p[1] && p[1].length > 0))) {
      return (
        <HomeBlock
          View={ProposalsBlock}
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
    createCR,
    handleRefreshProposals,
    actionableProposals,
  ]);

  const handleOpenProposal = useMemo(() => {
    return activeCR
      ? (async () => spawnTab(`${Protocols.CHANGE_REQUEST}:${crIDToCRPath(activeCR.id)}`))
      : undefined;
  }, [spawnTab, activeCR?.id]);

  const activeCRBlock = useMemo(() => {
    if (activeCR && registerMetadata) {
      return <CurrentProposalBlock
        proposal={activeCR}
        stakeholder={stakeholder}
        register={registerMetadata}
        onOpen={handleOpenProposal}
        onDelete={deleteCR}
        canDelete={canDelete}
        css={css`
          height: 300px;
          flex-basis: calc(50% - ${itemGapPx}px);
          flex-grow: 1;
        `}
      />
    } else {
      return null;
    }
  }, [activeCR, registerMetadata, canDelete, deleteCR, handleOpenProposal, stakeholder]);

  const registerMetaBlock = useMemo(() => {
    if (!activeCRBlock) {
      return (
        <HomeBlock
          View={MetaSummary}
          description="Register summary"
          props={registerMetadata
            ? {
                register: registerMetadata,
                style: { padding: '10px 12px 0 12px', flexGrow: 1, overflowY: 'auto' },
              }
            : registerMetadata}
          error={registerMetadata === null
            ? "Failed to load register metadata"
            : undefined}
          css={css`
            height: 300px;
            flex-basis: calc(50% - ${itemGapPx}px);
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
  }, [!activeCRBlock, registerMetadata]);

  const [selectedProposal, selectProposal] = useState<string | null>(null);
  const proposedChangeBlocks = useMemo(() => {
    if (activeCR) {
      return (
        <ProposalBrowser
          proposals={activeCR.items}
          selectedItem={selectedProposal}
          onSelectItem={selectProposal}
          onDeleteProposalForItemAtPath={updateItemProposal
            ? (path) => updateItemProposal("delete item from proposal draft", null, path)
            : undefined}
        />
      );
    } else {
      return null;
    }
  }, [activeCR, selectedProposal, selectProposal, updateItemProposal]);

  const [activeItemSelector, activateItemSelector] =
    useState<keyof typeof itemClasses | true | null>(null);

  const handleProposeNew = proposeBlankItem
    ? async function handleProposeNew(clsID: string) {
        const itemRef = await proposeBlankItem(clsID);
        selectProposal(itemRefToItemPath(itemRef));
      }
    : null;
  

  const itemSelectorBlocks = useMemo(() => {
    const groups = itemClassGroups
      ? itemClassGroups
      : { '': Object.keys(itemClasses) };
    return (
      <>
        {Object.entries(groups).map(([groupLabel, clsIDs]) =>
          <>
            {groupLabel
              ? <GridHeader>{groupLabel}:</GridHeader>
              : null}
            {clsIDs.map((clsID: string) => {
              const cls = itemClasses[clsID];
              const actions: MenuItemProps[] = [{
                onClick: () => spawnTab(`${Protocols.ITEM_CLASS}:${clsID}`),
                icon: 'search',
                text: "Find item…",
                selected: activeItemSelector === clsID,
              }];
              if (activeCRIsEditable && handleProposeNew) {
                actions.push({
                  onClick: () => handleProposeNew(clsID),
                  icon: 'add',
                  text: "Propose new",
                  intent: 'primary',
                });
              }
              return <HomeBlockCard
                  key={clsID}
                  css={css`flex-basis: calc(25% - 10px*3/4); flex-shrink: 0;`}
                  description={`Search items of class ${cls?.meta.title ?? clsID}`}>
                <Tag minimal>Class</Tag>
                <div css={css`padding: 5px; flex-grow: 1;`}>
                  <H5 css={css`margin: 0;`}>{cls.meta.title}</H5>
                  {cls
                    ? cls.meta.description && cls.meta.description !== cls.meta.title
                        ? <p css={css`margin: 10px 0 0 0;`}>
                            {cls.meta.description ?? "(no description)"}
                          </p>
                        : null
                    : "(no class information available)"}
                </div>
                <HomeBlockActions actions={actions} />
              </HomeBlockCard>
            })}
          </>
        )}

        <ItemSearchDrawer
          isOpen={jumpTo && activeItemSelector ? true : false}
          onClose={() => activateItemSelector(null)}
          availableClassIDs={typeof activeItemSelector === 'string' ? [activeItemSelector] : []}
          onChooseItem={(itemRef) => jumpTo?.(`itemdetails:${itemRefToItemPath(itemRef)}`)}
        />
      </>
    );
  }, [itemClasses, activeItemSelector, activeCRIsEditable, jumpTo]);

  return (
    <TabContentsWithHeader
        title={<></>}
        layoutOptions={{ gapPx: itemGapPx, stretch: true }}
        layout="card-grid">

      {activeCRBlock ?? registerMetaBlock}

      {proposalBlock}

      {proposedChangeBlocks
        ? <GridHeader>
            Proposed Changes: ({Object.keys(activeCR?.items ?? []).length} total)
          </GridHeader>
        : null}

      {proposedChangeBlocks}

      {!itemClassGroups
        ? <GridHeader>
            Register Items:
          </GridHeader>
        : null}

      {itemSelectorBlocks}

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

const GridHeader = styled(H4)`
  flex: 100%;
  margin-top: 10px;
  padding-left: 10px;
  color: ${Colors.GRAY2};
  .bp4-dark & {
    color: ${Colors.GRAY2};
  }
`;

const itemGapPx = 10;

export default RegisterHome;
