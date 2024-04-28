/** @jsx jsx */
/** @jsxFrag React.Fragment */

import React, { useMemo, useContext, useCallback, memo } from 'react';
import { jsx, css } from '@emotion/react';
import { NonIdealState } from '@blueprintjs/core';

import { DatasetContext } from '@riboseinc/paneron-extension-kit/context';
import type { ObjectChangeset } from '@riboseinc/paneron-extension-kit/types/objects';

import { BrowserCtx } from '../BrowserCtx';
import { canImportCR, canCreateCR } from '../../types/stakeholder';
import { ChangeRequestContext } from '../../proposals/ChangeRequestContext';
import ProposalTab from '../../proposals/ProposalTab';
import NewProposalMenu from '../../proposals/NewProposalMenu';
import { isImportableCR } from '../../proposals/types';
import { itemPathToItemRef } from '../itemPathUtils';
import { formatDate } from '../util';
import useLatestAcceptedProposal from '../../views/hooks/useLatestAcceptedProposal';
import {
  newCRObjectChangeset,
  importedProposalToCRObjectChangeset,
} from '../../proposals';


const ProposalWork: React.VoidFunctionComponent<Record<never, never>> =
memo(function () {
  const { changeRequest: activeCR, deleteCR } = useContext(ChangeRequestContext);
  const {
    registerMetadata: register,
    stakeholder,
    setActiveChangeRequestID,
    itemClasses,
  } = useContext(BrowserCtx);
  const {
    getMapReducedData,
    requestFileFromFilesystem,
    updateObjects,
    performOperation,
    getObjectData,
    isBusy,
  } = useContext(DatasetContext);

  const handleDelete = useCallback(async () => {
    if (deleteCR && activeCR && setActiveChangeRequestID) {
      await deleteCR();
      setActiveChangeRequestID(null);
    }
  }, [deleteCR, setActiveChangeRequestID]);

  let latestAcceptedProposal: ReturnType<typeof useLatestAcceptedProposal> | undefined;
  try {
    latestAcceptedProposal = useLatestAcceptedProposal();
  } catch (e) {
    console.error("Failed to obtain latest accepted proposal");
    latestAcceptedProposal = undefined;
  }
  const getNewEmptyCRChangeset:
  undefined | ((idea: string) => Promise<[ObjectChangeset, string]>) =
  useMemo(() => {
    if (stakeholder && canCreateCR(stakeholder) && latestAcceptedProposal !== undefined) {
      return async function getNewEmptyCRChangeset (newIdea: string) {
        const crID = crypto.randomUUID();
        return [newCRObjectChangeset(
          crID,
          newIdea,
          latestAcceptedProposal?.id ?? 'initial',
          stakeholder!.gitServerUsername!,
        ), crID];
      };
    } else {
      return undefined;
    }
  }, [stakeholder, latestAcceptedProposal?.id]);

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

  if (!activeCR || !register || !stakeholder) {
    return <NonIdealState
      icon="clean"
      title="Not working on any proposal"
      description={<>
        <p>
          Choose an actionable proposal from the sidebar to the left
          and activate it by double-clicking
        </p>
        {register && stakeholder && canCreateCR(stakeholder) && latestAcceptedProposal !== undefined
          ? <>
              <p>—or—</p>
              <NewProposalMenu
                css={css`height: 200px;`}
                previousVersion={
                  latestAcceptedProposal?.timeDisposed
                    ? formatDate(
                        latestAcceptedProposal.timeDisposed,
                        { showTime: true, useUTC: true })
                    : null}
                onImport={importCR}
                onCreateBlank={createCR}
              />
            </>
          : null}
      </>}
    />;
  } else {
    return <ProposalTab
      proposal={activeCR}
      register={register}
      stakeholder={stakeholder}
      onDelete={deleteCR ? handleDelete : undefined}
    />;
  }
});


const ProposalWorkTitle: React.VoidFunctionComponent<Record<never, never>> = function () {
  const { changeRequest: activeCR } = useContext(ChangeRequestContext);
  return <>{activeCR
    ? <strong>Active proposal</strong>
    : <>Proposal dashboard</>}</>;
};


export default {
  main: ProposalWork,
  title: ProposalWorkTitle,
} as const;
