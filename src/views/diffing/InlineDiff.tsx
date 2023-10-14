/** @jsx jsx */
/** @jsxFrag React.Fragment */

import { jsx } from '@emotion/react';
import React from 'react';
import ReactDOM from 'react-dom/server';
import VisualDiff from 'react-visual-diff';
import type { InternalItemReference, RegisterItem, Payload } from '../../types/item';
import { ItemDetailView } from '../../types/views';
import AnnotatedChange from '../AnnotatedChange';


const InlineDiff: React.FC<{
  DetailView: ItemDetailView<Payload>
  sharedRefComponents: Omit<InternalItemReference, 'itemID'>
  item1: RegisterItem<any>["data"]
  item2: RegisterItem<any>["data"]
}> = React.memo(({ DetailView, sharedRefComponents, item1, item2 }) => {
  // TODO: Make VisualDiff work. Currently, it doesn’t apparently when item detail views use hooks.
  // Which is often. Either make item views hook-free
  // (which means primarily eliminating useRegisterItemData() by inferring and pre-fetching
  // related item data), or work out another way to diff two React elements.

  console.debug(item1.description, item2.description);
  
  const left = <div dangerouslySetInnerHTML={{ __html: ReactDOM.renderToString(<DetailView
      itemRef={sharedRefComponents}
      itemData={item1}
    />) }} />
  const right = <div dangerouslySetInnerHTML={{ __html: ReactDOM.renderToString(<DetailView
      itemRef={sharedRefComponents}
      itemData={item2}
    />) }} />

  return <VisualDiff
    left={left}
    right={right}
    renderChange={AnnotatedChange} />;
}, (prevProps, nextProps) =>
  JSON.stringify(prevProps.item2) === JSON.stringify(nextProps.item2) &&
  JSON.stringify(prevProps.item1) === JSON.stringify(nextProps.item1)
);


export default InlineDiff;
