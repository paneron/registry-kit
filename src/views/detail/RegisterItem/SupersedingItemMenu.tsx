/** @jsx jsx */
/** @jsxFrag React.Fragment */

import update from 'immutability-helper';
import React from 'react';
import { jsx } from '@emotion/react';
import type { InternalItemReference } from '../../../types';
import GenericRelatedItemView from '../../GenericRelatedItemView';


/**
 * Shows a list of related items .
 */
export const RelatedItems: React.FC<{
  itemRefs: InternalItemReference[],
  onChange?: (newItemRefs: InternalItemReference[]) => void,
  className?: string,
}> = function ({ itemRefs, onChange, className }) {
  function handleRemoveItemAtIdx(idx: number) {
    onChange?.(update(itemRefs, { $splice: [[idx, 1]] }));
  }
  function handleUpdateItemAtIdx(idx: number, ref: InternalItemReference) {
    onChange?.(update(itemRefs, { $splice: [[idx, 0, ref]] }));
  }
  return <div className={className}>
    {itemRefs.map((itemRef, idx) =>
      <GenericRelatedItemView
        itemRef={itemRef}
        key={idx}
        onClear={onChange
          ? () => handleRemoveItemAtIdx(idx)
          : undefined}
        onChange={onChange
          ? (newRef) => handleUpdateItemAtIdx(idx, newRef)
          : undefined}
      />
    )}

    {/* New item placeholder */}
    {onChange
      ? <GenericRelatedItemView
          onChange={newRef => onChange!(update(
            itemRefs,
            { $push: [newRef] },
          ))}
        />
      : null}
  </div>;
};


export default RelatedItems;
