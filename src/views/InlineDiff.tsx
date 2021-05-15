/** @jsx jsx */
/** @jsxFrag React.Fragment */

import { jsx } from '@emotion/core';
import React, { useContext } from 'react';
import VisualDiff from 'react-visual-diff';
import { RegisterItem } from '../types/item';
import { ItemDetailView } from '../types/views';
import { BrowserCtx } from './BrowserCtx';
import AnnotatedChange from './AnnotatedChange';


const InlineDiff: React.FC<{
  DetailView: ItemDetailView<unknown>
  item1: RegisterItem<any>["data"]
  item2: RegisterItem<any>["data"]
}> = React.memo(({ DetailView, item1, item2 }) => {
  const { useRegisterItemData, getRelatedItemClassConfiguration } = useContext(BrowserCtx)

  return <VisualDiff
    left={<DetailView
      itemData={item1.data}
      useRegisterItemData={useRegisterItemData}
      getRelatedItemClassConfiguration={getRelatedItemClassConfiguration}
    />}
    right={<DetailView
      itemData={item2.data}
      useRegisterItemData={useRegisterItemData}
      getRelatedItemClassConfiguration={getRelatedItemClassConfiguration}
    />}
    renderChange={AnnotatedChange} />;
}, (prevProps, nextProps) =>
  JSON.stringify(prevProps.item2) === JSON.stringify(nextProps.item2) &&
  JSON.stringify(prevProps.item1) === JSON.stringify(nextProps.item1)
);


export default InlineDiff;
