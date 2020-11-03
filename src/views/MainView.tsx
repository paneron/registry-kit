/** @jsx jsx */
/** @jsxFrag React.Fragment */

import { Navbar } from '@blueprintjs/core';

import { css, jsx } from '@emotion/core';
import { PluginFC } from '@riboseinc/paneron-extension-kit/types';


export const MainView: PluginFC<{
  actions?: JSX.Element
}> = function ({
  actions,
  children,
}) {
  return (
    <div css={css`flex: 1; display: flex; flex-flow: column nowrap; overflow: hidden;`}>
      <main css={css`flex: 1; display: flex; flex-flow: row nowrap; align-items: stretch; overflow: hidden;`}>
        {children}
      </main>
      {actions
        ? <Navbar>
            <Navbar.Group>
              {actions}
            </Navbar.Group>
          </Navbar>
        : null}
    </div>
  );
};
