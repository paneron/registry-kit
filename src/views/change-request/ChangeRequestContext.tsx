/** @jsx jsx */
/** @jsxFrag React.Fragment */

import { jsx } from '@emotion/react';
import React, { useMemo, useContext } from 'react';
import { DatasetContext } from '@riboseinc/paneron-extension-kit/context';
import { type SomeCR as CR, type Proposed, canBeDeletedBy, canBeEditedBy } from '../../types/cr';
import { BrowserCtx } from '../BrowserCtx';
import { crIDToCRPath } from '../itemPathUtils';
import { canBeTransitionedBy } from './TransitionOptions';


export interface ChangeRequestContextSpec {
  /**
   * Change request object, undefined if not available/loading,
   * null if not expected (i.e. changeRequestID is not given).
   */
  changeRequest?: CR | null

  /**
   * Current user is eligible to edit the contents of this CR.
   * Always false if `changeRequest` is not defined or `null`.
   */
  canEdit: boolean

  /**
   * Current user is eligible to transition the contents of this CR.
   * Always false if `changeRequest` is not defined or `null`.
   */
  canTransition: boolean

  /**
   * Current user is eligible to delete this CR.
   * Always false if `changeRequest` is not defined or `null`.
   */
  canDelete: boolean
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
  const { useObjectData, updateTree, performOperation } = useContext(DatasetContext);
  const { stakeholder } = useContext(BrowserCtx);

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

  const crItemEntries = Object.entries(changeRequest?.items ?? []).map(i => JSON.stringify(i));
  const hasItems = crItemEntries.length > 0;

  const deleteCR = useMemo((() =>
    changeRequest?.id && canDelete && updateTree && !hasItems && !(changeRequest as Proposed).timeProposed
    ? performOperation('deleting proposal', async function handleDelete() {
        const subtreeRoot = crIDToCRPath(changeRequest.id).replace('/main.yaml', '');
        await updateTree({ subtreeRoot, newSubtreeRoot: null, commitMessage: 'remove unproposed CR draft' });
      })
    : undefined
  ), [hasItems, canDelete, changeRequest?.id, (changeRequest as Proposed)?.timeProposed, updateTree]);

  const ctx: ChangeRequestContextSpec = useMemo((() => ({
    changeRequest,
    canEdit,
    canTransition,
    canDelete,
    deleteCR,
  })), [changeRequest, canEdit, deleteCR, canDelete]);

  return (
    <ChangeRequestContext.Provider value={ctx}>
      {children}
    </ChangeRequestContext.Provider>
  );
};
