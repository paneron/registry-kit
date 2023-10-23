/** @jsx jsx */
/** @jsxFrag React.Fragment */

import React from 'react';
import { jsx, css } from '@emotion/react';
import { Classes } from '@blueprintjs/core';
import DL from '@riboseinc/paneron-extension-kit/widgets/DL';
import { normalizeObjectRecursively } from '@riboseinc/paneron-extension-kit/util';
import { Val } from '../../../views/diffing/InlineDiff';
import type { Register } from '../../../types';


const MetaSummary: React.VoidFunctionComponent<{
  register: Register
}> = function ({ register}) {
  return (
    <DL className={Classes.RUNNING_TEXT} css={css`padding: 10px;`}>
      <div>
        <dt>Viewing&nbsp;version:</dt>
        <dd>{register.version?.id ?? 'N/A'}</dd>
      </div>
      <div>
        <dt>Register&nbsp;name:</dt>
        <dd>{register.name}</dd>
      </div>
      <div>
        <dt>Content&nbsp;summary:</dt>
        <dd>{register.contentSummary || 'N/A'}</dd>
      </div>
      {register.operatingLanguage
        ? <div>
            <dt>Operating&nbsp;language:</dt>
            <dd>
              <Val val={normalizeObjectRecursively(register.operatingLanguage)} />
            </dd>
          </div>
        : null}
    </DL>
  );
};


export default MetaSummary;
