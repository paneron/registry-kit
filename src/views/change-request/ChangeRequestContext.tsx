/** @jsx jsx */
/** @jsxFrag React.Fragment */

import { jsx } from '@emotion/react';
import React, { useContext } from 'react';
import { DatasetContext } from '@riboseinc/paneron-extension-kit/context';
import { type SomeCR as CR, canBeEditedBy } from '../../types/cr';
import { BrowserCtx } from '../BrowserCtx';


export interface ChangeRequestContextSpec {
  /**
   * Change request object, undefined if not available/loading,
   * null if not expected (i.e. changeRequestID is not given).
   */
  changeRequest?: CR | null

  /**
   * Current user can edit the contents of this CR.
   * Always false if `changeRequest` is not defined or `null`.
   */
  canEdit: boolean
}

export const ChangeRequestContext = React.createContext<ChangeRequestContextSpec>({
  changeRequest: null,
  canEdit: false,
});

export const ChangeRequestContextProvider: React.FC<{
  changeRequestID: string | null
}> = function ({ changeRequestID, children }) {
  const { useObjectData } = useContext(DatasetContext);

  const { stakeholder } = useContext(BrowserCtx);

  const crPath = changeRequestID
    ? `/proposals/${changeRequestID}/main.yaml`
    : null;

  const changeRequest = useObjectData({
    objectPaths: crPath ? [crPath] : [],
    nounLabel: 'proposal(s)',
  }).value?.data[crPath ?? ''] as CR ?? (crPath ? undefined : null);

  return (
    <ChangeRequestContext.Provider value={{
      changeRequest,
      canEdit:
        changeRequest
        && stakeholder
        && canBeEditedBy(stakeholder, changeRequest)
          ? true
          : false,
    }}>
      {children}
    </ChangeRequestContext.Provider>
  );
};
