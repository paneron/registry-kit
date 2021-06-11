/** @jsx jsx */
/** @jsxFrag React.Fragment */

import React from 'react';
import { jsx } from '@emotion/react';
import { FormGroup, InputGroup } from '@blueprintjs/core';


const Justification: React.FC<{
  justification: string
  onChange?: (newVal: string) => void
}> = function ({ justification, onChange }) {
  return (
    <FormGroup
        label="Justification:"
        labelInfo="(required)"
        helperText="For an immediately approved change request, justification would typically be short."
        intent={justification.trim() === '' && onChange ? 'danger' : undefined}>
      <InputGroup
        value={justification}
        required
        placeholder="Justification for this change…"
        disabled={!onChange}
        onChange={onChange
          ? (evt => onChange(evt.currentTarget.value))
          : undefined} />
    </FormGroup>
  );
};


export default Justification;
