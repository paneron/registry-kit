/** @jsx jsx */
/** @jsxFrag React.Fragment */

import React, { useContext, memo, useCallback } from 'react';
import { jsx, css } from '@emotion/react';
import {
  NonIdealState,
  Spinner,
} from '@blueprintjs/core';
import { DatasetContext } from '@riboseinc/paneron-extension-kit/context';
import { TabbedWorkspaceContext } from '@riboseinc/paneron-extension-kit/widgets/TabbedWorkspace/context';
import { BrowserCtx } from '../../BrowserCtx';
import { crPathToCRID } from '../../itemPathUtils';
import {
  ChangeRequestContextProvider,
  ChangeRequestContext,
} from '../../../proposals/ChangeRequestContext';
import ProposalTab from '../../../proposals/ProposalTab';
import { Protocols } from '../../protocolRegistry';
import { maybeEllipsizeString } from '../../util';


const View: React.VoidFunctionComponent<{ uri: string }> =
memo(function ({ uri }) {
  const crID = crPathToCRID(uri);
  return (
    <ChangeRequestContextProvider changeRequestID={crID}>
      <MaybeChangeRequest uri={uri} />
    </ChangeRequestContextProvider>
  );
});


const MaybeChangeRequest: React.VoidFunctionComponent<{ uri: string }> =
memo(function ({ uri }) {
  const { closeTabWithURI } = useContext(TabbedWorkspaceContext);
  const { changeRequest: cr, deleteCR } = useContext(ChangeRequestContext);
  const { registerMetadata } = useContext(BrowserCtx);

  const handleDelete = useCallback(
    (async () => {
      if (deleteCR) {
        await deleteCR();
        closeTabWithURI(`${Protocols.CHANGE_REQUEST}:${uri}`);
      }
    }),
    [deleteCR, closeTabWithURI]);

  return (cr && registerMetadata
    ? <ProposalTab
        proposal={cr}
        register={registerMetadata}
        onDelete={deleteCR
          ? handleDelete
          : undefined}
      />
    : <NonIdealState
        icon={<Spinner />}
        css={css`
          position: absolute;
          inset: 0;
          overflow-y: auto;
        `}
        description={"Unable to load proposal"}
      />
  );
});


const CRTitle: React.FC<{ uri: string }> = memo(function ({ uri }) {
  const { useObjectData } = useContext(DatasetContext);
  const justification = useObjectData({ objectPaths: [uri] }).value.data?.[uri]?.justification;
  return <>Proposal “{maybeEllipsizeString(justification ?? uri)}”</>;
});

export default { main: View, title: CRTitle };
