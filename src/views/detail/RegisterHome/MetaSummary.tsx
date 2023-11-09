/** @jsx jsx */
/** @jsxFrag React.Fragment */

import React from 'react';
import { jsx } from '@emotion/react';
import DL from '@riboseinc/paneron-extension-kit/widgets/DL';
import { normalizeObjectRecursively } from '@riboseinc/paneron-extension-kit/util';
import { Val } from '../../../views/diffing/InlineDiff';
import type { Register } from '../../../types';


const MetaSummary: React.VoidFunctionComponent<{
  register: Register
  style?: React.CSSProperties
}> = function ({ register, style }) {
  return (
    <DL style={style}>
      <div>
        <dt>Viewing&nbsp;version:</dt>
        <dd>{register.version?.id || 'N/A'}</dd>
      </div>
      <div>
        <dt>Register&nbsp;name:</dt>
        <dd>{register.name}</dd>
      </div>
      {register.operatingLanguage
        ? <div>
            <dt>Operating&nbsp;language:</dt>
            <dd>
              <Val val={normalizeObjectRecursively(register.operatingLanguage)} />
            </dd>
          </div>
        : null}
      <div>
        <dt>Content&nbsp;summary:</dt>
        <dd dangerouslySetInnerHTML={{ __html: register.contentSummary || 'N/A' }}></dd>
      </div>
    </DL>
  );
};


export default MetaSummary;
