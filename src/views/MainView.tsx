/** @jsx jsx */
/** @jsxFrag React.Fragment */

import { Navbar } from '@blueprintjs/core';

import { css, jsx } from '@emotion/core';


export const MainView: React.FC<{
  actions?: JSX.Element
  wrapperClassName?: string
}> = function ({
  actions,
  children,
  wrapperClassName,
}) {
  return (
    <div css={css`flex: 1; display: flex; flex-flow: column nowrap; overflow: hidden;`} className={wrapperClassName}>
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
