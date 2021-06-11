/** @jsx jsx */
/** @jsxFrag React.Fragment */

import { css, jsx } from '@emotion/react';
import { Navbar } from '@blueprintjs/core';


const MainView: React.FC<{
  actions?: JSX.Element
  wrapperClassName?: string
  style?: React.CSSProperties
}> = function ({
  actions,
  children,
  wrapperClassName,
  style,
}) {
  return (
    <div css={css`flex: 1; display: flex; flex-flow: column nowrap; overflow: hidden;`} className={wrapperClassName} style={style}>
      <main css={css`flex: 1; display: flex; flex-flow: row nowrap; align-items: stretch; overflow: hidden;`}>
        {children}
      </main>
      {actions
        ? <Navbar>
            <Navbar.Group style={{ float: 'unset' }}>
              {actions}
            </Navbar.Group>
          </Navbar>
        : null}
    </div>
  );
};


export default MainView;
