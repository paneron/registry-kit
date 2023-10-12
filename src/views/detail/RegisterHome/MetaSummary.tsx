/** @jsx jsx */
/** @jsxFrag React.Fragment */

import React from 'react';
import { jsx } from '@emotion/react';
import type { Register, RegisterStakeholder } from '../../../types';


const MetaSummary: React.VoidFunctionComponent<{
  register: Register
  stakeholder?: RegisterStakeholder
  className?: string
}> = function ({ register, stakeholder, className }) {
  return (
    <div className={className}>
      {register.name}
      <br />
      Version: {register.version?.id ?? 'N/A'}
    </div>
  );
};


export default MetaSummary;
