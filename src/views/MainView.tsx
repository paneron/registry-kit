/** @jsx jsx */

import { H3, Navbar, NavbarDivider } from '@blueprintjs/core';

import { css, jsx } from '@emotion/core';
import { PluginFC } from '@riboseinc/paneron-plugin-kit/types';


export const MainView: PluginFC<{
  title: JSX.Element | string
  secondaryTitle?: JSX.Element
}> =
function ({ React, title, secondaryTitle, children }) {
  return (
    <div css={css`flex: 1; display: flex; flex-flow: column nowrap; overflow: hidden;`}>
      <Navbar>
        <Navbar.Group>
          <H3 css={css`flex: 1; margin: 0;`}>
            {title}
          </H3>
        </Navbar.Group>
        {secondaryTitle
          ? <Navbar.Group align="right">
              <React.Fragment>
                <NavbarDivider />
                <div>
                  {secondaryTitle}
                </div>
              </React.Fragment>
            </Navbar.Group>
          : null}
      </Navbar>
      <main css={css`flex: 1; display: flex; flex-flow: row nowrap; align-items: stretch; overflow: hidden;`}>
        {children}
      </main>
    </div>
  );
};
