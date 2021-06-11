/** @jsx jsx */
/** @jsxFrag React.Fragment */

import { diff, formatters } from 'jsondiffpatch';
import { jsx, css } from '@emotion/react';
import React, { useEffect, useRef, useState } from 'react';
import { Switch } from '@blueprintjs/core';
import { RegisterItem } from '../../types/item';


const StructuredDiff: React.FC<{
  item1: RegisterItem<any>["data"]
  item2: RegisterItem<any>["data"]
  className?: string
}> = React.memo(({ item1, item2, className }) => {
  const diffContainerRef = useRef<HTMLDivElement>(null);
  const [showUnchanged, setShowUnchanged] = useState(false);

  const item1json = JSON.stringify(item1);
  const item2json = JSON.stringify(item2);

  useEffect(() => {
    if (diffContainerRef.current) {
      const delta = diff(item1, item2);
      formatters.html.showUnchanged(showUnchanged);
      if (delta) {
        diffContainerRef.current.innerHTML = formatters.html.format(delta, item1);
      } else {
        diffContainerRef.current.innerHTML = formatters.html.format({}, item1);
      }
    }
  }, [item1json, item2json, diffContainerRef.current, showUnchanged]);

  // TODO: Make VisualDiff work. Currently, it doesn’t apparently when item detail views use hooks.
  // Which is often. Either make item views hook-free
  // (which means primarily eliminating useRegisterItemData() by inferring and pre-fetching
  // related item data), or work out another way to diff two React elements.

  return <div css={css`display: flex; flex-flow: column nowrap;`} className={className}>
    <Switch
      checked={showUnchanged}
      onChange={evt => setShowUnchanged(evt.currentTarget.checked)}
      label="Show unchanged properties"
    />
    <div ref={diffContainerRef} css={css`flex: 1; overflow: auto;`}></div>
  </div>
}, (prevProps, nextProps) =>
  JSON.stringify(prevProps.item2) === JSON.stringify(nextProps.item2) &&
  JSON.stringify(prevProps.item1) === JSON.stringify(nextProps.item1)
);


export default StructuredDiff;

