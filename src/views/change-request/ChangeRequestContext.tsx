/** @jsx jsx */
/** @jsxFrag React.Fragment */

import { jsx } from '@emotion/react';
import React, { useMemo, useContext } from 'react';
import { DatasetContext } from '@riboseinc/paneron-extension-kit/context';
import { type SomeCR as CR, canBeDeletedBy, canBeEditedBy } from '../../types/cr';
import type { RegisterItem, Payload, ChangeProposal, InternalItemReference } from '../../types';
import { isRegisterItem } from '../../types';
import { BrowserCtx } from '../BrowserCtx';
import { itemRefToItemPath, crIDToCRPath } from '../itemPathUtils';
import { canBeTransitionedBy } from './TransitionOptions';
import { updateCRObjectChangeset } from './objectChangeset';


export interface ChangeRequestContextSpec {
  /**
   * Change request object, undefined if not available/loading,
   * null is out of ordinary (i.e. changeRequestID is not given).
   */
  changeRequest?: CR | null

  /**
   * Contents of current CR can be edited by current stakeholder.
   * Always false if `changeRequest` is not defined or `null`.
   */
  canEdit: boolean

  /**
   * Current CR can be transitioned by current stsakeholder.
   * Always false if `changeRequest` is not defined or `null`.
   */
  canTransition: boolean

  /**
   * Current CR can be deleted by current stakeholder.
   * Always false if `changeRequest` is not defined or `null`.
   */
  canDelete: boolean

  /**
   * Propose new blank item of given item class.
   * Will always be undefined if `canEdit` is not `true`.
   */
  proposeBlankItem?: (clsID: string) => Promise<InternalItemReference>

  updateItemProposal?: (
    summary: string,
    proposal: ChangeProposal | null,
    itemPath: string,
    item?: RegisterItem<any>,
    itemData?: Payload,
  ) => Promise<void>

  /**
   * Function that performs CR deletion.
   * May not be present if operation is not possible right now,
   * but otherwise is present if `canDelete` is true.
   */
  deleteCR?: () => Promise<void>

}

export const ChangeRequestContext = React.createContext<ChangeRequestContextSpec>({
  changeRequest: null,
  canEdit: false,
  canTransition: false,
  canDelete: false,
});

export const ChangeRequestContextProvider: React.FC<{
  changeRequestID: string | null
}> = function ({ changeRequestID, children }) {
  const { useObjectData, makeRandomID, updateObjects, updateTree, performOperation, isBusy } = useContext(DatasetContext);
  const { itemClasses, subregisters, stakeholder } = useContext(BrowserCtx);

  const crPath = changeRequestID
    ? `/proposals/${changeRequestID}/main.yaml`
    : null;

  const changeRequest = useObjectData({
    objectPaths: crPath ? [crPath] : [],
    nounLabel: 'proposal(s)',
  }).value?.data[crPath ?? ''] as CR ?? (crPath ? undefined : null);

  const canEdit = changeRequest
    && stakeholder
    && canBeEditedBy(stakeholder, changeRequest)
      ? true
      : false;

  const canTransition = changeRequest
    && stakeholder
    && canBeTransitionedBy(stakeholder, changeRequest)
      ? true
      : false;

  const canDelete = changeRequest
    && stakeholder
    && canBeDeletedBy(stakeholder, changeRequest)
      ? true
      : false;

  const deleteCR = useMemo((() =>
    !isBusy && canDelete && updateTree
      ? performOperation('deleting proposal', async function handleDelete() {
          const subtreeRoot = crIDToCRPath(changeRequest.id).replace('/main.yaml', '');
          await updateTree({
            subtreeRoot,
            newSubtreeRoot: null,
            commitMessage: 'remove unproposed CR draft',
          });
        })
      : undefined
  ), [
    isBusy, performOperation,
    updateTree,
    canDelete,
  ]);

  const proposeBlankItem = useMemo((() => {
    if (!updateObjects || !makeRandomID || !canEdit || !changeRequest) {
      return undefined;
    } else {
      return performOperation('creating blank item', async function _createItem(classID: string, subregisterID?: string) {
        if (subregisters && !subregisterID) {
          throw new Error("Unable to create item: register uses subregisters, but subregister ID was not provided");
        }
        const clsConfig = itemClasses[classID];
        if (!clsConfig) {
          throw new Error("Unable to generate new item data: item class configuration is missing");
        }
        const initialItemData = clsConfig?.defaults ?? {};
        const itemID = await makeRandomID();
        const ref: InternalItemReference = { classID, itemID, subregisterID };
        const registerItem: RegisterItem<any> = {
          id: itemID,
          dateAccepted: new Date(),
          status: 'valid',
          data: initialItemData,
        };
        const itemPath = itemRefToItemPath(ref);
        await updateObjects({
          commitMessage: `propose to add new ${ref.classID}`,
          objectChangeset: updateCRObjectChangeset(
            changeRequest as any,
            { [itemPath]: { type: 'addition' } },
            { [itemPath]: registerItem },
          ),
          _dangerouslySkipValidation: true,
        });
        return ref;
      })
    }
  }), [changeRequest, canEdit, subregisters === undefined, updateObjects, makeRandomID]);

  const updateItemProposal = useMemo((() =>
    changeRequest && canEdit && updateObjects
      ? async function _handleSetProposal(
          summary: string,
          proposal: ChangeProposal | null,
          itemPath: string,
          item?: RegisterItem<any>,
          editedItemData?: Payload,
        ): Promise<void> {
          if (proposal && !item) {
            throw new Error("Missing item");
          }
          if (proposal && proposal?.type !== 'amendment' && (!editedItemData || !isRegisterItem(editedItemData))) {
            throw new Error("Missing item data");
          }
          await updateObjects({
            commitMessage: `${summary} for ${itemPath}`,
            objectChangeset: updateCRObjectChangeset(
              // TODO: We are sure it’s editable already, but casting should be avoided
              changeRequest as any,
              { [itemPath]: proposal },
              ((proposal && proposal?.type !== 'amendment') && editedItemData && item)
                ? { [itemPath]: { ...item, data: editedItemData } }
                : {},
            ),
            // We need this because updateCRObjectChangeset
            // omits oldValue for item data payloads.
            _dangerouslySkipValidation: true,
          });
        }
      : undefined
  ), [canEdit, changeRequest, updateObjects]);

  const ctx: ChangeRequestContextSpec = useMemo((() => ({
    changeRequest,
    canEdit,
    canTransition,
    canDelete,
    deleteCR,
    proposeBlankItem,
    updateItemProposal,
  })), [changeRequest, canEdit, deleteCR, canDelete, proposeBlankItem, updateItemProposal]);

  return (
    <ChangeRequestContext.Provider value={ctx}>
      {children}
    </ChangeRequestContext.Provider>
  );
};
