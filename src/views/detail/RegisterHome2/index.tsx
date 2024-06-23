/** @jsx jsx */
/** @jsxFrag React.Fragment */

import React, { useContext } from 'react';
import { jsx, css } from '@emotion/react';
import { NonIdealState, Button, Card } from '@blueprintjs/core';

import { TabbedWorkspaceContext } from '@riboseinc/paneron-extension-kit/widgets/TabbedWorkspace/context';

import { TabContentsWithHeader } from '../../util';
import { BrowserCtx } from '../../BrowserCtx';
import Search from '../../sidebar/Search';
import { Protocols } from '../../protocolRegistry';


const RegisterHome2: React.VoidFunctionComponent<Record<never, never>> = function () {
  const { registerMetadata } = useContext(BrowserCtx);
  const { spawnTab } = useContext(TabbedWorkspaceContext);
  return (
    <TabContentsWithHeader title={<>Welcome to {registerMetadata?.name ?? 'this register'}</>}>
      <Card css={css`
            flex: 1;
            box-shadow: none !important;
            position: absolute;
            border-radius: 0;
            display: flex;
            flex-flow: column nowrap;
            padding: 10px;
          `}>
        <p>
          Search all items:
        </p>
        <Search
          css={css`flex: 1; overflow: hidden;`}
          //style={{ height: '100vh', width: '50vw', minWidth: '500px', maxWidth: '90vw' }}
          stateName="item-search-home"
          initialView={<>
            <div dangerouslySetInnerHTML={{ __html:
              registerMetadata?.contentSummary
              ?? "There is no content summary of this registry yet."
            }} />
            <Button
                css={css`vertical-align: baseline; margin-top: .5em;`}
                onClick={() => spawnTab(Protocols.REGISTER_META)}>
              View register metadata
            </Button>
          </>}
          zeroResultsView={
            <NonIdealState
              icon="clean"
              title="No results matching query"
            />}
        />
      </Card>
    </TabContentsWithHeader>
  );
};

export default RegisterHome2;
