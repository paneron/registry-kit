/** @jsx jsx */
/** @jsxFrag React.Fragment */

import React, { useContext } from 'react';
import { jsx } from '@emotion/react';
import PropertyView from '@riboseinc/paneron-extension-kit/widgets/Sidebar/PropertyView';
import { Button } from '@blueprintjs/core';
import { BrowserCtx } from '../BrowserCtx';


const ItemClass: React.FC<{ classID: string, onApplyCriteria?: () => void }> =
function ({ classID, onApplyCriteria }) {

  const { itemClasses } = useContext(BrowserCtx);
  const clsMeta = itemClasses[classID].meta;

  return <>
    <PropertyView label="Class name">
      {clsMeta.title}
    </PropertyView>
    <PropertyView label="Alternative names">
      {clsMeta.alternativeNames?.join(', ') || 'N/A'}
    </PropertyView>
    {onApplyCriteria
      ? <Button icon="filter" small fill outlined onClick={onApplyCriteria}>Show only items of this class</Button>
      : null}
  </>;
};


export default ItemClass;
