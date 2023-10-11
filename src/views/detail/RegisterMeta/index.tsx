/** @jsx jsx */
/** @jsxFrag React.Fragment */

import React, { useState, useContext } from 'react';
import { jsx } from '@emotion/react';
import { NonIdealState, Spinner } from '@blueprintjs/core';
import { DatasetContext } from '@riboseinc/paneron-extension-kit/context';
import { BrowserCtx } from '../../BrowserCtx';
import { isRegisterMetadata, type Register } from '../../../types';
import { isOwner } from '../../../types/stakeholder';
import { REGISTER_METADATA_FILENAME } from '../../../common';
import { TabContentsWithHeader } from '../../util';
import RegisterMetaForm from './RegisterMetaForm';


const RegisterMeta: React.FC<Record<never, never>> = function () {
  const { updateObjects, performOperation } = useContext(DatasetContext);
  const { registerMetadata, stakeholder } = useContext(BrowserCtx);

  const [ editedMetadata, setEditedMetadata ] = useState<Register | null>(null);

  const canChange = updateObjects ? true : false;
  const didChange = registerMetadata && editedMetadata && JSON.stringify(editedMetadata) !== JSON.stringify(registerMetadata);

  const owner = (registerMetadata?.stakeholders ?? []).find(s => s.role === 'owner');
  const stakeholderCanEdit = !owner || (stakeholder && isOwner(stakeholder));

  function handleClear() {
    setEditedMetadata(null);
  }
  async function handleSave() {
    if (!updateObjects) {
      throw new Error("Dataset is read-only");
    }
    if (!stakeholder || !isOwner(stakeholder)) {
      throw new Error("Register meta is only meant to be edited by owner");
    }
    if (!isRegisterMetadata(editedMetadata)) {
      throw new Error("Invalid register metadata");
    }
    await performOperation('saving register meta', updateObjects)({
      commitMessage: "edited register metadata",
      objectChangeset: {
        [REGISTER_METADATA_FILENAME]: {
          oldValue: registerMetadata,
          newValue: editedMetadata,
        },
      },
    });
    setEditedMetadata(null);
  }

  if (registerMetadata) {
    return (
      <TabContentsWithHeader
        title="Register metadata"
        layout="card-grid"
        actions={[[{
          onClick: handleSave,
          disabled: !didChange || !canChange,
          intent: didChange && canChange ? "primary" : undefined,
          children: "Save",
        }, {
          onClick: handleClear,
          disabled: !didChange || !canChange,
          children: "Clear changes",
        }]]}
      >
        <RegisterMetaForm
          value={editedMetadata ?? registerMetadata}
          onChange={(updateObjects && stakeholderCanEdit)
            ? setEditedMetadata
            : undefined}
        />
      </TabContentsWithHeader>
    );
  } else if (registerMetadata === undefined) {
    return <NonIdealState icon={<Spinner />} />;
  } else {
    return <NonIdealState icon="heart-broken" description="Failed to read registry metadata." />
  }
};

export default {
  main: RegisterMeta,
  title: () => <>Register Metadata</>,
  plainTitle: async () => "register metadata",
};
