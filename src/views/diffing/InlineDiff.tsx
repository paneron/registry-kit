/** @jsx jsx */
/** @jsxFrag React.Fragment */

import { jsx } from '@emotion/react';
import React from 'react';
import ReactDOM from 'react-dom/server';
import VisualDiff from 'react-visual-diff';
import { UL } from '@blueprintjs/core';
import { objectsHaveSameShape, normalizeObjectRecursively } from '@riboseinc/paneron-extension-kit/util';
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
    renderChange={AnnotatedChange}
  />;
}, (prevProps, nextProps) =>
  JSON.stringify(prevProps.item2) === JSON.stringify(nextProps.item2) &&
  JSON.stringify(prevProps.item1) === JSON.stringify(nextProps.item1)
);


export const Val: React.VoidFunctionComponent<{ val: any }> = function ({ val }) {
  if (Array.isArray(val)) {
    return <UL>
      {val.map((v, idx) =>
        <li key={idx}><Val val={v} /></li>
      )}
    </UL>;
  } else if (isObject(val)) {
    return <UL>
      {Object.entries(val).sort().map(([key, val]) =>
        <li key={key}><code>{key}</code>: <Val val={val} /></li>
      )}
    </UL>;
  } else {
    return <code>{val?.toString() ?? '—'}</code>;
  }
};


function isObject(val: unknown): val is Record<string, any> {
  return val !== null && typeof val === 'object' && !Array.isArray(val);
}


export const InlineDiffGeneric: React.FC<{
  item1: Record<string, any>
  item2: Record<string, any>
  className?: string
}> = React.memo(function ({ item1, item2, className }) {
  const left = 
    <Val val={normalizeObjectRecursively(item1)} />;
  const right =
    <Val val={normalizeObjectRecursively(item2)} />;

  return (
    <div className={className}>
      <VisualDiff
        left={left}
        right={right}
        //left={<Val val={normalizeObjectRecursively(item1)} />}
        //right={<Val val={normalizeObjectRecursively(item2)} />}
        renderChange={AnnotatedChange}
      />
    </div>
  );
}, (prevProps, nextProps) =>
  objectsHaveSameShape(prevProps.item2, nextProps.item2) &&
  objectsHaveSameShape(prevProps.item1, nextProps.item1)
);


export default InlineDiff;
