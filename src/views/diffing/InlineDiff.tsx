/** @jsx jsx */
/** @jsxFrag React.Fragment */

import { jsx } from '@emotion/react';
import React, { useContext } from 'react';
import VisualDiff from 'react-visual-diff';
import { RegisterItem, Payload } from '../../types/item';
import { ItemDetailView } from '../../types/views';
import { BrowserCtx } from '../BrowserCtx';
import AnnotatedChange from '../AnnotatedChange';


const InlineDiff: React.FC<{
  DetailView: ItemDetailView<Payload>
  item1: RegisterItem<any>["data"]
  item2: RegisterItem<any>["data"]
}> = React.memo(({ DetailView, item1, item2 }) => {
  const { useRegisterItemData, getRelatedItemClassConfiguration } = useContext(BrowserCtx);
  // TODO: Make VisualDiff work. Currently, it doesn’t apparently when item detail views use hooks.
  // Which is often. Either make item views hook-free
  // (which means primarily eliminating useRegisterItemData() by inferring and pre-fetching
  // related item data), or work out another way to diff two React elements.

  return <VisualDiff
    left={<DetailView
      itemData={item1}
      useRegisterItemData={useRegisterItemData}
      getRelatedItemClassConfiguration={getRelatedItemClassConfiguration}
    />}
    right={<DetailView
      itemData={item2}
      useRegisterItemData={useRegisterItemData}
      getRelatedItemClassConfiguration={getRelatedItemClassConfiguration}
    />}
    renderChange={AnnotatedChange} />;
}, (prevProps, nextProps) =>
  JSON.stringify(prevProps.item2) === JSON.stringify(nextProps.item2) &&
  JSON.stringify(prevProps.item1) === JSON.stringify(nextProps.item1)
);


export default InlineDiff;
