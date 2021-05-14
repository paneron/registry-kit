/** @jsx jsx */
/** @jsxFrag React.Fragment */

import React from 'react';
import { jsx } from '@emotion/core';
import { FormGroup, InputGroup } from '@blueprintjs/core';


const Justification: React.FC<{
  justification: string
  onChange: (newVal: string) => void
}> = function ({ justification, onChange }) {
  return (
    <FormGroup
        label="Justification"
        labelInfo="(required)"
        helperText="For an immediately approved change request, justification would typically be short."
        intent={justification.trim() === '' ? 'danger' : undefined}>
      <InputGroup
        value={justification}
        required
        placeholder="Justification for this change…"
        onChange={evt => onChange(evt.currentTarget.value)} />
    </FormGroup>
  );
};


export default Justification;
