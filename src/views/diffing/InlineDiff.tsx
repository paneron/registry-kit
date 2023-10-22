/** @jsx jsx */
/** @jsxFrag React.Fragment */

import { jsx } from '@emotion/react';
import styled from '@emotion/styled';
import React from 'react';
import ReactDOM from 'react-dom/server';
import VisualDiff from 'react-visual-diff';
import { OL } from '@blueprintjs/core';
import DL from '@riboseinc/paneron-extension-kit/widgets/DL';
import { objectsHaveSameShape, normalizeObjectRecursively, isObject } from '@riboseinc/paneron-extension-kit/util';
import type { InternalItemReference, RegisterItem, Payload } from '../../types/item';
import { ItemDetailView } from '../../types/views';
import AnnotatedChange from '../AnnotatedChange';


const UnstyledOL = styled(OL)`
  margin: 0 !important;
  > li {
    margin: 0 !important;
  }
  ::marker {
    font-weight: bold;
  }
`;

const ComplexDL = styled(DL)`
  /* Within Blueprint’s running text container, we can get away with zero vertical padding. */
  padding: 0 4px;
  border: 1px solid rgba(125, 125, 125, 0.5);
  border-radius: 0 0 15px 0;
  margin: -1px -5px;
`;


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


function isNonEmpty(val: any): boolean {
  if (Array.isArray(val)) {
    return val.find(item => isNonEmpty(item)) !== undefined;
  } else if (isObject(val)) {
    return Object.values(val).find(item => isNonEmpty(item)) !== undefined;
  } else {
    return val && (val === 'string'
      ? val.trim() !== ''
      : val?.toString()?.trim?.() || `${val}`);
  }
}


/** Renders given value in a recursive way. */
export const Val: React.VoidFunctionComponent<{
  val: any
  /** Omit nulls, undefined and empty strings in nested values. */
  hideEmpty?: boolean
}> = function ({ val, hideEmpty }) {
  if (Array.isArray(val)) {
    const items = hideEmpty
      ? val.filter(isNonEmpty)
      : val;
    return (
      <UnstyledOL>
        {items.map((v, idx) =>
          <li key={idx}>
            {isObject(val) ? <>&rarr;</> : null}
            <Val val={v} hideEmpty={hideEmpty} />
          </li>
        )}
      </UnstyledOL>
    );

  } else if (isObject(val)) {
    const entries = hideEmpty
      ? Object.entries(val).filter(([, v]) => isNonEmpty(v))
      : Object.entries(val);
    const numItems = entries.length;
    const Comp = numItems > 1
      ? ComplexDL
      : DL;

    return (
      <Comp>
        {entries.sort().map(([key, val]) =>
          <div key={key}>
            <dt>{key}{isObject(val) ? <> &rarr;</> : ': '}</dt>
            <dd>
              <Val val={val} hideEmpty={hideEmpty} />
            </dd>
          </div>
        )}
      </Comp>
    );

  } else {
    const valString = typeof val === 'string'
      ? val
      : val?.toString() ?? '';
    return typeof val === 'string'
      ? <>{valString}</>
      : <code>{valString.trim() || `${val}`}</code>;
  }
};


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
