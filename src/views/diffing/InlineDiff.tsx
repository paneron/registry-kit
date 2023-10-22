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


// /** Returns true if a value or any nested value within, recursively, is considered “not empty”. */
// function isNonEmptyRecursive(val: any): boolean {
//   if (Array.isArray(val)) {
//     // TODO: Should really do this on arrays?
//     return val.find(item => isNonEmptyRecursive(item)) !== undefined;
//   } else if (isObject(val)) {
//     return Object.values(val).find(item => isNonEmptyRecursive(item)) !== undefined;
//   } else {
//     return isNonEmpty(val);
//   }
// }


/** Returns true if a value is considered “not empty”. */
function isNonEmpty(val: any): boolean {
  return val && (typeof val === 'string'
    ? val.trim() !== ''
    : val?.toString()?.trim?.() || `${val}`);
}


/** Renders given value in a recursive way. */
export const Val: React.VoidFunctionComponent<{
  val: any

  /**
   * Omit nulls, undefined and empty strings in object values.
   *
   * See `isNonEmpty()`.
   *
   * NOTE: Doesn’t work work well if you are annotating changed properties
   * and one of the hidden properties was changed.
   */
  hideEmpty?: boolean
}> = function ({ val, hideEmpty }) {
  if (Array.isArray(val)) {
    return (
      <UnstyledOL>
        {val.map((v, idx) =>
          <li key={idx}>
            {isObject(val) ? <>&rarr;</> : null}
            <Val val={v} hideEmpty={hideEmpty} />
          </li>
        )}
      </UnstyledOL>
    );

  } else if (isObject(val)) {
    const allEntries = Object.entries(val);

    const entries = hideEmpty
      ? allEntries.filter(([, v]) => isNonEmpty(v))
      : allEntries;

    const omittedCount = hideEmpty
      ? allEntries.length - entries.length
      : 0;

    const Comp = entries.length > 1
      ? ComplexDL
      : DL;

    return (
      <Comp>
        {(omittedCount > 1 ? entries : allEntries).sort().map(([key, val]) =>
          <div key={key}>
            <dt>{key}{isObject(val) ? <> &rarr;</> : ': '}</dt>
            <dd>
              <Val val={val} hideEmpty={hideEmpty} />
            </dd>
          </div>
        )}
        {omittedCount > 1
          ? <MetaDLRow>
              <dt>empty properties omitted:</dt>
              <dd><code>{omittedCount}</code></dd>
            </MetaDLRow>
          : null}
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


const MetaDLRow = styled.div`
  opacity: 0.7;
  > dt {
    font-weight: normal;
    font-style: italic;
  }
`


export const InlineDiffGeneric: React.FC<{
  item1: Record<string, any>
  item2: Record<string, any>

  /**
   * Don’t show properties with empty values to save space.
   *
   * NOTE: WIP. Doesn’t work work well if one of the hidden properties was changed.
   */
  omitEmpty?: boolean

  /** Omit unchanged properties (not supported yet). */
  showOnlyChanged?: boolean

  className?: string
}> = React.memo(function ({ item1, item2, omitEmpty, className }) {
  const left = 
    <Val val={normalizeObjectRecursively(item1)} hideEmpty={omitEmpty} />;
  const right =
    <Val val={normalizeObjectRecursively(item2)} hideEmpty={omitEmpty} />;

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
